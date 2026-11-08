"""Evidence-backed insights in live and demo workspaces."""

from __future__ import annotations

from fastapi import Request
from sqlalchemy import select

from ..analytics.common import local_today
from ..analytics.insights import insights_for
from ..db.models import Activity, ActivityDerived, BestEffort, CheckIn, Daily, User
from ..workspace import workspace
from .schemas import Insight


def insight_view(request: Request):
    ws = workspace(request)
    with ws.store.sessions() as db:
        prefs = db.get(User, ws.user_id).preferences or {}
        today = local_today(prefs)
        daily = [
            {"date": row.date, **row.data}
            for row in db.scalars(select(Daily).where(Daily.user_id == ws.user_id))
        ]
        derived = {
            row.activity_id: row.data
            for row in db.scalars(select(ActivityDerived).where(ActivityDerived.user_id == ws.user_id))
        }
        activities = [
            {**row.data, **derived.get(row.id, {})}
            for row in db.scalars(select(Activity).where(Activity.user_id == ws.user_id))
        ]
        checkins = [
            {"date": row.date, "energy": row.energy, "mood": row.mood}
            for row in db.scalars(select(CheckIn).where(CheckIn.user_id == ws.user_id))
        ]
        candidates = [
            {"activity_id": row.activity_id, "kind": row.kind, "date": row.date, "value": row.value}
            for row in db.scalars(select(BestEffort).where(BestEffort.user_id == ws.user_id))
        ]
    winners = {}
    for row in candidates:
        previous = winners.get(row["kind"])
        if previous is None or (
            row["value"] < previous["value"]
            if row["kind"].startswith("distance:")
            else row["value"] > previous["value"]
        ):
            winners[row["kind"]] = row
    return insights_for(activities, daily, checkins, today, prefs, list(winners.values()))


def register(app):
    app.add_api_route("/api/insights", insight_view, methods=["GET"], response_model=list[Insight])
    app.add_api_route("/api/demo/insights", insight_view, methods=["GET"], response_model=list[Insight])
