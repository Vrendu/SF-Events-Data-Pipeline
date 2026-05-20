"""User favorites — saved events per account."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable, List
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Response
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


class SyncFavoritesBody(BaseModel):
    event_ids: List[int] = Field(default_factory=list)


def create_favorites_router(
    get_db_connection,
    get_current_user: Callable,
) -> APIRouter:
    router = APIRouter(tags=["favorites"])

    async def _fetch_user_favorites(
        conn: asyncpg.Connection, user_id: UUID
    ) -> List[dict]:
        rows = await conn.fetch(
            """
            SELECT
                e.id, e.title, e.datetime, e.venue, e.location, e.latlong,
                e.url, e.description, e.categories, e.source
            FROM user_favorites uf
            JOIN events e ON e.id = uf.event_id
            WHERE uf.user_id = $1
            ORDER BY uf.created_at DESC
            """,
            user_id,
        )
        return [_event_row_to_dict(r) for r in rows]

    @router.get("/favorites")
    async def list_favorites(user: UserOut = Depends(get_current_user)):
        user_id = UUID(user.id)
        async with get_db_connection() as conn:
            return await _fetch_user_favorites(conn, user_id)

    @router.get("/favorites/ids")
    async def list_favorite_ids(user: UserOut = Depends(get_current_user)):
        user_id = UUID(user.id)
        async with get_db_connection() as conn:
            rows = await conn.fetch(
                "SELECT event_id FROM user_favorites WHERE user_id = $1 ORDER BY created_at DESC",
                user_id,
            )
        return {"event_ids": [int(r["event_id"]) for r in rows]}

    @router.post("/favorites/{event_id}", status_code=201)
    async def add_favorite(
        event_id: int,
        user: UserOut = Depends(get_current_user),
    ):
        if event_id < 1:
            raise HTTPException(status_code=400, detail="Invalid event id")
        user_id = UUID(user.id)
        async with get_db_connection() as conn:
            exists = await conn.fetchval("SELECT 1 FROM events WHERE id = $1", event_id)
            if not exists:
                raise HTTPException(status_code=404, detail="Event not found")
            await conn.execute(
                """
                INSERT INTO user_favorites (user_id, event_id, created_at)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, event_id) DO NOTHING
                """,
                user_id,
                event_id,
                datetime.now(timezone.utc),
            )
        return {"ok": True, "event_id": event_id}

    @router.delete("/favorites/{event_id}", status_code=204)
    async def remove_favorite(
        event_id: int,
        user: UserOut = Depends(get_current_user),
    ):
        user_id = UUID(user.id)
        async with get_db_connection() as conn:
            await conn.execute(
                "DELETE FROM user_favorites WHERE user_id = $1 AND event_id = $2",
                user_id,
                event_id,
            )
        return Response(status_code=204)

    @router.put("/favorites/sync")
    async def sync_favorites(
        body: SyncFavoritesBody,
        user: UserOut = Depends(get_current_user),
    ):
        """Merge event ids into the user's favorites (e.g. after login from local storage)."""
        user_id = UUID(user.id)
        unique_ids = sorted({i for i in body.event_ids if i >= 1})
        if not unique_ids:
            return {"merged": 0}

        async with get_db_connection() as conn:
            existing_events = await conn.fetch(
                "SELECT id FROM events WHERE id = ANY($1::int[])",
                unique_ids,
            )
            valid_ids = [int(r["id"]) for r in existing_events]
            if not valid_ids:
                return {"merged": 0}

            now = datetime.now(timezone.utc)
            await conn.executemany(
                """
                INSERT INTO user_favorites (user_id, event_id, created_at)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, event_id) DO NOTHING
                """,
                [(user_id, eid, now) for eid in valid_ids],
            )

        return {"merged": len(valid_ids)}

    return router
