"""Daily check-ins shared by live and demo workspaces."""

from __future__ import annotations

from datetime import date, timedelta

from fastapi import HTTPException, Request
from pydantic import BaseModel, Field

from ..analytics.common import local_today
from ..copy.sentences import checkin_reply
from ..db.models import CheckIn, User, now_iso
from ..workspace import workspace


class CheckInInput(BaseModel):
    mood: int | None = Field(default=None, ge=1, le=5)
    energy: int | None = Field(default=None, ge=1, le=5)
    soreness: int | None = Field(default=None, ge=0, le=2)
    note: str = Field(default="", max_length=1000)


def put_checkin(request: Request, day: date, body: CheckInInput):
    ws = workspace(request)
    with ws.store.sessions.begin() as db:
        user = db.get(User, ws.user_id)
        today = local_today(user.preferences or {})
        if not today - timedelta(days=7) <= day <= today:
            raise HTTPException(422, "Choose today or a day within the last week.")
        row = db.get(CheckIn, (ws.user_id, day.isoformat()))
        if row is None:
            row = CheckIn(user_id=ws.user_id, date=day.isoformat())
            db.add(row)
        row.mood, row.energy, row.soreness, row.note = (
            body.mood,
            body.energy,
            body.soreness,
            body.note.strip(),
        )
        row.updated_at = now_iso()
    return {"date": day.isoformat(), **body.model_dump(), "reply": checkin_reply(body.mood)}


def register(app):
    for prefix in ("/api", "/api/demo"):
        app.add_api_route(f"{prefix}/checkins/{{day}}", put_checkin, methods=["PUT"])
