"""User itineraries — collections of events (extensible to more item types later)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable, List, Optional
from uuid import UUID, uuid4

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import UserOut


def _event_row_to_dict(row: Any) -> dict:
    categories = row.get("categories")
    category = categories[0] if categories else None
    datetime_value = row.get("datetime")
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


class ItineraryCreateBody(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class ItineraryUpdateBody(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)


class AddEventBody(BaseModel):
    event_id: int = Field(ge=1)


class ItinerarySummaryOut(BaseModel):
    id: str
    name: str
    eventCount: int
    createdAt: str
    updatedAt: str
    hasEvent: bool = False


class ItineraryDetailOut(ItinerarySummaryOut):
    events: List[dict]


def _itinerary_summary(row: asyncpg.Record) -> ItinerarySummaryOut:
    return ItinerarySummaryOut(
        id=str(row["id"]),
        name=row["name"],
        eventCount=int(row["event_count"] or 0),
        createdAt=row["created_at"].isoformat(),
        updatedAt=row["updated_at"].isoformat(),
        hasEvent=bool(row.get("has_event")),
    )


async def _get_owned_itinerary(
    conn: asyncpg.Connection, itinerary_id: UUID, user_id: UUID
) -> asyncpg.Record:
    row = await conn.fetchrow(
        "SELECT id, user_id, name, created_at, updated_at FROM itineraries WHERE id = $1",
        itinerary_id,
    )
    if row is None or row["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    return row


async def _build_itinerary_detail(
    conn: asyncpg.Connection, itinerary_id: UUID, user_id: UUID
) -> ItineraryDetailOut:
    header = await _get_owned_itinerary(conn, itinerary_id, user_id)
    event_rows = await conn.fetch(
        """
        SELECT
            e.id, e.title, e.datetime, e.venue, e.location, e.latlong,
            e.url, e.description, e.categories, e.source
        FROM itinerary_events ie
        JOIN events e ON e.id = ie.event_id
        WHERE ie.itinerary_id = $1
        ORDER BY ie.sort_order ASC, ie.added_at ASC
        """,
        itinerary_id,
    )
    return ItineraryDetailOut(
        id=str(header["id"]),
        name=header["name"],
        eventCount=len(event_rows),
        createdAt=header["created_at"].isoformat(),
        updatedAt=header["updated_at"].isoformat(),
        events=[_event_row_to_dict(r) for r in event_rows],
    )


def create_itineraries_router(
    get_db_connection,
    get_current_user: Callable,
) -> APIRouter:
    router = APIRouter(tags=["itineraries"])

    @router.get("/itineraries", response_model=List[ItinerarySummaryOut])
    async def list_itineraries(
        user: UserOut = Depends(get_current_user),
        for_event_id: Optional[int] = Query(default=None, ge=1),
    ):
        user_id = UUID(user.id)
        async with get_db_connection() as conn:
            if for_event_id is None:
                rows = await conn.fetch(
                    """
                    SELECT
                        i.id,
                        i.name,
                        i.created_at,
                        i.updated_at,
                        COUNT(ie.event_id)::int AS event_count,
                        FALSE AS has_event
                    FROM itineraries i
                    LEFT JOIN itinerary_events ie ON ie.itinerary_id = i.id
                    WHERE i.user_id = $1
                    GROUP BY i.id
                    ORDER BY i.updated_at DESC
                    """,
                    user_id,
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT
                        i.id,
                        i.name,
                        i.created_at,
                        i.updated_at,
                        COUNT(ie.event_id)::int AS event_count,
                        BOOL_OR(ie.event_id = $2) AS has_event
                    FROM itineraries i
                    LEFT JOIN itinerary_events ie ON ie.itinerary_id = i.id
                    WHERE i.user_id = $1
                    GROUP BY i.id
                    ORDER BY i.updated_at DESC
                    """,
                    user_id,
                    for_event_id,
                )
        return [_itinerary_summary(r) for r in rows]

    @router.post("/itineraries", response_model=ItineraryDetailOut, status_code=201)
    async def create_itinerary(
        body: ItineraryCreateBody,
        user: UserOut = Depends(get_current_user),
    ):
        user_id = UUID(user.id)
        itinerary_id = uuid4()
        name = body.name.strip()
        now = datetime.now(timezone.utc)

        async with get_db_connection() as conn:
            await conn.execute(
                """
                INSERT INTO itineraries (id, user_id, name, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $4)
                """,
                itinerary_id,
                user_id,
                name,
                now,
            )

        return ItineraryDetailOut(
            id=str(itinerary_id),
            name=name,
            eventCount=0,
            createdAt=now.isoformat(),
            updatedAt=now.isoformat(),
            events=[],
        )

    @router.get("/itineraries/{itinerary_id}", response_model=ItineraryDetailOut)
    async def get_itinerary(
        itinerary_id: UUID,
        user: UserOut = Depends(get_current_user),
    ):
        user_id = UUID(user.id)
        async with get_db_connection() as conn:
            return await _build_itinerary_detail(conn, itinerary_id, user_id)

    @router.patch("/itineraries/{itinerary_id}", response_model=ItinerarySummaryOut)
    async def update_itinerary(
        itinerary_id: UUID,
        body: ItineraryUpdateBody,
        user: UserOut = Depends(get_current_user),
    ):
        if body.name is None:
            raise HTTPException(status_code=400, detail="Nothing to update")
        user_id = UUID(user.id)
        now = datetime.now(timezone.utc)
        async with get_db_connection() as conn:
            await _get_owned_itinerary(conn, itinerary_id, user_id)
            row = await conn.fetchrow(
                """
                UPDATE itineraries
                SET name = $1, updated_at = $2
                WHERE id = $3 AND user_id = $4
                RETURNING id, name, created_at, updated_at
                """,
                body.name.strip(),
                now,
                itinerary_id,
                user_id,
            )
            count = await conn.fetchval(
                "SELECT COUNT(*)::int FROM itinerary_events WHERE itinerary_id = $1",
                itinerary_id,
            )
        return ItinerarySummaryOut(
            id=str(row["id"]),
            name=row["name"],
            eventCount=int(count or 0),
            createdAt=row["created_at"].isoformat(),
            updatedAt=row["updated_at"].isoformat(),
        )

    @router.delete("/itineraries/{itinerary_id}", status_code=204)
    async def delete_itinerary(
        itinerary_id: UUID,
        user: UserOut = Depends(get_current_user),
    ):
        user_id = UUID(user.id)
        async with get_db_connection() as conn:
            await _get_owned_itinerary(conn, itinerary_id, user_id)
            await conn.execute(
                "DELETE FROM itineraries WHERE id = $1 AND user_id = $2",
                itinerary_id,
                user_id,
            )

    @router.post("/itineraries/{itinerary_id}/events", response_model=ItineraryDetailOut)
    async def add_event(
        itinerary_id: UUID,
        body: AddEventBody,
        user: UserOut = Depends(get_current_user),
    ):
        user_id = UUID(user.id)
        now = datetime.now(timezone.utc)
        async with get_db_connection() as conn:
            await _get_owned_itinerary(conn, itinerary_id, user_id)
            event_exists = await conn.fetchval(
                "SELECT 1 FROM events WHERE id = $1",
                body.event_id,
            )
            if not event_exists:
                raise HTTPException(status_code=404, detail="Event not found")

            await conn.execute(
                """
                INSERT INTO itinerary_events (itinerary_id, event_id, sort_order, added_at)
                VALUES ($1, $2, COALESCE(
                    (SELECT MAX(sort_order) + 1 FROM itinerary_events WHERE itinerary_id = $1),
                    0
                ), $3)
                ON CONFLICT (itinerary_id, event_id) DO NOTHING
                """,
                itinerary_id,
                body.event_id,
                now,
            )
            await conn.execute(
                "UPDATE itineraries SET updated_at = $1 WHERE id = $2",
                now,
                itinerary_id,
            )
            return await _build_itinerary_detail(conn, itinerary_id, user_id)

    @router.delete("/itineraries/{itinerary_id}/events/{event_id}", response_model=ItineraryDetailOut)
    async def remove_event(
        itinerary_id: UUID,
        event_id: int,
        user: UserOut = Depends(get_current_user),
    ):
        user_id = UUID(user.id)
        now = datetime.now(timezone.utc)
        async with get_db_connection() as conn:
            await _get_owned_itinerary(conn, itinerary_id, user_id)
            await conn.execute(
                "DELETE FROM itinerary_events WHERE itinerary_id = $1 AND event_id = $2",
                itinerary_id,
                event_id,
            )
            await conn.execute(
                "UPDATE itineraries SET updated_at = $1 WHERE id = $2",
                now,
                itinerary_id,
            )
            return await _build_itinerary_detail(conn, itinerary_id, user_id)

    return router
