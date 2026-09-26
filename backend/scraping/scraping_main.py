from urllib import response
from wsgiref import headers
from bs4 import BeautifulSoup
import requests
import re
from typing import List, Optional, Tuple
from datetime import date, timedelta, datetime
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import os
import httpx
from dotenv import load_dotenv

from scraping.config import SCRAPE_DAYS_AHEAD
from scraping.scrape_utils import event_in_scrape_horizon


load_dotenv()


def parse_datetime_string(datetime_str):
    """
    Convert various datetime formats to ISO 8601 format: YYYY-MM-DDTHH:MM-TZOFFSET

    Handles formats like:
    - "Sat, Feb 14, 2026 Show\n\t\t\t\t\t8:00 PM"
    - "2026-01-15T16:00-0800" (already in correct format)
    """
    if not datetime_str:
        return None

    # Clean up whitespace and newlines
    datetime_str = " ".join(datetime_str.split())

    # Check if already in ISO format
    if re.match(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}", datetime_str):
        return datetime_str

    # Parse format like "Sat, Feb 14, 2026 Show 8:00 PM"
    # Remove extra words like "Show"
    datetime_str = re.sub(r"\bShow\b", "", datetime_str).strip()

    try:
        # Try to parse the date with various formats
        # Format: "Sat, Feb 14, 2026 8:00 PM"
        dt = datetime.strptime(datetime_str, "%a, %b %d, %Y %I:%M %p")

        # Convert to ISO 8601 format with PST timezone (-0800)
        # Assuming Pacific Time for San Francisco events
        iso_format = dt.strftime("%Y-%m-%dT%H:%M-0800")
        return iso_format

    except ValueError:
        # Try alternative formats
        try:
            # Format without day name: "Feb 14, 2026 8:00 PM"
            dt = datetime.strptime(datetime_str, "%b %d, %Y %I:%M %p")
            return dt.strftime("%Y-%m-%dT%H:%M-0800")
        except ValueError:
            # If all parsing fails, return original
            print(f"Could not parse datetime: {datetime_str}")
            return datetime_str


async def scrape_events_from_warfield() -> List[dict]:
    url = "https://www.thewarfieldtheatre.com/events"
    print("🕷️ Starting Warfield scrape")
    response = requests.get(url, timeout=15)
    soup = BeautifulSoup(response.content, "html.parser")

    events = []
    venue = "The Warfield, San Francisco, CA"
    location = "982 Market St, San Francisco, CA 94102"

    # Geocode the venue location once
    # lat_lng = geocode_location(location)
    latitude = None
    longitude = None

    # Both classes combined into one selector
    for event in soup.select("div.entry.warfield.clearfix"):
        title_el = event.find(class_="title")
        raw_title = " ".join(title_el.stripped_strings) if title_el else None

        link_el = event.find("a", href=True)
        url = link_el["href"] if link_el else None

        raw_date = (
            event.find(class_="date").get_text(strip=True)
            if event.find(class_="date")
            else None
        )
        raw_time = (
            event.find(class_="time").get_text(strip=True)
            if event.find(class_="time")
            else None
        )

        img_el = event.select_one("div.thumb img")
        image_url = img_el.get("src") if img_el else None

        # Create concatenated datetime string
        datetime_str = None
        if raw_date and raw_time:
            datetime_str = f"{raw_date} {raw_time}"
        elif raw_date:
            datetime_str = raw_date
        elif raw_time:
            datetime_str = raw_time

        events.append(
            {
                "title": raw_title,
                "datetime": parse_datetime_string(datetime_str),
                "venue": venue,
                "location": location,
                "latlong": (
                    f"{latitude},{longitude}" if latitude and longitude else None
                ),
                "url": url,
                "categories": [],
                "source": "thewarfieldtheatre.com",
                "images": [{"url": image_url}] if image_url else [],
            }
        )

    print(f"✅ Scraped {len(events)} events from Warfield")
    return events


async def scrape_events_from_funcheap(max_pages: int = 5) -> List[dict]:
    print(f"🕷️ Starting Funcheap scrape across up to {max_pages} pages")
    events = []

    for page_num in range(1, max_pages + 1):
        # First page is /events, subsequent pages are /events/page/N
        if page_num == 1:
            url = "https://sf.funcheap.com/events"
        else:
            url = f"https://sf.funcheap.com/events/page/{page_num}"

        try:
            response = requests.get(url, timeout=15)

            # Stop if we hit a 404
            if response.status_code == 404:
                break

            soup = BeautifulSoup(response.content, "html.parser")

            # -------- FORMAT A: Featured card events --------
            for event in soup.select("div.post.type-post"):
                title_el = event.select_one("div.title.entry-title")
                meta_el = event.select_one("div.meta.date-time")
                link_el = event.select_one("a")

                title = title_el.get_text(strip=True) if title_el else None
                start_dt = meta_el.get("data-event-date") if meta_el else None
                end_dt = meta_el.get("data-event-date-end") if meta_el else None
                event_url = link_el["href"] if link_el else None

                if title and event_in_scrape_horizon(start_dt or end_dt):
                    events.append(
                        {
                            "title": title,
                            "start_datetime": start_dt,
                            "end_datetime": end_dt,
                            "url": event_url,
                            "source": "sf.funcheap.com",
                        }
                    )

            # -------- FORMAT B: Table row events --------
            for row in soup.select("tr.post"):
                time_el = row.select_one("td:first-child")
                title_el = row.select_one("span.title2.entry-title a")

                if not title_el:
                    continue

                title = title_el.get_text(strip=True)
                event_url = title_el["href"]
                time = time_el.get_text(strip=True) if time_el else None

                events.append(
                    {
                        "title": title,
                        "time": time,
                        "url": event_url,
                        "source": "sf.funcheap.com",
                    }
                )

        except Exception as e:
            print(f"Error on page {page_num}: {e}")
            break

    print(f"✅ Scraped {len(events)} events from Funcheap")
    return events


_WEEKLY_EVENT_DAYS = {
    "sun": "Sunday",
    "mon": "Monday",
    "tue": "Tuesday",
    "wed": "Wednesday",
    "thu": "Thursday",
    "fri": "Friday",
    "sat": "Saturday",
}
_WEEKLY_EVENT_URL_RE = re.compile(r"/events/weekly/(sun|mon|tue|wed|thu|fri|sat)/", re.IGNORECASE)
_WEEKDAY_INDEX = {
    "Monday": 0,
    "Tuesday": 1,
    "Wednesday": 2,
    "Thursday": 3,
    "Friday": 4,
    "Saturday": 5,
    "Sunday": 6,
}


def weekly_event_day(url: Optional[str]) -> Optional[str]:
    """dothebay recurring-event URLs look like /events/weekly/sun/some-slug.

    Mirrors frontend/src/utils/dates.ts's weeklyEventDay. Used to populate the
    `recurrence` field (e.g. "Every Sunday") for display.
    """
    if not url:
        return None
    match = _WEEKLY_EVENT_URL_RE.search(url)
    return _WEEKLY_EVENT_DAYS[match.group(1).lower()] if match else None


def next_weekly_occurrence(day_name: str, time_hint: Optional[str], *, today: Optional[date] = None) -> str:
    """Next upcoming date (today or later) for `day_name`, formatted like other
    dothebay datetimes ("YYYY-MM-DD HH:MM").

    dothebay's recurring-event cards carry a `startDate` meta that's stale (the
    original listing date, not the next occurrence), so we ignore its date and
    only borrow its time-of-day, recomputing the date ourselves each scrape.
    """
    today = today or date.today()
    target_weekday = _WEEKDAY_INDEX[day_name]
    days_ahead = (target_weekday - today.weekday()) % 7
    next_date = today + timedelta(days=days_ahead)

    # Extract just the time-of-day via regex rather than a full ISO parse:
    # dothebay's offsets (e.g. "-0700") aren't colon-separated, which
    # datetime.fromisoformat rejects on Python < 3.11.
    hour, minute = 0, 0
    if time_hint:
        time_match = re.search(r"T(\d{2}):(\d{2})", time_hint)
        if time_match:
            hour, minute = int(time_match.group(1)), int(time_match.group(2))

    return f"{next_date.isoformat()} {hour:02d}:{minute:02d}"


def generate_dothebay_urls(days_ahead: int = SCRAPE_DAYS_AHEAD) -> List[str]:
    base_url = "https://www.dothebay.com/events"
    today = date.today()

    urls = []
    for i in range(days_ahead):
        current_day = today + timedelta(days=i)
        url = f"{base_url}/{current_day.strftime('%Y/%m/%d')}"
        urls.append(url)

    return urls


async def scrape_events_from_dothebay() -> List[dict]:
    urls = generate_dothebay_urls()
    print(
        f"🕷️ Starting DoTheBay scrape across {len(urls)} daily pages "
        f"({SCRAPE_DAYS_AHEAD}d window)"
    )
    events = []

    for url in urls:
        try:
            response = requests.get(url, timeout=15)
            soup = BeautifulSoup(response.content, "html.parser")

            # Find all event cards with class "ds-listing event-card"
            for event_card in soup.select("div.ds-listing.event-card"):
                # Extract title from the link with class "ds-listing-event-title"
                title_el = event_card.select_one("a.ds-listing-event-title")
                title_text_el = title_el.select_one("span.ds-listing-event-title-text") if title_el else None
                title = title_text_el.get_text(strip=True) if title_text_el else None
                event_url = title_el["href"] if title_el and title_el.get("href") else None

                # Make URL absolute if it's relative
                if event_url and not event_url.startswith("http"):
                    event_url = f"https://www.dothebay.com{event_url}"

                # Extract venue name
                venue_el = event_card.select_one("div.ds-venue-name span[itemprop='name']")
                venue = venue_el.get_text(strip=True) if venue_el else None

                # Extract location details
                address_el = event_card.select_one("meta[itemprop='streetAddress']")
                locality_el = event_card.select_one("meta[itemprop='addressLocality']")
                region_el = event_card.select_one("meta[itemprop='addressRegion']")
                postal_el = event_card.select_one("meta[itemprop='postalCode']")

                street_address = address_el.get("content", "") if address_el else ""
                locality = locality_el.get("content", "") if locality_el else ""
                region = region_el.get("content", "") if region_el else ""
                postal = postal_el.get("content", "") if postal_el else ""

                # Construct full location
                location_parts = [p for p in [street_address, locality, region, postal] if p]
                location = ", ".join(location_parts) if location_parts else None

                # Extract date and time
                date_el = event_card.select_one("meta[itemprop='startDate']")
                start_date = date_el.get("datetime", "") if date_el else None

                # Create concatenated datetime string
                datetime_str = None
                if start_date:
                    # Format: 2026-01-25T14:00-0800
                    try:
                        dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
                        datetime_str = dt.strftime("%Y-%m-%d %H:%M")
                    except:
                        datetime_str = start_date

                # After this line:
                # Extract category from the current event_card's classes
                category = None
                classes = event_card.get("class", [])

                # Extract cover image URL from inline style: background-image:url('...')
                image_url = None
                cover_el = event_card.select_one("div.ds-cover-image")
                if cover_el:
                    style = cover_el.get("style", "")
                    match = re.search(r"url\(\s*['\"]?(.*?)['\"]?\s*\)", style)
                    if match:
                        image_url = match.group(1)

                images = [{"url": image_url}] if image_url else []

                # Weekly recurring events (e.g. /events/weekly/sun/...): the scraped
                # startDate is the original listing date, not the next occurrence
                # (often stale/in the past), so recompute the date ourselves and
                # keep the recurrence label separately for display.
                weekly_day = weekly_event_day(event_url)
                recurrence = f"Every {weekly_day}" if weekly_day else None
                if weekly_day:
                    datetime_str = next_weekly_occurrence(weekly_day, start_date)

                for cls in classes:
                    if cls.startswith("ds-event-category-"):
                        category = cls.replace("ds-event-category-", "")
                        break

                if title and event_in_scrape_horizon(datetime_str):
                    events.append(
                        {
                            "title": title,
                            "datetime": datetime_str,
                            "venue": venue,
                            "location": location,
                            "latlong": None,
                            "url": event_url,
                            "categories": [category] if category else None,
                            "source": "dothebay.com",
                            "images": images,
                            "recurrence": recurrence,
                        }
                    )

        except Exception as e:
            print(f"Error scraping {url}: {str(e)}")
            continue

    print(f"✅ Scraped {len(events)} events from DoTheBay")
    return events
