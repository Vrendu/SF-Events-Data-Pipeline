import asyncio
import os
import re
from contextlib import asynccontextmanager
from typing import Any, List, Literal, Optional
from datetime import datetime, timedelta

import asyncpg
from data_from_apis.categories import determine_categories
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from lxml import html
from pydantic import BaseModel

from data_from_apis.data_ticketmaster import (
    fetch_bay_area_ticketmaster_events,
    fetch_ticketmaster_events,
)

from scraping.scraping_main import (
    scrape_events_from_warfield,
    scrape_events_from_funcheap,
    scrape_events_from_dothebay,
)
from data_from_apis.data_resident_advisor import scrape_from_resident_advisor
from scraping.scraping_city_and_public import scrape_sfrecpark

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# In-memory cache for geocoded locations to avoid redundant API calls
_geocode_cache: dict = {}

# Connection pool for query endpoints (created on startup).
db_pool: Optional[asyncpg.Pool] = None


# At the top, add a helper
def _get_connect_kwargs() -> dict:
    """Add SSL for Neon/remote connections, skip for local."""
    url = DATABASE_URL or ""
    if "neon.tech" in url or "sslmode=require" in url:
        return {"ssl": "require"}
    return {}


@asynccontextmanager
async def db_connection():
    """
    Yields an asyncpg connection from the pool when available; otherwise,
    falls back to a one-off connection.
    """
    global db_pool

    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL must be set in environment or .env file")

    if db_pool is not None:
        async with db_pool.acquire() as conn:
            yield conn
        return

    conn = await asyncpg.connect(DATABASE_URL, **_get_connect_kwargs())
    try:
        yield conn
    finally:
        await conn.close()


async def geocode_location(location: str) -> Optional[str]:
    """
    Given a location string, return a 'lat,long' string using
    OpenStreetMap Nominatim (free, no API key required).
    Returns None if the location cannot be resolved.
    """
    if not location or not location.strip():
        return None

    cache_key = location.strip().lower()
    if cache_key in _geocode_cache:
        return _geocode_cache[cache_key]

    # Nominatim's ToS requires max 1 request/second
    await asyncio.sleep(1.1)

    try:
        print(f"📍 Geolocating: {location}")
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": location, "format": "json", "limit": 1},
                headers={"User-Agent": "EventsScraperApp/1.0"},
            )
            response.raise_for_status()
            results = response.json()

        if results:
            lat = results[0]["lat"]
            lon = results[0]["lon"]
            latlong = f"{lat},{lon}"
            _geocode_cache[cache_key] = latlong
            return latlong

    except Exception as e:
        print(f"⚠️  Geocoding failed for '{location}': {e}")

    _geocode_cache[cache_key] = None
    return None


app = FastAPI(title="Events Scraper API", version="1.0.0")


class ScrapeRequest(BaseModel):
    url: Optional[str] = None
    source: Optional[str] = None


class Event(BaseModel):
    id: Optional[int] = None
    title: str
    datetime: Optional[str] = None
    venue: Optional[str] = None
    location: Optional[str] = None
    latlong: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    categories: Optional[List[str]] = None
    source: Optional[str] = None


class EventOut(BaseModel):
    """
    Response shape tailored for the existing frontend components.

    The DB uses `datetime` and `categories`, but the UI expects:
    - `date` (string) and `category` (string)
    - `name` as a fallback for `title`
    """

    id: int
    title: str
    name: Optional[str] = None
    datetime: Optional[str] = None
    date: Optional[str] = None
    venue: Optional[str] = None
    location: Optional[str] = None
    latlong: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    categories: Optional[List[str]] = None
    category: Optional[str] = None
    source: Optional[str] = None


_ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _validate_iso_date(value: str, param_name: str) -> str:
    if not _ISO_DATE_RE.fullmatch(value):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid `{param_name}`. Expected YYYY-MM-DD.",
        )
    return value


def _event_row_to_out(row: Any) -> dict:
    categories = row.get("categories")
    category = categories[0] if categories else None
    datetime_value = row.get("datetime")

    # Frontend expects `name`, `date`, and `category`.
    return {
        "id": row.get("id"),
        "title": row.get("title"),
        "name": row.get("title"),
        "datetime": datetime_value,
        "date": datetime_value,
        "venue": row.get("venue"),
        "location": row.get("location"),
        "latlong": row.get("latlong"),
        "url": row.get("url"),
        "description": row.get("description"),
        "categories": categories,
        "category": category,
        "source": row.get("source"),
    }


async def init_db():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL must be set in environment or .env file")

    try:
        conn = await asyncpg.connect(DATABASE_URL, **_get_connect_kwargs())
    except asyncpg.exceptions.InvalidCatalogNameError as e:
        # Extract database name from error or DATABASE_URL
        import re

        db_match = re.search(r'database "([^"]+)"', str(e))
        db_name = db_match.group(1) if db_match else "unknown"
        raise RuntimeError(
            f'Database "{db_name}" does not exist. '
            f"Please create it first:\n"
            f'  psql postgres -c "CREATE DATABASE \\"{db_name}\\";"\n'
            f"Or run: ./create_database.sh"
        ) from e
    except Exception as e:
        raise RuntimeError(
            f"Failed to connect to database: {str(e)}\n"
            f"Make sure PostgreSQL is running and DATABASE_URL is correct."
        ) from e

    try:
        # First, create the table
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS events (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                datetime TEXT,
                venue TEXT,
                location TEXT,
                latlong TEXT,
                url TEXT,
                description TEXT,
                categories TEXT[],
                source TEXT             
            )
            """
        )

        # Add datetime column if it doesn't exist (for migration from old schema)
        await conn.execute(
            """
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='events' AND column_name='datetime'
                ) THEN
                    ALTER TABLE events ADD COLUMN datetime TEXT;
                END IF;
            END $$;
            """
        )

        # Create the unique indexes
        await conn.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_events_title ON events (title, datetime, venue);
             """
        )
    finally:
        await conn.close()


@app.on_event("startup")
async def startup_event():
    await init_db()
    global db_pool
    # Small pool: most requests are read-heavy and short-lived.
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10)


@app.on_event("shutdown")
async def shutdown_event():
    global db_pool
    if db_pool is not None:
        await db_pool.close()
        db_pool = None


async def populate_database(events: List[dict]):
    conn = await asyncpg.connect(DATABASE_URL, **_get_connect_kwargs())
    inserted_count = 0
    skipped_count = 0
    geocode_count = 0
    source_names = sorted(
        source
        for source in {event.get("source") for event in events}
        if isinstance(source, str) and source
    )

    try:
        print(
            f"💾 Populating database with {len(events)} events"
            f" from {', '.join(source_names) if source_names else 'unknown sources'}"
        )
        for event in events:
            try:
                # Geocode if latlong is missing but location is available
                if not event.get("latlong") and event.get("location"):
                    geocode_count += 1
                    event["latlong"] = await geocode_location(event["location"])

                categories = determine_categories(
                    event.get("title"),
                    event.get("description"),
                    event.get("venue"),
                    event.get("categories"),
                )
                # i want each category to be all lowercase 
                categories = [category.lower() for category in categories]
                row = await conn.fetchrow(
                    """
                    INSERT INTO events (title, datetime, venue, location, latlong, url, description, categories, source)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (title, datetime, venue) 
                    DO UPDATE SET
                        categories = EXCLUDED.categories || events.categories,
                        latlong = COALESCE(events.latlong, EXCLUDED.latlong)
                    RETURNING (xmax = 0) AS inserted
                    """,
                    event.get("title"),
                    event.get("datetime"),
                    event.get("venue"),
                    event.get("location"),
                    event.get("latlong"),
                    event.get("url"),
                    event.get("description"),
                    categories,
                    event.get("source"),
                )
                if row["inserted"]:
                    inserted_count += 1
                else:
                    skipped_count += 1

            except Exception as e:
                continue

        print(
            f"\n📊 Database summary: {inserted_count} inserted, {skipped_count} duplicates skipped, {geocode_count} geocoded"
        )
    finally:
        await conn.close()


@app.post("/scrape_events_warfield", response_model=List[Event])
async def scrape_events_warfield():
    response = await scrape_events_from_warfield()
    await populate_database(response)
    return response


@app.post("/scrape_events_funcheap", response_model=List[Event])
async def scrape_events_funcheap():
    response = await scrape_events_from_funcheap()
    # await populate_database(response)
    return response


@app.post("/scrape_events_dothebay", response_model=List[Event])
async def scrape_events_dothebay():
    response = await scrape_events_from_dothebay()
    await populate_database(response)
    return response


@app.post("/scrape_events_sfrecpark", response_model=List[Event])
async def scrape_events_sfrecpark():
    response = await scrape_sfrecpark()
    await populate_database(response)
    return response


@app.post("/scrape_events_resident_advisor", response_model=List[Event])
async def scrape_events_resident_advisor():
    response = await scrape_from_resident_advisor()
    await populate_database(response)
    return response


@app.post("/ticketmaster")
async def get_ticketmaster_events(
    keyword: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    if start_date is None:
        start_date = (datetime.now()).strftime("%Y-%m-%dT00:00:00Z")
    if end_date is None:
        end_date = (datetime.now() + timedelta(days=120)).strftime("%Y-%m-%dT23:59:59Z")

    try:
        events = await fetch_bay_area_ticketmaster_events(
            keyword=keyword,
            start_date_time=start_date,
            end_date_time=end_date,
        )
        await populate_database(events)
        return {
            "count": len(events),
            "events": events,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch Ticketmaster events: {str(e)}"
        )


@app.get("/events", response_model=List[EventOut])
async def list_events(
    # UI uses `on_date` for "today events".
    on_date: Optional[str] = Query(default=None, description="Filter by date (YYYY-MM-DD)"),
    source: Optional[str] = Query(default=None, description="Filter by exact source"),
    keyword: Optional[str] = Query(default=None, description="Search in title/venue/location/description/url"),
    category: Optional[str] = Query(default=None, description="Filter by category (exact match within categories[])"),
    venue: Optional[str] = Query(default=None, description="Filter by venue (case-insensitive substring)"),
    start_date: Optional[str] = Query(default=None, description="Filter start (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(default=None, description="Filter end (YYYY-MM-DD)"),
    limit: int = Query(default=100, ge=1, le=1000, description="Max events to return"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
    sort: str = Query(
        default="datetime_desc",
        description="Sort: datetime_desc | datetime_asc | title_asc | title_desc",
    ),
):
    if on_date is not None:
        on_date = _validate_iso_date(on_date, "on_date")
    if start_date is not None:
        start_date = _validate_iso_date(start_date, "start_date")
    if end_date is not None:
        end_date = _validate_iso_date(end_date, "end_date")

    allowed_sorts = {
        "datetime_desc": "datetime DESC NULLS LAST",
        "datetime_asc": "datetime ASC NULLS LAST",
        "title_asc": "title ASC NULLS LAST",
        "title_desc": "title DESC NULLS LAST",
    }
    if sort not in allowed_sorts:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid `sort`. Allowed: {', '.join(sorted(allowed_sorts.keys()))}",
        )

    where_clauses: List[str] = []
    args: List[Any] = []

    def add_arg(condition_template: str, value: Any) -> None:
        # condition_template must contain exactly one `{param}` placeholder.
        param_idx = len(args) + 1
        where_clauses.append(condition_template.format(param=f"${param_idx}"))
        args.append(value)

    # Filters
    if on_date is not None:
        # datetime is stored as TEXT; prefix-matching the ISO date works across
        # multiple timezone formats (e.g. 2026-05-15T... and 2026-05-15 ...).
        add_arg("(datetime IS NOT NULL AND LEFT(datetime, 10) = {param})", on_date)

    if start_date is not None:
        add_arg("(datetime IS NOT NULL AND LEFT(datetime, 10) >= {param})", start_date)
    if end_date is not None:
        add_arg("(datetime IS NOT NULL AND LEFT(datetime, 10) <= {param})", end_date)

    if source is not None:
        add_arg("source = {param}", source)

    if venue is not None:
        add_arg("(venue ILIKE {param})", f"%{venue}%")

    if keyword is not None:
        kw = f"%{keyword}%"
        where_clauses.append(
            "("
            "title ILIKE {param} OR "
            "venue ILIKE {param} OR "
            "location ILIKE {param} OR "
            "description ILIKE {param} OR "
            "url ILIKE {param}"
            ")".format(param="{param}")
        )
        # Replace the `{param}` placeholder used above with the correct positional $N.
        param_idx = len(args) + 1
        where_clauses[-1] = where_clauses[-1].format(param=f"${param_idx}")
        args.append(kw)

    if category is not None:
        # `categories` is a TEXT[] column.
        add_arg("{param} = ANY(categories)", category)

    where_sql = " AND ".join(where_clauses) if where_clauses else "TRUE"

    order_by_sql = allowed_sorts[sort]

    select_columns = """
        id,
        title,
        datetime,
        venue,
        location,
        latlong,
        url,
        description,
        categories,
        source
    """

    base_from = f"FROM events WHERE {where_sql}"

    async with db_connection() as conn:
        total_query = f"SELECT COUNT(*) {base_from}"
        total_count = await conn.fetchval(total_query, *args)

        limit_param = len(args) + 1
        offset_param = len(args) + 2
        events_query = (
            f"SELECT {select_columns} {base_from} "
            f"ORDER BY {order_by_sql} "
            f"LIMIT ${limit_param} OFFSET ${offset_param}"
        )
        rows = await conn.fetch(events_query, *args, limit, offset)

    # Note: frontend currently only consumes the array (no metadata).
    # Still, the query is built in a way that lets us easily add metadata later.
    _ = total_count
    return [_event_row_to_out(r) for r in rows]


# Frontend compatibility: React calls `/api/events` (CRA proxy forwards paths as-is).
@app.get("/api/events", response_model=List[EventOut], include_in_schema=False)
async def list_events_api(
    on_date: Optional[str] = Query(default=None, description="Filter by date (YYYY-MM-DD)"),
    source: Optional[str] = Query(default=None, description="Filter by exact source"),
    keyword: Optional[str] = Query(default=None, description="Search in title/venue/location/description/url"),
    category: Optional[str] = Query(default=None, description="Filter by category (exact match within categories[])"),
    venue: Optional[str] = Query(default=None, description="Filter by venue (case-insensitive substring)"),
    start_date: Optional[str] = Query(default=None, description="Filter start (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(default=None, description="Filter end (YYYY-MM-DD)"),
    limit: int = Query(default=100, ge=1, le=1000, description="Max events to return"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
    sort: str = Query(
        default="datetime_desc",
        description="Sort: datetime_desc | datetime_asc | title_asc | title_desc",
    ),
):
    return await list_events(
        on_date=on_date,
        source=source,
        keyword=keyword,
        category=category,
        venue=venue,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
        sort=sort,
    )


@app.get("/events/{event_id}", response_model=EventOut)
async def get_event(event_id: int):
    async with db_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT
                id, title, datetime, venue, location, latlong, url, description, categories, source
            FROM events
            WHERE id = $1
            """,
            event_id,
        )

    if row is None:
        raise HTTPException(status_code=404, detail="Event not found")

    return _event_row_to_out(row)


@app.get("/api/events/{event_id}", response_model=EventOut, include_in_schema=False)
async def get_event_api(event_id: int):
    return await get_event(event_id)


@app.get("/health")
async def health_check():
    """Health check endpoint to verify database connectivity."""
    try:
        async with db_connection() as conn:
            await conn.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(
            status_code=503, detail=f"Database connection failed: {str(e)}"
        )
