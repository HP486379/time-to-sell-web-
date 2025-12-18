import logging
from pathlib import Path
from datetime import date, datetime, time, timedelta, timezone
from typing import List, Optional
from enum import Enum

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

from scoring.technical import calculate_technical_score
from scoring.macro import calculate_macro_score
from scoring.events import calculate_event_adjustment
from scoring.total_score import calculate_total_score, get_label
from services.sp500_market_service import SP500MarketService
from services.macro_data_service import MacroDataService
from services.event_service import EventService
from services.nav_service import FundNavService
from services.backtest_service import BacktestService


class IndexType(str, Enum):
    SP500 = "SP500"
    SP500_JPY = "sp500_jpy"
    TOPIX = "TOPIX"
    NIKKEI = "NIKKEI"
    NIFTY50 = "NIFTY50"
    ORUKAN = "ORUKAN"
    ORUKAN_JPY = "orukan_jpy"


class PositionRequest(BaseModel):
    total_quantity: float = Field(..., description="Total units held")
    avg_cost: float = Field(..., description="Average acquisition price")
    index_type: IndexType = Field(IndexType.SP500, description="Target index type")
    score_ma: int = Field(200, description="Moving average window for score calculation")


class PricePoint(BaseModel):
    date: str
    close: float
    ma20: Optional[float]
    ma60: Optional[float]
    ma200: Optional[float]


class EvaluateResponse(BaseModel):
    current_price: Optional[float] = None
    market_value: Optional[float] = None
    unrealized_pnl: Optional[float] = None
    scores: dict = Field(default_factory=dict)
    technical_details: dict = Field(default_factory=dict)
    macro_details: dict = Field(default_factory=dict)
    event_details: dict = Field(default_factory=dict)
    price_series: List[PricePoint] = Field(default_factory=list)


class SyntheticNavResponse(BaseModel):
    asOf: str
    priceUsd: float
    usdJpy: float
    navJpy: float
    source: str


class FundNavResponse(BaseModel):
    asOf: str
    navJpy: float
    source: str


class BacktestRequest(BaseModel):
    start_date: date
    end_date: date
    initial_cash: float
    buy_threshold: float = 40.0
    sell_threshold: float = 80.0
    index_type: IndexType = IndexType.SP500
    score_ma: int = Field(200, description="Moving average window for score calculation")


class Trade(BaseModel):
    action: str
    date: str
    quantity: int
    price: float


class PortfolioPoint(BaseModel):
    date: str
    value: float


class BacktestResponse(BaseModel):
    final_value: float
    buy_and_hold_final: float
    total_return_pct: float
    cagr_pct: float
    max_drawdown_pct: float
    trade_count: int
    trades: List[Trade]
    portfolio_history: List[PortfolioPoint]
    buy_hold_history: List[PortfolioPoint]


logger = logging.getLogger(__name__)

app = FastAPI(title="S&P500 Timing API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


market_service = SP500MarketService()
macro_service = MacroDataService()
event_service = EventService()
nav_service = FundNavService()
backtest_service = BacktestService(market_service, macro_service, event_service)

JST = timezone(timedelta(hours=9))


def to_jst_iso(value: date) -> str:
    return datetime.combine(value, time.min, tzinfo=JST).isoformat()

_cache_ttl = timedelta(seconds=60)
_cached_snapshot = {}
_cached_at: dict[str, datetime] = {}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/debug/te")
def debug_te():
    return event_service.get_te_debug_info()


@app.get("/api/nav/sp500-synthetic", response_model=SyntheticNavResponse)
def get_synthetic_nav():
    return nav_service.get_synthetic_nav()


@app.get("/api/nav/emaxis-slim-sp500", response_model=FundNavResponse)
def get_fund_nav():
    nav = nav_service.get_official_nav()
    if nav:
        return nav
    synthetic = nav_service.get_synthetic_nav()
    return {
        "asOf": synthetic["asOf"],
        "navJpy": synthetic["navJpy"],
        "source": "synthetic",
    }


def _build_snapshot(index_type: IndexType = IndexType.SP500):
    events: List[dict] = []
    try:
        events = event_service.get_events()
    except Exception:
        logger.error("Failed to fetch events; falling back to empty list", exc_info=True)
        events = []

    try:
        event_adjustment, event_details_raw = calculate_event_adjustment(date.today(), events)
    except Exception:
        logger.error("Failed to calculate event adjustment; using zero adjustment", exc_info=True)
        event_adjustment, event_details_raw = 0.0, {}

    def _format_iso(d: Optional[date]) -> Optional[str]:
        if isinstance(d, date):
            return to_jst_iso(d)
        return None

    effective_event = event_details_raw.get("effective_event") if isinstance(event_details_raw, dict) else None
    iso_effective_event = None
    if isinstance(effective_event, dict):
        iso_date = _format_iso(effective_event.get("date"))
        if iso_date:
            iso_effective_event = {**effective_event, "date": iso_date, "source": effective_event.get("source")}

    event_details = {
        "E_adj": event_adjustment,
        "R_max": event_details_raw.get("R_max") if isinstance(event_details_raw, dict) else None,
        "effective_event": iso_effective_event,
        "events": [
            {
                **e,
                "date": _format_iso(e.get("date")),
                "timezone": "Asia/Tokyo",
            }
            for e in events
        ],
    }

    price_history: List = []
    price_series: List[PricePoint] = []
    current_price: Optional[float] = None
    try:
        price_history = market_service.get_price_history(index_type=index_type.value)
        try:
            market_service.get_current_price(price_history, index_type=index_type.value)
            market_service.get_usd_jpy()
        except Exception:
            logger.error("Failed to refresh market auxiliary data", exc_info=True)
        if index_type == IndexType.SP500:
            try:
                fund_nav = nav_service.get_official_nav() or nav_service.get_synthetic_nav()
                current_price = fund_nav.get("navJpy")
            except Exception:
                logger.error("Failed to fetch nav; falling back to price history", exc_info=True)
                current_price = price_history[-1][1] if price_history else None
        else:
            current_price = price_history[-1][1] if price_history else None
        try:
            price_series = market_service.build_price_series_with_ma(price_history)
        except Exception:
            logger.error("Failed to build price series", exc_info=True)
            price_series = []
    except Exception:
        logger.error("Failed to fetch price history; continuing with empty data", exc_info=True)
        price_history, price_series, current_price = [], [], None

    technical_score = 0.0
    technical_details = {}
    if price_history:
        try:
            technical_score, technical_details = calculate_technical_score(price_history)
        except Exception:
            logger.error("Failed to calculate technical score", exc_info=True)
            technical_score, technical_details = 0.0, {}

    macro_score = 0.0
    macro_details = {}
    try:
        macro_data = macro_service.get_macro_series()
        macro_score, macro_details = calculate_macro_score(
            macro_data["r_10y"], macro_data["cpi"], macro_data["vix"]
        )
    except Exception:
        logger.error("Failed to calculate macro score", exc_info=True)
        macro_score, macro_details = 0.0, {}

    total_score = calculate_total_score(technical_score, macro_score, event_adjustment)
    label = get_label(total_score)

    snapshot = {
        "current_price": current_price,
        "scores": {
            "technical": technical_score,
            "macro": macro_score,
            "event_adjustment": event_adjustment,
            "total": total_score,
            "label": label,
        },
        "technical_details": technical_details,
        "macro_details": macro_details,
        "event_details": event_details,
        "price_history": price_history,
        "price_series": price_series,
    }

    return snapshot


@app.get("/api/sp500/price-history", response_model=List[PricePoint])
def get_sp500_price_history():
    snapshot = get_cached_snapshot(index_type=IndexType.SP500)
    return snapshot["price_series"]


@app.get("/api/topix/price-history", response_model=List[PricePoint])
def get_topix_price_history():
    snapshot = get_cached_snapshot(index_type=IndexType.TOPIX)
    return snapshot["price_series"]


@app.get("/api/nikkei/price-history", response_model=List[PricePoint])
def get_nikkei_price_history():
    snapshot = get_cached_snapshot(index_type=IndexType.NIKKEI)
    return snapshot["price_series"]


@app.get("/api/nifty50/price-history", response_model=List[PricePoint])
def get_nifty_price_history():
    snapshot = get_cached_snapshot(index_type=IndexType.NIFTY50)
    return snapshot["price_series"]


@app.get("/api/orukan/price-history", response_model=List[PricePoint])
def get_orukan_price_history():
    snapshot = get_cached_snapshot(index_type=IndexType.ORUKAN)
    return snapshot["price_series"]


@app.get("/api/orukan-jpy/price-history", response_model=List[PricePoint])
def get_orukan_jpy_price_history():
    snapshot = get_cached_snapshot(index_type=IndexType.ORUKAN_JPY)
    return snapshot["price_series"]


@app.get("/api/sp500-jpy/price-history", response_model=List[PricePoint])
def get_sp500_jpy_price_history():
    snapshot = get_cached_snapshot(index_type=IndexType.SP500_JPY)
    return snapshot["price_series"]


def get_cached_snapshot(index_type: IndexType = IndexType.SP500):
    global _cached_snapshot, _cached_at
    now = datetime.utcnow()
    cache_key = index_type.value
    if cache_key in _cached_snapshot and cache_key in _cached_at and now - _cached_at[cache_key] < _cache_ttl:
        return _cached_snapshot[cache_key]

    _cached_snapshot[cache_key] = _build_snapshot(index_type=index_type)
    _cached_at[cache_key] = now
    return _cached_snapshot[cache_key]


def _evaluate(position: PositionRequest):
    snapshot = get_cached_snapshot(index_type=position.index_type)
    current_price = snapshot.get("current_price")

    try:
        technical_score, technical_details = calculate_technical_score(
            snapshot.get("price_history", []), base_window=position.score_ma
        )
    except Exception:
        logger.error("Failed to calculate technical score for evaluate", exc_info=True)
        technical_score, technical_details = 0.0, {}

    macro_score = snapshot.get("scores", {}).get("macro", 0.0)
    event_adjustment = snapshot.get("scores", {}).get("event_adjustment", 0.0)
    total_score = calculate_total_score(technical_score, macro_score, event_adjustment)
    label = get_label(total_score)

    scores = {
        "technical": technical_score,
        "macro": macro_score,
        "event_adjustment": event_adjustment,
        "total": total_score,
        "label": label,
    }

    market_value = position.total_quantity * current_price if current_price is not None else 0.0
    avg_cost_total = position.total_quantity * position.avg_cost
    unrealized_pnl = market_value - avg_cost_total

    return {
        "current_price": current_price,
        "market_value": round(market_value, 2),
        "unrealized_pnl": round(unrealized_pnl, 2),
        "scores": scores,
        "technical_details": technical_details,
        "macro_details": snapshot.get("macro_details", {}),
        "event_details": snapshot.get("event_details", {}),
        "price_series": snapshot.get("price_series", []),
    }


@app.post("/api/sp500/evaluate", response_model=EvaluateResponse)
def evaluate_sp500(position: PositionRequest):
    return _evaluate(position)


@app.post("/api/evaluate", response_model=EvaluateResponse)
def evaluate(position: PositionRequest):
    return _evaluate(position)


@app.post("/api/backtest", response_model=BacktestResponse)
def backtest(payload: BacktestRequest):
    try:
        result = backtest_service.run_backtest(
            payload.start_date,
            payload.end_date,
            payload.initial_cash,
            payload.buy_threshold,
            payload.sell_threshold,
            payload.index_type.value,
            payload.score_ma,
        )
        return result
    except ValueError as exc:
        logger.error("Backtest failed due to invalid input: %s", exc, exc_info=True)
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # pragma: no cover - defensive
        logger.error("Backtest failed unexpectedly", exc_info=True)
        raise HTTPException(
            status_code=502,
            detail="Backtest failed: external data unavailable (check network / API key / symbol).",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
