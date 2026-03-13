import re
import httpx
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup


def _split_name_from_address(text: str) -> tuple[Optional[str], Optional[str]]:
    """
    If text starts with a place name (non-numeric) followed by a street address,
    split them apart. Returns (name, street) or (None, text).
    E.g. "McLaren Lodge501 Stanyan Street" -> ("McLaren Lodge", "501 Stanyan Street")
    E.g. "City Hall Room 4161 Dr. Carlton..." -> ("City Hall Room 416", "1 Dr. Carlton...")
         -- won't work perfectly for "Room 416" but we handle that below
    """
    # Match: leading non-digit text, then a number that starts a street address
    # Street addresses start with a house number (digits at a word boundary)
    match = re.search(r"(?<!\d)(\d+\s+[A-Za-z])", text)
    if match:
        split_pos = match.start()
        name_part = text[:split_pos].strip()
        street_part = text[split_pos:].strip()
        if name_part and street_part:
            return name_part, street_part
    return None, text


async def get_sfrecpark_event_urls() -> List[str]:
    base_url = "https://sfrecpark.org"
    start_date = datetime.now().strftime("%m/%d/%Y")
    end_date = (datetime.now() + timedelta(days=60)).strftime("%m/%d/%Y")

    calendar_url = (
        f"{base_url}/calendar.aspx"
        f"?Keywords=&startDate={start_date}&enddate={end_date}"
    )

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(calendar_url)
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    event_links = soup.find_all("a", id=lambda x: x and x.startswith("eventTitle_"))
    return [base_url + a["href"] for a in event_links if a.get("href")]


async def scrape_sfrecpark_event(
    client: httpx.AsyncClient, url: str
) -> Optional[Dict[str, Any]]:
    try:
        response = await client.get(url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        # Title
        title_tag = soup.find("h2", id=lambda x: x and x.endswith("_eventTitle"))
        title = title_tag.get_text(strip=True) if title_tag else "Untitled"

        # Datetime
        hidden_date_div = soup.find(
            "div", id=lambda x: x and x.endswith("_dateHiddenDiv")
        )
        event_datetime = (
            hidden_date_div.get_text(strip=True) if hidden_date_div else None
        )

        # Venue: <div itemprop="name"> inside the location block
        location_div = soup.find(
            "div", id=lambda x: x and x.endswith("_ctl04_location")
        )
        venue = None
        if location_div:
            venue_tag = location_div.find("div", itemprop="name")
            raw_venue = venue_tag.get_text(strip=True) if venue_tag else None
            if raw_venue and raw_venue != "Event Location":
                # Sometimes the full address blob ends up in the venue tag.
                # If it contains digits mid-string suggesting a street number, split it.
                name_part, _ = _split_name_from_address(raw_venue)
                venue = name_part if name_part else raw_venue

        # Address fields
        street = soup.find("span", itemprop="streetAddress")
        city = soup.find("span", itemprop="addressLocality")
        state = soup.find("span", itemprop="addressRegion")
        postal = soup.find("span", itemprop="postalCode")

        street_text = street.get_text(strip=True) if street else None
        city_text = city.get_text(strip=True) if city else None
        state_text = state.get_text(strip=True) if state else None
        postal_text = postal.get_text(strip=True) if postal else None

        # Strip venue from start of street_text if it bled in
        if venue and street_text and street_text.startswith(venue):
            street_text = street_text[len(venue) :].strip()

        # If venue still None, try pre-street-address text node fallback
        if not venue:
            address_div = soup.find(
                "div", id=lambda x: x and x.endswith("_ctl04_divAddress")
            )
            if address_div:
                detail_item = address_div.find("div", class_="specificDetailItem")
                if detail_item and street:
                    pre_street_text = ""
                    for node in detail_item.children:
                        if hasattr(node, "get") and node.get("itemprop") == "address":
                            break
                        if hasattr(node, "get_text"):
                            pre_street_text += node.get_text(strip=True)
                        elif isinstance(node, str):
                            pre_street_text += node.strip()
                    pre_street_text = pre_street_text.strip()
                    if pre_street_text:
                        venue = pre_street_text

        # If venue still None, check if street_text itself starts with a place name
        # e.g. "McLaren Lodge501 Stanyan Street" or "City Hall Room 4161 Dr. Carlton..."
        if not venue and street_text:
            name_part, remainder = _split_name_from_address(street_text)
            if name_part:
                venue = name_part
                street_text = remainder

        # Cost
        cost_div = soup.find("div", id=lambda x: x and x.endswith("_costDiv"))
        cost = cost_div.get_text(strip=True) if cost_div else None

        # Description
        desc_tag = soup.find("div", class_="fr-view")
        description = desc_tag.get_text(strip=True) if desc_tag else None
        if cost and description:
            description = f"Cost: {cost}. {description}"

        address_parts = [
            p for p in [street_text, city_text, state_text, postal_text] if p
        ]
        location = ", ".join(address_parts) or None

        return {
            "title": title,
            "datetime": event_datetime,
            "venue": venue,
            "location": location,
            "url": url,
            "description": description,
            "source": "sfrecpark",
        }

    except Exception as e:
        print(f"⚠️  Failed to scrape {url}: {e}")
        return None


async def scrape_sfrecpark() -> List[Dict[str, Any]]:
    urls = await get_sfrecpark_event_urls()
    print(f"🕷️ Starting sfrecpark scrape for {len(urls)} event pages")

    events = []
    async with httpx.AsyncClient(timeout=15.0) as client:
        for url in urls:
            event = await scrape_sfrecpark_event(client, url)
            if event:
                events.append(event)

    print(f"✅ Scraped {len(events)} events from sfrecpark")
    return events
