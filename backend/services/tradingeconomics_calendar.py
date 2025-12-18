from __future__ import annotations

import os
import time
import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

import requests
from dateutil import parser
from zoneinfo import ZoneInfo


JST = ZoneInfo("Asia/Tokyo")
logger = logging.getLogger(__name__)


def _to_jst(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        # TEは通常タイムゾーン付きが来る想定だが、念のためUTC扱い
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(JST)


def _safe_int(x: Any, default: int = 0) -> int:
    try:
        return int(x)
    except Exception:
        return default


@dataclass
class TradingEconomicsCalendarProvider:
    api_key: str
    countries: str
    importance: int = 3
    window_days: int = 60
    timeout_sec: int = 15
    cache_ttl_sec: int = 6 * 60 * 60  # 6 hours

    _cache_until: float = 0.0
    _cache_events: List[Dict] = None  # type: ignore

    @classmethod
    def from_env(cls) -> "TradingEconomicsCalendarProvider | None":
        raw_api_key = os.getenv("TE_API_KEY")
        if raw_api_key is None:
            return None
        api_key = raw_api_key.strip()
        if not api_key:
            logger.warning("TE_API_KEY is present but empty; instantiating provider anyway.")
        countries = os.getenv("TE_COUNTRIES", "united states").strip()
        importance = _safe_int(os.getenv("TE_IMPORTANCE", "3"), 3)
        window_days = _safe_int(os.getenv("TE_WINDOW_DAYS", "60"), 60)
        return cls(api_key=api_key, countries=countries, importance=importance, window_days=window_days)

    def fetch_events(self, today: date) -> List[Dict]:
        # Simple in-memory cache (per process)
        now = time.time()
        if self._cache_events is not None and now < self._cache_until:
            return self._cache_events

        start = today.isoformat()
        end = (today + timedelta(days=self.window_days)).isoformat()

        # Country+Date endpoint
        # https://api.tradingeconomics.com/calendar/country/{country}/{start}/{end}?c={api_key}&importance=3
        url = (
            f"https://api.tradingeconomics.com/calendar/country/"
            f"{self.countries}/{start}/{end}"
        )
        params = {"c": self.api_key}
        # importance= (1-Low, 2-Medium, 3-High)
        params["importance"] = str(self.importance)

        try:
            resp = requests.get(url, params=params, timeout=self.timeout_sec)
        except Exception as exc:
            status = getattr(getattr(exc, "response", None), "status_code", "request_failed")
            body = getattr(getattr(exc, "response", None), "text", "")
            log = logger.info if status == 403 else logger.warning
            log("[TE RAW RESPONSE] status=%s body=%s", status, (body or "")[:500])
            return []

        log_level = logger.info if resp.status_code == 403 else logger.warning
        log_level("[TE RAW RESPONSE] status=%s body=%s", resp.status_code, resp.text[:500])
        if resp.status_code == 403:
            return []

        try:
            resp.raise_for_status()
        except Exception:
            return []

        try:
            raw = resp.json()
        except Exception:
            return []

        if not isinstance(raw, list):
            raw = []

        normalized: List[Dict] = []
        for item in raw:
            # Fields (typical): Date, Country, Event, Importance, Source, SourceURL, URL, ...
            event_name = (item.get("Event") or item.get("event") or "").strip()
            if not event_name:
                continue

            date_str = item.get("Date") or item.get("date")
            if not date_str:
                continue

            try:
                dt = parser.isoparse(str(date_str))
            except Exception:
                continue

            dt_jst = _to_jst(dt)
            d_jst = dt_jst.date()

            te_importance = _safe_int(item.get("Importance"), 0)
            # アプリ側(1-5)への雑マップ：TE 3=5, 2=3, 1=2
            app_importance = 5 if te_importance >= 3 else (3 if te_importance == 2 else 2)

            normalized.append(
                {
                    "name": event_name,
                    "importance": app_importance,
                    # 既存ロジック互換：dateはdate型で保持（スコア計算/並び替えが壊れない）
                    "date": d_jst,
                    # 表示用（任意）：実際の発表時刻を保持（将来UIで時刻表示できる）
                    "datetime": dt_jst.isoformat(),
                    "country": item.get("Country"),
                    "category": item.get("Category"),
                    "source": item.get("Source") or "tradingeconomics.com",
                    "source_url": item.get("SourceURL"),
                    "url": item.get("URL"),
                }
            )

        normalized.sort(key=lambda e: e["date"])
        if not normalized:
            logger.info(
                "TradingEconomics returned no events after normalization (countries=%s, importance=%s, window_days=%s, raw_count=%s)",
                self.countries,
                self.importance,
                self.window_days,
                len(raw),
            )
        self._cache_events = normalized
        self._cache_until = now + self.cache_ttl_sec
        return normalized
