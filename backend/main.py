from datetime import date
from fastapi import FastAPI
from pydantic import BaseModel, Field

from scoring.technical import calculate_technical_score
from scoring.macro import calculate_macro_score
from scoring.events import calculate_event_adjustment
from scoring.total_score import calculate_total_score, get_label
from services.sp500_market_service import SP500MarketService
from services.macro_data_service import MacroDataService
from services.event_service import EventService


class PositionRequest(BaseModel):
    total_quantity: float = Field(..., description="Total units held")
    avg_cost: float = Field(..., description="Average acquisition price")


class EvaluateResponse(BaseModel):
    current_price: float
    market_value: float
    unrealized_pnl: float
    scores: dict
    technical_details: dict
    macro_details: dict
    event_details: dict


app = FastAPI(title="S&P500 Timing API")


market_service = SP500MarketService()
macro_service = MacroDataService()
event_service = EventService()


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/sp500/evaluate", response_model=EvaluateResponse)
def evaluate(position: PositionRequest):
    price_history = market_service.get_price_history()
    current_price = market_service.get_current_price(price_history)

    technical_score, technical_details = calculate_technical_score(price_history)
    macro_data = macro_service.get_macro_series()
    macro_score, macro_details = calculate_macro_score(
        macro_data["r_10y"], macro_data["cpi"], macro_data["vix"]
    )

    events = event_service.get_events()
    event_adjustment, event_details = calculate_event_adjustment(date.today(), events)

    total_score = calculate_total_score(technical_score, macro_score, event_adjustment)
    label = get_label(total_score)

    market_value = position.total_quantity * current_price
    avg_cost_total = position.total_quantity * position.avg_cost
    unrealized_pnl = market_value - avg_cost_total

    effective_event = event_details.get("effective_event")

    return {
        "current_price": current_price,
        "market_value": round(market_value, 2),
        "unrealized_pnl": round(unrealized_pnl, 2),
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
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
