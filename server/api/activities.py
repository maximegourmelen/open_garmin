from __future__ import annotations

import hashlib
import io
import zipfile
from pathlib import Path

from fastapi import Depends, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

from ..analytics.common import downsample_samples
from ..main import (
    NoteInput,
)
from ..storage import Activity, ActivityDerived, ActivitySamples, Connection, Note
from ..workspace import workspace


def register(app, store, worker, current_user, limit):
    def read_activity(source_store, user_id, activity_id):
        with source_store.sessions() as db:
            row = db.get(Activity, (user_id, activity_id))
            if not row:
                raise HTTPException(404, "This activity is not in your workspace.")
            note = db.get(Note, (user_id, activity_id))
            samples = db.get(ActivitySamples, (user_id, activity_id))
            derived = db.get(ActivityDerived, (user_id, activity_id))
            full_samples = samples.samples if samples else row.data.get("samples", [])
            return {
                **row.data,
                "effort_points": derived.data.get("effort_points") if derived else None,
                "zone_minutes": derived.data.get("zone_minutes") if derived else None,
                "zone_source": derived.data.get("zone_source") if derived else None,
                "effort_source": "calculated" if derived else None,
                "effort_method": "effort_points@1" if derived else None,
                "samples": downsample_samples(full_samples),
                "sample_count": len(full_samples)
                if samples
                else row.data.get("sample_count", len(full_samples)),
                "note": {"text": note.text, "rpe": note.rpe, "tags": note.tags}
                if note
                else {"text": "", "rpe": None, "tags": []},
            }

    @app.get("/api/activities/{activity_id}")
    def activity(activity_id: str, user=Depends(current_user)):  # noqa: B008 - FastAPI dependency declaration
        return read_activity(store, user.id, activity_id)

    @app.get("/api/demo/activities/{activity_id}")
    def demo_activity(activity_id: str, request: Request):
        ws = workspace(request)
        return read_activity(ws.store, ws.user_id, activity_id)

    @app.post("/api/activities/{activity_id}/details")
    def load_details(activity_id: str, request: Request, user=Depends(current_user)):  # noqa: B008 - FastAPI dependency declaration
        limit(request, "details", 20)
        with store.sessions() as db:
            row = db.get(Activity, (user.id, activity_id))
            conn = db.get(Connection, user.id)
            if not row:
                raise HTTPException(404, "Activity not found.")
            if not conn or not conn.encrypted_key:
                raise HTTPException(409, "Reconnect Garmin to download this original.")
        return {"job_id": worker.enqueue(user.id, activity_id=activity_id)}

    @app.put("/api/activities/{activity_id}/note")
    def note(activity_id: str, body: NoteInput, user=Depends(current_user)):  # noqa: B008 - FastAPI dependency declaration
        with store.sessions.begin() as db:
            if not db.get(Activity, (user.id, activity_id)):
                raise HTTPException(404, "Activity not found.")
            row = db.get(Note, (user.id, activity_id))
            if not row:
                row = Note(user_id=user.id, activity_id=activity_id)
                db.add(row)
            row.text, row.rpe, row.tags = body.text, body.rpe, [t[:40] for t in body.tags]
        return {"ok": True}

    @app.post("/api/import/fit")
    async def import_fit(file: UploadFile, user=Depends(current_user)):  # noqa: B008 - FastAPI dependency declaration
        if not file.filename or not file.filename.lower().endswith(".fit"):
            raise HTTPException(422, "Choose a FIT activity file.")
        content = await file.read(60 * 1024 * 1024 + 1)
        if len(content) > 60 * 1024 * 1024:
            raise HTTPException(413, "FIT file exceeds the 60 MB limit.")
        try:
            from .. import app as app_shim

            details = app_shim.parse_original(content)
        except Exception:
            raise HTTPException(422, "The FIT activity could not be read.") from None
        start = details.get("recorded_start")
        if not start or not details.get("samples"):
            raise HTTPException(422, "The FIT file has no timestamped activity samples.")
        digest = hashlib.sha256(content).hexdigest()
        activity_id = f"fit-{digest[:32]}"
        samples = details["samples"]
        last = samples[-1]
        distance = last.get("distance")
        duration = last.get("time")
        hearts = [s["hr"] for s in samples if s.get("hr") is not None]
        values = {
            "id": activity_id,
            "name": Path(file.filename).stem[:120] or "Imported activity",
            "sport": details.get("recorded_sport", "other"),
            "type": details.get("recorded_sport", "other"),
            "start": start,
            "start_utc": start,
            "date": start[:10],
            "distance": distance,
            "duration": duration,
            "elapsed": duration,
            "moving": duration,
            "average_hr": round(sum(hearts) / len(hearts)) if hearts else None,
            "max_hr": max(hearts) if hearts else None,
            "average_speed": distance / duration if distance is not None and duration else None,
            "elevation": None,
            "calories": None,
            "power": None,
            "cadence": None,
            "aerobic_te": None,
            "anaerobic_te": None,
            "training_load": None,
            "vo2max": None,
            "description": "",
            "parent_id": None,
            "is_parent": False,
            "device": details.get("recorded_device", "Garmin"),
            "source": "imported_fit",
            "zones": [None] * 5,
            **details,
            "sample_count": len(samples),
        }
        with store.archive_lock, store.sessions.begin() as db:
            if db.get(Activity, (user.id, activity_id)):
                return {"id": activity_id, "status": "duplicate"}
            path = store.archive_path(user.id, activity_id)
            path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            archive = io.BytesIO()
            with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as container:
                container.writestr("activity.fit", content)
            path.write_bytes(archive.getvalue())
            path.chmod(0o600)
            db.add(
                Activity(
                    user_id=user.id,
                    id=activity_id,
                    date=values["date"],
                    data={**values, "samples": samples[:: max(1, (len(samples) + 69) // 70)]},
                    raw={"source": "user_fit", "sha256": digest},
                    details_loaded=True,
                )
            )
            db.add(ActivitySamples(user_id=user.id, activity_id=activity_id, samples=samples))
        return {"id": activity_id, "status": "imported"}

    @app.get("/api/activities/{activity_id}/original")
    def original(activity_id: str, user=Depends(current_user)):  # noqa: B008 - FastAPI dependency declaration
        with store.sessions() as db:
            row = db.get(Activity, (user.id, activity_id))
            if not row:
                raise HTTPException(404, "Activity not found.")
            path = store.archive_path(user.id, activity_id)
            if not path.is_file():
                raise HTTPException(404, "This original has not been downloaded yet.")
            if not row.details_loaded:
                raise HTTPException(409, "Download updated activity details before exporting this original.")
        return FileResponse(path, media_type="application/zip", filename=f"garmin-{activity_id}.zip")
