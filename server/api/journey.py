"""Journeys, milestones, check-ins, and weekly stories."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Literal

from fastapi import HTTPException, Request
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select

from ..analytics.activity_goals import goal_suggestion
from ..analytics.common import local_today, week_start
from ..analytics.reports import weekly_recap
from ..companion.journeys import BY_ID, available_journeys, journey_progress
from ..companion.messages import render_message
from ..companion.milestones import evaluate_milestones
from ..companion.streaks import streak
from ..db.models import (
    Activity,
    ActivityDerived,
    BestEffort,
    CheckIn,
    Daily,
    MilestoneAward,
    User,
    WeeklyRecap,
)
from ..derive import rederive_user
from ..workspace import workspace


class JourneyChange(BaseModel):
    id: str | None = None
    action: Literal["pause", "resume", "repeat_week", "leave"] | None = None

    @model_validator(mode="after")
    def one_choice(self):
        if (self.id is None) == (self.action is None):
            raise ValueError("Choose a journey or one action.")
        if self.id is not None and self.id not in BY_ID:
            raise ValueError("Choose a known journey.")
        return self


class CheckInInput(BaseModel):
    mood: int | None = Field(default=None, ge=1, le=5)
    energy: int | None = Field(default=None, ge=1, le=5)
    soreness: int | None = Field(default=None, ge=0, le=2)
    note: str = Field(default="", max_length=1000)


class SeenInput(BaseModel):
    ids: list[str] = Field(max_length=100)


def _context(db, user_id: str):
    daily = [
        {"date": row.date, **row.data} for row in db.scalars(select(Daily).where(Daily.user_id == user_id))
    ]
    derived = {
        row.activity_id: row.data
        for row in db.scalars(select(ActivityDerived).where(ActivityDerived.user_id == user_id))
    }
    activities = [
        {**row.data, **derived.get(row.id, {})}
        for row in db.scalars(select(Activity).where(Activity.user_id == user_id))
    ]
    bests = [
        {
            "activity_id": row.activity_id,
            "kind": row.kind,
            "date": row.date,
            "sport": row.sport,
            "value": row.value,
        }
        for row in db.scalars(select(BestEffort).where(BestEffort.user_id == user_id))
    ]
    checkins = [
        {"date": row.date, "mood": row.mood, "energy": row.energy, "soreness": row.soreness, "note": row.note}
        for row in db.scalars(select(CheckIn).where(CheckIn.user_id == user_id))
    ]
    return activities, daily, bests, checkins


def journey_view(request: Request):
    ws = workspace(request)
    with ws.store.sessions() as db:
        user = db.get(User, ws.user_id)
        prefs = user.preferences or {}
        today = local_today(prefs)
        activities, daily, bests, checkins = _context(db, ws.user_id)
        streak_data = streak(activities, daily, prefs, today)
        computed = evaluate_milestones(activities, daily, bests, checkins, prefs, today)
        awards = {
            row.milestone_id: row
            for row in db.scalars(select(MilestoneAward).where(MilestoneAward.user_id == ws.user_id))
        }
        milestones = []
        for item in computed:
            award = awards.get(item["id"])
            milestones.append(
                {
                    **item,
                    "earned": bool(award),
                    "earned_on": award.earned_on if award else None,
                    "activity_id": award.activity_id if award else None,
                    "seen": award.seen if award else False,
                }
            )
        recaps = [
            {"week_start": row.week_start, "seen": row.seen}
            for row in db.scalars(
                select(WeeklyRecap)
                .where(WeeklyRecap.user_id == ws.user_id)
                .order_by(WeeklyRecap.week_start.desc())
            )
        ]
    complete_weeks = [item["minutes"] for item in streak_data["weeks"][:-1]]
    return {
        "journey": journey_progress(prefs.get("journey"), activities, daily, today, prefs),
        "available": available_journeys(),
        "goal": {"minutes": prefs.get("weekly_minutes", 150), "sessions": prefs.get("weekly_sessions", 3)},
        "goal_suggestion": goal_suggestion(
            complete_weeks, prefs.get("weekly_minutes", 150), prefs.get("goal_focus", "move_more")
        ),
        "streak": streak_data,
        "milestones": milestones,
        "recaps": recaps,
        "checkins": sorted(checkins, key=lambda item: item["date"], reverse=True)[:28],
    }


def change_journey(request: Request, body: JourneyChange):
    ws = workspace(request)
    with ws.store.sessions.begin() as db:
        user = db.get(User, ws.user_id)
        prefs = dict(user.preferences or {})
        today = local_today(prefs)
        current = dict(prefs.get("journey") or {})
        if body.id:
            prefs["journey"] = {"id": body.id, "started": today.isoformat(), "paused": False, "repeats": []}
        elif body.action == "leave":
            prefs["journey"] = None
        else:
            if not current:
                raise HTTPException(409, "Choose a journey first.")
            if body.action == "pause":
                current["paused"] = True
            elif body.action == "resume":
                current["paused"] = False
            elif body.action == "repeat_week":
                activities, daily, _, _ = _context(db, ws.user_id)
                progress = journey_progress(current, activities, daily, today, prefs)
                if not progress or progress["current_slot"] is None:
                    raise HTTPException(409, "There is no current journey week to repeat.")
                week_number = progress["weeks"][progress["current_slot"] - 1]["week"]
                repeats = list(current.get("repeats", []))
                repeats.append(week_number)
                current["repeats"] = repeats
            prefs["journey"] = current
        user.preferences = prefs
    rederive_user(ws.store, ws.user_id)
    return journey_view(request)


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
        from ..db.models import now_iso

        row.updated_at = now_iso()
        tone = (user.preferences or {}).get("companion_tone", "cheerful")
    rederive_user(ws.store, ws.user_id)
    reply = render_message(f"checkin_reply_{body.mood}", ws.user_id, day, tone) if body.mood else None
    return {"date": day.isoformat(), **body.model_dump(), "reply": reply}


def mark_milestones_seen(request: Request, body: SeenInput):
    ws = workspace(request)
    with ws.store.sessions.begin() as db:
        for id in body.ids:
            award = db.get(MilestoneAward, (ws.user_id, id))
            if award:
                award.seen = True
    return {"ok": True}


def recap_view(request: Request, week: date):
    ws = workspace(request)
    with ws.store.sessions.begin() as db:
        user = db.get(User, ws.user_id)
        prefs = user.preferences or {}
        today = local_today(prefs)
        start = date.fromisoformat(week_start(week, prefs.get("week_start", "monday")))
        if week != start or start + timedelta(days=6) >= today:
            raise HTTPException(422, "Choose the start of a completed week.")
        row = db.get(WeeklyRecap, (ws.user_id, start.isoformat()))
        if row is None:
            activities, daily, _, _ = _context(db, ws.user_id)
            awards = [
                award.milestone_id
                for award in db.scalars(
                    select(MilestoneAward).where(
                        MilestoneAward.user_id == ws.user_id,
                        MilestoneAward.earned_on >= start.isoformat(),
                        MilestoneAward.earned_on <= (start + timedelta(days=6)).isoformat(),
                    )
                )
            ]
            data = weekly_recap(
                start,
                activities,
                daily,
                prefs,
                streak(activities, daily, prefs, start + timedelta(days=6)),
                awards,
            )
            row = WeeklyRecap(
                user_id=ws.user_id, week_start=start.isoformat(), version=1, data=data, seen=False
            )
            db.add(row)
        result = {**row.data, "seen": row.seen}
    return result


def mark_recap_seen(request: Request, week: date):
    ws = workspace(request)
    with ws.store.sessions.begin() as db:
        row = db.get(WeeklyRecap, (ws.user_id, week.isoformat()))
        if not row:
            raise HTTPException(404, "That weekly story is not available yet.")
        row.seen = True
    return {"ok": True}


def register(app):
    for prefix in ("/api", "/api/demo"):
        app.add_api_route(f"{prefix}/journey", journey_view, methods=["GET"])
        app.add_api_route(f"{prefix}/journey", change_journey, methods=["PUT"])
        app.add_api_route(f"{prefix}/checkins/{{day}}", put_checkin, methods=["PUT"])
        app.add_api_route(f"{prefix}/milestones/seen", mark_milestones_seen, methods=["POST"])
        app.add_api_route(f"{prefix}/recaps/{{week}}", recap_view, methods=["GET"])
        app.add_api_route(f"{prefix}/recaps/{{week}}/seen", mark_recap_seen, methods=["POST"])
