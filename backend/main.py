import os
from typing import List, Optional
from datetime import datetime, timedelta

import asyncpg
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from lxml import html
from pydantic import BaseModel

from data_from_apis.data_ticketmaster import fetch_bay_area_ticketmaster_events
from scraping.scraping_venues import scrape_events_from_warfield
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI(title="Events Scraper API", version="1.0.0")


class ScrapeRequest(BaseModel):
    url: Optional[str] = None
    source: Optional[str] = None


class Event(BaseModel):
    id: Optional[int]
    title: str
    date: Optional[str] = None
    time: Optional[str] = None
    venue: Optional[str] = None
    location: Optional[str] = None
    latlong: Optional[str] = None
    url: Optional[str] = None
    images: Optional[List[str]] = None
    description: Optional[str] = None
    source: Optional[List[str]] = None



async def init_db():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL must be set in environment or .env file")
    
    try:
        conn = await asyncpg.connect(DATABASE_URL)
    except asyncpg.exceptions.InvalidCatalogNameError as e:
        # Extract database name from error or DATABASE_URL
        import re
        db_match = re.search(r'database "([^"]+)"', str(e))
        db_name = db_match.group(1) if db_match else "unknown"
        raise RuntimeError(
            f'Database "{db_name}" does not exist. '
            f'Please create it first:\n'
            f'  psql postgres -c "CREATE DATABASE \\"{db_name}\\";"\n'
            f'Or run: ./create_database.sh'
        ) from e
    except Exception as e:
        raise RuntimeError(
            f"Failed to connect to database: {str(e)}\n"
            f"Make sure PostgreSQL is running and DATABASE_URL is correct."
        ) from e
    
    try:
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS events (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                date TEXT,
                time TEXT,
                venue TEXT,
                location TEXT,
                latlong TEXT,
                url TEXT,
                description TEXT,
                source TEXT[]             
            )
            """
        )
        await conn.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_events_title ON events (title, date, time, venue);
            """
        )
    finally:
        await conn.close()


@app.on_event("startup")
async def startup_event():
    await init_db()


@app.post("/scrape_events")
async def scrape_events(request: ScrapeRequest):
    response = await scrape_events_from_warfield(request.url)
    await populate_database(response)
    return response

async def populate_database(events: List[dict]):
    conn = await asyncpg.connect(DATABASE_URL)
    inserted_count = 0
    skipped_count = 0
    
    try:
        for event in events:
            try:
                # Insert event into database, or append source if duplicate exists
                source_value = event.get("source")
                source_array = [source_value] if source_value else []
                
                result = await conn.execute(
                    """
                    INSERT INTO events (title, date, time, venue, location, latlong, url, description, source)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (title, date, time, venue) 
                    DO UPDATE SET source = array_append(events.source, $10)
                    WHERE NOT ($10 = ANY(events.source))
                    """,
                    event.get("title"),
                    event.get("date"),
                    event.get("time"),
                    event.get("venue"),
                    event.get("location"),
                    event.get("latlong"),
                    event.get("url"),
                    event.get("description"),
                    source_array,
                    source_value,
                )
                # Check if row was actually inserted
                if result == "INSERT 0 1":
                    inserted_count += 1
                    print(f"✓ Inserted: {event.get('title')}")
                else:
                    skipped_count += 1
                    print(f"○ Updated duplicate with new source: {event.get('source')}")
                
            except Exception as e:
                print(f"✗ Error inserting event '{event.get('title')}': {str(e)}")
                continue
        
        print(f"\n📊 Database summary: {inserted_count} inserted, {skipped_count} duplicates skipped")
    finally:
        await conn.close()

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
        raise HTTPException(status_code=500, detail=f"Failed to fetch Ticketmaster events: {str(e)}")



@app.post("/scrape_events", response_model=List[Event])


@app.get("/events_test", response_model=List[Event])
async def list_events(source: Optional[str] = None, limit: int = 1000):
    """List stored events, optionally filtered by source."""
    if limit > 1000:
        limit = 1000  # Cap limit to prevent abuse
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        if source:
            rows = await conn.fetch(
                """
                SELECT * FROM events
                WHERE $1 = ANY(source)
                ORDER BY date DESC
                LIMIT $2
                """,
                source,
                limit,
            )
        else:
            rows = await conn.fetch(
                """
                SELECT * FROM events
                ORDER BY date DESC
                LIMIT $1
                """,
                limit,
            )
        events = []
        for row in rows:
            event = Event(
                id=row["id"],
                title=row["title"],
                date=row["date"],
                venue=row["venue"],
                location=row["location"],
                latlong=row["latlong"],
                url=row["url"],
                description=row["description"],
                source=row["source"],
            )
            events.append(event)
        length = len(events)
        print(f"Retrieved {length} events from database (source filter: {source})")
        return events
    finally:
        await conn.close()


@app.get("/health")
async def health_check():
    """Health check endpoint to verify database connectivity."""
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        await conn.execute("SELECT 1")
        await conn.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")
