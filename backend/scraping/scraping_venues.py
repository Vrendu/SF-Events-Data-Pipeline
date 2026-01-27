from bs4 import BeautifulSoup
import requests
import re
from typing import List
from datetime import date, timedelta, datetime

async def scrape_events_from_warfield() -> List[dict]:
    url = "https://www.thewarfieldtheatre.com/events"
    response = requests.get(url, timeout=15)
    soup = BeautifulSoup(response.content, "html.parser")

    events = []
    venue = "The Warfield, San Francisco, CA"
    location = "982 Market St, San Francisco, CA 94102"

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
                "datetime": datetime_str,
                "venue": venue,
                "location": location,
                "url": url,
                "source": "thewarfieldtheatre.com",
            }
        )

    return events

async def scrape_events_from_funcheap() -> List[dict]:
    url_base = "https://sf.funcheap.com/events"
    response = requests.get(url_base, timeout=15)
    soup = BeautifulSoup(response.content, "html.parser")

    events = []

    # -------- FORMAT A: Featured card events --------
    for event in soup.select("div.post.type-post"):
        title_el = event.select_one("div.title.entry-title")
        meta_el = event.select_one("div.meta.date-time")
        link_el = event.select_one("a")

        title = title_el.get_text(strip=True) if title_el else None
        start_dt = meta_el.get("data-event-date") if meta_el else None
        end_dt = meta_el.get("data-event-date-end") if meta_el else None
        url = link_el["href"] if link_el else None

        if title:
            events.append(
                {
                    "title": title,
                    "start_datetime": start_dt,
                    "end_datetime": end_dt,
                    "url": url,
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
        url = title_el["href"]
        time = time_el.get_text(strip=True) if time_el else None

        events.append(
            {"title": title, "time": time, "url": url, "source": "sf.funcheap.com"}
        )

    return events


def generate_dothebay_urls(days_ahead: int = 30) -> List[str]:
    base_url = "https://www.dothebay.com/events"
    today = date.today()

    urls = []
    for i in range(days_ahead):
        current_day = today + timedelta(days=i)
        url = f"{base_url}/{current_day.strftime('%Y/%m/%d')}"
        urls.append(url)

    return urls


async def scrape_events_from_dothebay() -> List[dict]:
    urls = generate_dothebay_urls(30)
    print(f"Generated {len(urls)} URLs for DoTheBay scraping.")
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
                address_el = event_card.select_one("span[itemprop='streetAddress']")
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

                if title:
                    events.append(
                        {
                            "title": title,
                            "datetime": datetime_str,
                            "venue": venue,
                            "location": location,
                            "url": event_url,
                            "source": "dothebay.com",
                        }
                    )

        except Exception as e:
            print(f"Error scraping {url}: {str(e)}")
            continue

    print(f"Scraped {len(events)} events from DoTheBay")
    return events