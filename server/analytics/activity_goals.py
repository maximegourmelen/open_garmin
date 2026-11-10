"""Beginner-facing active-minute, step and goal summaries."""

from __future__ import annotations

import statistics
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal

from ..copy.sentences import goal_suggestion as goal_suggestion_sentence
from ..copy.sentences import week_progress
from .common import daterange, week_start


def _activities_by_day(activities: list[dict]) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = {}
    for item in activities:
        if item.get("parent_id") or not item.get("date"):
            continue
        grouped.setdefault(item["date"], []).append(item)
    return grouped


def weekly_active_minutes(activities: list[dict], daily: list[dict], prefs: dict, today: date) -> dict:
    start = date.fromisoformat(week_start(today, prefs.get("week_start", "monday")))
    end = start + timedelta(days=6)
    daily_by_date = {item["date"]: item for item in daily if item.get("date")}
    activities_by_date = _activities_by_day(activities)
    by_day = []
    garmin_days = fallback_days = 0
    for day in daterange(start, end):
        key = day.isoformat()
        sources = activities_by_date.get(key, [])
        item = daily_by_date.get(key, {})
        if day > today:
            minutes = 0
        elif item.get("intensity_moderate") is not None and item.get("intensity_vigorous") is not None:
            minutes = item["intensity_moderate"] + 2 * item["intensity_vigorous"]
            garmin_days += 1
        else:
            minutes = sum((activity.get("duration") or 0) / 60 for activity in sources)
            fallback_days += 1
        by_day.append(
            {
                "date": key,
                "minutes": round(minutes, 1),
                "sports": sorted({activity.get("sport", "other") for activity in sources}),
                "is_today": day == today,
                "is_future": day > today,
            }
        )
    minutes = round(sum(item["minutes"] for item in by_day), 1)
    recent_goals = [item["intensity_goal"] for item in daily if item.get("intensity_goal") is not None]
    goal = (
        prefs["weekly_minutes"]
        if prefs.get("weekly_minutes") is not None
        else recent_goals[-1]
        if recent_goals
        else 150
    )
    sessions = sum(len(activities_by_date.get(day.isoformat(), [])) for day in daterange(start, today))
    sessions_goal = prefs.get("weekly_sessions", 3)
    return {
        "minutes": minutes,
        "goal": goal,
        "pct": round(minutes / goal * 100) if goal else None,
        "sessions": sessions,
        "sessions_goal": sessions_goal,
        "remaining_minutes": max(0, round(goal - minutes, 1)),
        "days_left": (end - today).days,
        "by_day": by_day,
        "days_with_garmin_intensity": garmin_days,
        "days_fallback": fallback_days,
        "sentence": week_progress(minutes, goal),
        "window": {"from": start.isoformat(), "to": end.isoformat()},
        "source": "calculated",
        "method": "active_minutes@1",
    }


def goal_suggestion(complete_weeks: list[float], current_goal: int, focus: str = "move_more") -> dict | None:
    weeks = complete_weeks[-4:]
    if len(weeks) < 2:
        suggested = 90 if focus in ("move_more", "start_running") else current_goal
    else:
        base = statistics.median(weeks)
        suggested = int((Decimal(str(base * 1.10)) / 5).quantize(Decimal("1"), rounding=ROUND_HALF_UP) * 5)
        suggested = max(max(30, current_goal - 30), min(suggested, current_goal + 30, 600))
    met = sum(value >= current_goal for value in weeks)
    should_show = abs(suggested - current_goal) >= 10 and (met >= 3 or met <= 1)
    if not should_show:
        return None
    sentence = goal_suggestion_sentence(suggested, current_goal)
    return {
        "minutes": suggested,
        "current_goal": current_goal,
        "sentence": sentence,
        "weeks_met": met,
        "n": len(weeks),
        "source": "calculated",
        "method": "goal_suggestion@1",
    }


def steps_summary(daily: list[dict], prefs: dict, today: date) -> dict:
    records = {item["date"]: item for item in daily if item.get("date")}
    recent = [records.get((today - timedelta(days=offset)).isoformat(), {}) for offset in range(7)]
    observed = [item["steps"] for item in recent if item.get("steps") is not None]
    garmin_goals = [item["steps_goal"] for item in recent if item.get("steps_goal") is not None]
    goal = (
        garmin_goals[0]
        if prefs.get("steps_goal_source", "garmin") == "garmin" and garmin_goals
        else prefs.get("steps_goal", 8000)
    )
    return {
        "today": records.get(today.isoformat(), {}).get("steps"),
        "goal": goal,
        "weekly_average": round(statistics.mean(observed)) if observed else None,
        "days_at_goal": sum(value >= goal for value in observed),
        "n": len(observed),
        "source": "calculated",
        "method": "steps@1",
    }
