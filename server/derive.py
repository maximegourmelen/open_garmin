"""Idempotently rebuild normalized and derived rows from stored source data."""

from __future__ import annotations

import hashlib
from collections.abc import Callable
from datetime import date, timedelta

from sqlalchemy import delete, select

from .analytics.activity import derive_activity
from .analytics.common import local_today, week_start
from .analytics.efforts import collect_best_efforts
from .analytics.reports import weekly_recap
from .analytics.zones import activity_zones, effort_points, estimate_max_hr
from .companion.milestones import evaluate_milestones
from .companion.streaks import streak
from .db.models import (
    Activity,
    ActivityDerived,
    ActivitySamples,
    BestEffort,
    CheckIn,
    Daily,
    MilestoneAward,
    User,
    WeeklyRecap,
)
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
        user = db.get(User, user_id)
        prefs = user.preferences if user else {}
        today = local_today({"timezone": prefs.get("timezone", "UTC")})
        activities = db.scalars(select(Activity).where(Activity.user_id == user_id)).all()
        estimated_max_hr = estimate_max_hr([row.data for row in activities], today)
        for row in activities:
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
            stream = db.get(ActivitySamples, (user_id, row.id))
            samples = stream.samples if stream else data.get("samples", [])
            zones = activity_zones(data, samples, prefs, estimated_max_hr)
            effort = effort_points(zones["zone_minutes"])
            minutes = zones["zone_minutes"]
            if minutes and all(value is not None for value in minutes):
                easy = minutes[0] + minutes[1]
                moderate = minutes[2]
                hard = minutes[3] + minutes[4]
                intensity = max(((easy, "easy"), (moderate, "moderate"), (hard, "hard")))[1]
            else:
                intensity = None
            derived_data = {
                "effort_points": effort["effort_points"],
                "effort_method": effort["method"],
                "zone_minutes": minutes,
                "zone_source": zones["source"],
                "intensity": intensity,
                "source": "calculated",
                "method": "effort_points@1",
                "version": ANALYTICS_VERSION,
                **derive_activity(data, samples, intensity),
            }
            derived = db.get(ActivityDerived, (user_id, row.id))
            if derived is None:
                db.add(
                    ActivityDerived(
                        user_id=user_id, activity_id=row.id, version=ANALYTICS_VERSION, data=derived_data
                    )
                )
            elif derived.version != ANALYTICS_VERSION or derived.data != derived_data:
                derived.version = ANALYTICS_VERSION
                derived.data = derived_data
        db.flush()
        derived_by_id = {
            item.activity_id: item.data
            for item in db.scalars(select(ActivityDerived).where(ActivityDerived.user_id == user_id))
        }
        candidates = collect_best_efforts(
            [{"activity": row.data, "derived": derived_by_id.get(row.id, {})} for row in activities]
        )
        db.execute(delete(BestEffort).where(BestEffort.user_id == user_id))
        db.add_all(BestEffort(user_id=user_id, **candidate) for candidate in candidates)
        for row in db.scalars(select(Daily).where(Daily.user_id == user_id)).all():
            if row.data.get("normalizer_version") == NORMALIZER_VERSION:
                continue
            fresh = normalize_daily_v2(row.raw or {})
            if not fresh.get("date"):
                fresh["date"] = row.date
            row.data = {**row.data, **fresh}
        daily_rows = [row.data for row in db.scalars(select(Daily).where(Daily.user_id == user_id))]
        checkins = [
            {"date": row.date, "mood": row.mood, "energy": row.energy, "soreness": row.soreness}
            for row in db.scalars(select(CheckIn).where(CheckIn.user_id == user_id))
        ]
        milestones = evaluate_milestones(
            [row.data for row in activities], daily_rows, candidates, checkins, prefs, today
        )
        existing_awards = {
            award.milestone_id
            for award in db.scalars(select(MilestoneAward).where(MilestoneAward.user_id == user_id))
        }
        joined = user.created_at[:10] if user else today.isoformat()
        for item in milestones:
            if not item["earned"] or item["id"] in existing_awards:
                continue
            db.add(
                MilestoneAward(
                    user_id=user_id,
                    milestone_id=item["id"],
                    earned_on=item["earned_on"],
                    activity_id=item["activity_id"],
                    value=item["value"],
                    seen=item["earned_on"] < joined,
                )
            )
        all_dates = [row.date for row in activities] + [row["date"] for row in daily_rows if row.get("date")]
        if all_dates:
            first_week = date.fromisoformat(week_start(min(all_dates), prefs.get("week_start", "monday")))
            current_week = date.fromisoformat(week_start(today, prefs.get("week_start", "monday")))
            existing_recaps = {
                row.week_start
                for row in db.scalars(select(WeeklyRecap).where(WeeklyRecap.user_id == user_id))
            }
            activity_data = [row.data for row in activities]
            award_by_week: dict[str, list[str]] = {}
            for item in milestones:
                if item["earned"]:
                    key = week_start(item["earned_on"], prefs.get("week_start", "monday"))
                    award_by_week.setdefault(key, []).append(item["id"])
            cursor = first_week
            while cursor < current_week:
                key = cursor.isoformat()
                if key not in existing_recaps:
                    end = cursor + timedelta(days=6)
                    past_activities = [
                        item for item in activity_data if item.get("date", "") <= end.isoformat()
                    ]
                    past_daily = [item for item in daily_rows if item.get("date", "") <= end.isoformat()]
                    data = weekly_recap(
                        cursor,
                        past_activities,
                        past_daily,
                        prefs,
                        streak(past_activities, past_daily, prefs, end),
                        award_by_week.get(key, []),
                    )
                    db.add(
                        WeeklyRecap(
                            user_id=user_id,
                            week_start=key,
                            version=1,
                            data=data,
                            seen=end.isoformat() < joined,
                        )
                    )
                cursor += timedelta(days=7)


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
