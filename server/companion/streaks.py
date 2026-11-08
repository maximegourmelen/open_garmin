"""Weekly consistency streaks with an unfinished current week."""

from __future__ import annotations

from datetime import date, timedelta

from ..analytics.common import daterange, week_start


def streak(
    activities: list[dict], daily: list[dict], prefs: dict, today: date, *, include_all: bool = False
) -> dict:
    start = date.fromisoformat(week_start(today, prefs.get("week_start", "monday")))
    by_date = {item["date"]: item for item in daily if item.get("date")}
    activities_by_date: dict[str, list[dict]] = {}
    for item in activities:
        if item.get("date") and not item.get("parent_id"):
            activities_by_date.setdefault(item["date"], []).append(item)
    first_known = min([date.fromisoformat(key) for key in [*by_date, *activities_by_date]], default=start)
    first_week = date.fromisoformat(week_start(first_known, prefs.get("week_start", "monday")))
    weeks = []
    cursor = first_week
    while cursor <= start:
        minutes = 0.0
        sessions = 0
        for day in daterange(cursor, min(cursor + timedelta(days=6), today)):
            key = day.isoformat()
            rows = activities_by_date.get(key, [])
            sessions += len(rows)
            record = by_date.get(key, {})
            if record.get("intensity_moderate") is not None and record.get("intensity_vigorous") is not None:
                minutes += record["intensity_moderate"] + 2 * record["intensity_vigorous"]
            else:
                minutes += sum((row.get("duration") or 0) / 60 for row in rows)
        goal = prefs.get("weekly_minutes", 150)
        sessions_goal = prefs.get("weekly_sessions", 3)
        met = (goal > 0 and minutes >= goal) or (sessions_goal > 0 and sessions >= sessions_goal)
        weeks.append(
            {
                "start": cursor.isoformat(),
                "minutes": round(minutes, 1),
                "sessions": sessions,
                "pct": round(minutes / goal * 100) if goal else None,
                "met": met,
            }
        )
        cursor += timedelta(days=7)
    completed = weeks[:-1]
    longest = running = 0
    for item in weeks:
        running = running + 1 if item["met"] else 0
        longest = max(longest, running)
    current = 1 if weeks[-1]["met"] else 0
    for item in reversed(completed):
        if not item["met"]:
            break
        current += 1
    # A partial week doesn't interrupt the streak built through last week.
    if not weeks[-1]["met"]:
        current = 0
        for item in reversed(completed):
            if not item["met"]:
                break
            current += 1
    current_week = weeks[-1]
    remaining_minutes = max(0, round(prefs.get("weekly_minutes", 150) - current_week["minutes"]))
    remaining_sessions = max(0, prefs.get("weekly_sessions", 3) - current_week["sessions"])
    result = {
        "current": current,
        "longest": longest,
        "at_risk": not current_week["met"] and (start + timedelta(days=6) - today).days <= 2 and current >= 1,
        "remaining_minutes": remaining_minutes,
        "remaining_sessions": remaining_sessions,
        "weeks": weeks[-12:],
        "method": "streak@1",
    }
    if include_all:
        result["all_weeks"] = weeks
    return result
