#using DICE to get event data 

from datetime import datetime, timedelta
import httpx
from dotenv import load_dotenv
import os
load_dotenv()
DICE_API_KEY = os.getenv("DICE_API_KEY")
DICE_BASE_URL = "https://partners-endpoint.dice.fm/graphql"

async def fetch_dice_events(city: str, state_code: str, start_date_time: str, end_date_time: str):
    query = """
    query GetEvents($city: String!, $stateCode: String!, $startDateTime: DateTime!, $endDateTime: DateTime!) {
      events(
        filter: {
          city: $city,
          stateCode: $stateCode,
          startDateTime: { gte: $startDateTime },
          endDateTime: { lte: $endDateTime }
        }
      ) {
        id
        name
        description
        url
        startDateTime
        endDateTime
        venue {
          name
          city
          stateCode
          latitude
          longitude
        }
        categories {
          segment {
            name
          }
        }
      }
    }
    """
    variables = {
        "city": city,
        "stateCode": state_code,
        "startDateTime": start_date_time,
        "endDateTime": end_date_time
    }