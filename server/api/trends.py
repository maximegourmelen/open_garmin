"""Readable fitness trends and printable weekly reports."""

from __future__ import annotations

import statistics
from datetime import date, timedelta
from typing import Literal

from fastapi import HTTPException, Request

from ..analytics.activity_goals import goal_weeks_in_a_row, weekly_active_minutes
from ..analytics.common import daterange, week_start
from ..analytics.efforts import bests
from ..analytics.fitness import efficiency_signal, longest_signal, resting_hr_signal, vo2max_signal
from ..analytics.load import ramp_check
from ..analytics.reports import weekly_recap
from .progress import _data

Range = Literal["30D", "90D", "1Y"]
WEEKS = {"30D": 5, "90D": 13, "1Y": 52}


def _week(start: date, today: date, prefs: dict, activities: list[dict], daily: list[dict]) -> dict:
    end = start + timedelta(days=6)
    rows = [
        item
        for item in activities
        if not item.get("parent_id") and start.isoformat() <= item.get("date", "") <= end.isoformat()
    ]
    active = weekly_active_minutes(activities, daily, prefs, min(end, today))
    by_sport: dict[str, float] = {}
    for item in rows:
        sport = item.get("sport") or "other"
        by_sport[sport] = round(by_sport.get(sport, 0) + (item.get("duration") or 0) / 60, 1)
    return {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "minutes": active["active_minutes"],
        "goal": active["goal_minutes"],
        "sessions": len(rows),
        "distance": round(sum(item.get("distance") or 0 for item in rows), 1),
        "effort": round(sum(item.get("effort_points") or 0 for item in rows), 1),
        "by_sport": by_sport,
        "partial": end > today,
        "goal_met": active["active_minutes"] is not None
        and active["active_minutes"] >= active["goal_minutes"],
        "daily": active["by_day"],
    }


def _weeks(today: date, prefs: dict, activities: list[dict], daily: list[dict], count: int) -> list[dict]:
    current = date.fromisoformat(week_start(today, prefs.get("week_start", "monday")))
    return [
        _week(current - timedelta(days=7 * offset), today, prefs, activities, daily)
        for offset in reversed(range(count))
    ]


def _spark(signal: dict, activities: list[dict], daily: list[dict], first: date) -> list[float | None]:
    key = signal["id"]
    if key == "resting_hr":
        return [item.get("resting_hr") for item in daily if item["date"] >= first.isoformat()][-30:]
    if key == "vo2max":
        return [
            item.get("vo2max")
            for item in activities
            if item.get("date", "") >= first.isoformat() and item.get("vo2max") is not None
        ][-30:]
    if key == "longest":
        return [
            item.get("duration") / 60
            for item in activities
            if item.get("date", "") >= first.isoformat() and item.get("duration") is not None
        ][-30:]
    if key == "efficiency":
        return [
            round((item.get("gap_speed") or item["average_speed"]) * 60 / item["average_hr"], 3)
            for item in activities
            if item.get("date", "") >= first.isoformat()
            and item.get("average_hr")
            and (item.get("gap_speed") or item.get("average_speed"))
        ][-30:]
    return [signal.get("before"), signal.get("after")]


def trends_view(request: Request, range: Range = "30D") -> dict:
    prefs, today, activities, daily, candidates = _data(request)
    weeks = _weeks(today, prefs, activities, daily, 52)
    current, longest = goal_weeks_in_a_row(weeks)
    first = today - timedelta(days={"30D": 29, "90D": 89, "1Y": 364}[range])
    activity_minutes: dict[str, float] = {}
    for item in activities:
        if item.get("date") and not item.get("parent_id"):
            key = item["date"]
            activity_minutes[key] = activity_minutes.get(key, 0) + (item.get("duration") or 0) / 60
    consistency = [
        {"date": day.isoformat(), "minutes": round(activity_minutes.get(day.isoformat(), 0), 1)}
        for day in daterange(today - timedelta(days=83), today)
    ]
    signals = [
        resting_hr_signal(daily, today),
        efficiency_signal(activities, today),
        longest_signal(activities, today),
        vo2max_signal(activities, today),
    ]
    return {
        "range": range,
        "signals": [{**item, "spark": _spark(item, activities, daily, first)} for item in signals],
        "volume": weeks[-WEEKS[range] :],
        "consistency": {
            "days": consistency,
            "active_days_28": sum(item["minutes"] > 0 for item in consistency[-28:]),
            "streak": current,
            "best_streak": longest,
        },
        "ramp": ramp_check(activities, today, prefs.get("week_start", "monday")),
        "records": bests(candidates, today)["items"],
        "reports": list(reversed(weeks)),
        "method": "trends@1",
    }


def _health_average(daily: list[dict], start: date, key: str, divide: int = 1) -> float | None:
    end = start + timedelta(days=6)
    values = [
        item[key] / divide
        for item in daily
        if start.isoformat() <= item.get("date", "") <= end.isoformat() and item.get(key) is not None
    ]
    return round(statistics.mean(values), 1) if values else None


def report_view(request: Request, week_start_date: date) -> dict:
    prefs, today, activities, daily, candidates = _data(request)
    if week_start_date != date.fromisoformat(week_start(week_start_date, prefs.get("week_start", "monday"))):
        raise HTTPException(422, "Choose the first day of a week.")
    if week_start_date > today:
        raise HTTPException(422, "Choose a current or completed week.")
    week = _week(week_start_date, today, prefs, activities, daily)
    end = week_start_date + timedelta(days=6)
    rows = sorted(
        (
            item
            for item in activities
            if not item.get("parent_id")
            and week_start_date.isoformat() <= item.get("date", "") <= end.isoformat()
        ),
        key=lambda item: (item.get("date") or "", item.get("start") or ""),
    )
    previous = [
        _week(week_start_date - timedelta(days=7 * offset), today, prefs, activities, daily)
        for offset in range(1, 5)
    ]
    previous_minutes = [item["minutes"] for item in previous if item["minutes"] is not None]
    previous_average = round(statistics.mean(previous_minutes)) if previous_minutes else None
    recap = weekly_recap(week_start_date, activities, daily, prefs)
    health = {}
    for name, key, divisor in (
        ("sleep", "sleep_seconds", 60),
        ("resting_hr", "resting_hr", 1),
        ("hrv", "hrv", 1),
    ):
        health[name] = {
            "current": _health_average(daily, week_start_date, key, divisor),
            "previous": _health_average(daily, week_start_date - timedelta(days=7), key, divisor),
        }
    return {
        **week,
        "summary": recap["slides"][0]["big"],
        "activities": [
            {
                "id": item.get("id"),
                "date": item.get("date"),
                "name": item.get("name") or item.get("sport", "Activity").title(),
                "sport": item.get("sport"),
                "duration": item.get("duration"),
                "distance": item.get("distance"),
                "effort": item.get("effort_points"),
            }
            for item in rows
        ],
        "health": health,
        "records": [
            item
            for item in bests(candidates, today)["items"]
            if week_start_date.isoformat() <= item["all_time"]["date"] <= end.isoformat()
        ],
        "previous_four_average": previous_average,
        "method": "weekly_report@1",
    }


def register(app):
    for prefix in ("/api", "/api/demo"):
        app.add_api_route(f"{prefix}/trends", trends_view, methods=["GET"])
        app.add_api_route(f"{prefix}/reports/week/{{week_start_date}}", report_view, methods=["GET"])
