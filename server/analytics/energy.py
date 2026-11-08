"""Body Battery and stress summaries using Garmin values as reported."""

from __future__ import annotations


def body_battery_day(day: dict, activities: list[dict] | None = None) -> dict:
    charged, drained = day.get("bb_charged"), day.get("bb_drained")
    sentence = None
    if charged is not None and drained is not None:
        sentence = (
            "You recharged more than you used — nice."
            if charged >= drained
            else "A draining day — make some room to recharge tonight."
        )
    return {
        "latest": day.get("bb_latest"),
        "at_wake": day.get("bb_at_wake"),
        "high": day.get("bb_max"),
        "low": day.get("bb_min"),
        "charged": charged,
        "drained": drained,
        "events": day.get("bb_events") or [],
        "activity_impacts": [
            {"id": item.get("id"), "name": item.get("name"), "impact": item.get("body_battery_impact")}
            for item in activities or []
            if item.get("body_battery_impact") is not None
        ],
        "sentence": sentence,
        "source": "garmin",
        "method": "body_battery@1",
    }


def stress_day(day: dict) -> dict:
    labels = {
        "CALM": "Calm day",
        "BALANCED": "Balanced day",
        "STRESSFUL": "A stressful day",
        "VERY_STRESSFUL": "A very stressful day",
    }
    qualifier = day.get("stress_qualifier")
    minutes = {
        key: round(day[f"stress_{key}_s"] / 60, 1) if day.get(f"stress_{key}_s") is not None else None
        for key in ("rest", "low", "medium", "high")
    }
    measured = sum(value for value in minutes.values() if value is not None)
    return {
        "average": day.get("stress"),
        "max": day.get("stress_max"),
        "qualifier": qualifier,
        "title": labels.get(
            str(qualifier).upper(), str(qualifier).replace("_", " ").title() if qualifier else None
        ),
        "minutes": minutes,
        "pct": {
            key: round(value / measured * 100, 1) if value is not None and measured else None
            for key, value in minutes.items()
        },
        "measured_minutes": round(measured, 1),
        "source": "garmin",
        "method": "stress_day@1",
    }
