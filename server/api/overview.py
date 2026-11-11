"""One compact, factual response for the Overview page."""

from __future__ import annotations

from datetime import date, timedelta

from fastapi import Request
from sqlalchemy import select

from ..analytics.common import usual_range
from ..copy.sentences import overview_summary
from ..db.models import Activity, ActivityDerived, Daily
from ..workspace import workspace
from .activity_views import summary as activity_summary
from .schemas import OverviewResponse
from .today import today_view


def _metric(value, unit: str, bounds: dict | None, spark: list, *, need: float | None = None) -> dict:
    status = "missing" if value is None else "within"
    if value is not None and bounds:
        status = "below" if value < bounds["low"] else "above" if value > bounds["high"] else "within"
    if value is not None and need is not None:
        status = "below" if value < need - 15 else "within"
    return {
        "value": value,
        "unit": unit,
        "usual_range": bounds,
        "status": status,
        "delta": value - need
        if value is not None and need is not None
        else value - bounds["median"]
        if value is not None and bounds and bounds.get("median") is not None
        else None,
        "spark": spark,
    }


def overview_view(request: Request):
    legacy = today_view(request)
    ws = workspace(request)
    today = date.fromisoformat(legacy["date"])
    with ws.store.sessions() as db:
        daily = [
            {"date": row.date, **row.data}
            for row in db.scalars(select(Daily).where(Daily.user_id == ws.user_id))
        ]
        activities = list(db.scalars(select(Activity).where(Activity.user_id == ws.user_id)))
        derived = {
            row.activity_id: row.data
            for row in db.scalars(select(ActivityDerived).where(ActivityDerived.user_id == ws.user_id))
        }
    by_day = {item["date"]: item for item in daily}
    current = by_day.get(today.isoformat(), {})

    def values(key: str, days: int = 30) -> list[float | None]:
        return [
            by_day.get((today - timedelta(days=offset)).isoformat(), {}).get(key)
            for offset in reversed(range(days))
        ]

    def bounds(key: str) -> dict | None:
        return usual_range(values(key)[0:-1])

    sleep_minutes = current.get("sleep_seconds") / 60 if current.get("sleep_seconds") is not None else None
    sleep_need = current.get("sleep_need_minutes") or current.get("sleep_need")
    sleep_seconds_range = bounds("sleep_seconds")
    sleep_range = (
        {
            **sleep_seconds_range,
            "low": sleep_seconds_range["low"] / 60,
            "high": sleep_seconds_range["high"] / 60,
            "median": sleep_seconds_range["median"] / 60,
        }
        if sleep_seconds_range
        else None
    )
    hrv_bounds = legacy["hrv"]["usual_range"] if legacy["hrv"] else bounds("hrv")
    battery_value = current.get("bb_at_wake")
    last_night = {
        "sleep": _metric(
            sleep_minutes,
            "min",
            sleep_range,
            [v / 60 if v is not None else None for v in values("sleep_seconds")],
            need=sleep_need,
        ),
        "resting_hr": _metric(
            current.get("resting_hr"),
            "bpm",
            legacy["resting_hr"]["usual_range"] if legacy["resting_hr"] else bounds("resting_hr"),
            values("resting_hr"),
        ),
        "hrv": _metric(current.get("hrv"), "ms", hrv_bounds, values("hrv")),
        "body_battery": _metric(battery_value, "", bounds("bb_at_wake"), values("bb_at_wake")),
    }
    week = legacy["week"]
    week_view = {
        "active_minutes": week["active_minutes"],
        "goal_minutes": week["goal_minutes"],
        "activity_count": week["activity_count"],
        "goal_activities": week["goal_activities"],
        "activity_seconds": week["activity_seconds"],
        "daily_active_minutes": week["daily_active_minutes"],
        "start": week["start"],
        "end": week["end"],
    }
    recent_rows = sorted(
        (row for row in activities if not row.data.get("parent_id")),
        key=lambda row: (row.date, row.data.get("start") or ""),
        reverse=True,
    )[:3]
    recent = [activity_summary(row.data, derived.get(row.id)) for row in recent_rows]
    reasons = [
        {"label": signal["label"], "value": signal["value_text"], "metric_id": signal["id"]}
        for signal in legacy["suggestion"]["signals"]
        if signal["id"] in {"sleep", "hrv", "body_battery", "resting_hr"}
    ][:3]
    notes = [
        {
            "id": item["id"],
            "text": item["title"],
            "source": item["evidence"],
            "href": "/health/sleep"
            if "sleep" in item["id"]
            else "/health/heart"
            if "hrv" in item["id"] or "rhr" in item["id"]
            else "/trends",
        }
        for item in legacy["insights"][:3]
    ]
    shortfall = sleep_need - sleep_minutes if sleep_need is not None and sleep_minutes is not None else None
    return {
        "date": legacy["date"],
        "summary_sentence": overview_summary(
            sleep_short_minutes=shortfall,
            hrv_below=last_night["hrv"]["status"] == "below",
            active_minutes=week["active_minutes"],
            goal_minutes=week["goal_minutes"],
        ),
        "last_night": last_night,
        "week": week_view,
        "today": {
            "kind": legacy["suggestion"]["kind"],
            "title": legacy["suggestion"]["title"],
            "sentence": legacy["suggestion"]["text"],
            "reasons": reasons,
        },
        "recent_activities": recent,
        "notes": notes,
        "feeling_today": legacy["checkin"],
    }


def register(app):
    app.add_api_route("/api/overview", overview_view, methods=["GET"], response_model=OverviewResponse)
    app.add_api_route("/api/demo/overview", overview_view, methods=["GET"], response_model=OverviewResponse)
    app.add_api_route("/api/today", overview_view, methods=["GET"], response_model=OverviewResponse)
    app.add_api_route("/api/demo/today", overview_view, methods=["GET"], response_model=OverviewResponse)
