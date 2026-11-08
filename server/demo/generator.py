"""Deterministic Garmin-shaped data for a fictional beginner's first year."""

from __future__ import annotations

import math
import random
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from ..garmin.normalize import normalize_activity_v2, normalize_daily_v2

SEED = 16165
TIMEZONE = "America/Toronto"
PARK_LAT = 45.503
PARK_LON = -73.587


def _activity_raw(
    day: date, index: int, progress: float, sport: str, duration_minutes: int, rng: random.Random
) -> tuple[dict, list[dict]]:
    speed_base = {"walking": 1.36, "running": 2.38, "strength": 0.0, "cycling": 4.5}[sport]
    speed = speed_base * (1 + (0.10 * progress if sport == "running" else 0.04 * progress))
    speed *= rng.uniform(0.96, 1.04)
    seconds = duration_minutes * 60
    distance = round(speed * seconds, 1) if sport != "strength" else None
    heart = {"walking": 111, "running": 138, "strength": 116, "cycling": 126}[sport] + rng.randint(-5, 5)
    zone_mix = [0.3, 0.5, 0.16, 0.04, 0.0] if sport == "running" else [0.46, 0.46, 0.08, 0.0, 0.0]
    if sport == "strength":
        zone_mix = [0.35, 0.45, 0.18, 0.02, 0.0]
    if sport == "cycling":
        zone_mix = [0.28, 0.47, 0.2, 0.05, 0.0]
    started = datetime.combine(day, time(7 + index % 4, 10 + (index * 7) % 45))
    sport_key = {
        "walking": "walking",
        "running": "running",
        "strength": "strength_training",
        "cycling": "cycling",
    }[sport]
    raw = {
        "activityId": 900000 + index,
        "activityName": {
            "walking": "Park walk",
            "running": "Easy run",
            "strength": "Strength session",
            "cycling": "Neighbourhood ride",
        }[sport],
        "activityType": {"typeKey": sport_key},
        "startTimeLocal": started.isoformat(),
        "startTimeGMT": started.replace(tzinfo=ZoneInfo(TIMEZONE)).astimezone(ZoneInfo("UTC")).isoformat(),
        "distance": distance,
        "duration": seconds,
        "elapsedDuration": seconds + rng.randint(0, 120),
        "movingDuration": seconds,
        "averageHR": heart,
        "maxHR": heart + rng.randint(16, 32),
        "averageSpeed": speed if sport != "strength" else None,
        "maxSpeed": speed * 1.27 if sport != "strength" else None,
        "avgGradeAdjustedSpeed": speed * 1.02 if sport != "strength" else None,
        "elevationGain": rng.randint(10, 70) if sport != "strength" else None,
        "elevationLoss": rng.randint(10, 70) if sport != "strength" else None,
        "minElevation": 78,
        "maxElevation": 128,
        "calories": round(seconds / 60 * {"walking": 4, "running": 8, "strength": 5, "cycling": 6}[sport]),
        "steps": round(distance / (0.7 if sport == "walking" else 0.95))
        if sport in ("walking", "running")
        else None,
        "moderateIntensityMinutes": duration_minutes
        if sport != "running"
        else round(duration_minutes * 0.65),
        "vigorousIntensityMinutes": round(duration_minutes * 0.35) if sport == "running" else 0,
        "averageRunningCadenceInStepsPerMinute": 158 + round(progress * 12)
        if sport == "running"
        else 121
        if sport == "walking"
        else None,
        "averageBikeCadence": 74 if sport == "cycling" else None,
        "avgStrideLength": 84 + progress * 9 if sport == "running" else 68 if sport == "walking" else None,
        "avgGroundContactTime": 285 - progress * 18 if sport == "running" else None,
        "avgVerticalOscillation": 8.5 - progress * 0.4 if sport == "running" else None,
        "avgVerticalRatio": 9.5 - progress * 0.5 if sport == "running" else None,
        "averagePower": 170 if sport == "running" else 120 if sport == "cycling" else None,
        "maxPower": 260 if sport == "running" else 230 if sport == "cycling" else None,
        "normPower": 185 if sport == "running" else 145 if sport == "cycling" else None,
        "trainingEffect": 2.3 if sport == "running" else 1.8,
        "anaerobicTrainingEffect": 0.4 if sport == "running" else 0.1,
        "trainingEffectLabel": "AEROBIC_BASE" if sport in ("running", "cycling") else "RECOVERY",
        "aerobicTrainingEffectMessage": "MAINTAINING",
        "anaerobicTrainingEffectMessage": "NO_EFFECT",
        "differenceBodyBattery": -round(duration_minutes / 5),
        "minTemperature": 8,
        "maxTemperature": 18,
        "locationName": "Fictional Park" if sport != "strength" else "Home",
        "isPR": index in (42, 128, 215),
        "lapCount": max(1, round(distance / 1000)) if distance else 0,
        "fastestSplit_1000": round(1000 / speed) if distance and distance >= 1000 else None,
        "fastestSplit_5000": round(5000 / speed) if distance and distance >= 5000 else None,
        "totalSets": 4 if sport == "strength" else None,
        "totalReps": 36 if sport == "strength" else None,
    }
    for zone, fraction in enumerate(zone_mix, start=1):
        raw[f"hrTimeInZone_{zone}"] = round(seconds * fraction)
        raw[f"powerTimeInZone_{zone}"] = (
            round(seconds * fraction) if sport in ("running", "cycling") else None
        )
    samples = []
    for minute in range(duration_minutes + 1):
        offset = minute * 60
        angle = minute / max(duration_minutes, 1) * 2 * math.pi
        radius = 0.0032 * (1 + 0.06 * math.sin(angle * 3 + index))
        sample = {
            "time": offset,
            "distance": round(speed * offset, 1) if distance is not None else None,
            "hr": heart + round(9 * math.sin(angle / 2)) if minute else heart - 15,
            "speed": speed * (1 + 0.03 * math.sin(angle * 2)) if distance is not None else None,
            "elevation": 95 + 12 * math.sin(angle) if distance is not None else None,
            "cadence": (raw["averageRunningCadenceInStepsPerMinute"] / 2) if sport == "running" else None,
            "cadence_spm": raw["averageRunningCadenceInStepsPerMinute"],
            "cadence_rpm": raw["averageBikeCadence"],
            "power": raw["averagePower"],
            "lat": PARK_LAT + radius * math.sin(angle) if distance is not None else None,
            "lon": PARK_LON + radius * math.cos(angle) if distance is not None else None,
        }
        samples.append(sample)
    return raw, samples


def _daily_raw(day: date, day_index: int, progress: float, rng: random.Random) -> dict:
    weekday = day.weekday()
    dip = 195 <= day_index < 216
    sleep_hours = max(
        6.5, min(8.0, 7.3 + (0.3 if weekday >= 5 else -0.15) + rng.uniform(-0.55, 0.55) - (0.4 if dip else 0))
    )
    sleep_seconds = round(sleep_hours * 3600)
    steps = max(5000, min(11000, round(5500 + progress * 4300 + rng.randint(-1100, 1100))))
    rhr = round(62 - 7 * progress + rng.uniform(-2, 2))
    hrv = round(45 + 15 * progress + rng.uniform(-5, 5) - (5 if dip else 0))
    bb_wake = max(40, min(95, round(72 + rng.uniform(-15, 15) - (12 if dip else 0))))
    sleep_start = datetime.combine(day - timedelta(days=1), time(22, 40)) + timedelta(
        minutes=rng.randint(-35, 35)
    )
    sleep_end = sleep_start + timedelta(seconds=sleep_seconds)
    summary = {
        "calendarDate": day.isoformat(),
        "movement": {
            "steps": steps,
            "floorsAscended": rng.randint(2, 12),
            "floorsDescended": rng.randint(2, 12),
        },
        "heartRate": {"restingValue": rhr, "minValue": rhr - 4, "maxValue": rhr + 92},
        "bodyBattery": {
            "chargedValue": max(20, bb_wake - 20),
            "drainedValue": rng.randint(25, 55),
            "minValue": 15,
            "maxValue": bb_wake,
            "latestValue": max(15, bb_wake - rng.randint(20, 48)),
            "activityEvents": [],
        },
        "stress": {
            "avgLevel": rng.randint(20, 38),
            "maxLevel": rng.randint(55, 85),
            "qualifier": "LOW" if not dip else "MODERATE",
            "restDurationInMillis": 6 * 3600 * 1000,
            "lowStressDurationInMillis": 5 * 3600 * 1000,
            "mediumStressDurationInMillis": 2 * 3600 * 1000,
            "highStressDurationInMillis": 30 * 60 * 1000,
        },
        "intensityMinutes": {
            "moderate": 20 if weekday in (0, 2, 4, 5, 6) else 0,
            "vigorous": 5 if progress > 0.2 and weekday in (2, 5) else 0,
            "goal": 150,
        },
        "pulseOx": {"avgValue": 97, "minValue": 94},
        "respiration": {"avgValue": 15, "minValue": 10, "maxValue": 21},
        "calories": {
            "burnedTotal": 2100 + rng.randint(-120, 120),
            "burnedActive": 360 + rng.randint(-100, 100),
        },
    }
    sleep = {
        "calendarDate": day.isoformat(),
        "sleepTimeSeconds": sleep_seconds,
        "sleepStartTimestampLocal": sleep_start.isoformat(),
        "sleepEndTimestampLocal": sleep_end.isoformat(),
        "deepSleepSeconds": round(sleep_seconds * 0.18),
        "remSleepSeconds": round(sleep_seconds * 0.22),
        "lightSleepSeconds": round(sleep_seconds * 0.55),
        "awakeSleepSeconds": round(sleep_seconds * 0.05),
        "awakeCount": rng.randint(1, 3),
        "avgHeartRate": rhr + 4,
        "avgSleepStress": rng.randint(9, 20),
        "averageSpO2Value": 97,
        "lowestSpO2Value": 94,
        "napTimeSeconds": 0,
        "sleepNeed": {"actual": 480, "baseline": 480},
        "sleepScoreFeedback": "GOOD",
        "sleepScores": {
            "overall": {"value": round(70 + (sleep_hours - 7) * 10), "qualifierKey": "GOOD"},
            "deepPercentage": {"value": 18, "qualifierKey": "GOOD", "optimalStart": 15, "optimalEnd": 25},
            "remPercentage": {"value": 22, "qualifierKey": "GOOD", "optimalStart": 20, "optimalEnd": 25},
            "lightPercentage": {"value": 55, "qualifierKey": "FAIR", "optimalStart": 45, "optimalEnd": 55},
        },
    }
    hrv_raw = {
        "calendarDate": day.isoformat(),
        "lastNightAvg": hrv,
        "weeklyAvg": hrv,
        "lastNight5MinHigh": hrv + 15,
        "status": "BALANCED",
        "baseline": {
            "balancedLow": 42 + round(progress * 8),
            "balancedUpper": 62 + round(progress * 8),
            "lowUpper": 39 + round(progress * 8),
        },
        "feedbackPhrase": "BALANCED",
    }
    legacy = {
        "calendarDate": day.isoformat(),
        "dailyStepGoal": 7500,
        "bodyBatteryAtWakeTime": bb_wake,
        "lastSevenDaysAvgRestingHeartRate": rhr,
    }
    return {"summary": summary, "sleep": sleep, "hrv": hrv_raw, "summary_legacy": legacy}


def generate_demo(today: date | None = None) -> dict:
    """Return the same year for the same end date and fixed seed."""
    today = today or datetime.now(ZoneInfo(TIMEZONE)).date()
    start = today - timedelta(days=364)
    rng = random.Random(SEED)
    activities = []
    daily = []
    activity_index = 0
    for day_index in range(365):
        day = start + timedelta(days=day_index)
        progress = day_index / 364
        raw_day = _daily_raw(day, day_index, progress, rng)
        daily.append({"date": day.isoformat(), "raw": raw_day, "data": normalize_daily_v2(raw_day)})
        weekday = day.weekday()
        dip = 195 <= day_index < 216
        if weekday not in ((2, 5) if dip else (0, 2, 4, 5, 6)):
            continue
        sport = "walking"
        if progress > 0.18 and weekday in (2, 5):
            sport = "running"
        elif progress > 0.15 and weekday == 6:
            sport = "strength"
        elif progress > 0.3 and weekday == 4 and day_index % 28 < 7:
            sport = "cycling"
        if dip:
            sport = "walking"
        duration = round(14 + progress * 22 + rng.randint(-3, 4))
        if sport == "strength":
            duration = round(24 + progress * 8)
        if dip:
            duration = 15
        raw_activity, samples = _activity_raw(day, activity_index, progress, sport, duration, rng)
        activities.append(
            {
                "date": day.isoformat(),
                "raw": raw_activity,
                "data": normalize_activity_v2(raw_activity),
                "samples": samples,
            }
        )
        activity_index += 1
    return {"activities": activities, "daily": daily}
