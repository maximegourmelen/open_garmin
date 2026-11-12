"""A small goal suggestion for the Welcome flow."""

from __future__ import annotations

from datetime import date, timedelta

from fastapi import Request

from ..analytics.activity_goals import goal_suggestion, weekly_active_minutes
from ..analytics.common import week_start
from .progress import _data


def goal_suggestion_view(request: Request):
    prefs, today, activities, daily, _ = _data(request)
    current_start = date.fromisoformat(week_start(today, prefs.get("week_start", "monday")))
    complete_weeks = []
    for offset in range(4, 0, -1):
        end = current_start - timedelta(days=7 * (offset - 1) + 1)
        start = end - timedelta(days=6)
        if any(
            start.isoformat() <= item.get("date", "") <= end.isoformat() for item in [*activities, *daily]
        ):
            complete_weeks.append(weekly_active_minutes(activities, daily, prefs, end)["minutes"])
    return {
        "goal_suggestion": goal_suggestion(
            complete_weeks, prefs.get("weekly_minutes", 150), prefs.get("goal_focus", "move_more")
        )
    }


def register(app):
    for prefix in ("/api", "/api/demo"):
        app.add_api_route(f"{prefix}/goals/suggestion", goal_suggestion_view, methods=["GET"])
