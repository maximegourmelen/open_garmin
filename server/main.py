from __future__ import annotations

import json
import threading
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .db.models import Job
from .db.store import Store
from .demo.seed import build_demo_workspace
from .derive import rederive_all
from .garmin.client import GarminClient
from .security import install_security
from .worker import Worker


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=10, max_length=256)
    name: str = Field(default="Athlete", max_length=120)


class KeyInput(BaseModel):
    api_key: str = Field(min_length=16, max_length=2000, repr=False)
    region: str = "com"


class NoteInput(BaseModel):
    text: str = Field(default="", max_length=10000)
    rpe: int | None = Field(default=None, ge=0, le=10)
    feel: int | None = Field(default=None, ge=1, le=5)
    tags: list[str] = Field(default_factory=list, max_length=12)


JOURNEY_IDS = frozenset(
    journey["id"]
    for journey in json.loads((Path(__file__).parent / "companion" / "journeys.json").read_text())
)
TODAY_LAYOUT_ITEMS = frozenset(
    {
        "week",
        "suggestion",
        "streak",
        "checkin",
        "latest_activity",
        "sleep",
        "body_battery",
        "resting_hr",
        "next_milestone",
        "insights",
        "steps",
        "stress",
        "hrv",
        "journey",
    }
)


class JourneyPreference(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    started: str
    paused: bool = False
    repeats: list[int] = Field(default_factory=list)

    @field_validator("id")
    @classmethod
    def known_journey(cls, value: str) -> str:
        if value not in JOURNEY_IDS:
            raise ValueError("Choose a known journey.")
        return value

    @field_validator("started")
    @classmethod
    def valid_start(cls, value: str) -> str:
        date.fromisoformat(value)
        return value

    @field_validator("repeats")
    @classmethod
    def valid_repeats(cls, value: list[int]) -> list[int]:
        if len(value) > 52 or any(week < 1 or week > 52 for week in value):
            raise ValueError("Choose valid journey weeks to repeat.")
        return value


class Preferences(BaseModel):
    model_config = ConfigDict(extra="forbid")
    units: Literal["metric", "imperial"] = "metric"
    timezone: str = "America/Toronto"
    week_start: Literal["monday", "sunday"] = "monday"
    weekly_distance: float = Field(default=40000, ge=0, le=1000000)
    weekly_minutes: int = Field(default=150, ge=0, le=10080)
    weekly_sessions: int = Field(default=3, ge=0, le=14)
    primary_sport: Literal["running", "cycling", "strength", "swimming", "walking", "hiking", "other"] = (
        "walking"
    )
    theme: Literal["dark", "light", "system"] = "dark"
    reduce_motion: bool = False
    onboarded: bool = False
    goal_focus: Literal["move_more", "start_running", "build_habit", "sleep_better", "curious"] = "move_more"
    companion_enabled: bool = True
    companion_name: str = Field(default="Pip", min_length=1, max_length=20)
    companion_tone: Literal["cheerful", "calm"] = "cheerful"
    zone_source: Literal["garmin", "custom"] = "garmin"
    max_hr: int | None = Field(default=None, ge=120, le=230)
    steps_goal_source: Literal["garmin", "custom"] = "garmin"
    steps_goal: int = Field(default=8000, ge=1, le=100000)
    today_layout: list[str] = Field(
        default_factory=lambda: [
            "week",
            "suggestion",
            "streak",
            "checkin",
            "latest_activity",
            "sleep",
            "body_battery",
            "resting_hr",
            "next_milestone",
            "insights",
        ]
    )
    nav_collapsed: bool = False
    journey: JourneyPreference | None = None

    @field_validator("companion_name")
    @classmethod
    def clean_companion_name(cls, value: str) -> str:
        name = value.strip()
        if not 1 <= len(name) <= 20:
            raise ValueError("Companion name must be 1–20 characters.")
        return name

    @field_validator("today_layout")
    @classmethod
    def valid_layout(cls, value: list[str]) -> list[str]:
        if len(value) != len(set(value)) or any(item not in TODAY_LAYOUT_ITEMS for item in value):
            raise ValueError("Choose distinct My Day cards.")
        return value

    @model_validator(mode="after")
    def validate_custom_zones(self):
        if self.zone_source == "custom" and self.max_hr is None:
            raise ValueError("Choose a maximum heart rate for custom zones.")
        return self


def create_app(store: Store | None = None, start_worker: bool = True, client_factory=GarminClient):
    store = store or Store()
    worker = Worker(store, client_factory)

    def run_rederive(app):
        try:
            rederive_all(
                store,
                lambda progress: setattr(app.state, "rederive", {"state": "running", "progress": progress}),
            )
        except Exception:
            app.state.rederive = {"state": "idle", "progress": 0}
        else:
            app.state.rederive = {"state": "idle", "progress": 100}

    @asynccontextmanager
    async def lifespan(app):
        if start_worker:
            app.state.rederive = {"state": "running", "progress": 0}
            thread = threading.Thread(target=run_rederive, args=(app,), daemon=True)
            thread.start()
            worker.start()
        yield
        worker.stop()

    app = FastAPI(title="Open Garmin", version="0.1.0", lifespan=lifespan)
    app.state.store, app.state.worker = store, worker
    app.state.rederive = {"state": "idle", "progress": 100}
    app.state.demo_workspace = build_demo_workspace()

    current_user, set_session, limit = install_security(app, store)
    app.state.current_user = current_user

    from .api import activities as activities_api
    from .api import auth as auth_api
    from .api import insights as insights_api
    from .api import journey as journey_api
    from .api import methods as methods_api
    from .api import progress as progress_api
    from .api import relationships as relationships_api
    from .api import settings as settings_api
    from .api import status as status_api
    from .api import today as today_api
    from .api import wellness as wellness_api

    status_api.register(app)
    auth_api.register(app, store, worker, current_user, set_session, limit)
    settings_api.register(app, store, worker, current_user, limit, client_factory)
    activities_api.register(app, store, worker, current_user, limit)
    wellness_api.register(app)
    relationships_api.register(app)
    insights_api.register(app)
    journey_api.register(app)
    methods_api.register(app)
    progress_api.register(app)
    today_api.register(app)

    dist = Path(__file__).resolve().parent.parent / "dist"
    if (dist / "assets").exists():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")
    fonts = Path(__file__).resolve().parent.parent / "public" / "fonts"
    if fonts.exists():
        app.mount("/fonts", StaticFiles(directory=fonts), name="fonts")

    @app.get("/{path:path}")
    def frontend(path: str):
        if path.startswith("api/"):
            raise HTTPException(404, "Endpoint not found.")
        if path == "favicon.svg":
            return FileResponse(Path(__file__).resolve().parent.parent / "public" / "favicon.svg")
        if (dist / "index.html").exists():
            return FileResponse(dist / "index.html")
        return JSONResponse(
            {"message": "Run npm run dev for the frontend, or npm run build to serve it here."}
        )

    return app


def update_job_cancel(uid):
    from sqlalchemy import update

    return (
        update(Job)
        .where(Job.user_id == uid, Job.state.in_(["queued", "running"]))
        .values(state="cancelled", message="Disconnected")
    )
