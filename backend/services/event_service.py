import json
import logging
from datetime import date, timedelta
from pathlib import Path
from typing import Dict, List

from services.tradingeconomics_calendar import TradingEconomicsCalendarProvider


logger = logging.getLogger(__name__)


class ManualCalendarProvider:
    def __init__(self, path: Path):
        self.path = path

    def load_events(self) -> list[dict]:
        try:
            with self.path.open("r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            logger.exception("[ManualCalendar] Failed to load us_events.json")
            return []


class EventService:
    def __init__(self, manual_events: list[dict], te_provider=None) -> None:
        self._manual_events = manual_events
        self._te = te_provider

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
        day = 10
        return target.replace(day=day)

    def _monthly_events_fallback(self, today: date) -> List[Dict]:
        month_ref = today.replace(day=1)
        next_month = (month_ref.replace(day=28) + timedelta(days=4)).replace(day=1)
        candidates = [month_ref, next_month]
        events: List[Dict] = []
        for month in candidates:
            events.extend(
                [
                    {"name": "FOMC", "importance": 5, "date": self._compute_third_wednesday(month), "source": "local heuristic calendar"},
                    {"name": "CPI Release", "importance": 4, "date": self._cpi_release_day(month), "source": "local heuristic calendar"},
                    {"name": "Nonfarm Payrolls", "importance": 3, "date": self._first_friday(month), "source": "local heuristic calendar"},
                ]
            )
        return events

    def get_events_for_date(self, target: date) -> List[Dict]:
        window_days = 30
        events: List[Dict] = []
        target_iso = target.isoformat()

        # ---- ① 手動カレンダーが最優先 ----
        for ev in self._manual_events:
            if ev.get("date") == target_iso:
                enriched = {**ev, "date": target, "source": ev.get("source", "manual calendar")}
                events.append(enriched)

        # ---- ② TE（403 の場合は空配列）----
        if self._te is not None:
            try:
                te_events = self._te.fetch_events(target)
                if te_events:
                    events.extend(te_events)
            except Exception:
                # TE エラーは握りつぶし
                pass
        else:
            logger.info("TradingEconomics provider unavailable; falling back to manual/heuristic calendar")

        # ---- ③ フォールバック（ヒューリスティック）----
        if not events:
            events = self._monthly_events_fallback(target)

        # 既存のwindow絞り込み（今の挙動を維持）
        windowed = [
            event
            for event in events
            if "date" in event
            and isinstance(event["date"], date)
            and -7 <= (event["date"] - target).days <= window_days
        ]
        return sorted(windowed, key=lambda e: e["date"])

    def get_events(self) -> List[Dict]:
        return self.get_events_for_date(date.today())

    def get_te_debug_info(self) -> Dict:
        if self._te is None:
            return {"enabled": False}
        return {
            "enabled": True,
            "countries": self._te.countries,
            "importance": self._te.importance,
            "windowDays": self._te.window_days,
        }
