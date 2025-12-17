import logging
from datetime import date, timedelta
from typing import Dict, List

from services.tradingeconomics_calendar import TradingEconomicsCalendarProvider


logger = logging.getLogger(__name__)


class EventService:
    def __init__(self) -> None:
        self._te = TradingEconomicsCalendarProvider.from_env()

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

        # 1) API優先
        if self._te is not None:
            try:
                events = self._te.fetch_events(target)
            except Exception:
                logger.warning("TradingEconomics fetch failed; falling back to heuristic calendar", exc_info=True)
                events = []
        else:
            logger.warning("TradingEconomics provider unavailable; falling back to heuristic calendar")
            events = []

        # 2) APIが取れなければフォールバック
        if not events:
            logger.warning("TradingEconomics returned no events; using heuristic calendar")
            events = self._monthly_events_fallback(target)

        # 3) 既存のwindow絞り込み（今の挙動を維持）
        windowed = [
            event
            for event in events
            if "date" in event and isinstance(event["date"], date)
            and -7 <= (event["date"] - target).days <= window_days
        ]
        return sorted(windowed, key=lambda e: e["date"])

    def get_events(self) -> List[Dict]:
        return self.get_events_for_date(date.today())
