import json
import logging
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from services.tradingeconomics_calendar import TradingEconomicsCalendarProvider


logger = logging.getLogger(__name__)


@dataclass
class Event:
    name: str
    date: date
    importance: int
    source: str
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        data = {
            "name": self.name,
            "date": self.date,
            "importance": self.importance,
            "source": self.source,
        }
        if self.metadata:
            data.update(self.metadata)
        return data


class ManualUSCalendarProvider:
    def __init__(self, events: List[Event]) -> None:
        self._events = events

    @classmethod
    def from_json_file(cls, path: Path) -> "ManualUSCalendarProvider":
        events: List[Event] = []
        resolved = path.resolve()
        if not resolved.exists():
            logger.warning("[ManualUSCalendar] File not found: %s", resolved)
            return cls([])
        try:
            raw = json.load(resolved.open("r", encoding="utf-8"))
        except Exception:
            logger.exception("[ManualUSCalendar] Failed to load %s", resolved)
            return cls([])

        for idx, item in enumerate(raw or []):
            try:
                name = str(item["name"])
                date_str = item["date"]
                importance = int(item.get("importance", 1))
                event_date = date.fromisoformat(date_str)
            except Exception:
                logger.exception("[ManualUSCalendar] Invalid entry at index %s in %s", idx, resolved)
                continue

            events.append(Event(name=name, date=event_date, importance=importance, source="manual-us-json"))

        return cls(events)

    def get_events(self, start: date, end: date) -> List[Event]:
        return [e for e in self._events if start <= e.date <= end]


class EventService:
    def __init__(
        self,
        us_manual: Optional[ManualUSCalendarProvider] = None,
        te: Optional[TradingEconomicsCalendarProvider] = None,
    ) -> None:
        self._us_manual = us_manual
        self._te = te

    # --- fallback (heuristic) は残す（API失敗時のみ使う） ---
    def _compute_third_wednesday(self, target: date) -> date:
        first_day = target.replace(day=1)
        weekday = first_day.weekday()
        offset = (2 - weekday) % 7  # Wednesday is 2
        return first_day + timedelta(days=offset + 14)

    def _first_friday(self, target: date) -> date:
        first_day = target.replace(day=1)
        weekday = first_day.weekday()
        offset = (4 - weekday) % 7  # Friday is 4
        return first_day + timedelta(days=offset)

    def _cpi_release_day(self, target: date) -> date:
        return target.replace(day=10)

    def _build_heuristic_events(self, today: date, start: date, end: date) -> List[Event]:
        month_ref = today.replace(day=1)
        next_month = (month_ref.replace(day=28) + timedelta(days=4)).replace(day=1)
        candidates = [month_ref, next_month]
        events: List[Event] = []
        for month in candidates:
            candidates_month: List[Tuple[str, date, int]] = [
                ("FOMC", self._compute_third_wednesday(month), 5),
                ("CPI Release", self._cpi_release_day(month), 4),
                ("Nonfarm Payrolls", self._first_friday(month), 3),
            ]
            for name, dt, importance in candidates_month:
                if start <= dt <= end:
                    events.append(
                        Event(
                            name=name,
                            date=dt,
                            importance=importance,
                            source="local heuristic calendar",
                        )
                    )
        return events

    def _normalize_te_event(self, raw_event: Dict[str, Any]) -> Optional[Event]:
        name = raw_event.get("name")
        if not name:
            return None

        raw_date = raw_event.get("date")
        event_date: Optional[date] = None
        if isinstance(raw_date, date):
            event_date = raw_date
        elif raw_date:
            try:
                event_date = date.fromisoformat(str(raw_date))
            except Exception:
                event_date = None

        if event_date is None:
            return None

        try:
            importance = int(raw_event.get("importance", 1))
        except Exception:
            importance = 1

        return Event(
            name=name,
            date=event_date,
            importance=importance,
            source="tradingeconomics",
        )

    def fetch_events(self, today: date, window_days: int = 120) -> List[Event]:
        start = today - timedelta(days=window_days)
        end = today + timedelta(days=window_days)

        events: List[Event] = []
        seen_keys: Set[Tuple[str, date]] = set()

        if self._us_manual:
            manual_events = self._us_manual.get_events(start, end)
            for ev in manual_events:
                key = (ev.name, ev.date)
                seen_keys.add(key)
                events.append(
                    Event(
                        name=ev.name,
                        date=ev.date,
                        importance=ev.importance,
                        source=ev.source,
                        metadata=ev.metadata,
                    )
                )

        if self._te:
            try:
                te_events = self._te.fetch_events(today)
            except Exception:
                logger.info("TradingEconomics fetch failed; skipping TE events", exc_info=True)
                te_events = []

            for raw_event in te_events or []:
                normalized = self._normalize_te_event(raw_event)
                if normalized is None:
                    continue
                key = (normalized.name, normalized.date)
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                events.append(normalized)

        heuristic_events = self._build_heuristic_events(today, start, end)
        for ev in heuristic_events:
            key = (ev.name, ev.date)
            if key in seen_keys:
                continue
            seen_keys.add(key)
            events.append(ev)

        events.sort(key=lambda e: e.date)
        return events

    def get_events(self, today: Optional[date] = None, window_days: int = 120) -> List[Dict[str, Any]]:
        resolved_today = today or date.today()
        return [event.to_dict() for event in self.fetch_events(resolved_today, window_days=window_days)]

    def get_events_for_date(self, target: date) -> List[Dict[str, Any]]:
        events = self.fetch_events(today=target, window_days=30)
        return [event.to_dict() for event in events if event.date == target]

    def get_te_debug_info(self) -> Dict:
        if self._te is None:
            return {"enabled": False}
        return {
            "enabled": True,
            "countries": self._te.countries,
            "importance": self._te.importance,
            "windowDays": self._te.window_days,
        }
