"""Shared scrape horizons and limits (override via env)."""
import os

# Forward-looking window for HTML scrapers; weekly runs should keep this >= 10.
SCRAPE_DAYS_AHEAD = int(os.getenv("SCRAPE_DAYS_AHEAD", "14"))

# Safety cap on SF Rec & Park detail pages per run.
SCRAPE_MAX_SFRECPARK_EVENTS = int(os.getenv("SCRAPE_MAX_SFRECPARK_EVENTS", "200"))

# Concurrent detail-page fetches for SF Rec & Park.
SFRECPARK_CONCURRENCY = int(os.getenv("SFRECPARK_CONCURRENCY", "5"))

# Fixed coordinates for single-venue scrapers (avoids geocoding the same address).
WARFIELD_LATLONG = "37.7837,-122.4101"
