"""A compact weekly story generated from a completed local week."""

from __future__ import annotations

import statistics
from datetime import date, timedelta

from ..copy.format import duration_summary, plural
from .activity_goals import weekly_active_minutes
from .common import week_start
from .fitness import fitness_signals


def weekly_recap(
    week: date,
    activities: list[dict],
    daily: list[dict],
    prefs: dict,
    streak: dict | None = None,
    milestone_ids: list[str] | None = None,
) -> dict:
    start = date.fromisoformat(week_start(week, prefs.get("week_start", "monday")))
    end = start + timedelta(days=6)
    week_rows = [
        item
        for item in activities
        if not item.get("parent_id") and start.isoformat() <= item.get("date", "") <= end.isoformat()
    ]
    week_days = [item for item in daily if start.isoformat() <= item.get("date", "") <= end.isoformat()]
    progress = weekly_active_minutes(activities, daily, prefs, end)
    sessions = len(week_rows)
    duration_seconds = sum((item.get("duration") or 0) for item in week_rows)
    active_dates = len({item["date"] for item in week_rows})
    slides = [
        {
            "kind": "headline",
            "title": "Your week",
            "big": (
                f"{sessions} {plural(sessions, 'activity', 'activities')}"
                f" · {duration_summary(duration_seconds)}"
            ),
            "pose": "wave",
            "text": f"Activities were recorded on {active_dates} days.",
        }
    ]
    if progress["goal"] and progress["active_minutes"] is not None:
        slides.append(
            {
                "kind": "goal",
                "pct": progress["pct"],
                "minutes": progress["minutes"],
                "goal": progress["goal"],
                "text": "Your weekly active-minute goal was met."
                if progress["pct"] >= 100
                else progress["sentence"],
            }
        )
    if week_rows:
        highlight = max(week_rows, key=lambda item: item.get("duration") or 0)
        slides.append(
            {
                "kind": "highlight",
                "activity_id": highlight.get("id"),
                "text": f"Longest activity: {highlight.get('name') or highlight.get('sport', 'activity')}, "
                f"{duration_summary(highlight.get('duration'))}.",
            }
        )
    sleep = [item["sleep_seconds"] / 60 for item in week_days if item.get("sleep_seconds") is not None]
    if sleep:
        average = round(statistics.mean(sleep))
        slides.append(
            {
                "kind": "sleep",
                "avg_minutes": average,
                "vs_usual_min": None,
                "text": f"Average recorded sleep: {duration_summary(average * 60)}.",
            }
        )
    improving = [
        signal for signal in fitness_signals(activities, daily, end) if signal["status"] == "improving"
    ]
    if improving:
        signal = improving[0]
        slides.append({"kind": "fitness", "signal": signal["id"], "text": signal["sentence"]})
    if milestone_ids:
        slides.append(
            {
                "kind": "milestones",
                "ids": milestone_ids,
                "text": f"{len(milestone_ids)} new achievements were recorded.",
            }
        )
    if streak and streak.get("current", 0) >= 2:
        slides[0]["text"] += f" The weekly goal was met {streak['current']} weeks in a row."
    slides.append(
        {
            "kind": "next_week",
            "suggested_goal": progress["goal"],
            "text": "Review your activity and sleep trends before setting next week's goal.",
        }
    )
    return {
        "week_start": start.isoformat(),
        "week_end": end.isoformat(),
        "slides": slides,
        "method": "weekly_recap@1",
        "version": 1,
    }
