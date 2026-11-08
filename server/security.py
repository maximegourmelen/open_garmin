"""Session, CSRF, origin, and rate-limit protection."""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy import delete

from .config import COOKIE
from .storage import LoginSession, User


def password_hash(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    derived = hashlib.scrypt(
        password.encode(), salt=bytes.fromhex(salt), n=32768, r=8, p=1, maxmem=128 * 1024 * 1024
    ).hex()
    return f"{salt}:{derived}"


def password_matches(password: str, stored: str) -> bool:
    try:
        return hmac.compare_digest(password_hash(password, stored.split(":")[0]), stored)
    except (ValueError, TypeError):
        return False


def install_security(app, store):
    rate_lock = threading.Lock()
    rate_buckets: dict[str, deque] = defaultdict(deque)

    @app.middleware("http")
    async def protection(request: Request, call_next):
        if request.url.path.startswith("/api") and request.method not in ("GET", "HEAD", "OPTIONS"):
            origin = request.headers.get("origin")
            allowed = {
                v.strip().rstrip("/")
                for v in os.environ.get("OPEN_GARMIN_ALLOWED_ORIGINS", "").split(",")
                if v.strip()
            }
            allowed.update(
                {
                    f"http://{request.headers.get('host')}",
                    f"https://{request.headers.get('host')}",
                    "http://127.0.0.1:5173",
                    "http://localhost:5173",
                }
            )
            if origin and origin.rstrip("/") not in allowed:
                return JSONResponse({"detail": "This origin is not allowed."}, status_code=403)
            if request.headers.get("sec-fetch-site") == "cross-site":
                return JSONResponse({"detail": "Cross-site requests are not allowed."}, status_code=403)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["X-Frame-Options"] = "DENY"
        if request.url.path.startswith("/api"):
            response.headers["Cache-Control"] = "no-store"
        else:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"  # noqa: E501 - existing literal
            )
        return response

    # Request validation must not reflect a submitted key/password in its error body.
    from fastapi.exceptions import RequestValidationError

    @app.exception_handler(RequestValidationError)
    async def validation_error(_, exc):
        return JSONResponse({"detail": "Check the submitted values and try again."}, status_code=422)

    def limit(request: Request, category: str, maximum: int = 10):
        bucket = f"{category}:{request.client.host if request.client else 'unknown'}"
        with rate_lock:
            items = rate_buckets[bucket]
            now = time.time()
            while items and items[0] < now - 60:
                items.popleft()
            if len(items) >= maximum:
                raise HTTPException(429, "Too many attempts. Please wait a minute.")
            items.append(now)

    def current_user(request: Request) -> User:
        token = request.cookies.get(COOKIE, "")
        with store.sessions() as db:
            session = db.get(LoginSession, hashlib.sha256(token.encode()).hexdigest())
            if not token or not session or session.expires_at < time.time():
                raise HTTPException(401, "Sign in to your workspace first.")
            user = db.get(User, session.user_id)
            if not user:
                raise HTTPException(401, "Sign in to your workspace first.")
            if request.method not in ("GET", "HEAD", "OPTIONS"):
                expected = hmac.new(token.encode(), b"open-garmin-csrf", hashlib.sha256).hexdigest()
                if not hmac.compare_digest(request.headers.get("x-csrf-token", ""), expected):
                    raise HTTPException(403, "Please refresh the page and try again.")
            return user

    def set_session(user: User, response: Response):
        token = secrets.token_urlsafe(40)
        with store.sessions.begin() as db:
            db.execute(delete(LoginSession).where(LoginSession.expires_at < time.time()))
            db.add(
                LoginSession(
                    digest=hashlib.sha256(token.encode()).hexdigest(),
                    user_id=user.id,
                    expires_at=time.time() + 30 * 86400,
                )
            )
        response.set_cookie(
            COOKIE,
            token,
            httponly=True,
            secure=os.environ.get("OPEN_GARMIN_SECURE_COOKIES") == "1",
            samesite="lax",
            max_age=30 * 86400,
            path="/",
        )
        return {
            "user": {"name": user.name, "email": user.email},
            "csrf_token": hmac.new(token.encode(), b"open-garmin-csrf", hashlib.sha256).hexdigest(),
        }

    return current_user, set_session, limit
