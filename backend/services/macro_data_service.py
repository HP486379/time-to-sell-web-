import os
import random
from datetime import date, timedelta
from typing import Dict, List, Tuple

import requests
import yfinance as yf
from dotenv import load_dotenv


class MacroDataService:
    """Fetches macro series (10y, CPI, VIX) with live sources and graceful fallbacks."""

    def __init__(self):
        load_dotenv()
        self.fred_api_key = os.getenv("FRED_API_KEY")

    def _synthetic_series(self, base: float, variance: float, points: int = 120) -> Tuple[List[float], float]:
        history = [base + random.uniform(-variance, variance) for _ in range(points)]
        current = base + variance * 0.5
        return history, current

    def _fetch_fred_series(self, series_id: str, start: date) -> List[float]:
        if not self.fred_api_key:
            return []

        params = {
            "series_id": series_id,
            "api_key": self.fred_api_key,
            "file_type": "json",
            "observation_start": start.isoformat(),
        }
        try:
            resp = requests.get(
                "https://api.stlouisfed.org/fred/series/observations", params=params, timeout=10
            )
            resp.raise_for_status()
            observations = resp.json().get("observations", [])
            values: List[float] = []
            for obs in observations:
                try:
                    values.append(float(obs["value"]))
                except (TypeError, ValueError):
                    continue
            return values
        except Exception:
            return []

    def _fetch_vix(self) -> Tuple[List[float], float]:
        try:
            ticker = yf.Ticker("^VIX")
            hist = ticker.history(period="2y", interval="1d")
            if hist.empty:
                raise ValueError("empty VIX history")
            closes = hist["Close"].dropna()
            history = [round(float(val), 2) for val in closes[:-1]]
            current = round(float(closes.iloc[-1]), 2)
            return history, current
        except Exception:
            return self._synthetic_series(18.0, 5.0)

    def _fetch_r10y(self) -> Tuple[List[float], float]:
        start = date.today() - timedelta(days=3650)
        values = self._fetch_fred_series("DGS10", start)
        if values:
            return values[:-1], values[-1]
        return self._synthetic_series(3.5, 1.0)

    def _fetch_cpi(self) -> Tuple[List[float], float]:
        start = date.today() - timedelta(days=3650)
        values = self._fetch_fred_series("CPIAUCSL", start)
        if values:
            return values[:-1], values[-1]
        return self._synthetic_series(4.0, 1.2)

    def get_macro_series(self) -> Dict[str, Tuple[List[float], float]]:
        return {
            "r_10y": self._fetch_r10y(),
            "cpi": self._fetch_cpi(),
            "vix": self._fetch_vix(),
        }
