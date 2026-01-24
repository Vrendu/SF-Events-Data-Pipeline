"""FastAPI backend for scraping events and storing them in PostgreSQL.

Endpoints:
- POST /test_scrape       -> test web scraping and return events
- GET  /ticketmaster      -> fetch SF events from Ticketmaster API
- GET  /events            -> list stored events from database
- GET  /health            -> health check endpoint

Notes:
- Uses `asyncpg` for async DB access and `httpx` + `lxml` for scraping/parsing.
- Requires DATABASE_URL environment variable (e.g., postgresql://user:pass@localhost/dbname)
"""

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


# Load environment variables from .env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI(title="Events Scraper API", version="1.0.0")


class ScrapeRequest(BaseModel):
    url: str
    source: Optional[str] = None


class EventOut(BaseModel):
    id: Optional[int]
    title: str
    date: Optional[str] = None
    venue: Optional[str] = None
    location: Optional[str] = None
    latlong: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None


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
                venue TEXT,
                location TEXT,
                latlong TEXT,
                url TEXT,
                description TEXT,
                source TEXT             
            )
            """
        )
        await conn.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_events_title ON events (title, date, venue, source);
            """
        )
    finally:
        await conn.close()


@app.on_event("startup")
async def startup_event():
    await init_db()


@app.post("/test_scrape")


async def populate_database(events: List[dict]):
    conn = await asyncpg.connect(DATABASE_URL)
    inserted_count = 0
    skipped_count = 0
    
    try:
        for event in events:
            try:
                # Insert event into database, skip if duplicate exists
                result = await conn.execute(
                    """
                    INSERT INTO events (title, date, venue, location, latlong, url, description, source)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (title, date, venue, source) DO NOTHING
                    """,
                    event.get("title"),
                    event.get("date"),
                    event.get("venue"),
                    event.get("location"),
                    event.get("latlong"),
                    event.get("url"),
                    event.get("description"),
                    event.get("source"),
                )
                # Check if row was actually inserted
                if result == "INSERT 0 1":
                    inserted_count += 1
                    print(f"✓ Inserted: {event.get('title')}")
                else:
                    skipped_count += 1
                    print(f"○ Skipped duplicate: {event.get('title')}")
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
        end_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%dT23:59:59Z")

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



@app.post("/scrape_events", response_model=List[EventOut])


@app.get("/events", response_model=List[EventOut])
async def list_events(source: Optional[str] = None, limit: int = 100):
    """List stored events, optionally filtered by source."""
    if limit > 1000:
        limit = 1000  # Cap limit to prevent abuse
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        if source:
            rows = await conn.fetch(
                """SELECT id,title,date,location,url,description,source 
                   FROM events WHERE source=$1 ORDER BY id DESC LIMIT $2""",
                source, limit
            )
        else:
            rows = await conn.fetch(
                """SELECT id,title,date,location,url,description,source 
                   FROM events ORDER BY id DESC LIMIT $1""",
                limit
            )
        return [dict(r) for r in rows]
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
