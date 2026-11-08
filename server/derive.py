"""Idempotently rebuild normalized and derived rows from stored source data."""

from __future__ import annotations

import hashlib
from collections.abc import Callable

from sqlalchemy import select

from .db.models import Activity, ActivityDerived, ActivitySamples, Daily, User
from .db.store import Store
from .garmin.fit import parse_original
from .garmin.normalize import normalize_activity_v2, normalize_daily_v2

NORMALIZER_VERSION = 2
ANALYTICS_VERSION = 1
DETAIL_KEYS = (
    "samples",
    "laps",
    "sets",
    "events",
    "session_metrics",
    "detail_state",
    "detail_error",
    "sample_count",
    "sample_resolution",
    "recorded_start",
    "recorded_sport",
    "recorded_device",
    "watch_feel",
    "watch_rpe",
    "parser_version",
)


def _original_path(store: Store, user_id: str, activity_id: str):
    folder = store.directory / "originals" / hashlib.sha256(user_id.encode()).hexdigest()
    return folder / f"{hashlib.sha256(activity_id.encode()).hexdigest()}.zip"


def rederive_user(store: Store, user_id: str) -> None:
    """Recompute from raw columns without changing them or original archive files."""
    with store.archive_lock, store.sessions.begin() as db:
        for row in db.scalars(select(Activity).where(Activity.user_id == user_id)).all():
            data = dict(row.data)
            if data.get("normalizer_version") != NORMALIZER_VERSION:
                fresh = (
                    normalize_activity_v2(row.raw)
                    if row.raw and row.raw.get("activityId")
                    else {"normalizer_version": NORMALIZER_VERSION}
                )
                fresh = {
                    key: value
                    for key, value in fresh.items()
                    if value not in ("", None) or key not in ("id", "date", "start")
                }
                detail = {key: data[key] for key in DETAIL_KEYS if key in data}
                data = {**data, **fresh, **detail}
            if row.details_loaded and data.get("parser_version") != 2:
                path = _original_path(store, user_id, row.id)
                if path.exists():
                    try:
                        parsed = parse_original(path.read_bytes())
                    except Exception:
                        parsed = None
                    if parsed:
                        stream = db.get(ActivitySamples, (user_id, row.id))
                        if stream:
                            stream.samples = parsed["samples"]
                        else:
                            db.add(
                                ActivitySamples(
                                    user_id=user_id, activity_id=row.id, samples=parsed["samples"]
                                )
                            )
                        data = {**data, **{key: value for key, value in parsed.items() if key != "samples"}}
                        data["sample_count"] = len(parsed["samples"])
            inline = data.get("samples") or []
            if len(inline) > 80 and not db.get(ActivitySamples, (user_id, row.id)):
                db.add(ActivitySamples(user_id=user_id, activity_id=row.id, samples=inline))
                step = max(1, (len(inline) + 69) // 70)
                data = {**data, "samples": inline[::step], "sample_count": len(inline)}
            if data != row.data:
                row.data = data
            derived = db.get(ActivityDerived, (user_id, row.id))
            if derived is None:
                db.add(
                    ActivityDerived(user_id=user_id, activity_id=row.id, version=ANALYTICS_VERSION, data={})
                )
            elif derived.version != ANALYTICS_VERSION:
                derived.version = ANALYTICS_VERSION
                derived.data = {}
        for row in db.scalars(select(Daily).where(Daily.user_id == user_id)).all():
            if row.data.get("normalizer_version") == NORMALIZER_VERSION:
                continue
            fresh = normalize_daily_v2(row.raw or {})
            if not fresh.get("date"):
                fresh["date"] = row.date
            row.data = {**row.data, **fresh}


def rederive_all(store: Store, report: Callable[[int], None] | None = None) -> None:
    with store.sessions() as db:
        user_ids = list(db.scalars(select(User.id)))
    for index, user_id in enumerate(user_ids, start=1):
        rederive_user(store, user_id)
        if report:
            report(round(index / len(user_ids) * 100))


def after_sync(
    store: Store, user_id: str, activity_ids: list[str] | None = None, dates: list[str] | None = None
) -> None:
    """Refresh derived rows after an import; scoped updates are added with analytics modules."""
    rederive_user(store, user_id)
