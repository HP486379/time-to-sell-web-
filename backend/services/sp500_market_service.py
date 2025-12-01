import logging
import os
from datetime import date, timedelta
from typing import List, Optional, Tuple

import requests
import yfinance as yf


logger = logging.getLogger(__name__)


class SP500MarketService:
    """Service that fetches live S&P500 (or VOO) pricing via yfinance with a synthetic fallback."""

    def __init__(self, symbol: Optional[str] = None):
        self.symbol = symbol or os.getenv("SP500_SYMBOL", "^GSPC")
        self.nav_api_base = os.getenv("SP500_NAV_API_BASE")
        self.start_price = 4000.0

    def _fetch_nav_history(self, start: date, end: date) -> List[Tuple[str, float]]:
        """Optional custom NAV API (if provided by env) returning date/close pairs."""

        if not self.nav_api_base:
            return []

        try:
            resp = requests.get(
                f"{self.nav_api_base.rstrip('/')}/history",
                params={"symbol": self.symbol, "start": start.isoformat(), "end": end.isoformat()},
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, list) and data:
                return [
                    (str(item["date"]), float(item["close"]))
                    for item in data
                    if "date" in item and "close" in item
                ]
        except Exception as exc:
            logger.warning("NAV API fallback due to error: %s", exc)
        return []

    def _fallback_history(self, days: int = 260) -> List[Tuple[str, float]]:
        today = date.today()
        history = []
        price = self.start_price
        for i in range(days):
            price += 1.5
            history.append(((today - timedelta(days=days - i)).isoformat(), round(price, 2)))
        return history

    def get_price_history(self) -> List[Tuple[str, float]]:
        try:
            today = date.today()
            start = today - timedelta(days=365)
            nav_hist = self._fetch_nav_history(start, today)
            if nav_hist:
                return [(d, round(v, 2)) for d, v in nav_hist]

            ticker = yf.Ticker(self.symbol)
            hist = ticker.history(period="1y", interval="1d")
            if hist.empty:
                raise ValueError("empty history")
            closes = hist["Close"].dropna()
            return [
                (idx.date().isoformat(), round(float(val), 2)) for idx, val in closes.items()
            ]
        except Exception as exc:
            logger.warning("Falling back to synthetic price history: %s", exc)
            return self._fallback_history()

    def get_price_history_range(
        self, start: date, end: date, allow_fallback: bool = True
    ) -> List[Tuple[str, float]]:
        try:
            nav_hist = self._fetch_nav_history(start, end)
            if nav_hist:
                return [(d, round(v, 2)) for d, v in nav_hist]

            hist = yf.download(self.symbol, start=start, end=end + timedelta(days=1), interval="1d")
            hist = hist.dropna()
            if hist.empty:
                raise ValueError("empty history")
            closes = hist["Close"]
            return [
                (idx.date().isoformat(), round(float(val), 2)) for idx, val in closes.items()
            ]
        except Exception as exc:
            logger.warning("Price history fetch failed (%s)", exc)
            if not allow_fallback:
                raise
            days = (end - start).days or 260
            return self._fallback_history(days)

    def get_usd_jpy(self) -> float:
        try:
            fx = yf.download("JPY=X", period="5d", interval="1d")
            fx = fx.dropna()
            if not fx.empty:
                return round(float(fx["Close"].iloc[-1]), 4)
        except Exception:
            pass
        return 150.0

    def get_fund_nav_jpy(self, sp_price_usd: float, usd_jpy: float) -> float:
        """
        eMAXIS Slim 米国株式（S&P500）の直近基準価額を取得する。

        Yahoo! Finance 上のファンドコード（デフォルト: 03311187.T）を優先し、
        取得できない場合は S&P500 指数を為替で円換算した値でフォールバックする。
        """

        fund_symbol = os.getenv("SP500_FUND_SYMBOL", "03311187.T")
        try:
            fund = yf.download(fund_symbol, period="1mo", interval="1d")
            fund = fund.dropna()
            if not fund.empty:
                return round(float(fund["Close"].iloc[-1]), 2)
        except Exception:
            pass

        return round(sp_price_usd * usd_jpy, 2)

    def get_current_price(self, history: Optional[List[Tuple[str, float]]] = None) -> float:
        try:
            ticker = yf.Ticker(self.symbol)
            live = ticker.fast_info.get("lastPrice") if ticker.fast_info else None
            if live:
                return round(float(live), 2)
            hist = ticker.history(period="5d", interval="1d")
            if not hist.empty:
                return round(float(hist["Close"].iloc[-1]), 2)
        except Exception:
            pass

        if history:
            return history[-1][1]
        return self._fallback_history()[-1][1]

    def build_price_series_with_ma(self, history: List[Tuple[str, float]]):
        closes = [p[1] for p in history]
        dates = [p[0] for p in history]

        def moving_avg(window: int) -> List[Optional[float]]:
            results: List[Optional[float]] = []
            running_sum = 0.0
            for i, price in enumerate(closes):
                running_sum += price
                if i >= window:
                    running_sum -= closes[i - window]
                if i + 1 >= window:
                    results.append(round(running_sum / window, 2))
                else:
                    results.append(None)
            return results

        ma20 = moving_avg(20)
        ma60 = moving_avg(60)
        ma200 = moving_avg(200)

        series = []
        for idx, date_str in enumerate(dates):
            series.append(
                {
                    "date": date_str,
                    "close": closes[idx],
                    "ma20": ma20[idx],
                    "ma60": ma60[idx],
                    "ma200": ma200[idx],
                }
            )
        return series
