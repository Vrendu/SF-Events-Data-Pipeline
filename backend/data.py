"""Ticketmaster API client for fetching events."""

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
    """
    Fetch events from Ticketmaster Discovery API.
    
    Args:
        size: Number of events to return (default 20, max 200)
        city: City name to filter events
        state_code: State code (e.g., 'CA' for California)
        keyword: Keyword to search for in event titles
        start_date_time: Start date/time in ISO 8601 format (e.g., '2024-01-01T00:00:00Z')
        end_date_time: End date/time in ISO 8601 format
        
    Returns:
        JSON response from Ticketmaster API containing events data
        
    Raises:
        Exception: If API request fails
    """
    url = f"{TICKETMASTER_BASE_URL}/discovery/v2/events.json"
    
    params = {
        "apikey": TICKETMASTER_API_KEY,
        # "size": min(size, 200),  # Cap at 200
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


if __name__ == "__main__":
    import asyncio
    
    async def main():
        print("Fetching San Francisco events from Ticketmaster...\n")
        try:
            events = await fetch_sf_ticketmaster_events()
            print(f"Found {len(events)} events:\n")
            
            for i, event in enumerate(events, 1):
                print(f"{i}. {event.get('title', 'No title')}")
                print(f"   Date: {event.get('date', 'TBD')}")
                print(f"   Location: {event.get('location', 'TBD')}")
                print(f"   URL: {event.get('url', 'N/A')}")
                print()
        except Exception as e:
            print(f"Error: {e}")
    
    asyncio.run(main())
