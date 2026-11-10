from __future__ import annotations

import csv
import hashlib
import io
import json
import shutil
import time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import delete, select

from ..config import COOKIE
from ..db.models import (
    Activity,
    ActivityDerived,
    ActivityFeel,
    ActivitySamples,
    BestEffort,
    CheckIn,
    Connection,
    Daily,
    Job,
    MilestoneAward,
    Note,
    User,
    WeeklyRecap,
)
from ..derive import rederive_user
from ..garmin.client import GarminError
from ..main import (
    KeyInput,
    Preferences,
    update_job_cancel,
)
from ..workspace import workspace


class ProfileInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)


def register(app, store, worker, current_user, limit, client_factory):
    @app.put("/api/profile")
    def save_profile(body: ProfileInput, user=Depends(current_user)):  # noqa: B008
        if not body.name.strip():
            raise HTTPException(422, "Enter a display name.")
        with store.sessions.begin() as db:
            db.get(User, user.id).name = body.name.strip()
        return {"name": body.name.strip()}

    @app.put("/api/demo/profile")
    def save_demo_profile(request: Request, body: ProfileInput):
        if not body.name.strip():
            raise HTTPException(422, "Enter a display name.")
        ws = workspace(request)
        with ws.store.sessions.begin() as db:
            db.get(User, ws.user_id).name = body.name.strip()
        return {"name": body.name.strip()}

    @app.get("/api/preferences", response_model=Preferences)
    def get_preferences(user=Depends(current_user)):  # noqa: B008 - FastAPI dependency declaration
        with store.sessions() as db:
            return db.get(User, user.id).preferences

    @app.get("/api/demo/preferences", response_model=Preferences)
    def get_demo_preferences(request: Request):
        ws = workspace(request)
        with ws.store.sessions() as db:
            return db.get(User, ws.user_id).preferences

    @app.put("/api/demo/preferences")
    def save_demo_preferences(request: Request, body: Preferences):
        ws = workspace(request)
        with ws.store.sessions.begin() as db:
            user = db.get(User, ws.user_id)
            first_finish = not user.preferences.get("onboarded", False) and body.onboarded
            user.preferences = body.model_dump()
        if first_finish:
            rederive_user(ws.store, ws.user_id)
        return {"ok": True}

    @app.post("/api/connection")
    def connect(body: KeyInput, request: Request, user=Depends(current_user)):  # noqa: B008 - FastAPI dependency declaration
        limit(request, "connect", 4)
        if body.region not in ("com", "cn"):
            raise HTTPException(422, "Choose a valid Garmin region.")
        key = body.api_key.strip()
        if len(key) < 16:
            raise HTTPException(422, "Enter the complete Personal API key.")
        client = client_factory(key, body.region)
        try:
            profile = client.get("/userprofile-service/userprofile/settings")
            if not isinstance(profile, dict):
                raise GarminError("Garmin returned an unexpected profile response.")
        except GarminError as exc:
            raise HTTPException(exc.status if exc.status in (401, 403, 429) else 502, str(exc)) from None
        finally:
            client.close()
        with store.sessions.begin() as db:
            conn = db.get(Connection, user.id)
            if not conn:
                conn = Connection(user_id=user.id)
                db.add(conn)
                revision = 1
            else:
                if (
                    conn.profile.get("displayName")
                    and profile.get("displayName")
                    and conn.profile["displayName"] != profile["displayName"]
                ):
                    raise HTTPException(
                        409,
                        "This key belongs to a different Garmin profile. Export and delete the existing imported data before connecting another account.",  # noqa: E501 - existing literal
                    )
                revision = conn.revision + 1
            conn.encrypted_key, conn.region, conn.profile, conn.state = (
                store.encrypt(key),
                body.region,
                profile,
                "connected",
            )
            conn.revision, conn.message = revision, None
        return {"ok": True, "job_id": worker.enqueue(user.id, 90)}

    @app.delete("/api/connection")
    def disconnect(user=Depends(current_user)):  # noqa: B008 - FastAPI dependency declaration
        with store.sessions.begin() as db:
            conn = db.get(Connection, user.id)
            if conn:
                conn.encrypted_key, conn.state, conn.message = None, "disconnected", None
                conn.revision += 1
            db.execute(update_job_cancel(user.id))
        return {"ok": True}

    @app.post("/api/sync")
    def sync(request: Request, days: int = 3, user=Depends(current_user)):  # noqa: B008 - FastAPI dependency declaration
        limit(request, "sync", 6)
        if not 1 <= days <= 366:
            raise HTTPException(422, "Choose between 1 and 366 days.")
        with store.sessions() as db:
            conn = db.get(Connection, user.id)
            if not conn or not conn.encrypted_key:
                raise HTTPException(409, "Connect your Garmin account first.")
            if conn.profile.get("_retry_after", 0) > time.time():
                raise HTTPException(429, "Garmin requested a cooldown. Please wait before syncing again.")
        return {"job_id": worker.enqueue(user.id, days)}

    @app.put("/api/preferences")
    def preferences(body: Preferences, user=Depends(current_user)):  # noqa: B008 - FastAPI dependency declaration
        if (
            body.units not in ("metric", "imperial")
            or body.week_start not in ("monday", "sunday")
            or body.theme not in ("light", "dark", "system")
        ):
            raise HTTPException(422, "Choose valid preferences.")
        try:
            ZoneInfo(body.timezone)
        except ZoneInfoNotFoundError:
            raise HTTPException(422, "Choose a valid IANA timezone, such as America/Toronto.") from None
        with store.sessions.begin() as db:
            saved = db.get(User, user.id)
            first_finish = not saved.preferences.get("onboarded", False) and body.onboarded
            saved.preferences = body.model_dump()
        if first_finish:
            rederive_user(store, user.id)
        return {"ok": True}

    @app.get("/api/export")
    def export(format: str = "json", user=Depends(current_user)):  # noqa: B008 - FastAPI dependency declaration
        with store.sessions() as db:
            streams = {
                s.activity_id: s.samples
                for s in db.scalars(select(ActivitySamples).where(ActivitySamples.user_id == user.id))
            }
            activities = [
                {**r.data, "samples": streams.get(r.id, r.data.get("samples", [])), "raw": r.raw}
                for r in db.scalars(select(Activity).where(Activity.user_id == user.id))
            ]
            daily = [
                {**r.data, "raw": r.raw} for r in db.scalars(select(Daily).where(Daily.user_id == user.id))
            ]
            notes = [
                {"activity_id": n.activity_id, "text": n.text, "rpe": n.rpe, "tags": n.tags}
                for n in db.scalars(select(Note).where(Note.user_id == user.id))
            ]
        if format == "csv":
            out = io.StringIO()
            fields = [
                "id",
                "name",
                "date",
                "sport",
                "distance",
                "duration",
                "average_hr",
                "elevation",
                "power",
                "source",
            ]
            writer = csv.DictWriter(out, fieldnames=fields, extrasaction="ignore")
            writer.writeheader()
            for a in activities:
                # Prevent spreadsheet formula injection in exported user-defined names.
                writer.writerow(
                    {
                        k: "'" + v
                        if isinstance(v := a.get(k), str) and v.startswith(("=", "+", "-", "@"))
                        else v
                        for k in fields
                    }
                )
            return Response(
                out.getvalue(),
                media_type="text/csv",
                headers={"Content-Disposition": 'attachment; filename="open-garmin-activities.csv"'},
            )
        if format != "json":
            raise HTTPException(422, "Choose JSON or CSV.")
        payload = {
            "schema_version": 1,
            "attribution": "Garmin device-sourced data. App notes and derived metrics are identified separately.",  # noqa: E501 - existing literal
            "activities": activities,
            "daily": daily,
            "notes": notes,
            "preferences": user.preferences,
        }
        return Response(
            json.dumps(payload, allow_nan=False),
            media_type="application/json",
            headers={"Content-Disposition": 'attachment; filename="open-garmin-export.json"'},
        )

    def erase_data(uid):
        with store.archive_lock, store.sessions.begin() as db:
            conn = db.get(Connection, uid)
            if conn:
                conn.encrypted_key, conn.state = None, "disconnected"
                conn.revision += 1
            for model in (
                Note,
                ActivityFeel,
                ActivitySamples,
                ActivityDerived,
                BestEffort,
                MilestoneAward,
                WeeklyRecap,
                CheckIn,
                Activity,
                Daily,
                Job,
            ):
                db.execute(delete(model).where(model.user_id == uid))
            folder = store.directory / "originals" / hashlib.sha256(uid.encode()).hexdigest()
            if folder.exists():
                shutil.rmtree(folder)

    @app.delete("/api/data")
    def delete_data(user=Depends(current_user)):  # noqa: B008 - FastAPI dependency declaration
        erase_data(user.id)
        return {"ok": True}

    @app.delete("/api/account")
    def delete_account(response: Response, user=Depends(current_user)):  # noqa: B008 - FastAPI dependency declaration
        erase_data(user.id)
        with store.sessions.begin() as db:
            db.execute(delete(User).where(User.id == user.id))
        response.delete_cookie(COOKIE)
        return {"ok": True}
