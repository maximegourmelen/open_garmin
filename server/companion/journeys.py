"""Progress through original, flexible week-by-week journeys."""

from __future__ import annotations

import json
import statistics
from datetime import date, timedelta
from pathlib import Path

from ..analytics.common import daterange, week_start

DEFINITIONS = json.loads((Path(__file__).parent / "journeys.json").read_text())
BY_ID = {item["id"]: item for item in DEFINITIONS}


def available_journeys() -> list[dict]:
    return DEFINITIONS


def _steps_baseline(daily: list[dict], started: date) -> int:
    values = [
        day["steps"]
        for day in daily
        if day.get("steps") is not None
        and (started - timedelta(days=14)).isoformat() <= day.get("date", "") < started.isoformat()
    ]
    if not values:
        return 5000
    return round(statistics.median(values) / 250) * 250


def journey_progress(
    journey: dict | None,
    activities: list[dict],
    daily: list[dict],
    today: date,
    prefs: dict | None = None,
) -> dict | None:
    if not journey or journey.get("id") not in BY_ID:
        return None
    definition = BY_ID[journey["id"]]
    prefs = prefs or {}
    started = date.fromisoformat(journey["started"])
    start = date.fromisoformat(week_start(started, prefs.get("week_start", "monday")))
    base = _steps_baseline(daily, started)
    targets = []
    for index, target in enumerate(definition["weeks"], start=1):
        target = dict(target)
        if definition["id"] == "steps_6w":
            target["avg_steps"] = min(base + 500 * index, prefs.get("steps_goal", 8000) + 2000)
        targets.append((index, target))
        for _ in range(journey.get("repeats", []).count(index)):
            targets.append((index, dict(target)))
    daily_by_date = {day["date"]: day for day in daily if day.get("date")}
    top = [item for item in activities if not item.get("parent_id") and item.get("date")]
    weeks = []
    for slot, (index, target) in enumerate(targets):
        first = start + timedelta(days=slot * 7)
        last = first + timedelta(days=6)
        dates = {day.isoformat() for day in daterange(first, min(last, today))}
        rows = [item for item in top if item["date"] in dates]
        days = [daily_by_date[key] for key in dates if key in daily_by_date]
        minutes = 0.0
        for day in dates:
            record = daily_by_date.get(day, {})
            if record.get("intensity_moderate") is not None and record.get("intensity_vigorous") is not None:
                minutes += record["intensity_moderate"] + 2 * record["intensity_vigorous"]
            else:
                minutes += sum((item.get("duration") or 0) / 60 for item in rows if item["date"] == day)
        nights_at_need = sum(
            day.get("sleep_seconds") is not None
            and day.get("sleep_need_minutes") is not None
            and day["sleep_seconds"] / 60 >= day["sleep_need_minutes"]
            for day in days
        )
        observed_steps = [day["steps"] for day in days if day.get("steps") is not None]
        actual = {
            "minutes": round(minutes, 1),
            "sessions": len(rows),
            "longest_minutes": round(max(((item.get("duration") or 0) / 60 for item in rows), default=0), 1),
            "nights_at_need": nights_at_need,
            "avg_steps": round(statistics.mean(observed_steps)) if observed_steps else None,
        }
        fractions = [
            min(1, (actual[key] or 0) / value)
            for key, value in target.items()
            if key in actual and isinstance(value, (int, float)) and value > 0
        ]
        pct = round(statistics.mean(fractions) * 100) if fractions else 0
        status = (
            "upcoming"
            if first > today
            else "current"
            if first <= today <= last
            else "done"
            if pct >= 100
            else "partial"
        )
        weeks.append(
            {
                "week": index,
                "slot": slot + 1,
                "start": first.isoformat(),
                "end": last.isoformat(),
                "targets": target,
                "actual": actual,
                "pct": pct,
                "status": status,
            }
        )
    current_slot = next((item["slot"] for item in weeks if item["status"] == "current"), None)
    completed = today > start + timedelta(days=len(targets) * 7 - 1)
    return {
        "id": definition["id"],
        "name": definition["name"],
        "focus": definition["focus"],
        "started": journey["started"],
        "paused": journey.get("paused", False),
        "repeats": journey.get("repeats", []),
        "weeks": weeks,
        "current_slot": current_slot,
        "completed": completed,
        "method": "journey_progress@1",
    }
