import requests
from typing import List
from datetime import datetime, timedelta


async def scrape_from_resident_advisor() -> List[dict]:
    url = "https://ra.co/graphql"
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

        response = requests.post(url, json=payload, headers=headers)

        if not response.text:
            raise ValueError("Empty response from RA")

        data = response.json()

        if "errors" in data:
            raise ValueError(f"GraphQL errors: {data['errors']}")

        listings = data["data"]["eventListings"]["data"]
        total = data["data"]["eventListings"]["totalResults"]
        all_listings.extend(listings)

        print(
            f"Page {page}: fetched {len(listings)} events (total so far: {len(all_listings)} / {total})"
        )

        if len(all_listings) >= total or len(listings) == 0:
            break

        page += 1

    print(f"✅ Total retrieved: {len(all_listings)} events from Resident Advisor")

    return [
        {
            "title": l["event"]["title"],
            "datetime": l["event"].get("startTime") or l["event"].get("date"),
            "venue": l["event"]["venue"]["name"] if l["event"].get("venue") else None,
            "location": (
                l["event"]["venue"].get("address") if l["event"].get("venue") else None
            ),
            "latlong": (
                f"{l['event']['venue']['location']['latitude']},{l['event']['venue']['location']['longitude']}"
                if l["event"].get("venue") and l["event"]["venue"].get("location")
                else None
            ),
            "url": (
                f"https://ra.co{l['event']['contentUrl']}"
                if l["event"].get("contentUrl")
                else None
            ),
            "description": None,
            "categories": [g["name"] for g in l["event"].get("genres") or []],
            "source": "resident_advisor",
        }
        for l in all_listings
    ]
