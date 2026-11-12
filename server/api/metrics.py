"""Personal metric summaries for the shared explanation drawer."""

from __future__ import annotations

import math
import statistics
from datetime import timedelta

from fastapi import HTTPException, Query, Request
from sqlalchemy import select

from ..analytics.common import daterange, local_today, usual_range
from ..analytics.load import effort_trend
from ..analytics.sleep import minutes_from_noon, sleep_minutes
from ..db.models import Activity, ActivityDerived, Daily, User
from ..workspace import workspace
from .schemas import MetricSummary

# Values stay in the units stored by the backend. Formatting belongs to the client.
SPECS = {
    "sleep_duration": ("min", "garmin", None, None),
    "sleep_need": ("min", "garmin", None, None),
    "sleep_score": ("score", "garmin", None, None),
    "sleep_bedtime": ("clock", "garmin", None, "Bedtime"),
    "sleep_wake": ("clock", "garmin", None, "Wake time"),
    "sleep_awakenings": ("times", "garmin", None, None),
    "sleep_stages": ("min", "garmin", None, "Deep sleep"),
    "bedtime_regularity": ("min", "calculated", "bedtime_rhythm@1", "From usual bedtime"),
    "resting_hr": ("bpm", "garmin", None, None),
    "hrv": ("ms", "garmin", None, None),
    "hrv_status": ("ms", "garmin", None, "7-day HRV average"),
    "body_battery": ("points", "garmin", None, "At wake"),
    "body_battery_high": ("points", "garmin", None, None),
    "body_battery_low": ("points", "garmin", None, None),
    "body_battery_charged": ("points", "garmin", None, None),
    "body_battery_drained": ("points", "garmin", None, None),
    "stress": ("score", "garmin", None, None),
    "stress_rest": ("min", "garmin", None, None),
    "stress_low": ("min", "garmin", None, None),
    "stress_medium": ("min", "garmin", None, None),
    "stress_high": ("min", "garmin", None, None),
    "steps": ("steps", "garmin", None, None),
    "steps_floors": ("floors", "garmin", None, None),
    "active_minutes": ("min", "garmin", "active_minutes@1", None),
    "activity_count": ("activities", "calculated", None, "Recorded activities"),
    "activity_time": ("min", "garmin", None, None),
    "activity_distance": ("km", "calculated", None, "Recorded distance"),
    "activity_avg_pace": ("s/km", "garmin", None, "Average pace"),
    "activity_swim_pace": ("s/100m", "garmin", None, "Swim pace"),
    "activity_avg_speed": ("km/h", "garmin", None, "Average speed"),
    "activity_avg_hr": ("bpm", "garmin", None, "Average activity heart rate"),
    "activity_elevation": ("m", "garmin", None, "Elevation gain"),
    "effort": ("points", "calculated", "effort_points@1", None),
    "hr_zones": ("min", "calculated", "zones_from_samples@1", "Time in zone 2"),
    "training_effect": ("score", "garmin", None, "Aerobic training effect"),
    "load": ("ratio", "calculated", "effort_trend@1", "7-day to 28-day effort ratio"),
    "efficiency": ("m/beat", "calculated", "efficiency_trend@1", None),
    "vo2max": ("mL/kg/min", "garmin", None, None),
    "usual_range": ("", "calculated", "common.usual_range", None),
    "record": ("records", "calculated", "bests@1", "New records"),
}
ACTIVITY_METRICS = {
    "activity_count",
    "activity_time",
    "activity_distance",
    "activity_avg_pace",
    "activity_swim_pace",
    "activity_avg_speed",
    "activity_avg_hr",
    "activity_elevation",
    "effort",
    "hr_zones",
    "training_effect",
    "load",
    "efficiency",
    "vo2max",
    "record",
}


def number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        return None
    return float(value)


def daily_value(metric_id: str, day: dict, bedtime_usual: float | None):
    if metric_id == "sleep_duration":
        return sleep_minutes(day)
    if metric_id == "sleep_need":
        return number(
            day.get("sleep_need_minutes")
            if day.get("sleep_need_minutes") is not None
            else day.get("sleep_need")
        )
    if metric_id == "sleep_stages":
        deep = number(day.get("deep_seconds"))
        return round(deep / 60, 1) if deep is not None else None
    if metric_id == "sleep_bedtime":
        return minutes_from_noon(day.get("sleep_start"))
    if metric_id == "sleep_wake":
        return minutes_from_noon(day.get("sleep_end"))
    if metric_id == "sleep_awakenings":
        return number(day.get("sleep_awake_count"))
    if metric_id == "bedtime_regularity":
        bedtime = minutes_from_noon(day.get("sleep_start"))
        return (
            round(abs(bedtime - bedtime_usual), 1)
            if bedtime is not None and bedtime_usual is not None
            else None
        )
    if metric_id == "hrv_status":
        return number(day.get("hrv_weekly"))
    if metric_id == "body_battery":
        return number(day.get("bb_at_wake"))
    if metric_id in {"body_battery_high", "body_battery_low", "body_battery_charged", "body_battery_drained"}:
        key = {
            "body_battery_high": "bb_max",
            "body_battery_low": "bb_min",
            "body_battery_charged": "bb_charged",
            "body_battery_drained": "bb_drained",
        }[metric_id]
        return number(day.get(key))
    if metric_id in {"stress_rest", "stress_low", "stress_medium", "stress_high"}:
        seconds = number(day.get(f"stress_{metric_id.removeprefix('stress_')}_s"))
        return round(seconds / 60, 1) if seconds is not None else None
    if metric_id == "steps_floors":
        return number(day.get("floors_up"))
    if metric_id == "active_minutes":
        moderate = number(day.get("intensity_moderate"))
        vigorous = number(day.get("intensity_vigorous"))
        return moderate + 2 * vigorous if moderate is not None and vigorous is not None else None
    if metric_id == "usual_range":
        return None
    return number(day.get(metric_id))


def activity_value(metric_id: str, items: list[tuple[dict, dict]]):
    if not items:
        return None
    if metric_id == "activity_count":
        return float(len(items))
    if metric_id == "activity_distance":
        return round(sum(number(data.get("distance")) or 0 for data, _ in items), 1)
    if metric_id == "activity_time":
        return round(sum(number(data.get("duration")) or 0 for data, _ in items) / 60, 1)
    if metric_id in {
        "activity_avg_pace",
        "activity_swim_pace",
        "activity_avg_speed",
        "activity_avg_hr",
        "activity_elevation",
    }:
        if metric_id == "activity_avg_pace":
            values = [
                1000 / speed
                for data, _ in items
                if data.get("sport") in {"running", "walking", "hiking"}
                if (speed := number(data.get("average_speed"))) and speed > 0
            ]
        elif metric_id == "activity_avg_speed":
            values = [
                speed * 3.6
                for data, _ in items
                if data.get("sport") not in {"running", "walking", "hiking", "swimming"}
                if (speed := number(data.get("average_speed"))) and speed > 0
            ]
        elif metric_id == "activity_swim_pace":
            values = [
                100 / speed
                for data, _ in items
                if data.get("sport") == "swimming"
                if (speed := number(data.get("average_speed"))) and speed > 0
            ]
        else:
            key = "average_hr" if metric_id == "activity_avg_hr" else "elevation"
            values = [value for data, _ in items if (value := number(data.get(key))) is not None]
        return round(statistics.mean(values), 1) if values else None
    if metric_id == "record":
        return float(sum(bool(derived.get("is_best")) for _, derived in items))
    if metric_id == "effort":
        values = [number(derived.get("effort_points")) for _, derived in items]
        observed = [value for value in values if value is not None]
        return round(sum(observed), 1) if observed else None
    if metric_id == "hr_zones":
        values = [
            number(zones[1]) if len(zones := (derived.get("zone_minutes") or [])) > 1 else None
            for _, derived in items
        ]
        observed = [value for value in values if value is not None]
        return round(sum(observed), 1) if observed else None
    if metric_id == "training_effect":
        values = [number(data.get("aerobic_te")) for data, _ in items]
    elif metric_id == "efficiency":
        values = [number((derived.get("efficiency") or {}).get("ef")) for _, derived in items]
    elif metric_id == "vo2max":
        values = [number(data.get("vo2max")) for data, _ in items]
    else:
        return None
    observed = [value for value in values if value is not None]
    return round(statistics.mean(observed), 2) if observed else None


def metric_summary(request: Request, metric_id: str, days: int = Query(default=30, ge=7, le=365)):
    if metric_id not in SPECS:
        raise HTTPException(404, "Unknown metric.")
    ws = workspace(request)
    with ws.store.sessions() as db:
        user = db.get(User, ws.user_id)
        today = local_today(user.preferences or {})
        first = today - timedelta(days=days - 1)
        warmup = first - timedelta(days=28)
        daily = {
            row.date: row.data
            for row in db.scalars(
                select(Daily).where(
                    Daily.user_id == ws.user_id,
                    Daily.date >= first.isoformat(),
                    Daily.date <= today.isoformat(),
                )
            )
        }
        activities = list(
            db.scalars(
                select(Activity).where(
                    Activity.user_id == ws.user_id,
                    Activity.date >= warmup.isoformat(),
                    Activity.date <= today.isoformat(),
                )
            )
        )
        derived = (
            {
                row.activity_id: row.data
                for row in db.scalars(
                    select(ActivityDerived).where(
                        ActivityDerived.user_id == ws.user_id,
                        ActivityDerived.activity_id.in_([activity.id for activity in activities]),
                    )
                )
            }
            if activities
            else {}
        )
    by_day: dict[str, list[tuple[dict, dict]]] = {}
    for activity in activities:
        if not activity.data.get("parent_id"):
            by_day.setdefault(activity.date, []).append((activity.data, derived.get(activity.id, {})))
    bedtimes = [minutes_from_noon(day.get("sleep_start")) for day in daily.values()]
    observed_bedtimes = [minute for minute in bedtimes if minute is not None]
    bedtime_usual = statistics.median(observed_bedtimes) if len(observed_bedtimes) >= 7 else None
    trend = None
    if metric_id == "load":
        effort_items = [
            {"date": date, "effort_points": item[1].get("effort_points")}
            for date, items in by_day.items()
            for item in items
        ]
        trend = {item["date"]: item["ratio"] for item in effort_trend(effort_items, first, today)["days"]}
    series = []
    for day in daterange(first, today):
        date = day.isoformat()
        if metric_id == "load":
            value = trend.get(date) if trend else None
        elif metric_id in ACTIVITY_METRICS:
            value = activity_value(metric_id, by_day.get(date, []))
            if metric_id == "activity_distance" and value is not None:
                divisor = 1609.344 if (user.preferences or {}).get("units") == "imperial" else 1000
                value = round(value / divisor, 2)
            if value is not None and (user.preferences or {}).get("units") == "imperial":
                if metric_id == "activity_avg_pace":
                    value = round(value * 1.609344, 1)
                elif metric_id == "activity_swim_pace":
                    value = round(value * 0.9144, 1)
                elif metric_id == "activity_avg_speed":
                    value = round(value / 1.609344, 1)
                elif metric_id == "activity_elevation":
                    value = round(value * 3.28084, 1)
        else:
            value = daily_value(metric_id, daily.get(date, {}), bedtime_usual)
            if metric_id == "active_minutes" and value is None:
                values = [
                    (
                        number(data.get("intensity_minutes_moderate")),
                        number(data.get("intensity_minutes_vigorous")),
                    )
                    for data, _ in by_day.get(date, [])
                ]
                if values and all(m is not None and v is not None for m, v in values):
                    value = sum(m + 2 * v for m, v in values)
        series.append({"date": date, "value": value})
    latest = next((item for item in reversed(series) if item["value"] is not None), None)
    unit, source, method_id, value_label = SPECS[metric_id]
    if metric_id == "activity_distance" and (user.preferences or {}).get("units") == "imperial":
        unit = "mi"
    if (user.preferences or {}).get("units") == "imperial":
        unit = {
            "activity_avg_pace": "s/mi",
            "activity_swim_pace": "s/100yd",
            "activity_avg_speed": "mph",
            "activity_elevation": "ft",
        }.get(metric_id, unit)
    return {
        "id": metric_id,
        "latest": latest,
        "unit": unit,
        "usual_range": usual_range([item["value"] for item in series]),
        "series": series,
        "source": source,
        "method_id": method_id,
        "value_label": value_label,
    }


def register(app):
    for prefix in ("/api", "/api/demo"):
        app.add_api_route(
            f"{prefix}/metrics/{{metric_id}}/summary",
            metric_summary,
            methods=["GET"],
            response_model=MetricSummary,
        )
