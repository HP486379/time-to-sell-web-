from typing import List, Tuple


def moving_average(prices: List[float], window: int) -> List[float]:
    if len(prices) < window:
        raise ValueError(f"Not enough data for MA{window}")
    ma_values = []
    for i in range(window - 1, len(prices)):
        window_prices = prices[i - window + 1 : i + 1]
        ma_values.append(sum(window_prices) / window)
    return ma_values


def clip(value: float, lower: float = 0.0, upper: float = 100.0) -> float:
    return max(lower, min(upper, value))


def calculate_technical_score(price_history: List[Tuple[str, float]]):
    closes = [p[1] for p in price_history]
    ma200_series = moving_average(closes, 200)
    ma20_series = moving_average(closes, 20)
    ma60_series = moving_average(closes, 60)

    ma200 = ma200_series[-1]
    ma20 = ma20_series[-1]
    ma60 = ma60_series[-1]
    current_price = closes[-1]

    d = (current_price - ma200) / ma200 * 100

    # base score
    if d <= -20:
        t_base = 0
    elif -20 < d < 0:
        t_base = 30 * (d + 20) / 20
    elif 0 <= d < 10:
        t_base = 30 + 20 * d / 10
    elif 10 <= d < 25:
        t_base = 50 + 30 * (d - 10) / 15
    else:
        t_base = 100

    # trend evaluation
    def is_increasing(series: List[float]) -> bool:
        if len(series) < 20:
            return False
        return series[-1] > series[-20]

    def is_decreasing(series: List[float]) -> bool:
        if len(series) < 20:
            return False
        return series[-1] < series[-20]

    if ma20 > ma60 > ma200 and is_increasing(ma20_series[-20:]):
        t_trend = 10
    elif ma20 < ma60 < ma200 and is_decreasing(ma20_series[-20:]):
        t_trend = -10
    else:
        t_trend = 0

    technical_score = clip(t_base + t_trend)

    return round(technical_score, 2), {
        "d": round(d, 2),
        "T_base": round(t_base, 2),
        "T_trend": round(t_trend, 2),
    }
