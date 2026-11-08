"""A compact weekly story generated from a completed local week."""

from __future__ import annotations

import statistics
from datetime import date, timedelta

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
    duration = round(sum((item.get("duration") or 0) for item in week_rows) / 60)
    active_dates = len({item["date"] for item in week_rows})
    slides = [
        {
            "kind": "headline",
            "title": "Your week",
            "big": f"{sessions} sessions · {duration} min",
            "pose": "wave",
            "text": f"You were active on {active_dates} days.",
        }
    ]
    if progress["goal"]:
        slides.append(
            {
                "kind": "goal",
                "pct": progress["pct"],
                "minutes": progress["minutes"],
                "goal": progress["goal"],
                "text": "You reached your weekly goal! 🎉"
                if progress["pct"] >= 100
                else f"You moved {round(progress['minutes'])} minutes this week.",
            }
        )
    if week_rows:
        highlight = max(week_rows, key=lambda item: item.get("duration") or 0)
        slides.append(
            {
                "kind": "highlight",
                "activity_id": highlight.get("id"),
                "text": f"Highlight: {highlight.get('name') or highlight.get('sport', 'activity')} — "
                f"{round((highlight.get('duration') or 0) / 60)} minutes.",
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
                "text": f"You slept about {average // 60} h {average % 60:02} m on average.",
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
                "text": f"You earned {len(milestone_ids)} new badge{'s' if len(milestone_ids) != 1 else ''}!",
            }
        )
    if streak and streak.get("current", 0) >= 2:
        slides[0]["text"] += f" That's {streak['current']} weeks in a row."
    slides.append(
        {
            "kind": "next_week",
            "suggested_goal": progress["goal"],
            "text": "Keep going in a way that feels good next week.",
        }
    )
    return {
        "week_start": start.isoformat(),
        "week_end": end.isoformat(),
        "slides": slides,
        "method": "weekly_recap@1",
        "version": 1,
    }
