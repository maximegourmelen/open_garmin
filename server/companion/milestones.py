"""Stable milestone catalog and evidence-based award checks."""

from __future__ import annotations

from datetime import date, datetime, timedelta

from ..analytics.common import week_start
from ..analytics.fitness import resting_hr_signal
from ..analytics.sleep import bedtime_rhythm
from .journeys import journey_progress
from .streaks import streak


def _definition(id: str, title: str, how: str, tier: str = "bronze", icon: str = "star") -> dict:
    return {
        "id": id,
        "title": title,
        "description": how,
        "how_to_earn": how,
        "icon": icon,
        "tier": tier,
        "color": {"bronze": "accent", "silver": "mint", "gold": "gold"}[tier],
    }


CATALOG = [
    _definition("hello", "Hello there", "Finish onboarding", icon="hand"),
    _definition("first_activity", "First step", "Record your first activity", icon="footprints"),
    _definition("first_run", "First run", "Record your first run", icon="person-standing"),
    _definition("first_walk_5k", "5K stroll", "Walk 5 km in one go", icon="route"),
    _definition("first_run_1k", "Non-stop kilometre", "Run 1 km continuously", icon="route"),
    _definition("first_run_5k", "5K runner", "Run 5 km in one activity", "silver", "route"),
    _definition("first_run_10k", "10K runner", "Run 10 km in one activity", "gold", "route"),
    _definition(
        "long_60", "Hour of power", "Move for at least 60 minutes in one activity", "silver", "clock"
    ),
    *[
        _definition(f"sessions_{n}", f"{n} sessions", f"Record {n} activities", tier, "calendar")
        for n, tier in ((10, "bronze"), (25, "silver"), (50, "gold"), (100, "gold"))
    ],
    *[
        _definition(f"total_{n}km", f"{n} km club", f"Move a total of {n} km", tier, "map")
        for n, tier in ((25, "bronze"), (50, "silver"), (100, "silver"), (250, "gold"), (500, "gold"))
    ],
    _definition("week_goal_1", "Goal getter", "Meet your weekly goal once", icon="target"),
    *[
        _definition(f"streak_{n}", f"{n}-week streak", f"Meet your goal {n} weeks in a row", tier, "flame")
        for n, tier in ((2, "bronze"), (4, "silver"), (8, "silver"), (12, "gold"), (26, "gold"))
    ],
    _definition("active_150", "150 club", "Move for 150 active minutes in a week", "silver", "timer"),
    _definition("variety_3", "Mix it up", "Try three sports within four weeks", "silver", "shuffle"),
    _definition("early_bird", "Early bird", "Start an activity before 07:00", icon="sunrise"),
    _definition("night_owl", "Night owl", "Start an activity after 21:00", icon="moon"),
    _definition("strength_5", "Strong start", "Record five strength sessions", "silver", "dumbbell"),
    _definition(
        "steps_goal_7", "Step it up", "Meet your step goal seven days in a row", "silver", "footprints"
    ),
    _definition(
        "sleep_need_5", "Well rested", "Meet your sleep need on five nights in a week", "silver", "moon"
    ),
    _definition(
        "bedtime_regular", "Steady rhythm", "Keep a regular bedtime for seven nights", "silver", "bed"
    ),
    _definition("checkin_7", "Checking in", "Share seven daily check-ins", icon="heart"),
    _definition("pb_any", "Personal best", "Set a personal best effort", icon="medal"),
    _definition(
        "rhr_down", "Heart getting fitter", "See an improving resting heart-rate trend", "gold", "heart-pulse"
    ),
    _definition("comeback", "Comeback", "Move again after at least two weeks away", icon="sparkles"),
]


def catalog() -> list[dict]:
    from .journeys import DEFINITIONS

    return CATALOG + [
        _definition(
            f"journey_{journey['id']}_complete",
            f"{journey['name']} complete",
            f"Finish the {journey['name']} journey",
            "gold",
            "flag",
        )
        for journey in DEFINITIONS
    ]


def evaluate_milestones(
    activities: list[dict],
    daily: list[dict],
    best_efforts: list[dict],
    checkins: list[dict],
    prefs: dict,
    today: date,
) -> list[dict]:
    """Return every badge, its earliest qualifying evidence, and current progress."""
    rows = sorted(
        (item for item in activities if item.get("date") and not item.get("parent_id")),
        key=lambda item: (item["date"], item.get("start") or ""),
    )
    days = sorted((item for item in daily if item.get("date")), key=lambda item: item["date"])
    award: dict[str, tuple[str, str | None, float | None]] = {}
    progress: dict[str, tuple[float, float, str]] = {}

    def earn(id: str, day: str, activity_id: str | None = None, value: float | None = None):
        if id not in award:
            award[id] = day, activity_id, value

    if prefs.get("onboarded"):
        earn("hello", today.isoformat())
    total_distance = 0.0
    strength_count = 0
    seen_sports: list[tuple[str, str]] = []
    previous_activity_day = None
    for index, item in enumerate(rows, start=1):
        day, activity_id = item["date"], item.get("id")
        sport = item.get("sport")
        distance = item.get("distance") or 0
        total_distance += distance
        earn("first_activity", day, activity_id)
        if sport == "running":
            earn("first_run", day, activity_id)
            if distance >= 5000:
                earn("first_run_5k", day, activity_id, distance)
            if distance >= 10000:
                earn("first_run_10k", day, activity_id, distance)
        if sport == "walking" and distance >= 5000:
            earn("first_walk_5k", day, activity_id, distance)
        if (item.get("duration") or 0) >= 3600:
            earn("long_60", day, activity_id, item["duration"] / 60)
        for threshold in (10, 25, 50, 100):
            if index >= threshold:
                earn(f"sessions_{threshold}", day, activity_id, index)
        for threshold in (25, 50, 100, 250, 500):
            if total_distance >= threshold * 1000:
                earn(f"total_{threshold}km", day, activity_id, round(total_distance / 1000, 1))
        if sport == "strength":
            strength_count += 1
            if strength_count >= 5:
                earn("strength_5", day, activity_id, strength_count)
        start = item.get("start") or ""
        try:
            hour = datetime.fromisoformat(start).hour
        except ValueError:
            hour = None
        if hour is not None and hour < 7:
            earn("early_bird", day, activity_id)
        if hour is not None and hour >= 21:
            earn("night_owl", day, activity_id)
        if (
            previous_activity_day
            and (date.fromisoformat(day) - date.fromisoformat(previous_activity_day)).days >= 14
        ):
            earn("comeback", day, activity_id)
        previous_activity_day = day
        seen_sports.append((day, sport))
        recent_sports = {
            name
            for when, name in seen_sports
            if name and when >= (date.fromisoformat(day) - timedelta(days=27)).isoformat()
        }
        if len(recent_sports) >= 3:
            earn("variety_3", day, activity_id, len(recent_sports))
    for threshold in (10, 25, 50, 100):
        progress[f"sessions_{threshold}"] = (len(rows), threshold, "sessions")
    for threshold in (25, 50, 100, 250, 500):
        progress[f"total_{threshold}km"] = (round(total_distance / 1000, 1), threshold, "km")
    progress["strength_5"] = (strength_count, 5, "sessions")
    progress["variety_3"] = (
        len({item.get("sport") for item in rows[-20:] if item.get("sport")}),
        3,
        "sports",
    )
    for item in sorted(best_efforts, key=lambda item: item["date"]):
        if item.get("kind") == "distance:1000" and item.get("sport") == "running":
            earn("first_run_1k", item["date"], item.get("activity_id"), item.get("value"))
        if item.get("kind", "").startswith("distance:"):
            earn("pb_any", item["date"], item.get("activity_id"), item.get("value"))
    streak_data = streak(rows, days, prefs, today, include_all=True)
    history = streak_data["all_weeks"]
    run = 0
    for item in history:
        day = min(date.fromisoformat(item["start"]) + timedelta(days=6), today).isoformat()
        if item["met"]:
            earn("week_goal_1", day)
            run += 1
            for threshold in (2, 4, 8, 12, 26):
                if run >= threshold:
                    earn(f"streak_{threshold}", day, value=run)
        else:
            run = 0
        if item["minutes"] >= 150:
            earn("active_150", day, value=item["minutes"])
    for threshold in (2, 4, 8, 12, 26):
        progress[f"streak_{threshold}"] = (streak_data["longest"], threshold, "weeks")
    steps_run = 0
    previous_step_day = None
    for item in days:
        if (
            previous_step_day
            and (date.fromisoformat(item["date"]) - date.fromisoformat(previous_step_day)).days != 1
        ):
            steps_run = 0
        steps_run = (
            steps_run + 1
            if item.get("steps") is not None
            and item.get("steps_goal") is not None
            and item["steps"] >= item["steps_goal"]
            else 0
        )
        if steps_run >= 7:
            earn("steps_goal_7", item["date"], value=steps_run)
        previous_step_day = item["date"]
    checkin_rows = sorted((item for item in checkins if item.get("date")), key=lambda item: item["date"])
    if len(checkin_rows) >= 7:
        earn("checkin_7", checkin_rows[6]["date"], value=7)
    progress["checkin_7"] = (len(checkin_rows), 7, "check-ins")
    nights_by_week: dict[str, list[dict]] = {}
    for index, item in enumerate(days):
        nights_by_week.setdefault(week_start(item["date"], prefs.get("week_start", "monday")), []).append(
            item
        )
        if "bedtime_regular" not in award:
            rhythm = bedtime_rhythm(days[max(0, index - 13) : index + 1], date.fromisoformat(item["date"]))
            if rhythm["within_7"] == 7:
                earn("bedtime_regular", item["date"])
    for nights in nights_by_week.values():
        enough = [
            item
            for item in nights
            if item.get("sleep_seconds") is not None
            and item.get("sleep_need_minutes") is not None
            and item["sleep_seconds"] / 60 >= item["sleep_need_minutes"]
        ]
        if len(enough) >= 5:
            earn("sleep_need_5", enough[4]["date"], value=5)
    if resting_hr_signal(days, today)["status"] == "improving":
        earn("rhr_down", today.isoformat())
    journey = journey_progress(prefs.get("journey"), rows, days, today, prefs)
    if journey and journey["completed"]:
        earn(f"journey_{journey['id']}_complete", journey["weeks"][-1]["end"])
    return [
        {
            **definition,
            "earned": definition["id"] in award,
            "earned_on": award[definition["id"]][0] if definition["id"] in award else None,
            "activity_id": award[definition["id"]][1] if definition["id"] in award else None,
            "value": award[definition["id"]][2] if definition["id"] in award else None,
            "progress": {
                "current": progress[definition["id"]][0],
                "target": progress[definition["id"]][1],
                "unit": progress[definition["id"]][2],
            }
            if definition["id"] in progress
            else None,
        }
        for definition in catalog()
    ]
