"""Fitness, best efforts, volume, and deeper training trends."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Literal

from fastapi import Request
from sqlalchemy import select

from ..analytics.activity_goals import weekly_active_minutes
from ..analytics.common import daterange, local_today, week_start
from ..analytics.efforts import bests, five_k_estimate
from ..analytics.fitness import fitness_signals
from ..analytics.load import effort_trend, ramp_check
from ..analytics.zones import intensity_mix
from ..db.models import Activity, ActivityDerived, BestEffort, Daily, User
from ..workspace import workspace
from .schemas import DeeperResponse, ProgressResponse

Range = Literal["7D", "4W", "3M", "1Y"]
DAYS = {"7D": 7, "4W": 28, "3M": 90, "1Y": 365}


def _data(request: Request):
    ws = workspace(request)
    with ws.store.sessions() as db:
        user = db.get(User, ws.user_id)
        prefs = user.preferences or {}
        today = local_today(prefs)
        derived = {
            row.activity_id: row.data
            for row in db.scalars(select(ActivityDerived).where(ActivityDerived.user_id == ws.user_id))
        }
        activities = [
            {**row.data, **derived.get(row.id, {})}
            for row in db.scalars(select(Activity).where(Activity.user_id == ws.user_id))
        ]
        daily = [
            {"date": row.date, **row.data}
            for row in db.scalars(select(Daily).where(Daily.user_id == ws.user_id))
        ]
        candidates = [
            {
                "activity_id": row.activity_id,
                "kind": row.kind,
                "date": row.date,
                "sport": row.sport,
                "value": row.value,
                "source": row.source,
                "start_offset_s": row.start_offset_s,
            }
            for row in db.scalars(select(BestEffort).where(BestEffort.user_id == ws.user_id))
        ]
    return prefs, today, activities, daily, candidates


def progress_view(request: Request):
    prefs, today, activities, daily, candidates = _data(request)
    first_week = week_start(today, prefs.get("week_start", "monday"))
    volume = []
    for weeks_ago in reversed(range(12)):
        start = date.fromisoformat(first_week) - timedelta(days=7 * weeks_ago)
        end = min(start + timedelta(days=6), today)
        stats = weekly_active_minutes(activities, daily, prefs, end)
        week_activities = [
            item
            for item in activities
            if not item.get("parent_id") and start.isoformat() <= item.get("date", "") <= end.isoformat()
        ]
        by_sport = {}
        for item in week_activities:
            sport = item.get("sport", "other")
            by_sport[sport] = round(by_sport.get(sport, 0) + (item.get("duration") or 0) / 60, 1)
        volume.append(
            {
                "start": start.isoformat(),
                "end": (start + timedelta(days=6)).isoformat(),
                "minutes": stats["minutes"],
                "goal": stats["goal"],
                "sessions": stats["sessions"],
                "distance": round(sum(item.get("distance") or 0 for item in week_activities), 1),
                "by_sport": by_sport,
                "partial": weeks_ago == 0,
                "method": "active_minutes@1",
            }
        )
    activity_days = {}
    for item in activities:
        if item.get("date") and not item.get("parent_id"):
            activity_days[item["date"]] = (
                activity_days.get(item["date"], 0) + (item.get("duration") or 0) / 60
            )
    consistency = [
        {"date": day.isoformat(), "minutes": round(activity_days.get(day.isoformat(), 0), 1)}
        for day in daterange(today - timedelta(days=83), today)
    ]
    active_days_28 = sum(item["minutes"] > 0 for item in consistency[-28:])
    return {
        "signals": fitness_signals(activities, daily, today),
        "bests": bests(candidates, today)["items"],
        "volume": volume,
        "consistency": {"days": consistency, "active_days_28": active_days_28},
        "ramp": ramp_check(activities, today, prefs.get("week_start", "monday")),
        "method": "progress_overview@1",
    }


def deeper_view(request: Request, range: Range = "3M"):
    _, today, activities, _, candidates = _data(request)
    first = today - timedelta(days=DAYS[range] - 1)
    recent = [item for item in activities if first.isoformat() <= item.get("date", "") <= today.isoformat()]
    benefit_mix = {}
    pace_hr = []
    running_form = []
    vo2max = []
    for item in recent:
        if item.get("parent_id"):
            continue
        benefit = item.get("te_label")
        if benefit:
            benefit_mix[benefit] = benefit_mix.get(benefit, 0) + 1
        if (
            item.get("sport") in ("walking", "running")
            and item.get("average_hr")
            and item.get("average_speed")
        ):
            pace_hr.append(
                {
                    "id": item.get("id"),
                    "date": item["date"],
                    "sport": item["sport"],
                    "pace_s_per_km": round(1000 / item["average_speed"], 1),
                    "average_hr": item["average_hr"],
                }
            )
        if item.get("sport") == "running":
            running_form.append(
                {
                    "date": item["date"],
                    "cadence_spm": item.get("cadence_spm"),
                    "stride_length_m": item.get("stride_length_m"),
                    "ground_contact_ms": item.get("ground_contact_ms"),
                    "vertical_oscillation_cm": item.get("vertical_oscillation_cm"),
                    "vertical_ratio_pct": item.get("vertical_ratio_pct"),
                }
            )
        if item.get("vo2max") is not None:
            vo2max.append({"date": item["date"], "value": item["vo2max"]})
    return {
        "range": range,
        "from": first.isoformat(),
        "to": today.isoformat(),
        "effort_trend": effort_trend(activities, first, today),
        "intensity_mix": intensity_mix(activities, today),
        "benefit_mix": benefit_mix,
        "pace_hr": pace_hr,
        "running_form": running_form,
        "five_k_estimate": five_k_estimate(candidates, today),
        "vo2max": vo2max,
        "method": "progress_deeper@1",
    }


def register(app):
    for prefix in ("/api", "/api/demo"):
        app.add_api_route(
            f"{prefix}/progress", progress_view, methods=["GET"], response_model=ProgressResponse
        )
        app.add_api_route(
            f"{prefix}/progress/deeper", deeper_view, methods=["GET"], response_model=DeeperResponse
        )
