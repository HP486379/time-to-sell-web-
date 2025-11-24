from typing import Dict, List, Tuple
import random


class MacroDataService:
    """Provides dummy macro series with modest variability."""

    def _series_with_current(self, base: float, variance: float) -> Tuple[List[float], float]:
        history = [base + random.uniform(-variance, variance) for _ in range(120)]
        current = base + variance * 0.5
        return history, current

    def get_macro_series(self) -> Dict[str, Tuple[List[float], float]]:
        return {
            "r_10y": self._series_with_current(3.5, 1.0),
            "cpi": self._series_with_current(4.0, 1.2),
            "vix": self._series_with_current(18.0, 5.0),
        }
