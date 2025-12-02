import logging
import os
import random
from datetime import date, timedelta
from typing import List, Optional, Tuple

import requests
import pandas as pd
import yfinance as yf
from dotenv import load_dotenv


logger = logging.getLogger(__name__)


class SP500MarketService:
    """Service that fetches live pricing via yfinance with an optional synthetic fallback."""

    def __init__(self, symbol: Optional[str] = None):
        load_dotenv()
        self.symbol = symbol or os.getenv("SP500_SYMBOL", "^GSPC")
        self.nav_api_base = os.getenv("SP500_NAV_API_BASE")
        # TOPIX は指数よりも ETF のシンボルの方が取得安定するため 1306.T をデフォルトとする
        self.topix_symbol = os.getenv("TOPIX_SYMBOL", "1306.T")
        self.topix_nav_api_base = os.getenv("TOPIX_NAV_API_BASE")
        # 実データを優先するが、環境変数で指数ごとにフォールバック可否を制御する
        self.allow_synthetic_fallback = self._flag("SP500_ALLOW_SYNTHETIC_FALLBACK", default=True)
        self.allow_synthetic_fallback_topix = self._flag("TOPIX_ALLOW_SYNTHETIC_FALLBACK", default=True)
        self.start_prices = {"SP500": 4000.0, "TOPIX": 1500.0}

        logger.info(
            "[MARKET CONFIG] SP500_SYMBOL=%s TOPIX_SYMBOL=%s SP500_FALLBACK=%s TOPIX_FALLBACK=%s",
            self.symbol,
            self.topix_symbol,
            self.allow_synthetic_fallback,
            self.allow_synthetic_fallback_topix,
        )

    def _extract_close_series(self, hist: pd.DataFrame) -> pd.Series:
        """Extract a 1-D close/adj close series from yfinance DataFrame."""

        close = hist.get("Close")
        if close is None:
            close = hist.get("Adj Close")
        if close is None:
            raise ValueError("close column missing")
        # yfinance may return a DataFrame when using MultiIndex columns; squeeze to Series
        if isinstance(close, pd.DataFrame):
            close = close.iloc[:, 0]
        return close.dropna()

    def _flag(self, name: str, default: bool = False) -> bool:
        raw = os.getenv(name)
        if raw is None:
            return default
        return raw.lower() in {"1", "true", "yes", "on"}

    def _resolve_symbol(self, index_type: str) -> str:
        return self.topix_symbol if index_type == "TOPIX" else self.symbol

    def _resolve_nav_base(self, index_type: str) -> Optional[str]:
        return self.topix_nav_api_base if index_type == "TOPIX" else self.nav_api_base

    def _allow_synthetic_for_index(self, index_type: str) -> bool:
        return self.allow_synthetic_fallback_topix if index_type == "TOPIX" else self.allow_synthetic_fallback

    def _fetch_nav_history(self, start: date, end: date, index_type: str) -> List[Tuple[str, float]]:
        """Optional custom NAV API (if provided by env) returning date/close pairs."""

        nav_base = self._resolve_nav_base(index_type)
        if not nav_base:
            return []

        try:
            resp = requests.get(
                f"{nav_base.rstrip('/')}/history",
                params={
                    "symbol": self._resolve_symbol(index_type),
                    "start": start.isoformat(),
                    "end": end.isoformat(),
                },
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

    def _fallback_history(self, start: date, end: date, index_type: str) -> List[Tuple[str, float]]:
        """決定的で過度に膨らまないシンセティック履歴を生成する。

        * 年率のドリフトは指数ごとに設定（S&P500: 約7%、TOPIX: 約4%）
        * 日次の揺らぎを小さめに入れて最大ドローダウンが0%にならないようにする
        * 週末はスキップし、営業日ベースで積み上げる
        """

        annual_drift_map = {"SP500": 0.07, "TOPIX": 0.04}
        annual_drift = annual_drift_map.get(index_type, 0.05)
        daily_drift = annual_drift / 260.0

        rng_seed = f"{index_type}:{start.isoformat()}:{end.isoformat()}"
        rng = random.Random(rng_seed)

        history: List[Tuple[str, float]] = []
        price = self.start_prices.get(index_type, 4000.0)

        current = start
        while current <= end:
            if current.weekday() < 5:  # 月〜金のみ
                noise = rng.uniform(-0.006, 0.006)  # ±0.6% 程度の揺らぎ
                # 半年ごとに5%程度の調整を入れて drawdown を作る
                if (current.timetuple().tm_yday // 182) % 2 == 1:
                    noise -= 0.002

                daily_change = 1 + daily_drift + noise
                price = max(1.0, price * daily_change)
                history.append((current.isoformat(), round(price, 2)))
            current += timedelta(days=1)

        return history

    def _to_iso_date(self, idx) -> str:
        try:
            return idx.date().isoformat()
        except AttributeError:
            try:
                # pandas Timestamp may expose .to_pydatetime
                return idx.to_pydatetime().date().isoformat()  # type: ignore[attr-defined]
            except Exception:
                return str(idx)

    def get_price_history(self, index_type: str = "SP500") -> List[Tuple[str, float]]:
        today = date.today()
        start = today - timedelta(days=365)
        allow_synth = self._allow_synthetic_for_index(index_type)
        try:
            nav_hist = self._fetch_nav_history(start, today, index_type)
            if nav_hist:
                logger.info("Using NAV history for %s (%d pts)", index_type, len(nav_hist))
                return [(d, round(v, 2)) for d, v in nav_hist]

            ticker = yf.Ticker(self._resolve_symbol(index_type))
            hist = ticker.history(period="1y", interval="1d")
            if hist.empty:
                raise ValueError("empty history")
            closes = self._extract_close_series(hist)
            logger.info("Using yfinance history for %s (%d pts)", index_type, len(closes))
            return [(self._to_iso_date(idx), round(float(val), 2)) for idx, val in closes.items()]
        except Exception as exc:
            logger.warning("Price history fetch failed (%s)", exc, exc_info=True)
            if not allow_synth:
                raise
            return self._fallback_history(start, today, index_type)

    def get_price_history_range(
        self, start: date, end: date, allow_fallback: bool = True, index_type: str = "SP500"
    ) -> List[Tuple[str, float]]:
        allow_synth = self._allow_synthetic_for_index(index_type)
        fallback_allowed = allow_fallback and allow_synth
        try:
            nav_hist = self._fetch_nav_history(start, end, index_type)
            if nav_hist:
                logger.info("Using NAV history for %s (%d pts)", index_type, len(nav_hist))
                return [(d, round(v, 2)) for d, v in nav_hist]

            hist = yf.download(
                self._resolve_symbol(index_type), start=start, end=end + timedelta(days=1), interval="1d"
            )
            hist = hist.dropna()
            if hist.empty:
                raise ValueError("empty history")
            closes = self._extract_close_series(hist)
            logger.info("Using yfinance history for %s (%d pts)", index_type, len(closes))
            return [(self._to_iso_date(idx), round(float(val), 2)) for idx, val in closes.items()]
        except Exception as exc:
            logger.warning("Price history fetch failed (%s)", exc, exc_info=True)
            if not fallback_allowed:
                raise
            return self._fallback_history(start, end, index_type)

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

    def get_current_price(
        self, history: Optional[List[Tuple[str, float]]] = None, index_type: str = "SP500"
    ) -> float:
        try:
            ticker = yf.Ticker(self._resolve_symbol(index_type))
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
        today = date.today()
        synthetic = self._fallback_history(today - timedelta(days=30), today, index_type)
        return synthetic[-1][1]

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
