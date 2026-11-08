from __future__ import annotations

import threading
import time
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select, update

from .derive import after_sync
from .garmin import (
    GarminClient,
    GarminError,
    chunks,
    normalize_activity_v2,
    normalize_daily_v2,
    parse_original,
)
from .storage import Activity, ActivitySamples, Connection, Daily, Job, Store, User, now_iso


class Worker:
    def __init__(self, store: Store, client_factory=GarminClient):
        self.store = store
        self.client_factory = client_factory
        self.stop_event = threading.Event()
        self.thread: threading.Thread | None = None
        self.token_cache = {}

    def start(self):
        # One worker process per installation; durable queued work survives restarts.
        with self.store.sessions.begin() as db:
            db.execute(
                update(Job)
                .where(Job.state == "running")
                .values(state="queued", message="Resuming interrupted sync")
            )
        self.thread = threading.Thread(target=self.loop, name="garmin-sync", daemon=True)
        self.thread.start()

    def stop(self):
        self.stop_event.set()
        if self.thread:
            self.thread.join(timeout=2)

    def enqueue(self, user_id: str, days: int = 3, activity_id: str | None = None):
        with self.store.sessions.begin() as db:
            pending = db.scalar(
                select(Job).where(
                    Job.user_id == user_id,
                    Job.state.in_(["queued", "running"]),
                    Job.kind == ("activity" if activity_id else "sync"),
                    Job.activity_id == activity_id,
                )
            )
            if pending:
                return pending.id
            job = Job(
                user_id=user_id,
                days=days,
                activity_id=activity_id,
                kind="activity" if activity_id else "sync",
            )
            db.add(job)
            db.flush()
            return job.id

    def progress(self, job_id: str, value: int, message: str):
        with self.store.sessions.begin() as db:
            job = db.get(Job, job_id)
            if job and job.state != "cancelled":
                job.progress, job.message = value, message

    def loop(self):
        last_schedule = 0.0
        while not self.stop_event.is_set():
            try:
                if time.time() - last_schedule > 60:
                    self.schedule()
                    last_schedule = time.time()
                with self.store.sessions() as db:
                    job = db.scalar(select(Job).where(Job.state == "queued").order_by(Job.created_at))
                    job_id = job.id if job else None
                if job_id:
                    self.run(job_id)
                else:
                    self.stop_event.wait(1)
            except Exception:
                # Do not log response bodies, credentials, user data or exception reprs.
                self.stop_event.wait(5)

    def schedule(self):
        cutoff = (datetime.now(UTC) - timedelta(hours=1)).isoformat()
        with self.store.sessions() as db:
            ids = [
                c.user_id
                for c in db.scalars(
                    select(Connection).where(
                        Connection.encrypted_key.is_not(None),
                        Connection.state.in_(["connected", "ok", "partial", "rate_limited", "error"]),
                        Connection.last_checked < cutoff,
                    )
                )
                if c.profile.get("_retry_after", 0) <= time.time()
            ]
        for uid in ids:
            self.enqueue(uid)

    def run(self, job_id: str):
        with self.store.sessions.begin() as db:
            job = db.get(Job, job_id)
            if not job:
                return
            job.state = "running"
            user_id, days, activity_id = job.user_id, job.days, job.activity_id
            conn = db.get(Connection, user_id)
            if not conn or not conn.encrypted_key:
                job.state, job.message, job.completed_at = (
                    "failed",
                    "Connect Garmin in Settings to sync.",
                    now_iso(),
                )
                return
            key, region, revision = self.store.decrypt(conn.encrypted_key), conn.region, conn.revision
            conn.last_checked = now_iso()
            user = db.get(User, user_id)
            prefs = user.preferences if user else {}
        client = self.client_factory(key, region)
        cached = self.token_cache.get(user_id)
        if cached and cached[0] == revision:
            client.token, client.expires = cached[1:]
        try:
            if activity_id:
                self.load_activity(client, user_id, activity_id, revision)
                warnings = []
            else:
                try:
                    today = datetime.now(ZoneInfo(prefs.get("timezone", "UTC"))).date()
                except ZoneInfoNotFoundError:
                    today = datetime.now(UTC).date()
                warnings = self.sync(
                    client, user_id, job_id, today - timedelta(days=days - 1), today, revision
                )
            with self.store.sessions() as db:
                if not self.check_revision(db, user_id, revision):
                    return
            after_sync(self.store, user_id)
            with self.store.sessions.begin() as db:
                job = db.get(Job, job_id)
                conn = db.get(Connection, user_id)
                if not job or job.state == "cancelled":
                    return
                job.state, job.progress, job.completed_at = "complete", 100, now_iso()
                job.message = (
                    "Synced with gaps: " + "; ".join(warnings) if warnings else "Your training is up to date"
                )
                if conn and conn.revision == revision:
                    conn.last_success = now_iso()
                    conn.state = "partial" if warnings else "ok"
                    conn.message = job.message if warnings else None
        except (GarminError, ValueError) as exc:
            message = (
                str(exc)
                if isinstance(exc, GarminError)
                else "This original activity could not be decoded. The saved summary is still available."
            )
            with self.store.sessions.begin() as db:
                job = db.get(Job, job_id)
                if job:
                    job.state, job.message, job.completed_at = "failed", message, now_iso()
                conn = db.get(Connection, user_id)
                if conn and conn.revision == revision:
                    conn.state = (
                        "needs_key"
                        if isinstance(exc, GarminError) and exc.status == 401
                        else "rate_limited"
                        if isinstance(exc, GarminError) and exc.status == 429
                        else "error"
                    )
                    conn.message = message
                    if isinstance(exc, GarminError) and exc.status == 429:
                        conn.profile = {**conn.profile, "_retry_after": time.time() + (exc.retry_after or 60)}
        except Exception:
            with self.store.sessions.begin() as db:
                job = db.get(Job, job_id)
                if job:
                    job.state, job.message, job.completed_at = (
                        "failed",
                        "The sync stopped unexpectedly. Previously imported data is intact; try again.",
                        now_iso(),
                    )
                conn = db.get(Connection, user_id)
                if conn and conn.revision == revision:
                    conn.state, conn.message = (
                        "error",
                        "The sync stopped unexpectedly. Your imported data is intact; try syncing again.",
                    )
        finally:
            with self.store.sessions() as db:
                if self.check_revision(db, user_id, revision) and getattr(client, "token", None):
                    self.token_cache[user_id] = (revision, client.token, client.expires)
                else:
                    self.token_cache.pop(user_id, None)
            client.close()

    def check_revision(self, db, user_id, revision):
        conn = db.get(Connection, user_id)
        return conn is not None and conn.encrypted_key is not None and conn.revision == revision

    def sync(self, client, user_id, job_id, first: date, last: date, revision: int):
        warnings = []
        self.progress(job_id, 5, "Importing recent activities")
        for page in range(20):
            raw = client.get(
                "/activitylist-service/activities/search/activities",
                {
                    "start": page * 99,
                    "limit": 99,
                    "startDate": first.isoformat(),
                    "endDate": last.isoformat(),
                    "excludeChildren": "true",
                },
            )
            if not isinstance(raw, list):
                raise GarminError(
                    "Garmin returned an unexpected activity list. No existing activities were removed."
                )
            with self.store.sessions.begin() as db:
                if not self.check_revision(db, user_id, revision):
                    return ["Connection changed during sync"]
                for item in raw:
                    values = normalize_activity_v2(item)
                    if not values["id"] or not values["date"]:
                        continue
                    row = db.get(Activity, (user_id, values["id"]))
                    if row:
                        changed = any(
                            row.data.get(k) is not None
                            and values.get(k) is not None
                            and abs(row.data[k] - values[k]) > 0.1
                            for k in ("distance", "duration")
                        )
                        values.update(
                            {
                                k: row.data[k]
                                for k in (
                                    "samples",
                                    "laps",
                                    "sets",
                                    "events",
                                    "session_metrics",
                                    "sample_count",
                                    "sample_resolution",
                                    "detail_state",
                                    "detail_error",
                                )
                                if k in row.data
                            }
                        )
                        if changed:
                            values.update(
                                samples=[],
                                laps=[],
                                sets=[],
                                session_metrics=[],
                                sample_count=0,
                                detail_state="not_loaded",
                            )
                            row.details_loaded = False
                            old_samples = db.get(ActivitySamples, (user_id, row.id))
                            if old_samples:
                                db.delete(old_samples)
                        row.data, row.raw, row.date = values, item, values["date"]
                    else:
                        db.add(
                            Activity(
                                user_id=user_id, id=values["id"], date=values["date"], data=values, raw=item
                            )
                        )
            if len(raw) < 99:
                break
        else:
            warnings.append("Activity import reached its per-sync page limit")
        self.progress(job_id, 25, "Updating daily totals")
        for start, end in chunks(first, last, 28):
            raw = client.get("/usersummary-service/v2/dailysummaries", {"startDate": start, "endDate": end})
            rows = raw.get("data", []) if isinstance(raw, dict) else raw
            if not isinstance(rows, list):
                raise GarminError("Garmin returned an unexpected daily summary response.")
            for item in rows:
                values = normalize_daily_v2({"summary": item})
                if values["date"]:
                    self.save_daily(user_id, values["date"], values, "summary", item, revision)
        self.progress(job_id, 45, "Bringing in sleep and HRV")
        for start, end in chunks(first, last, 28):
            for domain in ("sleep", "hrv"):
                try:
                    raw = (
                        client.get(
                            "/sleep-service/sleep/dailySleepSummariesByDate",
                            {"startDate": start, "endDate": end},
                        )
                        if domain == "sleep"
                        else client.get(f"/hrv-service/hrv/daily/{start}/{end}")
                    )
                    rows = raw.get("hrvSummaries", []) if domain == "hrv" and isinstance(raw, dict) else raw
                    if rows is None:
                        rows = []
                    if not isinstance(rows, list):
                        warnings.append(f"{domain.upper()} response could not be interpreted")
                        continue
                    for item in rows:
                        if not isinstance(item, dict):
                            continue
                        day = item.get("calendarDate")
                        if not day:
                            continue
                        if domain == "sleep":
                            values = normalize_daily_v2({"sleep": item})
                        else:
                            values = normalize_daily_v2({"hrv": item})
                        self.save_daily(user_id, day, values, domain, item, revision)
                except GarminError as exc:
                    if exc.status in (401, 429):
                        raise
                    warnings.append(f"{domain.upper()} unavailable ({exc.status})")
        self.progress(job_id, 70, "Checking recovery details")
        # A bounded single-day request also reconciles values absent in V2 summaries.
        try:
            raw = client.get("/usersummary-service/usersummary/daily", {"calendarDate": last.isoformat()})
            if isinstance(raw, dict):
                self.save_daily(
                    user_id,
                    last.isoformat(),
                    normalize_daily_v2({"summary_legacy": raw}),
                    "summary_legacy",
                    raw,
                    revision,
                )
        except GarminError as exc:
            if exc.status in (401, 429):
                raise
            warnings.append("Today's detailed wellness summary is unavailable")
        with self.store.sessions() as db:
            newest = [
                r.id
                for r in db.scalars(
                    select(Activity)
                    .where(Activity.user_id == user_id, Activity.details_loaded.is_(False))
                    .order_by(Activity.date.desc())
                    .limit(10)
                )
            ]
        for i, aid in enumerate(newest):
            self.progress(job_id, 75 + i * 2, f"Reading activity details ({i + 1}/{len(newest)})")
            try:
                self.load_activity(client, user_id, aid, revision)
            except GarminError as exc:
                if exc.status in (401, 429):
                    raise
                self.detail_error(user_id, aid, "The original file is not available from Garmin.", revision)
            except Exception:
                # Each original is isolated; a malformed file cannot abort summary sync.
                self.detail_error(
                    user_id,
                    aid,
                    "This original file could not be decoded. The summary remains available.",
                    revision,
                )
        return list(dict.fromkeys(warnings))

    def save_daily(self, uid, day, values, domain, raw, revision):
        with self.store.sessions.begin() as db:
            if not self.check_revision(db, uid, revision):
                return
            row = db.get(Daily, (uid, day))
            combined_raw = {**(row.raw if row else {}), domain: raw}
            normalized = normalize_daily_v2(combined_raw)
            normalized["date"] = day
            if not row:
                db.add(
                    Daily(
                        user_id=uid,
                        date=day,
                        data=normalized,
                        raw=combined_raw,
                    )
                )
            else:
                row.data, row.raw = {**row.data, **normalized}, combined_raw

    def detail_error(self, uid, aid, message, revision):
        with self.store.sessions.begin() as db:
            row = db.get(Activity, (uid, aid))
            if row and self.check_revision(db, uid, revision):
                row.data = {**row.data, "detail_state": "unavailable", "detail_error": message}
                row.details_loaded = True

    def load_activity(self, client, uid, aid, revision):
        raw = client.get(f"/activity-service/activity/{aid}")
        if not isinstance(raw, dict):
            raise GarminError("This activity summary is unavailable.")
        values = normalize_activity_v2(raw)
        with self.store.sessions.begin() as db:
            row = db.get(Activity, (uid, aid))
            if not row or not self.check_revision(db, uid, revision):
                return
            row.raw = {**row.raw, **raw}
            # Detail summaries omit some list-only fields; preserve existing known values.
            row.data = {
                **row.data,
                **{
                    k: v
                    for k, v in values.items()
                    if v is not None and k not in ("samples", "laps", "sets", "zones", "detail_state")
                },
            }
        content = client.get(f"/download-service/files/activity/{aid}", binary=True)
        with self.store.archive_lock, self.store.sessions() as db:
            if not db.get(Activity, (uid, aid)) or not self.check_revision(db, uid, revision):
                return
            path = self.store.archive_path(uid, aid)
            temporary = path.with_suffix(".tmp")
            temporary.write_bytes(content)
            temporary.chmod(0o600)
            temporary.replace(path)
        details = parse_original(content)
        with self.store.sessions.begin() as db:
            row = db.get(Activity, (uid, aid))
            if row and self.check_revision(db, uid, revision):
                samples = details.pop("samples", [])
                stored = db.get(ActivitySamples, (uid, aid))
                if stored:
                    stored.samples = samples
                else:
                    db.add(ActivitySamples(user_id=uid, activity_id=aid, samples=samples))
                step = max(1, (len(samples) + 69) // 70)
                row.data = {**row.data, **details, "samples": samples[::step], "sample_count": len(samples)}
                row.details_loaded = True
