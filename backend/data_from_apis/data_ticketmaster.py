import os
from typing import List, Optional, Dict, Any
import httpx
from dotenv import load_dotenv

load_dotenv()

TICKETMASTER_API_KEY = os.getenv("TICKETMASTER_API_KEY")
TICKETMASTER_BASE_URL = "https://app.ticketmaster.com"


async def fetch_ticketmaster_events(
    city: Optional[str] = None,
    state_code: Optional[str] = None,
    keyword: Optional[str] = None,
    start_date_time: Optional[str] = None,
    end_date_time: Optional[str] = None,
) -> Dict[str, Any]:
    """Fetch all events from Ticketmaster API with pagination."""
    url = f"https://app.ticketmaster.com/discovery/v2/events.json"

    base_params = {
        "apikey": TICKETMASTER_API_KEY,
        "size": 200
    }

    if city:
        base_params["city"] = city
    if state_code:
        base_params["stateCode"] = state_code
    if keyword:
        base_params["keyword"] = keyword
    if start_date_time:
        base_params["startDateTime"] = start_date_time
    if end_date_time:
        base_params["endDateTime"] = end_date_time

    all_events = []
    page = 0
    total_pages = 1

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            while page < total_pages:
                params = {**base_params, "page": page}
                print(f"Fetching Ticketmaster events - page {page + 1}/{total_pages} with params:", params)
                
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                
                # Update total pages from response
                page_info = data.get("page", {})
                total_pages = page_info.get("totalPages", 1)
                
                # Collect events from this page
                embedded = data.get("_embedded", {})
                events = embedded.get("events", [])
                all_events.extend(events)
                
                print(f"Retrieved {len(events)} events from page {page + 1}. Total so far: {len(all_events)}")
                
                page += 1
            
            # Return response in same format as original
            return {
                "_embedded": {"events": all_events},
                "page": {
                    "size": len(all_events),
                    "totalElements": len(all_events),
                    "totalPages": total_pages,
                    "number": 0
                }
            }
    except httpx.HTTPError as e:
        raise Exception(f"Failed to fetch Ticketmaster events: {str(e)}")


async def fetch_bay_area_ticketmaster_events(
    keyword: Optional[str] = None,
    start_date_time: Optional[str] = None,
    end_date_time: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Fetch San Francisco events from Ticketmaster.
    Returns:
        List of event dictionaries normalized to common format
    """

    bay_area_cities = ["San Francisco", "Oakland", 
                       "San Jose", "Berkeley", "Palo Alto", 
                       "Mountain View", "Campbell", "Sunnyvale",
                       "Santa Clara", "Redwood City", 
                       "San Mateo","San Bruno"]
    events = []
    for city in bay_area_cities:
        response = await fetch_ticketmaster_events(
            city=city,
            state_code="CA",
            keyword=keyword,
            start_date_time=start_date_time,
            end_date_time=end_date_time,
        )

        embedded = response.get("_embedded", {})
        raw_events = embedded.get("events", [])

        print(f"{city}: {len(raw_events)} raw events")

        for event in raw_events:
            normalized_event = normalize_ticketmaster_event(event)
            events.append(normalized_event)

    return events


def normalize_ticketmaster_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a single Ticketmaster event to common format."""
    # Extract venue information
    venues = event.get("_embedded", {}).get("venues", [])
    venue = venues[0].get("name") if venues else None
    if venue and venues:
        venue_info = venues[0]
        city = venue_info.get("city", {}).get("name", "")
        state = venue_info.get("state", {}).get("stateCode", "")
        if city or state:
            venue = f"{venue}, {city}, {state}".strip(", ")
    
    # Extract date information
    dates = event.get("dates", {})
    start = dates.get("start", {})
    date_str = start.get("dateTime") or start.get("localDate")
    
    normalized_event = {
        "title": event.get("name"),
        "date": date_str,
        "venue": venue,
        "url": event.get("url"),
        "description": event.get("info") or event.get("pleaseNote"),
        "source": "Ticketmaster"
    }
    return normalized_event


