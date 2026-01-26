from bs4 import BeautifulSoup
import requests
import re
from typing import List


async def scrape_events_from_warfield(url: str) -> List[dict]:
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

        cleaned_time = re.sub(r"\s+", " ", raw_time).strip() if raw_time else None

        events.append(
            {
                "title": raw_title,
                "date": raw_date,
                "time": raw_time,
                "venue": venue,
                "location": location,
                "url": url,
                "source": "thewarfieldtheatre.com",
            }
        )

       
    return events

async def scrape_events_from_funcheap(url: str) -> List[dict]:
    url = "https://www.funcheap.com/san-francisco/"
    response = requests.get(url, timeout=15)
    soup = BeautifulSoup(response.content, "html.parser")

    events = []

    return events

async def scrape_events_from_dothebay(url: str) -> List[dict]:
    url = "https://www.dothebay.com/events/"
    response = requests.get(url, timeout=15)
    soup = BeautifulSoup(response.content, "html.parser")

    events = []

    return events
