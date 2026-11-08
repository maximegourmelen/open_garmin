from __future__ import annotations

import hashlib
import io
import zipfile
from datetime import date
from pathlib import Path
from typing import Annotated
from xml.etree import ElementTree as ET

from fastapi import Depends, HTTPException, Query, Request, Response, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select

from ..main import (
    NoteInput,
)
from ..storage import Activity, ActivityDerived, ActivityFeel, ActivitySamples, Connection, Note
from ..workspace import workspace
from .activity_views import detail as activity_detail
from .activity_views import summary as activity_summary


def register(app, store, worker, current_user, limit):
    def read_list(source_store, user_id, from_date, to_date, sport, q, page_limit, cursor):
        with source_store.sessions() as db:
            rows = list(
                db.scalars(
                    select(Activity)
                    .where(Activity.user_id == user_id)
                    .order_by(Activity.date.desc(), Activity.id.desc())
                )
            )
            derived = {
                row.activity_id: row.data
                for row in db.scalars(select(ActivityDerived).where(ActivityDerived.user_id == user_id))
            }
        sports = {value.strip() for value in sport.split(",") if value.strip()} if sport else None
        query = q.strip().casefold()
        items = []
        for row in rows:
            data = row.data
            if from_date and row.date < from_date.isoformat() or to_date and row.date > to_date.isoformat():
                continue
            if sports and data.get("sport") not in sports:
                continue
            search = " ".join(
                (
                    data.get("name", ""),
                    data.get("sport", ""),
                    data.get("location_name") or "",
                    row.date,
                    date.fromisoformat(row.date).strftime("%b %d"),
                )
            ).casefold()
            if query and query not in search:
                continue
            items.append(activity_summary(data, derived.get(row.id)))
        parents = {row.id: row.data.get("parent_id") for row in rows}
        top_level = [item for item in items if not parents.get(item["id"])]
        totals = {
            "sessions": len(top_level),
            "duration": round(sum(item["duration"] or 0 for item in top_level)),
            "distance": round(sum(item["distance"] or 0 for item in top_level), 1),
            "effort_points": round(sum(item["effort_points"] or 0 for item in top_level)),
        }
        page = items[cursor : cursor + page_limit]
        next_cursor = str(cursor + page_limit) if cursor + page_limit < len(items) else None
        return {"items": page, "next_cursor": next_cursor, "totals": totals}

    @app.get("/api/activities")
    def list_activities(
        from_date: Annotated[date | None, Query(alias="from")] = None,
        to_date: Annotated[date | None, Query(alias="to")] = None,
        sport: str = "",
        q: str = "",
        limit: int = Query(default=50, ge=1, le=100),
        cursor: int = Query(default=0, ge=0),
        user=Depends(current_user),  # noqa: B008 - FastAPI dependency declaration
    ):
        return read_list(store, user.id, from_date, to_date, sport, q, limit, cursor)

    @app.get("/api/demo/activities")
    def demo_list_activities(
        request: Request,
        from_date: Annotated[date | None, Query(alias="from")] = None,
        to_date: Annotated[date | None, Query(alias="to")] = None,
        sport: str = "",
        q: str = "",
        limit: int = Query(default=50, ge=1, le=100),
        cursor: int = Query(default=0, ge=0),
    ):
        ws = workspace(request)
        return read_list(ws.store, ws.user_id, from_date, to_date, sport, q, limit, cursor)

    def read_activity(source_store, user_id, activity_id):
        with source_store.sessions() as db:
            row = db.get(Activity, (user_id, activity_id))
            if not row:
                raise HTTPException(404, "This activity is not in your workspace.")
            note = db.get(Note, (user_id, activity_id))
            feel = db.get(ActivityFeel, (user_id, activity_id))
            samples = db.get(ActivitySamples, (user_id, activity_id))
            derived = db.get(ActivityDerived, (user_id, activity_id))
            full_samples = samples.samples if samples else row.data.get("samples", [])
            note_data = (
                {"text": note.text, "rpe": note.rpe, "feel": feel.feel if feel else None, "tags": note.tags}
                if note
                else None
            )
            return activity_detail(row.data, derived.data if derived else None, full_samples, note_data)

    @app.get("/api/activities/{activity_id}")
    def activity(activity_id: str, user=Depends(current_user)):  # noqa: B008 - FastAPI dependency declaration
        return read_activity(store, user.id, activity_id)

    @app.get("/api/demo/activities/{activity_id}")
    def demo_activity(activity_id: str, request: Request):
        ws = workspace(request)
        return read_activity(ws.store, ws.user_id, activity_id)

    def read_gpx(source_store, user_id, activity_id):
        with source_store.sessions() as db:
            row = db.get(Activity, (user_id, activity_id))
            if not row:
                raise HTTPException(404, "This activity is not in your workspace.")
            stream = db.get(ActivitySamples, (user_id, activity_id))
            samples = stream.samples if stream else row.data.get("samples", [])
            gps = [
                sample
                for sample in samples
                if sample.get("lat") is not None and sample.get("lon") is not None
            ]
            if len(gps) < 2:
                raise HTTPException(404, "This activity has no route to export.")
            root = ET.Element(
                "gpx", version="1.1", creator="Open Garmin", xmlns="http://www.topografix.com/GPX/1/1"
            )
            track = ET.SubElement(root, "trk")
            ET.SubElement(track, "name").text = row.data.get("name", "Activity")
            segment = ET.SubElement(track, "trkseg")
            for sample in gps:
                point = ET.SubElement(segment, "trkpt", lat=str(sample["lat"]), lon=str(sample["lon"]))
                if sample.get("elevation") is not None:
                    ET.SubElement(point, "ele").text = str(sample["elevation"])
            return Response(
                ET.tostring(root, encoding="utf-8", xml_declaration=True), media_type="application/gpx+xml"
            )

    @app.get("/api/activities/{activity_id}/gpx")
    def gpx(activity_id: str, user=Depends(current_user)):  # noqa: B008 - FastAPI dependency declaration
        return read_gpx(store, user.id, activity_id)

    @app.get("/api/demo/activities/{activity_id}/gpx")
    def demo_gpx(activity_id: str, request: Request):
        ws = workspace(request)
        return read_gpx(ws.store, ws.user_id, activity_id)

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

    def write_note(source_store, user_id, activity_id, body):
        with source_store.sessions.begin() as db:
            if not db.get(Activity, (user_id, activity_id)):
                raise HTTPException(404, "Activity not found.")
            row = db.get(Note, (user_id, activity_id))
            if not row:
                row = Note(user_id=user_id, activity_id=activity_id)
                db.add(row)
            row.text, row.rpe, row.tags = body.text, body.rpe, [t[:40] for t in body.tags]
            if "feel" in body.model_fields_set:
                feel = db.get(ActivityFeel, (user_id, activity_id))
                if not feel:
                    feel = ActivityFeel(user_id=user_id, activity_id=activity_id)
                    db.add(feel)
                feel.feel = body.feel
        return {"ok": True}

    @app.put("/api/activities/{activity_id}/note")
    def note(activity_id: str, body: NoteInput, user=Depends(current_user)):  # noqa: B008 - FastAPI dependency declaration
        return write_note(store, user.id, activity_id, body)

    @app.put("/api/demo/activities/{activity_id}/note")
    def demo_note(activity_id: str, body: NoteInput, request: Request):
        ws = workspace(request)
        return write_note(ws.store, ws.user_id, activity_id, body)

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
