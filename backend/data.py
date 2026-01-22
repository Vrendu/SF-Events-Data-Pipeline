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
    
    url = "https://app.ticketmaster.com/discovery/v2/events.json?apikey=OGEc060IJneRcI1wTBj5lnOXzPi56EaX"

    params = {
        "apikey": TICKETMASTER_API_KEY,
        'size': 100
    }

    if city:
        params["city"] = city
    if state_code:
        params["stateCode"] = state_code
    if keyword:
        params["keyword"] = keyword
    if start_date_time:
        params["startDateTime"] = start_date_time
    if end_date_time:
        params["endDateTime"] = end_date_time
    print("Fetching Ticketmaster events with params:", params)
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise Exception(f"Failed to fetch Ticketmaster events: {str(e)}")
    



async def fetch_sf_ticketmaster_events(
    keyword: Optional[str] = None,
    start_date_time: Optional[str] = None,
    end_date_time: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Fetch San Francisco events from Ticketmaster.
    
    Args:
        keyword: Optional keyword to search for
        start_date_time: Optional start date/time filter
        end_date_time: Optional end date/time filter
        
    Returns:
        List of event dictionaries normalized to common format
    """
    print("start_date_time:", start_date_time)
    print("end_date_time:", end_date_time)
    response = await fetch_ticketmaster_events(
        
        city="San Francisco",
        state_code="CA",
        keyword=keyword,
        start_date_time=start_date_time,
        end_date_time=end_date_time,
    )
    
    # Normalize to common event format
    events = []
    embedded = response.get("_embedded", {})
    raw_events = embedded.get("events", [])
    
    for event in raw_events:
        # Extract venue information
        venues = event.get("_embedded", {}).get("venues", [])
        location = venues[0].get("name") if venues else None
        if location and venues:
            venue = venues[0]
            city = venue.get("city", {}).get("name", "")
            state = venue.get("state", {}).get("stateCode", "")
            if city or state:
                location = f"{location}, {city}, {state}".strip(", ")
        
        # Extract date information
        dates = event.get("dates", {})
        start = dates.get("start", {})
        date_str = start.get("dateTime") or start.get("localDate")
        
        normalized_event = {
            "title": event.get("name"),
            "date": date_str,
            "location": location,
            "url": event.get("url"),
            "description": event.get("info") or event.get("pleaseNote"),
            "source": "Ticketmaster",
            # "raw_data": event,  # Keep original data for reference
        }
        events.append(normalized_event)
    
    return events


async def test_ticketmaster_api() -> List[Dict[str, Any]]:
    """Test the Ticketmaster API by fetching a small set of SF events."""
    try:
        events = await fetch_sf_ticketmaster_events()
        return events
    except Exception as e:
        raise Exception(f"Ticketmaster API test failed: {str(e)}")
