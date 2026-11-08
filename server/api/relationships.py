"""Daily relationship explorer for both workspaces."""

from __future__ import annotations

from datetime import timedelta
from typing import Literal

from fastapi import Request
from sqlalchemy import select

from ..analytics.common import local_today
from ..analytics.relationships import relationship
from ..db.models import Activity, ActivityDerived, CheckIn, Daily, User
from ..workspace import workspace

Variable = Literal[
    "sleep_minutes",
    "sleep_score",
    "hrv",
    "resting_hr",
    "bb_at_wake",
    "stress_avg",
    "steps",
    "active_minutes",
    "effort_points",
    "checkin_energy",
    "checkin_mood",
]
Range = Literal["7D", "4W", "3M", "1Y"]


def relationship_view(
    request: Request, x: Variable, y: Variable, lag: Literal[0, 1] = 0, range: Range = "3M"
):
    ws = workspace(request)
    with ws.store.sessions() as db:
        prefs = db.get(User, ws.user_id).preferences or {}
        today = local_today(prefs)
        first = today - timedelta(days={"7D": 7, "4W": 28, "3M": 90, "1Y": 365}[range] - 1)
        daily = list(
            db.scalars(
                select(Daily).where(
                    Daily.user_id == ws.user_id,
                    Daily.date >= first.isoformat(),
                    Daily.date <= today.isoformat(),
                )
            )
        )
        checkins = list(
            db.scalars(
                select(CheckIn).where(
                    CheckIn.user_id == ws.user_id,
                    CheckIn.date >= first.isoformat(),
                    CheckIn.date <= today.isoformat(),
                )
            )
        )
        activities = list(
            db.scalars(
                select(Activity).where(
                    Activity.user_id == ws.user_id,
                    Activity.date >= first.isoformat(),
                    Activity.date <= today.isoformat(),
                )
            )
        )
        derived = {
            row.activity_id: row.data
            for row in db.scalars(select(ActivityDerived).where(ActivityDerived.user_id == ws.user_id))
        }
    records = {}
    for row in daily:
        data = row.data
        records[row.date] = {
            "date": row.date,
            "sleep_minutes": data["sleep_seconds"] / 60 if data.get("sleep_seconds") is not None else None,
            "sleep_score": data.get("sleep_score"),
            "hrv": data.get("hrv"),
            "resting_hr": data.get("resting_hr"),
            "bb_at_wake": data.get("bb_at_wake"),
            "stress_avg": data.get("stress"),
            "steps": data.get("steps"),
            "active_minutes": (data.get("intensity_moderate") or 0)
            + 2 * (data.get("intensity_vigorous") or 0)
            if data.get("intensity_moderate") is not None or data.get("intensity_vigorous") is not None
            else None,
            "effort_points": 0,
        }
    for row in activities:
        if row.data.get("parent_id"):
            continue
        record = records.setdefault(row.date, {"date": row.date})
        record["effort_points"] = record.get("effort_points", 0) + (
            derived.get(row.id, {}).get("effort_points") or 0
        )
    for row in checkins:
        record = records.setdefault(row.date, {"date": row.date})
        record.update(checkin_energy=row.energy, checkin_mood=row.mood)
    result = relationship(list(records.values()), x, y, lag)
    result.update(range=range, **{"from": first.isoformat(), "to": today.isoformat()})
    return result


def register(app):
    app.add_api_route("/api/relationships", relationship_view, methods=["GET"])
    app.add_api_route("/api/demo/relationships", relationship_view, methods=["GET"])
