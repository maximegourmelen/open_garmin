"""Build an isolated, disposable demo workspace."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from ..config import DEFAULT_PREFS
from ..db.models import Activity, ActivitySamples, CheckIn, Daily, MilestoneAward, Note, User
from ..db.store import Store
from ..workspace import Workspace
from .generator import TIMEZONE, generate_demo


def build_demo_workspace() -> Workspace:
    store = Store(in_memory=True)
    today = datetime.now(ZoneInfo(TIMEZONE)).date()
    generated = generate_demo(today)
    prefs = deepcopy(DEFAULT_PREFS)
    prefs["onboarded"] = True
    prefs["journey"] = {
        "id": "walk_to_run_9w",
        "started": (today - timedelta(days=21)).isoformat(),
        "paused": False,
    }
    with store.sessions.begin() as db:
        db.add(
            User(
                id="demo", email="demo@open-garmin.invalid", password_hash="", name="Alex", preferences=prefs
            )
        )
        db.flush()
        for item in generated["daily"]:
            db.add(Daily(user_id="demo", date=item["date"], data=item["data"], raw=item["raw"]))
        for item in generated["activities"]:
            data = {
                **item["data"],
                "source": "demo",
                "detail_state": "ready",
                "sample_count": len(item["samples"]),
                "parser_version": 2,
            }
            activity_id = data["id"]
            db.add(
                Activity(
                    user_id="demo",
                    id=activity_id,
                    date=item["date"],
                    data=data,
                    raw=item["raw"],
                    details_loaded=True,
                )
            )
        db.flush()
        for item in generated["activities"]:
            db.add(ActivitySamples(user_id="demo", activity_id=item["data"]["id"], samples=item["samples"]))
        latest_id = generated["activities"][-1]["data"]["id"]
        db.add(
            Note(
                user_id="demo",
                activity_id=latest_id,
                text="The easy pace felt good today.",
                rpe=3,
                tags=["easy"],
            )
        )
        for offset in (0, 1, 2, 4, 6):
            db.add(
                CheckIn(
                    user_id="demo",
                    date=(today - timedelta(days=offset)).isoformat(),
                    mood=4,
                    energy=3,
                    soreness=0,
                    note="",
                )
            )
        db.add(
            MilestoneAward(
                user_id="demo",
                milestone_id="first_50k",
                earned_on=(today - timedelta(days=2)).isoformat(),
                value=50000,
                seen=False,
            )
        )
    return Workspace(store, "demo", "demo", True)
