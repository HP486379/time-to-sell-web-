from datetime import date, timedelta
from typing import List, Dict


class EventService:
    def get_events(self) -> List[Dict]:
        today = date.today()
        return [
            {"name": "FOMC", "importance": 5, "date": today + timedelta(days=2)},
            {"name": "CPI Release", "importance": 4, "date": today + timedelta(days=6)},
            {"name": "Jobs Report", "importance": 3, "date": today - timedelta(days=1)},
        ]
