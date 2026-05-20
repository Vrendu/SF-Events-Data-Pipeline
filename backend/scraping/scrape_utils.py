"""Date helpers for limiting scrapes to a forward-looking window."""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Optional

from scraping.config import SCRAPE_DAYS_AHEAD


def scrape_window() -> tuple[date, date]:
    """Inclusive calendar-day range: today through today + SCRAPE_DAYS_AHEAD."""
    start = date.today()
    return start, start + timedelta(days=SCRAPE_DAYS_AHEAD)


def event_start_date(datetime_str: Optional[str]) -> Optional[date]:
    if not datetime_str or not str(datetime_str).strip():
        return None
    s = str(datetime_str).strip()

    if len(s) >= 10 and re.match(r"\d{4}-\d{2}-\d{2}", s[:10]):
        try:
            return date.fromisoformat(s[:10])
        except ValueError:
            pass

    normalized = s.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized).date()
    except ValueError:
        pass

    for fmt in (
        "%Y-%m-%d %H:%M",
        "%a, %b %d, %Y %I:%M %p",
        "%b %d, %Y %I:%M %p",
    ):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue

    return None


def event_in_scrape_horizon(
    datetime_str: Optional[str], *, include_unknown: bool = True
) -> bool:
    """True if the event start falls inside the configured forward window."""
    start, end = scrape_window()
    event_date = event_start_date(datetime_str)
    if event_date is None:
        return include_unknown
    return start <= event_date <= end
