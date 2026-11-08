"""Workspace status and demo access rules."""

from __future__ import annotations

import os

from fastapi import HTTPException, Request
from sqlalchemy import func, select

from ..db.models import Connection, Daily, Job, MilestoneAward, User, WeeklyRecap
from ..workspace import workspace

DEMO_DENIED = "This is the demo. Connect Garmin to use your own data."


def register(app):
    @app.get("/api/status")
    @app.get("/api/demo/status")
    def status(request: Request):
        ws = workspace(request)
        with ws.store.sessions() as db:
            user = db.get(User, ws.user_id)
            conn = db.get(Connection, ws.user_id)
            jobs = list(
                db.scalars(
                    select(Job).where(Job.user_id == ws.user_id).order_by(Job.created_at.desc()).limit(10)
                )
            )
            data_through = db.scalar(select(func.max(Daily.date)).where(Daily.user_id == ws.user_id))
            milestones = (
                db.scalar(
                    select(func.count())
                    .select_from(MilestoneAward)
                    .where(MilestoneAward.user_id == ws.user_id, MilestoneAward.seen.is_(False))
                )
                or 0
            )
            recap_week = db.scalar(
                select(func.max(WeeklyRecap.week_start)).where(
                    WeeklyRecap.user_id == ws.user_id, WeeklyRecap.seen.is_(False)
                )
            )
            return {
                "mode": ws.mode,
                "local_mode": ws.mode == "live" and os.environ.get("OPEN_GARMIN_LOCAL_MODE") == "1",
                "user": {"name": user.name},
                "connection": {
                    "connected": bool(conn and conn.encrypted_key),
                    "state": conn.state if conn else "not_connected",
                    "last_checked": conn.last_checked if conn else None,
                    "last_success": conn.last_success if conn else None,
                    "message": conn.message if conn else None,
                    "region": conn.region if conn else "com",
                },
                "jobs": [
                    {
                        "id": job.id,
                        "kind": job.kind,
                        "state": job.state,
                        "progress": job.progress,
                        "message": job.message,
                    }
                    for job in jobs
                ],
                "rederive": {"state": "idle", "progress": 100},
                "data_through": data_through,
                "unseen": {"milestones": milestones, "recap_week": recap_week},
            }

    @app.post("/api/demo/connection")
    @app.delete("/api/demo/connection")
    @app.post("/api/demo/sync")
    @app.post("/api/demo/import/fit")
    @app.delete("/api/demo/data")
    @app.delete("/api/demo/account")
    @app.get("/api/demo/export")
    @app.get("/api/demo/activities/{activity_id}/original")
    def denied_demo_mutation():
        raise HTTPException(403, DEMO_DENIED)
