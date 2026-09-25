import requests
from typing import List
from datetime import datetime, timedelta


async def scrape_from_resident_advisor() -> List[dict]:
    url = "https://ra.co/graphql"
    print("🕷️ Starting Resident Advisor scrape")
    today = datetime.now().strftime("%Y-%m-%d")
    three_month = (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")

    headers = {
        "Content-Type": "application/json",
        "Referer": "https://ra.co/events/us/sanfrancisco",
        "Origin": "https://ra.co",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "ra-content-language": "en",
        "X-Requested-With": "XMLHttpRequest",
    }

    all_listings = []
    page = 1

    while True:
        payload = {
            "query": """
            query GET_EVENT_LISTINGS($filters: FilterInputDtoInput, $pageSize: Int, $page: Int) {
              eventListings(filters: $filters, pageSize: $pageSize, page: $page) {
                data {
                  id
                  event {
                    title
                    date
                    startTime
                    contentUrl
                    images {
                      filename
                      alt
                      type
                    }
                    genres {
                      name
                    }
                    venue {
                      name
                      address
                      location {
                        latitude
                        longitude
                      }
                    }
                  }
                }
                totalResults
              }
            }""",
            "variables": {
                "filters": {
                    "areas": {"eq": 218},
                    "listingDate": {"gte": today, "lte": three_month},
                },
                "pageSize": 100,
                "page": page,
            },
        }

        response = requests.post(url, json=payload, headers=headers, timeout=20)

        if not response.text:
            raise ValueError("Empty response from RA")

        data = response.json()

        if "errors" in data:
            raise ValueError(f"GraphQL errors: {data['errors']}")

        listings = data["data"]["eventListings"]["data"]
        total = data["data"]["eventListings"]["totalResults"]
        all_listings.extend(listings)

        if len(all_listings) >= total or len(listings) == 0:
            break

        page += 1

    print(f"✅ Scraped {len(all_listings)} events from Resident Advisor")

    return [_to_event(l["event"]) for l in all_listings]


def _extract_images(event: dict) -> List[dict]:
    """Return images in the same [{url, ...}] shape as other sources, front flyer first."""
    images = event.get("images") or []
    sorted_images = sorted(images, key=lambda img: img.get("type") != "FLYERFRONT")
    return [
        {"url": img["filename"], "type": img.get("type"), "alt": img.get("alt")}
        for img in sorted_images
        if img.get("filename")
    ]


def _to_event(event: dict) -> dict:
    venue = event.get("venue") or {}
    location = venue.get("location") or {}

    latlong = None
    if location.get("latitude") is not None and location.get("longitude") is not None:
        latlong = f"{location['latitude']},{location['longitude']}"

    return {
        "title": event["title"],
        "datetime": event.get("startTime") or event.get("date"),
        "venue": venue.get("name"),
        "location": venue.get("address"),
        "latlong": latlong,
        "url": (
            f"https://ra.co{event['contentUrl']}" if event.get("contentUrl") else None
        ),
        "description": None,
        "images": _extract_images(event),
        "categories": ["Nightlife", "Music", "Concerts", "Live Music"]
        + [g["name"] for g in event.get("genres") or []],
        "source": "resident_advisor",
    }
