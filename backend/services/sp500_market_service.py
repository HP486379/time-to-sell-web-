from datetime import date, timedelta
from typing import List, Tuple


class SP500MarketService:
    """Stub service generating synthetic S&P500 price history."""

    def __init__(self):
        self.start_price = 4000.0

    def get_price_history(self) -> List[Tuple[str, float]]:
        today = date.today()
        history = []
        price = self.start_price
        for i in range(260):
            price += 1.5  # mild uptrend
            history.append(((today - timedelta(days=260 - i)).isoformat(), round(price, 2)))
        return history
