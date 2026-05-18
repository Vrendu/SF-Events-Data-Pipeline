"""
User authentication: Argon2id passwords, JWT access cookies, rotating refresh tokens.
"""
from __future__ import annotations

import hashlib
import os
import re
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID, uuid4

import asyncpg
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field, field_validator

ACCESS_COOKIE = "plotted_access"
REFRESH_COOKIE = "plotted_refresh"
ACCESS_MINUTES = 15
REFRESH_DAYS = 14

_password_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16,
)

_rate_buckets: dict[str, list[float]] = {}


def _jwt_secret() -> str:
    secret = os.getenv("AUTH_JWT_SECRET", "").strip()
    if len(secret) >= 32:
        return secret
    env = os.getenv("ENV", "development").lower()
    if env in ("production", "prod"):
        raise RuntimeError(
            "AUTH_JWT_SECRET must be set to a random string of at least 32 characters in production."
        )
    return "dev-insecure-jwt-secret-change-me-32chars-min!!"


def _cookie_secure() -> bool:
    return os.getenv("AUTH_COOKIE_SECURE", "").lower() in ("1", "true", "yes")


def _hash_refresh_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _check_rate_limit(request: Request, bucket: str, max_attempts: int = 8, window_sec: int = 900) -> None:
    key = f"{bucket}:{_client_ip(request)}"
    now = time.time()
    attempts = [t for t in _rate_buckets.get(key, []) if now - t < window_sec]
    if len(attempts) >= max_attempts:
        raise HTTPException(
            status_code=429,
            detail="Too many attempts. Please try again later.",
        )
    attempts.append(now)
    _rate_buckets[key] = attempts


def _clear_rate_limit(request: Request, bucket: str) -> None:
    key = f"{bucket}:{_client_ip(request)}"
    _rate_buckets.pop(key, None)


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _password_hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def _validate_password_strength(password: str) -> str:
    if len(password) < 10:
        raise ValueError("Password must be at least 10 characters.")
    if len(password) > 128:
        raise ValueError("Password must be at most 128 characters.")
    if not re.search(r"[A-Za-z]", password):
        raise ValueError("Password must include at least one letter.")
    if not re.search(r"\d", password):
        raise ValueError("Password must include at least one number.")
    return password


class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    display_name: Optional[str] = Field(default=None, max_length=80)

    @field_validator("password")
    @classmethod
    def password_rules(cls, v: str) -> str:
        return _validate_password_strength(v)


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    id: str
    email: str
    displayName: str


def _encode_access_token(user_id: UUID, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_MINUTES),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm="HS256")


def _decode_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Not authenticated") from None
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Not authenticated")
    return payload


def _set_auth_cookies(response: Response, access_token: str, refresh_raw: str) -> None:
    secure = _cookie_secure()
    common = {
        "httponly": True,
        "secure": secure,
        "samesite": "lax",
        "path": "/",
    }
    response.set_cookie(
        ACCESS_COOKIE,
        access_token,
        max_age=ACCESS_MINUTES * 60,
        **common,
    )
    response.set_cookie(
        REFRESH_COOKIE,
        refresh_raw,
        max_age=REFRESH_DAYS * 24 * 60 * 60,
        **common,
    )


def _clear_auth_cookies(response: Response) -> None:
    secure = _cookie_secure()
    common = {"httponly": True, "secure": secure, "samesite": "lax", "path": "/"}
    response.delete_cookie(ACCESS_COOKIE, **common)
    response.delete_cookie(REFRESH_COOKIE, **common)


def _row_to_user(row: asyncpg.Record) -> UserOut:
    return UserOut(
        id=str(row["id"]),
        email=row["email"],
        displayName=row["display_name"],
    )


async def _issue_session(
    conn: asyncpg.Connection,
    user_id: UUID,
    email: str,
    display_name: str,
    response: Response,
) -> UserOut:
    refresh_raw = secrets.token_urlsafe(48)
    refresh_hash = _hash_refresh_token(refresh_raw)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS)

    await conn.execute(
        """
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
        VALUES ($1, $2, $3, $4)
        """,
        uuid4(),
        user_id,
        refresh_hash,
        expires_at,
    )

    access = _encode_access_token(user_id, email)
    _set_auth_cookies(response, access, refresh_raw)
    return UserOut(id=str(user_id), email=email, displayName=display_name)


def create_auth_router(get_db_connection) -> APIRouter:
    router = APIRouter(tags=["auth"])

    async def get_current_user(request: Request) -> UserOut:
        token = request.cookies.get(ACCESS_COOKIE)
        if not token:
            raise HTTPException(status_code=401, detail="Not authenticated")
        payload = _decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Not authenticated")

        async with get_db_connection() as conn:
            row = await conn.fetchrow(
                "SELECT id, email, display_name FROM users WHERE id = $1",
                UUID(user_id),
            )
        if row is None:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return _row_to_user(row)

    async def try_refresh_session(request: Request, response: Response) -> Optional[UserOut]:
        refresh_raw = request.cookies.get(REFRESH_COOKIE)
        if not refresh_raw:
            return None

        refresh_hash = _hash_refresh_token(refresh_raw)

        async with get_db_connection() as conn:
            row = await conn.fetchrow(
                """
                SELECT rt.id AS token_id, rt.user_id, u.email, u.display_name
                FROM refresh_tokens rt
                JOIN users u ON u.id = rt.user_id
                WHERE rt.token_hash = $1 AND rt.expires_at > NOW()
                """,
                refresh_hash,
            )
            if row is None:
                return None

            await conn.execute("DELETE FROM refresh_tokens WHERE id = $1", row["token_id"])
            return await _issue_session(
                conn,
                row["user_id"],
                row["email"],
                row["display_name"],
                response,
            )

    @router.post("/auth/register", response_model=UserOut)
    async def register(body: RegisterBody, request: Request, response: Response):
        _check_rate_limit(request, "register")
        email = body.email.strip().lower()
        display_name = (body.display_name or "").strip() or email.split("@")[0]

        async with get_db_connection() as conn:
            existing = await conn.fetchval("SELECT 1 FROM users WHERE email = $1", email)
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail="Unable to create account. Try logging in or use a different email.",
                )

            user_id = uuid4()
            pw_hash = hash_password(body.password)
            await conn.execute(
                """
                INSERT INTO users (id, email, password_hash, display_name)
                VALUES ($1, $2, $3, $4)
                """,
                user_id,
                email,
                pw_hash,
                display_name[:80],
            )
            _clear_rate_limit(request, "register")
            return await _issue_session(conn, user_id, email, display_name[:80], response)

    @router.post("/auth/login", response_model=UserOut)
    async def login(body: LoginBody, request: Request, response: Response):
        _check_rate_limit(request, "login")
        email = body.email.strip().lower()

        async with get_db_connection() as conn:
            row = await conn.fetchrow(
                "SELECT id, email, display_name, password_hash FROM users WHERE email = $1",
                email,
            )
            if row is None or not verify_password(row["password_hash"], body.password):
                raise HTTPException(status_code=401, detail="Invalid email or password.")

            await conn.execute("DELETE FROM refresh_tokens WHERE user_id = $1", row["id"])
            _clear_rate_limit(request, "login")
            return await _issue_session(
                conn, row["id"], row["email"], row["display_name"], response
            )

    @router.post("/auth/logout")
    async def logout(request: Request, response: Response):
        refresh_raw = request.cookies.get(REFRESH_COOKIE)
        if refresh_raw:
            refresh_hash = _hash_refresh_token(refresh_raw)
            async with get_db_connection() as conn:
                await conn.execute(
                    "DELETE FROM refresh_tokens WHERE token_hash = $1",
                    refresh_hash,
                )
        _clear_auth_cookies(response)
        return {"ok": True}

    @router.get("/auth/me", response_model=UserOut)
    async def me(request: Request, response: Response):
        try:
            return await get_current_user(request)
        except HTTPException as exc:
            if exc.status_code != 401:
                raise
            refreshed = await try_refresh_session(request, response)
            if refreshed:
                return refreshed
            raise

    return router
