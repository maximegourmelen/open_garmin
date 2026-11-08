"""Interactive, private local validation. Keys are entered without terminal echo.

Creates a local pilot workspace only on a fresh installation. Never prints keys,
tokens, measurements, profiles or activity names. Do not run as an automated test.
"""
import getpass
import json
import os
import secrets

from sqlalchemy import func, select

from server.app import DEFAULT_PREFS, password_hash
from server.garmin import GarminClient, GarminError
from server.storage import Activity, Connection, Daily, Job, Store, User
from server.worker import Worker

store = Store()
with store.sessions() as db:
    if db.scalar(select(func.count()).select_from(User)):
        raise SystemExit("This workspace already has an owner. Use the app's connection form instead.")
key = getpass.getpass("Garmin Personal API key (hidden): ").strip()
client = GarminClient(key)
try:
    profile = client.get("/userprofile-service/userprofile/settings")
    print("Personal API authentication and profile access succeeded.", flush=True)
except GarminError as exc:
    raise SystemExit(str(exc)) from None
finally:
    client.close()
password = secrets.token_urlsafe(22)
with store.sessions.begin() as db:
    user = User(email="local@open-garmin.invalid", name="Athlete", password_hash=password_hash(password), preferences=DEFAULT_PREFS.copy())
    db.add(user)
    db.flush()
    uid = user.id
    db.add(Connection(user_id=uid, encrypted_key=store.encrypt(key), region="com", profile=profile, revision=1))
del key
path = store.directory / "local-login.json"
fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, "w") as f:
    json.dump({"email": user.email, "password": password}, f)
print("Created a private pilot workspace. Login details saved in .runtime/local-login.json.", flush=True)
worker = Worker(store)
job_id = worker.enqueue(uid, 90)
worker.run(job_id)
with store.sessions() as db:
    job = db.get(Job, job_id)
    print("Validation sync:", job.state, job.message, flush=True)
    print("Imported activity rows:", db.scalar(select(func.count()).select_from(Activity).where(Activity.user_id == uid)), flush=True)
    print("Imported daily rows:", db.scalar(select(func.count()).select_from(Daily).where(Daily.user_id == uid)), flush=True)
    for row in db.scalars(select(Daily).where(Daily.user_id == uid).limit(1)):
        raw = row.raw.get("summary", {})
        print("V2 summary field names:", {k: list(v.keys()) if isinstance(v, dict) else type(v).__name__ for k, v in raw.items()}, flush=True)
