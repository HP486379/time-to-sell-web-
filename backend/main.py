from datetime import date, datetime, timedelta
from typing import List, Optional
import logging
from enum import Enum
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

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
    TOPIX = "TOPIX"


class PositionRequest(BaseModel):
    total_quantity: float = Field(..., description="Total units held")
    avg_cost: float = Field(..., description="Average acquisition price")
    index_type: IndexType = Field(IndexType.SP500, description="Target index type")


class PricePoint(BaseModel):
    date: str
    close: float
    ma20: Optional[float]
    ma60: Optional[float]
    ma200: Optional[float]


class EvaluateResponse(BaseModel):
    current_price: float
    market_value: float
    unrealized_pnl: float
    scores: dict
    technical_details: dict
    macro_details: dict
    event_details: dict
    price_series: List[PricePoint]


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

_cache_ttl = timedelta(seconds=60)
_cached_snapshot = {}
_cached_at: dict[str, datetime] = {}


@app.get("/api/health")
def health():
    return {"status": "ok"}


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
    price_history = market_service.get_price_history(index_type=index_type.value)
    market_service.get_current_price(price_history, index_type=index_type.value)
    market_service.get_usd_jpy()
    if index_type == IndexType.SP500:
        fund_nav = nav_service.get_official_nav() or nav_service.get_synthetic_nav()
        current_price = fund_nav["navJpy"]
    else:
        current_price = price_history[-1][1]

    technical_score, technical_details = calculate_technical_score(price_history)
    macro_data = macro_service.get_macro_series()
    macro_score, macro_details = calculate_macro_score(
        macro_data["r_10y"], macro_data["cpi"], macro_data["vix"]
    )

    events = event_service.get_events()
    event_adjustment, event_details = calculate_event_adjustment(date.today(), events)

    total_score = calculate_total_score(technical_score, macro_score, event_adjustment)
    label = get_label(total_score)

    effective_event = event_details.get("effective_event")

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
        "event_details": {
            "E_adj": event_adjustment,
            "R_max": event_details.get("R_max"),
            "effective_event": effective_event,
        },
        "price_series": market_service.build_price_series_with_ma(price_history),
    }

    return snapshot


def get_cached_snapshot(index_type: IndexType = IndexType.SP500):
    global _cached_snapshot, _cached_at
    now = datetime.utcnow()
    cache_key = index_type.value
    if cache_key in _cached_snapshot and cache_key in _cached_at and now - _cached_at[cache_key] < _cache_ttl:
        return _cached_snapshot[cache_key]

    _cached_snapshot[cache_key] = _build_snapshot(index_type=index_type)
    _cached_at[cache_key] = now
    return _cached_snapshot[cache_key]


@app.post("/api/sp500/evaluate", response_model=EvaluateResponse)
def evaluate(position: PositionRequest):
    snapshot = get_cached_snapshot(index_type=position.index_type)
    current_price = snapshot["current_price"]

    market_value = position.total_quantity * current_price
    avg_cost_total = position.total_quantity * position.avg_cost
    unrealized_pnl = market_value - avg_cost_total

    return {
        "current_price": current_price,
        "market_value": round(market_value, 2),
        "unrealized_pnl": round(unrealized_pnl, 2),
        "scores": snapshot["scores"],
        "technical_details": snapshot["technical_details"],
        "macro_details": snapshot["macro_details"],
        "event_details": snapshot["event_details"],
        "price_series": snapshot["price_series"],
    }


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
