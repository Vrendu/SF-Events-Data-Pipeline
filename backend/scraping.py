"""Web scraping module for San Francisco events using BeautifulSoup."""

from typing import List, Optional, Dict, Any
import httpx
from bs4 import BeautifulSoup
import re


async def scrape_sf_events(url: str, source: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Scrape events from a URL, focusing on San Francisco events.
    
    Args:
        url: The URL to scrape
        source: Optional source name for the events
        
    Returns:
        List of event dictionaries with title, date, location, etc.
    """
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            # Set a user agent to avoid being blocked
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            }
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            html_content = response.text
    except httpx.HTTPError as e:
        raise Exception(f"Failed to fetch URL: {str(e)}")
    
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Try different scraping strategies
    events = []
    
    # Strategy 1: Schema.org Event markup
    events.extend(_scrape_schema_org_events(soup, url, source))
    
    # Strategy 2: Common event patterns
    if not events:
        events.extend(_scrape_generic_events(soup, url, source))
    
    # Filter for San Francisco events
    sf_events = _filter_sf_events(events)
    
    return sf_events


def _scrape_schema_org_events(soup: BeautifulSoup, page_url: str, source: Optional[str]) -> List[Dict[str, Any]]:
    """Scrape events using Schema.org markup."""
    events = []
    
    # Find all Schema.org Event items
    event_items = soup.find_all(attrs={"itemtype": re.compile(r".*Event", re.I)})
    
    for item in event_items:
        event = {}
        
        # Extract title
        title_elem = item.find(attrs={"itemprop": "name"}) or item.find("h1") or item.find("h2") or item.find("h3")
        event["title"] = _clean_text(title_elem) if title_elem else None
        
        # Extract date
        date_elem = item.find(attrs={"itemprop": "startDate"}) or item.find("time")
        if date_elem:
            event["date"] = date_elem.get("datetime") or _clean_text(date_elem)
        else:
            event["date"] = None
        
        # Extract location
        location_elem = item.find(attrs={"itemprop": "location"})
        if location_elem:
            # Try to get address or name
            address = location_elem.find(attrs={"itemprop": "address"})
            name = location_elem.find(attrs={"itemprop": "name"})
            if address:
                event["location"] = _clean_text(address)
            elif name:
                event["location"] = _clean_text(name)
            else:
                event["location"] = _clean_text(location_elem)
        else:
            # Look for location in class names
            location_elem = item.find(class_=re.compile(r"location|venue|place", re.I))
            event["location"] = _clean_text(location_elem) if location_elem else None
        
        # Extract description
        desc_elem = item.find(attrs={"itemprop": "description"}) or item.find("p")
        event["description"] = _clean_text(desc_elem) if desc_elem else None
        
        # Extract URL
        url_elem = item.find("a", href=True) or item.find(attrs={"itemprop": "url"})
        event["url"] = url_elem.get("href") if url_elem else page_url
        
        if event["title"]:
            event["source"] = source or page_url
            events.append(event)
    
    return events


def _scrape_generic_events(soup: BeautifulSoup, page_url: str, source: Optional[str]) -> List[Dict[str, Any]]:
    """Scrape events using generic HTML patterns."""
    events = []
    
    # Look for common event container patterns
    event_containers = (
        soup.find_all(class_=re.compile(r"event", re.I)) +
        soup.find_all(id=re.compile(r"event", re.I)) +
        soup.find_all("article") +
        soup.find_all("div", class_=re.compile(r"card|item|listing", re.I))
    )
    
    for container in event_containers:
        event = {}
        
        # Extract title (usually in h1-h4 or strong tags)
        title_elem = (
            container.find("h1") or
            container.find("h2") or
            container.find("h3") or
            container.find("h4") or
            container.find("strong") or
            container.find("a", class_=re.compile(r"title|name", re.I))
        )
        event["title"] = _clean_text(title_elem) if title_elem else None
        
        # Extract date
        date_elem = (
            container.find("time") or
            container.find(class_=re.compile(r"date", re.I)) or
            container.find(attrs={"datetime": True})
        )
        if date_elem:
            event["date"] = date_elem.get("datetime") or _clean_text(date_elem)
        else:
            event["date"] = None
        
        # Extract location
        location_elem = (
            container.find(class_=re.compile(r"location|venue|place|address", re.I)) or
            container.find(attrs={"data-location": True})
        )
        event["location"] = _clean_text(location_elem) if location_elem else None
        
        # Extract description
        desc_elem = container.find("p") or container.find(class_=re.compile(r"description|summary", re.I))
        event["description"] = _clean_text(desc_elem) if desc_elem else None
        
        # Extract URL
        url_elem = container.find("a", href=True)
        if url_elem:
            href = url_elem.get("href")
            # Make absolute URL if relative
            if href and not href.startswith("http"):
                from urllib.parse import urljoin
                href = urljoin(page_url, href)
            event["url"] = href
        else:
            event["url"] = page_url
        
        if event["title"]:
            event["source"] = source or page_url
            events.append(event)
    
    return events


def _filter_sf_events(events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Filter events to only include San Francisco locations.
    
    Looks for SF-related keywords in location field.
    """
    sf_keywords = [
        "san francisco", "sf", "sf bay", "bay area",
        "mission", "soma", "north beach", "castro", "haight",
        "pacific heights", "marina", "russian hill", "nob hill",
        "financial district", "union square", "chinatown",
        "golden gate", "presidio", "fisherman's wharf"
    ]
    
    filtered = []
    for event in events:
        location = (event.get("location") or "").lower()
        title = (event.get("title") or "").lower()
        
        # Check if location or title contains SF keywords
        if any(keyword in location or keyword in title for keyword in sf_keywords):
            filtered.append(event)
        # If no location specified but title suggests SF event, include it
        elif not event.get("location") and any(keyword in title for keyword in sf_keywords):
            filtered.append(event)
        # If location is empty/null, include it (might be SF)
        elif not event.get("location"):
            filtered.append(event)
    
    return filtered


def _clean_text(element) -> Optional[str]:
    """Extract and clean text from a BeautifulSoup element."""
    if element is None:
        return None
    
    # Get text and clean it
    text = element.get_text(separator=" ", strip=True)
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip() if text else None


# Common SF event websites to scrape
SF_EVENT_SOURCES = [
    {
        "url": "https://www.eventbrite.com/d/united-states--san-francisco/events/",
        "source": "Eventbrite SF"
    },
    {
        "url": "https://www.meetup.com/find/events/?location=us--ca--San-Francisco",
        "source": "Meetup SF"
    },
    {
        "url": "https://www.sfstation.com/events",
        "source": "SF Station"
    },
]


async def scrape_multiple_sf_sources() -> List[Dict[str, Any]]:
    """
    Scrape events from multiple San Francisco event sources.
    
    Returns:
        Combined list of events from all sources
    """
    all_events = []
    
    for source_info in SF_EVENT_SOURCES:
        try:
            events = await scrape_sf_events(source_info["url"], source_info["source"])
            all_events.extend(events)
        except Exception as e:
            print(f"Error scraping {source_info['source']}: {e}")
            continue
    
    # Deduplicate by title and date
    seen = set()
    unique_events = []
    for event in all_events:
        key = (event.get("title"), event.get("date"))
        if key not in seen and key[0]:  # Only add if title exists
            seen.add(key)
            unique_events.append(event)
    
    return unique_events


async def test_scraping() -> List[Dict[str, Any]]:
    """Run a quick scrape against Eventbrite SF and return the events."""
    test_url = "https://www.eventbrite.com/d/united-states--san-francisco/events/"

    try:
        events = await scrape_sf_events(test_url, "Eventbrite SF")
        return events
    except Exception as e:
        raise Exception(
            "Failed to fetch Eventbrite SF events. Some sites may block automated scraping."
        ) from e


# Example usage
if __name__ == "__main__":
    import asyncio

    # Manual test runner that prints a small summary to stdout
    results = asyncio.run(test_scraping())
    print(f"Found {len(results)} San Francisco events:\n")
    for i, event in enumerate(results[:20], 1):
        print(f"{i}. {event.get('title', 'No title')}")
        print(f"   Date: {event.get('date', 'TBD')}")
        print(f"   Location: {event.get('location', 'TBD')}")
        print(f"   URL: {event.get('url', 'N/A')}")
        print()
