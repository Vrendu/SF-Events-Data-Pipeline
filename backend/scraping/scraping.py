"""Web scraping module for San Francisco events using BeautifulSoup."""
# Scraping Sources 

# City & public

# https://sfrecpark.org/calendar

# https://sfpl.org/events

# https://sf.gov/events

# Universities

# https://events.berkeley.edu

# https://events.stanford.edu

# https://calendar.ucsf.edu

# Museums & culture

# https://www.sfmoma.org/events/

# https://www.exploratorium.edu/visit/calendar

# https://asianart.org/calendar

# Indie venues

# https://theindependentsf.com/events

# https://rickshawstop.com/calendar

# https://gamh.com/calendar


# # Other Sources

# Ticketmaster API


from typing import List, Optional, Dict, Any
import httpx
from bs4 import BeautifulSoup
import re

