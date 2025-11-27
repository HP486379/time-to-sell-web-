import os
from datetime import date, timedelta
from typing import List, Optional, Tuple

import yfinance as yf


class SP500MarketService:
    """Service that fetches live S&P500 (or VOO) pricing via yfinance with a synthetic fallback."""

    def __init__(self, symbol: Optional[str] = None):
        self.symbol = symbol or os.getenv("SP500_SYMBOL", "^GSPC")
        self.start_price = 4000.0

    def _fallback_history(self) -> List[Tuple[str, float]]:
        today = date.today()
        history = []
        price = self.start_price
        for i in range(260):
            price += 1.5
            history.append(((today - timedelta(days=260 - i)).isoformat(), round(price, 2)))
        return history

    def get_price_history(self) -> List[Tuple[str, float]]:
        try:
            ticker = yf.Ticker(self.symbol)
            hist = ticker.history(period="1y", interval="1d")
            if hist.empty:
                return self._fallback_history()
            closes = hist["Close"].dropna()
            return [
                (idx.date().isoformat(), round(float(val), 2)) for idx, val in closes.items()
            ]
        except Exception:
            return self._fallback_history()

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
