"""Sleep summaries derived from Garmin-reported nights."""

from __future__ import annotations

import statistics
from datetime import UTC, date, datetime, timedelta


def sleep_minutes(day: dict) -> float | None:
    seconds = day.get("sleep_seconds")
    return round(seconds / 60, 1) if seconds is not None else None


def sleep_sentence(day: dict) -> str:
    minutes = sleep_minutes(day)
    if minutes is None:
        return "No sleep reading for this night."
    need = day.get("sleep_need_minutes") or day.get("sleep_need")
    if need is None:
        need = 420
    difference = minutes - need
    if difference > 15:
        return "You got a bit more than you needed."
    if difference >= -15:
        return "You got about what you needed."
    if difference >= -60:
        return "You got a little less than you needed."
    return "You got quite a bit less than you needed — an early night could help."


def sleep_debt(days: list[dict], today: date) -> dict:
    recent = [
        day
        for day in days
        if (today - timedelta(days=6)).isoformat() <= day.get("date", "") <= today.isoformat()
    ]
    short = sum(
        max(0, (day.get("sleep_need_minutes") or day.get("sleep_need") or 420) - minutes)
        for day in recent
        if (minutes := sleep_minutes(day)) is not None
    )
    return {
        "minutes": round(short),
        "n": sum(sleep_minutes(day) is not None for day in recent),
        "sentence": f"About {short / 60:.1f} h short this week"
        if short >= 60
        else "You're well rested this week.",
        "method": "sleep_debt_7d@1",
    }


def _bedtime_minutes(value: str | int | float | None) -> float | None:
    if value is None:
        return None
    try:
        timestamp = (
            datetime.fromtimestamp(value / 1000 if value > 10**11 else value, tz=UTC)
            if isinstance(value, (int, float))
            else datetime.fromisoformat(value.replace("Z", "+00:00"))
        )
    except (TypeError, ValueError, OverflowError):
        return None
    return (timestamp.hour * 60 + timestamp.minute - 18 * 60) % 1440


def bedtime_rhythm(days: list[dict], today: date) -> dict:
    recent = [
        day
        for day in days
        if (today - timedelta(days=13)).isoformat() <= day.get("date", "") <= today.isoformat()
    ]
    values = [minute for day in recent if (minute := _bedtime_minutes(day.get("sleep_start"))) is not None]
    if len(values) < 7:
        return {
            "usual_minutes_after_18": None,
            "band_minutes": None,
            "within_7": None,
            "sentence": "More nights of sleep data will show your bedtime rhythm.",
            "method": "bedtime_rhythm@1",
        }
    usual = statistics.median(values)
    spread = statistics.median(abs(value - usual) for value in values)
    band = max(30, spread)
    last_seven = [day for day in recent if day.get("date", "") >= (today - timedelta(days=6)).isoformat()]
    within = sum(
        abs(minute - usual) <= band
        for day in last_seven
        if (minute := _bedtime_minutes(day.get("sleep_start"))) is not None
    )
    return {
        "usual_minutes_after_18": round(usual),
        "band_minutes": round(band),
        "within_7": within,
        "sentence": "Your bedtime has been nice and regular."
        if within >= 5
        else "Your bedtimes moved around this week. A steadier rhythm often helps sleep.",
        "method": "bedtime_rhythm@1",
    }


def stage_ranges(day: dict) -> dict:
    total = day.get("sleep_seconds")
    subscores = day.get("sleep_subscores") or {}
    result = {}
    for stage in ("deep", "light", "rem", "awake"):
        seconds = day.get(f"{stage}_seconds")
        pct = round(seconds / total * 100, 1) if seconds is not None and total else None
        reported = subscores.get(f"{stage}Percentage") or subscores.get(stage) or {}
        low, high = reported.get("optimal_start"), reported.get("optimal_end")
        result[stage] = {
            "minutes": round(seconds / 60, 1) if seconds is not None else None,
            "pct": pct,
            "optimal_start": low,
            "optimal_end": high,
            "in_range": low <= pct <= high
            if pct is not None and low is not None and high is not None
            else None,
            "source": "garmin" if low is not None and high is not None else "calculated",
        }
    return result
