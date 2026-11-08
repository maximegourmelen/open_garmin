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
    if "hiking" in key or "hike" in key:
        return "hiking"
    if "walk" in key:
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


def normalize_activity_v2(raw: dict) -> dict:
    """Keep the v1 contract while exposing additional reported activity fields."""
    result = normalize_activity(raw)
    summary = raw.get("summaryDTO") if isinstance(raw.get("summaryDTO"), dict) else {}

    def get(key: str):
        return pick(summary.get(key), raw.get(key))

    sport = result["sport"]
    stride = number(get("avgStrideLength"))
    split_keys = {"1000": "fastestSplit_1000", "1609": "fastestSplit_1609", "5000": "fastestSplit_5000"}
    result.update(
        max_speed=number(get("maxSpeed")),
        gap_speed=number(get("avgGradeAdjustedSpeed")),
        elevation_loss=number(get("elevationLoss")),
        min_elevation=number(get("minElevation")),
        max_elevation=number(get("maxElevation")),
        steps=number(get("steps")),
        intensity_minutes_moderate=number(get("moderateIntensityMinutes")),
        intensity_minutes_vigorous=number(get("vigorousIntensityMinutes")),
        cadence_spm=number(get("averageRunningCadenceInStepsPerMinute"))
        if sport == "running" or sport == "walking"
        else None,
        cadence_rpm=number(pick(get("averageBikeCadence"), get("averageBikingCadenceInRevPerMinute")))
        if sport == "cycling"
        else None,
        stride_length_m=stride / 100 if stride is not None else None,
        ground_contact_ms=number(get("avgGroundContactTime")),
        vertical_oscillation_cm=number(get("avgVerticalOscillation")),
        vertical_ratio_pct=number(get("avgVerticalRatio")),
        max_power=number(get("maxPower")),
        normalized_power=number(get("normPower")),
        power_zones=[number(get(f"powerTimeInZone_{i}")) for i in range(1, 6)],
        te_label=get("trainingEffectLabel") if isinstance(get("trainingEffectLabel"), str) else None,
        te_aerobic_message=get("aerobicTrainingEffectMessage")
        if isinstance(get("aerobicTrainingEffectMessage"), str)
        else None,
        te_anaerobic_message=get("anaerobicTrainingEffectMessage")
        if isinstance(get("anaerobicTrainingEffectMessage"), str)
        else None,
        body_battery_impact=number(get("differenceBodyBattery")),
        temperature_min=number(get("minTemperature")),
        temperature_max=number(get("maxTemperature")),
        location_name=get("locationName") if isinstance(get("locationName"), str) else None,
        is_pr=bool(pick(get("isPR"), get("pr"))) if pick(get("isPR"), get("pr")) is not None else None,
        lap_count=number(get("lapCount")),
        garmin_fastest_splits={
            distance: number(get(key)) for distance, key in split_keys.items() if number(get(key)) is not None
        },
        total_sets=number(get("totalSets")),
        total_reps=number(get("totalReps")),
        normalizer_version=2,
    )
    return result


def normalize_daily_v2(raw_by_domain: dict) -> dict:
    """Rebuild one day from stored V2, sleep, HRV and legacy raw domains."""
    summary = raw_by_domain.get("summary") or {}
    sleep = raw_by_domain.get("sleep") or {}
    sleep = sleep.get("dailySleepDTO") or sleep
    hrv = raw_by_domain.get("hrv") or {}
    legacy = raw_by_domain.get("summary_legacy") or {}
    result = normalize_daily(summary)
    result["date"] = pick(
        result["date"], sleep.get("calendarDate"), hrv.get("calendarDate"), legacy.get("calendarDate")
    )
    if sleep:
        result.update(sleep_values(sleep))
    if hrv:
        result.update(
            hrv=number(hrv.get("lastNightAvg")),
            hrv_weekly=number(hrv.get("weeklyAvg")),
            hrv_status=hrv.get("status"),
            hrv_baseline=hrv.get("baseline"),
        )
    heart = summary.get("heartRate") or {}
    bb = summary.get("bodyBattery") or {}
    stress = summary.get("stress") or {}
    intensity = summary.get("intensityMinutes") or {}
    movement = summary.get("movement") or {}
    pulse_ox = summary.get("pulseOx") or {}
    respiration = summary.get("respiration") or {}
    calories = summary.get("calories") or {}
    need = sleep.get("sleepNeed") or {}
    baseline = hrv.get("baseline") or {}
    events = []
    for event in bb.get("activityEvents") or []:
        if not isinstance(event, dict) or not isinstance(event.get("eventType"), str):
            continue
        duration = number(event.get("durationInMillis"))
        events.append(
            {
                "type": event["eventType"],
                "start_local": event.get("eventStartTimeLocal"),
                "duration_s": duration / 1000 if duration is not None else None,
                "impact": number(event.get("bodyBatteryImpact")),
            }
        )
    subscores = {}
    for name, score in (sleep.get("sleepScores") or {}).items():
        if not isinstance(score, dict):
            continue
        subscores[name] = {
            "value": number(score.get("value")),
            "qualifier": score.get("qualifierKey"),
            "optimal_start": number(score.get("optimalStart")),
            "optimal_end": number(score.get("optimalEnd")),
        }
    duration_names = {
        "rest": "restDurationInMillis",
        "low": "lowStressDurationInMillis",
        "medium": "mediumStressDurationInMillis",
        "high": "highStressDurationInMillis",
    }
    result.update(
        hr_min=number(heart.get("minValue")),
        hr_max=number(heart.get("maxValue")),
        bb_charged=number(bb.get("chargedValue")),
        bb_drained=number(bb.get("drainedValue")),
        bb_min=number(bb.get("minValue")),
        bb_max=number(bb.get("maxValue")),
        bb_latest=number(bb.get("latestValue")),
        bb_at_wake=number(legacy.get("bodyBatteryAtWakeTime")),
        bb_events=events,
        stress_qualifier=stress.get("qualifier"),
        stress_max=number(stress.get("maxLevel")),
        intensity_moderate=number(intensity.get("moderate")),
        intensity_vigorous=number(intensity.get("vigorous")),
        intensity_goal=number(intensity.get("goal")),
        floors_up=number(movement.get("floorsAscended")),
        floors_down=number(movement.get("floorsDescended")),
        steps_goal=number(legacy.get("dailyStepGoal")),
        spo2_avg=number(pulse_ox.get("avgValue")),
        spo2_min=number(pulse_ox.get("minValue")),
        respiration_min=number(respiration.get("minValue")),
        respiration_max=number(respiration.get("maxValue")),
        active_calories=number(calories.get("burnedActive")),
        sleep_awake_count=number(sleep.get("awakeCount")),
        sleep_avg_hr=number(sleep.get("avgHeartRate")),
        sleep_avg_stress=number(sleep.get("avgSleepStress")),
        sleep_spo2_avg=number(sleep.get("averageSpO2Value")),
        sleep_spo2_min=number(sleep.get("lowestSpO2Value")),
        nap_seconds=number(sleep.get("napTimeSeconds")),
        sleep_need_minutes=number(need.get("actual")),
        sleep_need_baseline=number(need.get("baseline")),
        sleep_feedback=sleep.get("sleepScoreFeedback"),
        sleep_subscores=subscores,
        hrv_5min_high=number(hrv.get("lastNight5MinHigh")),
        hrv_balanced_low=number(baseline.get("balancedLow")),
        hrv_balanced_high=number(baseline.get("balancedUpper")),
        hrv_low_upper=number(baseline.get("lowUpper")),
        hrv_feedback=hrv.get("feedbackPhrase"),
        rhr_7d_avg=number(legacy.get("lastSevenDaysAvgRestingHeartRate")),
        normalizer_version=2,
    )
    for key, raw_key in duration_names.items():
        value = number(stress.get(raw_key))
        result[f"stress_{key}_s"] = value / 1000 if value is not None else None
    return result
