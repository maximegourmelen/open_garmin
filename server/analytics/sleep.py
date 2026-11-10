"""Sleep summaries derived from Garmin-reported nights."""

from __future__ import annotations

import statistics
from datetime import UTC, date, datetime, timedelta

from ..copy.sentences import bedtime_sentence, sleep_debt_sentence, sleep_summary


def sleep_minutes(day: dict) -> float | None:
    seconds = day.get("sleep_seconds")
    return round(seconds / 60, 1) if seconds is not None else None


def _sleep_need(day: dict) -> float | None:
    need = day.get("sleep_need_minutes")
    return need if need is not None else day.get("sleep_need")


def sleep_sentence(day: dict) -> str:
    return sleep_summary(day)


def sleep_debt(days: list[dict], today: date) -> dict:
    recent = [
        day
        for day in days
        if (today - timedelta(days=6)).isoformat() <= day.get("date", "") <= today.isoformat()
    ]
    readings = [
        (minutes, need)
        for day in recent
        if (minutes := sleep_minutes(day)) is not None
        and (need := _sleep_need(day)) is not None
    ]
    short = sum(max(0, need - minutes) for minutes, need in readings) if readings else None
    return {
        "minutes": round(short) if short is not None else None,
        "n": len(readings),
        "sentence": sleep_debt_sentence(short),
        "method": "sleep_debt_7d@1",
    }


def minutes_from_noon(value: str | int | float | None) -> float | None:
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
    return (timestamp.hour * 60 + timestamp.minute - 12 * 60) % 1440


def bedtime_rhythm(days: list[dict], today: date) -> dict:
    recent = [
        day
        for day in days
        if (today - timedelta(days=13)).isoformat() <= day.get("date", "") <= today.isoformat()
    ]
    values = [minute for day in recent if (minute := minutes_from_noon(day.get("sleep_start"))) is not None]
    if len(values) < 7:
        return {
            "usual_minutes_from_noon": None,
            "usual_window_from_noon": None,
            "usual_minutes_after_18": None,
            "band_minutes": None,
            "within_7": None,
            "sentence": bedtime_sentence(None),
            "method": "bedtime_rhythm@1",
        }
    usual = statistics.median(values)
    spread = statistics.median(abs(value - usual) for value in values)
    band = max(30, spread)
    last_seven = [day for day in recent if day.get("date", "") >= (today - timedelta(days=6)).isoformat()]
    within = sum(
        abs(minute - usual) <= band
        for day in last_seven
        if (minute := minutes_from_noon(day.get("sleep_start"))) is not None
    )
    return {
        "usual_minutes_from_noon": round(usual),
        "usual_window_from_noon": [round(usual - band), round(usual + band)],
        "usual_minutes_after_18": round((usual - 360) % 1440),
        "band_minutes": round(band),
        "within_7": within,
        "sentence": bedtime_sentence(within),
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
            "optimal_range_pct": [low, high] if low is not None and high is not None else None,
            "optimal_range_minutes": [round(total / 60 * low / 100, 1), round(total / 60 * high / 100, 1)]
            if total and low is not None and high is not None
            else None,
            "optimal_start": round(total / 60 * low / 100, 1)
            if total and low is not None
            else None,
            "optimal_end": round(total / 60 * high / 100, 1)
            if total and high is not None
            else None,
            "in_range": low <= pct <= high
            if pct is not None and low is not None and high is not None
            else None,
            "source": "garmin" if low is not None and high is not None else "calculated",
        }
    return result
