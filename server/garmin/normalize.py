"""Loss-aware normalization of Garmin payloads."""

from __future__ import annotations

import math
from datetime import date, timedelta


def number(value):
    if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value):
        return value
    return None


def pick(*values):
    return next((v for v in values if v is not None), None)


def sport_name(key: str) -> str:
    key = str(key or "other").lower()
    if any(v in key for v in ("running", "treadmill", "trail_run", "virtual_run")):
        return "running"
    if any(v in key for v in ("cycling", "biking", "gravel", "mountain_bike")):
        return "cycling"
    if any(v in key for v in ("strength", "weight", "functional")):
        return "strength"
    if "swim" in key:
        return "swimming"
    if "walk" in key or "hiking" in key:
        return "walking"
    return "other"


def device_name(raw: dict) -> str:
    """Retain reported model names without maintaining a watch-model allowlist."""
    for source in (raw, raw.get("summaryDTO"), raw.get("deviceInfo")):
        if not isinstance(source, dict):
            continue
        for key in ("deviceName", "deviceModel", "productName", "displayName"):
            value = source.get(key)
            if isinstance(value, str) and value.strip():
                name = value.strip()[:80]
                return name if name.lower().startswith("garmin ") else f"Garmin {name}"
    return "Garmin"


def normalize_activity(raw: dict) -> dict:
    summary = raw.get("summaryDTO") or raw
    typ = raw.get("activityTypeDTO") or raw.get("activityType") or {}
    kind = typ.get("typeKey") if isinstance(typ, dict) else str(typ)
    start = summary.get("startTimeLocal") or raw.get("startTimeLocal") or summary.get("startTimeGMT") or ""
    result = {
        "id": str(raw.get("activityId") or ""),
        "name": raw.get("activityName") or "Untitled activity",
        "sport": sport_name(kind),
        "type": kind or "other",
        "start": start,
        "start_utc": summary.get("startTimeGMT") or raw.get("startTimeGMT"),
        "date": start[:10],
        "distance": number(summary.get("distance")),
        "duration": number(summary.get("duration")),
        "elapsed": number(summary.get("elapsedDuration")),
        "moving": number(summary.get("movingDuration")),
        "average_hr": number(pick(summary.get("averageHR"), summary.get("average_hr"))),
        "max_hr": number(summary.get("maxHR")),
        "average_speed": number(summary.get("averageSpeed")),
        "elevation": number(summary.get("elevationGain")),
        "calories": number(summary.get("calories")),
        "power": number(pick(summary.get("averagePower"), summary.get("avgPower"))),
        "cadence": number(
            pick(
                summary.get("averageRunCadence"),
                summary.get("averageRunningCadenceInStepsPerMinute"),
                summary.get("averageBikeCadence"),
            )
        ),
        "aerobic_te": number(pick(summary.get("trainingEffect"), summary.get("aerobicTrainingEffect"))),
        "anaerobic_te": number(pick(summary.get("anaerobicTrainingEffect"), summary.get("anaerobicTE"))),
        "training_load": number(summary.get("activityTrainingLoad")),
        "vo2max": number(pick(summary.get("vO2MaxValue"), summary.get("vo2MaxValue"))),
        "description": raw.get("description") or "",
        "parent_id": raw.get("parentId"),
        "is_parent": bool(raw.get("isMultiSportParent") or raw.get("isParent") or raw.get("parent")),
        "device": device_name(raw),
        "source": "garmin",
        "zones": [number(summary.get(f"hrTimeInZone_{i}")) for i in range(1, 6)],
        "samples": [],
        "laps": [],
        "sets": [],
        "detail_state": "not_loaded",
    }
    if result["average_speed"] is None and result["distance"] is not None and result["duration"]:
        result["average_speed"] = result["distance"] / result["duration"]
    return result


def _nested(raw: dict, section: str, *fields):
    part = raw.get(section) or {}
    return next(
        (part[name] for name in fields if isinstance(part, dict) and part.get(name) is not None), None
    )


def normalize_daily(raw: dict) -> dict:
    steps = _nested(raw, "movement", "totalSteps", "steps")
    if isinstance(steps, dict):
        steps = steps.get("value")
    return {
        "date": raw.get("calendarDate") or raw.get("date"),
        "steps": number(pick(raw.get("totalSteps"), steps)),
        "resting_hr": number(
            pick(raw.get("restingHeartRate"), _nested(raw, "heartRate", "restingHeartRate", "restingValue"))
        ),
        "stress": number(
            pick(
                raw.get("averageStressLevel"),
                _nested(raw, "stress", "averageStressLevel", "averageValue", "avgLevel"),
            )
        ),
        "body_battery": number(
            pick(
                raw.get("bodyBatteryMostRecentValue"),
                _nested(raw, "bodyBattery", "latestValue", "endOfDayValue"),
            )
        ),
        "body_battery_high": number(
            pick(raw.get("bodyBatteryHighestValue"), _nested(raw, "bodyBattery", "maxValue"))
        ),
        "calories": number(
            pick(
                raw.get("totalKilocalories"),
                _nested(raw, "calories", "totalKilocalories", "totalKilocalorieValue", "burnedTotal"),
            )
        ),
        "respiration": number(
            pick(
                raw.get("avgWakingRespirationValue"),
                _nested(raw, "respiration", "avgWakingRespirationValue", "averageValue", "avgValue"),
            )
        ),
        "sleep_seconds": None,
        "sleep_score": None,
        "sleep_need": None,
        "hrv": None,
        "hrv_status": None,
        "source": "garmin",
    }


def sleep_values(raw: dict) -> dict:
    raw = raw.get("dailySleepDTO") or raw
    scores = raw.get("sleepScores") or {}
    overall = scores.get("overall") or scores.get("overallScore") or {}
    need = raw.get("sleepNeed") or {}
    return {
        "sleep_seconds": number(raw.get("sleepTimeSeconds")),
        "sleep_score": number(overall.get("value") if isinstance(overall, dict) else overall),
        "sleep_need": number(need.get("actual")) if isinstance(need, dict) else None,
        "sleep_start": raw.get("sleepStartTimestampLocal"),
        "sleep_end": raw.get("sleepEndTimestampLocal"),
        "deep_seconds": number(raw.get("deepSleepSeconds")),
        "rem_seconds": number(raw.get("remSleepSeconds")),
        "light_seconds": number(raw.get("lightSleepSeconds")),
        "awake_seconds": number(raw.get("awakeSleepSeconds")),
        "sleep_respiration": number(raw.get("averageRespirationValue")),
    }


def chunks(start: date, end: date, size: int):
    while start <= end:
        until = min(end, start + timedelta(days=size - 1))
        yield start.isoformat(), until.isoformat()
        start = until + timedelta(days=1)
