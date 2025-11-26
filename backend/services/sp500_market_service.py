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
