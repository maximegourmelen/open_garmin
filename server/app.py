from __future__ import annotations

import csv
import hashlib
import hmac
import io
import json
import os
import re
import secrets
import shutil
import threading
import time
import zipfile
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import Depends, FastAPI, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError

from .garmin import GarminClient, GarminError, parse_original
from .storage import Activity, ActivitySamples, Connection, Daily, Job, LoginSession, Note, Store, User
from .worker import Worker

COOKIE = "og_session"
DEFAULT_PREFS = {"units": "metric", "timezone": "America/Toronto", "week_start": "monday", "weekly_distance": 40000, "weekly_minutes": 300, "primary_sport": "running", "theme": "light"}


def password_hash(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    derived = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=32768, r=8, p=1, maxmem=128 * 1024 * 1024).hex()
    return f"{salt}:{derived}"


def password_matches(password: str, stored: str) -> bool:
    try:
        return hmac.compare_digest(password_hash(password, stored.split(":")[0]), stored)
    except (ValueError, TypeError):
        return False


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
    rate_lock = threading.Lock()
    rate_buckets: dict[str, deque] = defaultdict(deque)

    @asynccontextmanager
    async def lifespan(app):
        if start_worker:
            worker.start()
        yield
        worker.stop()

    app = FastAPI(title="Open Garmin", version="0.1.0", lifespan=lifespan)
    app.state.store, app.state.worker = store, worker

    @app.middleware("http")
    async def protection(request: Request, call_next):
        if request.url.path.startswith("/api") and request.method not in ("GET", "HEAD", "OPTIONS"):
            origin = request.headers.get("origin")
            allowed = {v.strip().rstrip("/") for v in os.environ.get("OPEN_GARMIN_ALLOWED_ORIGINS", "").split(",") if v.strip()}
            allowed.update({f"http://{request.headers.get('host')}", f"https://{request.headers.get('host')}", "http://127.0.0.1:5173", "http://localhost:5173"})
            if origin and origin.rstrip("/") not in allowed:
                return JSONResponse({"detail": "This origin is not allowed."}, status_code=403)
            if request.headers.get("sec-fetch-site") == "cross-site":
                return JSONResponse({"detail": "Cross-site requests are not allowed."}, status_code=403)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["X-Frame-Options"] = "DENY"
        if request.url.path.startswith("/api"):
            response.headers["Cache-Control"] = "no-store"
        else:
            response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
        return response

    # Request validation must not reflect a submitted key/password in its error body.
    from fastapi.exceptions import RequestValidationError

    @app.exception_handler(RequestValidationError)
    async def validation_error(_, exc):
        return JSONResponse({"detail": "Check the submitted values and try again."}, status_code=422)

    def limit(request: Request, category: str, maximum: int = 10):
        bucket = f"{category}:{request.client.host if request.client else 'unknown'}"
        with rate_lock:
            items = rate_buckets[bucket]
            now = time.time()
            while items and items[0] < now - 60:
                items.popleft()
            if len(items) >= maximum:
                raise HTTPException(429, "Too many attempts. Please wait a minute.")
            items.append(now)

    def current_user(request: Request) -> User:
        token = request.cookies.get(COOKIE, "")
        with store.sessions() as db:
            session = db.get(LoginSession, hashlib.sha256(token.encode()).hexdigest())
            if not token or not session or session.expires_at < time.time():
                raise HTTPException(401, "Sign in to your workspace first.")
            user = db.get(User, session.user_id)
            if not user:
                raise HTTPException(401, "Sign in to your workspace first.")
            if request.method not in ("GET", "HEAD", "OPTIONS"):
                expected = hmac.new(token.encode(), b"open-garmin-csrf", hashlib.sha256).hexdigest()
                if not hmac.compare_digest(request.headers.get("x-csrf-token", ""), expected):
                    raise HTTPException(403, "Please refresh the page and try again.")
            return user

    def set_session(user: User, response: Response):
        token = secrets.token_urlsafe(40)
        with store.sessions.begin() as db:
            db.execute(delete(LoginSession).where(LoginSession.expires_at < time.time()))
            db.add(LoginSession(digest=hashlib.sha256(token.encode()).hexdigest(), user_id=user.id, expires_at=time.time() + 30 * 86400))
        response.set_cookie(COOKIE, token, httponly=True, secure=os.environ.get("OPEN_GARMIN_SECURE_COOKIES") == "1", samesite="lax", max_age=30 * 86400, path="/")
        return {"user": {"name": user.name, "email": user.email}, "csrf_token": hmac.new(token.encode(), b"open-garmin-csrf", hashlib.sha256).hexdigest()}

    @app.get("/api/health")
    def health():
        return {"ok": True, "version": "0.1.0"}

    @app.get("/api/session")
    def session(request: Request):
        local_mode = os.environ.get("OPEN_GARMIN_LOCAL_MODE") == "1"
        with store.sessions() as db:
            owner_exists = bool(db.scalar(select(func.count()).select_from(User)))
        try:
            user = current_user(request)
        except HTTPException:
            return {"user": None, "csrf_token": None, "registration_open": not owner_exists or os.environ.get("OPEN_GARMIN_ALLOW_REGISTRATION") == "1", "local_mode": local_mode}
        token = request.cookies[COOKIE]
        return {"user": {"name": user.name, "email": user.email}, "csrf_token": hmac.new(token.encode(), b"open-garmin-csrf", hashlib.sha256).hexdigest(), "registration_open": False, "local_mode": local_mode}

    @app.post("/api/auth/local")
    def local_session(request: Request, response: Response):
        if os.environ.get("OPEN_GARMIN_LOCAL_MODE") != "1" or request.url.hostname not in ("127.0.0.1", "localhost", "::1"):
            raise HTTPException(404, "Local workspace is unavailable.")
        limit(request, "local_auth", 10)
        with store.sessions.begin() as db:
            users = list(db.scalars(select(User).limit(2)))
            if len(users) > 1:
                raise HTTPException(409, "This installation has multiple workspaces. Sign in to choose one.")
            if users:
                user = users[0]
            else:
                user = User(email="local@open-garmin.invalid", name="Athlete", password_hash=password_hash(secrets.token_urlsafe(32)), preferences=DEFAULT_PREFS.copy())
                db.add(user)
                db.flush()
        return {**set_session(user, response), "local_mode": True}

    @app.post("/api/auth/register")
    def register(body: Credentials, request: Request, response: Response):
        limit(request, "auth")
        email = body.email.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
            raise HTTPException(422, "Enter a valid email address.")
        try:
            with store.sessions.begin() as db:
                existing = db.scalar(select(func.count()).select_from(User))
                if existing and os.environ.get("OPEN_GARMIN_ALLOW_REGISTRATION") != "1":
                    raise HTTPException(403, "This installation is private. Sign in to the existing workspace.")
                user = User(email=email, name=body.name.strip() or "Athlete", password_hash=password_hash(body.password), preferences=DEFAULT_PREFS.copy())
                db.add(user)
                db.flush()
        except IntegrityError:
            raise HTTPException(409, "An account could not be created with those details.") from None
        return set_session(user, response)

    @app.post("/api/auth/login")
    def login(body: Credentials, request: Request, response: Response):
        limit(request, "auth")
        with store.sessions() as db:
            user = db.scalar(select(User).where(User.email == body.email.strip().lower()))
        if not user or not password_matches(body.password, user.password_hash):
            raise HTTPException(401, "The email or password was not accepted.")
        return set_session(user, response)

    @app.post("/api/auth/logout")
    def logout(request: Request, response: Response, user=Depends(current_user)):
        digest = hashlib.sha256(request.cookies[COOKIE].encode()).hexdigest()
        with store.sessions.begin() as db:
            db.execute(delete(LoginSession).where(LoginSession.digest == digest))
        response.delete_cookie(COOKIE)
        return {"ok": True}

    @app.get("/api/data")
    def data(user=Depends(current_user)):
        with store.sessions() as db:
            conn = db.get(Connection, user.id)
            rows = list(db.scalars(select(Activity).where(Activity.user_id == user.id).order_by(Activity.date.desc())))
            notes = {n.activity_id: {"text": n.text, "rpe": n.rpe, "tags": n.tags} for n in db.scalars(select(Note).where(Note.user_id == user.id))}
            activities = [{**r.data, "samples": r.data.get("samples", [])[::max(1, (len(r.data.get("samples", [])) + 69) // 70)], "note": notes.get(r.id, {"text": "", "rpe": None, "tags": []}), "sample_count": r.data.get("sample_count", len(r.data.get("samples", [])))} for r in rows]
            daily = [r.data for r in db.scalars(select(Daily).where(Daily.user_id == user.id).order_by(Daily.date))]
            jobs = [{"id": j.id, "kind": j.kind, "activity_id": j.activity_id, "state": j.state, "progress": j.progress, "message": j.message} for j in db.scalars(select(Job).where(Job.user_id == user.id).order_by(Job.created_at.desc()).limit(8))]
            status = {"connected": bool(conn and conn.encrypted_key), "state": conn.state if conn else "not_connected", "last_checked": conn.last_checked if conn else None, "last_success": conn.last_success if conn else None, "message": conn.message if conn else None, "region": conn.region if conn else "com"}
        return {"mode": "live", "activities": activities, "daily": daily, "preferences": {**DEFAULT_PREFS, **user.preferences}, "status": status, "jobs": jobs, "user": {"name": user.name, "email": user.email}, "data_through": max((d["date"] for d in daily), default=None), "local_mode": os.environ.get("OPEN_GARMIN_LOCAL_MODE") == "1"}

    @app.post("/api/connection")
    def connect(body: KeyInput, request: Request, user=Depends(current_user)):
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
                if conn.profile.get("displayName") and profile.get("displayName") and conn.profile["displayName"] != profile["displayName"]:
                    raise HTTPException(409, "This key belongs to a different Garmin profile. Export and delete the existing imported data before connecting another account.")
                revision = conn.revision + 1
            conn.encrypted_key, conn.region, conn.profile, conn.state = store.encrypt(key), body.region, profile, "connected"
            conn.revision, conn.message = revision, None
        return {"ok": True, "job_id": worker.enqueue(user.id, 90)}

    @app.delete("/api/connection")
    def disconnect(user=Depends(current_user)):
        with store.sessions.begin() as db:
            conn = db.get(Connection, user.id)
            if conn:
                conn.encrypted_key, conn.state, conn.message = None, "disconnected", None
                conn.revision += 1
            db.execute(update_job_cancel(user.id))
        return {"ok": True}

    @app.post("/api/sync")
    def sync(request: Request, days: int = 3, user=Depends(current_user)):
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

    @app.get("/api/activities/{activity_id}")
    def activity(activity_id: str, user=Depends(current_user)):
        with store.sessions() as db:
            row = db.get(Activity, (user.id, activity_id))
            if not row:
                raise HTTPException(404, "This activity is not in your workspace.")
            note = db.get(Note, (user.id, activity_id))
            samples = db.get(ActivitySamples, (user.id, activity_id))
            return {**row.data, "samples": samples.samples if samples else row.data.get("samples", []), "note": {"text": note.text, "rpe": note.rpe, "tags": note.tags} if note else {"text": "", "rpe": None, "tags": []}}

    @app.post("/api/activities/{activity_id}/details")
    def load_details(activity_id: str, request: Request, user=Depends(current_user)):
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
    def note(activity_id: str, body: NoteInput, user=Depends(current_user)):
        with store.sessions.begin() as db:
            if not db.get(Activity, (user.id, activity_id)):
                raise HTTPException(404, "Activity not found.")
            row = db.get(Note, (user.id, activity_id))
            if not row:
                row = Note(user_id=user.id, activity_id=activity_id)
                db.add(row)
            row.text, row.rpe, row.tags = body.text, body.rpe, [t[:40] for t in body.tags]
        return {"ok": True}

    @app.put("/api/preferences")
    def preferences(body: Preferences, user=Depends(current_user)):
        if body.units not in ("metric", "imperial") or body.week_start not in ("monday", "sunday") or body.theme not in ("light", "dark"):
            raise HTTPException(422, "Choose valid preferences.")
        try:
            ZoneInfo(body.timezone)
        except ZoneInfoNotFoundError:
            raise HTTPException(422, "Choose a valid IANA timezone, such as America/Toronto.") from None
        with store.sessions.begin() as db:
            db.get(User, user.id).preferences = body.model_dump()
        return {"ok": True}

    @app.get("/api/export")
    def export(format: str = "json", user=Depends(current_user)):
        with store.sessions() as db:
            streams = {s.activity_id: s.samples for s in db.scalars(select(ActivitySamples).where(ActivitySamples.user_id == user.id))}
            activities = [{**r.data, "samples": streams.get(r.id, r.data.get("samples", [])), "raw": r.raw} for r in db.scalars(select(Activity).where(Activity.user_id == user.id))]
            daily = [{**r.data, "raw": r.raw} for r in db.scalars(select(Daily).where(Daily.user_id == user.id))]
            notes = [{"activity_id": n.activity_id, "text": n.text, "rpe": n.rpe, "tags": n.tags} for n in db.scalars(select(Note).where(Note.user_id == user.id))]
        if format == "csv":
            out = io.StringIO()
            fields = ["id", "name", "date", "sport", "distance", "duration", "average_hr", "elevation", "power", "source"]
            writer = csv.DictWriter(out, fieldnames=fields, extrasaction="ignore")
            writer.writeheader()
            for a in activities:
                # Prevent spreadsheet formula injection in exported user-defined names.
                writer.writerow({k: "'" + v if isinstance(v := a.get(k), str) and v.startswith(("=", "+", "-", "@")) else v for k in fields})
            return Response(out.getvalue(), media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="open-garmin-activities.csv"'})
        if format != "json":
            raise HTTPException(422, "Choose JSON or CSV.")
        payload = {"schema_version": 1, "attribution": "Garmin device-sourced data. App notes and derived metrics are identified separately.", "activities": activities, "daily": daily, "notes": notes, "preferences": user.preferences}
        return Response(json.dumps(payload, allow_nan=False), media_type="application/json", headers={"Content-Disposition": 'attachment; filename="open-garmin-export.json"'})

    @app.post("/api/import/fit")
    async def import_fit(file: UploadFile, user=Depends(current_user)):
        if not file.filename or not file.filename.lower().endswith(".fit"):
            raise HTTPException(422, "Choose a FIT activity file.")
        content = await file.read(60 * 1024 * 1024 + 1)
        if len(content) > 60 * 1024 * 1024:
            raise HTTPException(413, "FIT file exceeds the 60 MB limit.")
        try:
            details = parse_original(content)
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
        values = {"id": activity_id, "name": Path(file.filename).stem[:120] or "Imported activity",
                  "sport": details.get("recorded_sport", "other"), "type": details.get("recorded_sport", "other"),
                  "start": start, "start_utc": start, "date": start[:10], "distance": distance, "duration": duration,
                  "elapsed": duration, "moving": duration, "average_hr": round(sum(hearts)/len(hearts)) if hearts else None,
                  "max_hr": max(hearts) if hearts else None, "average_speed": distance/duration if distance is not None and duration else None,
                  "elevation": None, "calories": None, "power": None, "cadence": None, "aerobic_te": None,
                  "anaerobic_te": None, "training_load": None, "vo2max": None, "description": "", "parent_id": None,
                  "is_parent": False, "device": details.get("recorded_device", "Garmin"), "source": "imported_fit",
                  "zones": [None]*5, **details, "sample_count": len(samples)}
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
            db.add(Activity(user_id=user.id, id=activity_id, date=values["date"], data={**values, "samples": samples[::max(1,(len(samples)+69)//70)]}, raw={"source": "user_fit", "sha256": digest}, details_loaded=True))
            db.add(ActivitySamples(user_id=user.id, activity_id=activity_id, samples=samples))
        return {"id": activity_id, "status": "imported"}

    @app.get("/api/activities/{activity_id}/original")
    def original(activity_id: str, user=Depends(current_user)):
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

    def erase_data(uid):
        with store.archive_lock, store.sessions.begin() as db:
            conn = db.get(Connection, uid)
            if conn:
                conn.encrypted_key, conn.state = None, "disconnected"
                conn.revision += 1
            for model in (Note, Activity, Daily, Job):
                db.execute(delete(model).where(model.user_id == uid))
            folder = store.directory / "originals" / hashlib.sha256(uid.encode()).hexdigest()
            if folder.exists():
                shutil.rmtree(folder)

    @app.delete("/api/data")
    def delete_data(user=Depends(current_user)):
        erase_data(user.id)
        return {"ok": True}

    @app.delete("/api/account")
    def delete_account(response: Response, user=Depends(current_user)):
        erase_data(user.id)
        with store.sessions.begin() as db:
            db.execute(delete(User).where(User.id == user.id))
        response.delete_cookie(COOKIE)
        return {"ok": True}

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
        return JSONResponse({"message": "Run npm run dev for the frontend, or npm run build to serve it here."})

    return app


def update_job_cancel(uid):
    from sqlalchemy import update
    return update(Job).where(Job.user_id == uid, Job.state.in_(["queued", "running"])).values(state="cancelled", message="Disconnected")


app = create_app()
