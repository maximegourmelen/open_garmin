from __future__ import annotations

import hashlib
import hmac
import os
import re
import secrets
from copy import deepcopy

from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError

from ..config import COOKIE, DEFAULT_PREFS
from ..main import Credentials
from ..security import password_hash, password_matches
from ..storage import Activity, Connection, Daily, Job, LoginSession, Note, User


def register(app, store, worker, current_user, set_session, limit):
    @app.get("/api/health")
    def health():
        return {"ok": True, "version": "0.1.0"}

    @app.get("/api/session")
    def session(request: Request, response: Response):
        with store.sessions() as db:
            user_count = db.scalar(select(func.count()).select_from(User)) or 0
        local_mode = (
            os.environ.get("OPEN_GARMIN_LOCAL_MODE") == "1"
            and request.url.hostname in ("127.0.0.1", "localhost", "::1")
            and user_count <= 1
        )
        try:
            user = current_user(request)
        except HTTPException:
            if local_mode:
                return local_session(request, response)
            return {
                "user": None,
                "csrf_token": None,
                "registration_open": not user_count
                or os.environ.get("OPEN_GARMIN_ALLOW_REGISTRATION") == "1",
                "local_mode": False,
            }
        token = request.cookies[COOKIE]
        return {
            "user": {"name": user.name, "email": user.email},
            "csrf_token": hmac.new(token.encode(), b"open-garmin-csrf", hashlib.sha256).hexdigest(),
            "registration_open": False,
            "local_mode": local_mode,
        }

    @app.post("/api/auth/local")
    def local_session(request: Request, response: Response):
        if os.environ.get("OPEN_GARMIN_LOCAL_MODE") != "1" or request.url.hostname not in (
            "127.0.0.1",
            "localhost",
            "::1",
        ):
            raise HTTPException(404, "Local workspace is unavailable.")
        if request.method == "POST":
            limit(request, "local_auth", 10)
        with store.sessions.begin() as db:
            users = list(db.scalars(select(User).limit(2)))
            if len(users) > 1:
                raise HTTPException(409, "This installation has multiple workspaces. Sign in to choose one.")
            if users:
                user = users[0]
            else:
                user = User(
                    email="local@open-garmin.invalid",
                    name="Athlete",
                    password_hash=password_hash(secrets.token_urlsafe(32)),
                    preferences=deepcopy(DEFAULT_PREFS),
                )
                db.add(user)
                db.flush()
        return {**set_session(user, response), "local_mode": True}

    @app.post("/api/auth/register")
    def register(body: Credentials, request: Request, response: Response):
        limit(request, "auth")
        email = body.email.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
            raise HTTPException(422, "Enter a valid email address.")
        try:
            with store.sessions.begin() as db:
                existing = db.scalar(select(func.count()).select_from(User))
                if existing and os.environ.get("OPEN_GARMIN_ALLOW_REGISTRATION") != "1":
                    raise HTTPException(
                        403, "This installation is private. Sign in to the existing workspace."
                    )
                user = User(
                    email=email,
                    name=body.name.strip() or "Athlete",
                    password_hash=password_hash(body.password),
                    preferences=deepcopy(DEFAULT_PREFS),
                )
                db.add(user)
                db.flush()
        except IntegrityError:
            raise HTTPException(409, "An account could not be created with those details.") from None
        return set_session(user, response)

    @app.post("/api/auth/login")
    def login(body: Credentials, request: Request, response: Response):
        limit(request, "auth")
        with store.sessions() as db:
            user = db.scalar(select(User).where(User.email == body.email.strip().lower()))
        if not user or not password_matches(body.password, user.password_hash):
            raise HTTPException(401, "The email or password was not accepted.")
        return set_session(user, response)

    @app.post("/api/auth/logout")
    def logout(request: Request, response: Response, user=Depends(current_user)):  # noqa: B008 - FastAPI dependency declaration
        digest = hashlib.sha256(request.cookies[COOKIE].encode()).hexdigest()
        with store.sessions.begin() as db:
            db.execute(delete(LoginSession).where(LoginSession.digest == digest))
        response.delete_cookie(COOKIE)
        return {"ok": True}

    @app.get("/api/data")
    def data(user=Depends(current_user)):  # noqa: B008 - FastAPI dependency declaration
        with store.sessions() as db:
            conn = db.get(Connection, user.id)
            rows = list(
                db.scalars(select(Activity).where(Activity.user_id == user.id).order_by(Activity.date.desc()))
            )
            notes = {
                n.activity_id: {"text": n.text, "rpe": n.rpe, "tags": n.tags}
                for n in db.scalars(select(Note).where(Note.user_id == user.id))
            }
            activities = [
                {
                    **r.data,
                    "samples": r.data.get("samples", [])[
                        :: max(1, (len(r.data.get("samples", [])) + 69) // 70)
                    ],
                    "note": notes.get(r.id, {"text": "", "rpe": None, "tags": []}),
                    "sample_count": r.data.get("sample_count", len(r.data.get("samples", []))),
                }
                for r in rows
            ]
            daily = [
                r.data for r in db.scalars(select(Daily).where(Daily.user_id == user.id).order_by(Daily.date))
            ]
            jobs = [
                {
                    "id": j.id,
                    "kind": j.kind,
                    "activity_id": j.activity_id,
                    "state": j.state,
                    "progress": j.progress,
                    "message": j.message,
                }
                for j in db.scalars(
                    select(Job).where(Job.user_id == user.id).order_by(Job.created_at.desc()).limit(8)
                )
            ]
            status = {
                "connected": bool(conn and conn.encrypted_key),
                "state": conn.state if conn else "not_connected",
                "last_checked": conn.last_checked if conn else None,
                "last_success": conn.last_success if conn else None,
                "message": conn.message if conn else None,
                "region": conn.region if conn else "com",
            }
        return {
            "mode": "live",
            "activities": activities,
            "daily": daily,
            "preferences": {**DEFAULT_PREFS, **user.preferences},
            "status": status,
            "jobs": jobs,
            "user": {"name": user.name, "email": user.email},
            "data_through": max((d["date"] for d in daily), default=None),
            "local_mode": os.environ.get("OPEN_GARMIN_LOCAL_MODE") == "1",
        }
