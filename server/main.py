from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .garmin import GarminClient
from .security import install_security
from .storage import Job, Store
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
    tags: list[str] = Field(default_factory=list, max_length=12)


class Preferences(BaseModel):
    units: str = "metric"
    timezone: str = "America/Toronto"
    week_start: str = "monday"
    weekly_distance: float = Field(default=40000, ge=0, le=1000000)
    weekly_minutes: int = Field(default=300, ge=0, le=10080)
    primary_sport: str = "running"
    theme: str = "light"


def create_app(store: Store | None = None, start_worker: bool = True, client_factory=GarminClient):
    store = store or Store()
    worker = Worker(store, client_factory)

    @asynccontextmanager
    async def lifespan(app):
        if start_worker:
            worker.start()
        yield
        worker.stop()

    app = FastAPI(title="Open Garmin", version="0.1.0", lifespan=lifespan)
    app.state.store, app.state.worker = store, worker

    current_user, set_session, limit = install_security(app, store)

    from .api import activities as activities_api
    from .api import auth as auth_api
    from .api import settings as settings_api

    auth_api.register(app, store, worker, current_user, set_session, limit)
    settings_api.register(app, store, worker, current_user, limit, client_factory)
    activities_api.register(app, store, worker, current_user, limit)

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
