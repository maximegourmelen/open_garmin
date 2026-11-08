"""Read-only health series for live and synthetic demo workspaces."""

from __future__ import annotations

from datetime import timedelta
from typing import Literal

from fastapi import Request
from sqlalchemy import select

from ..analytics.activity_goals import steps_summary
from ..analytics.common import daterange, local_today
from ..analytics.energy import body_battery_day, stress_day
from ..analytics.sleep import bedtime_rhythm, sleep_debt, sleep_minutes, sleep_sentence, stage_ranges
from ..db.models import Activity, Daily, User
from ..workspace import workspace

Range = Literal["7D", "4W", "3M", "1Y"]
DAYS = {"7D": 7, "4W": 28, "3M": 90, "1Y": 365}


def health_series(request: Request, kind: str, range: Range) -> dict:
    ws = workspace(request)
    with ws.store.sessions() as db:
        user = db.get(User, ws.user_id)
        prefs = user.preferences or {}
        today = local_today(prefs)
        first = today - timedelta(days=DAYS[range] - 1)
        rows = list(
            db.scalars(
                select(Daily)
                .where(
                    Daily.user_id == ws.user_id,
                    Daily.date >= first.isoformat(),
                    Daily.date <= today.isoformat(),
                )
                .order_by(Daily.date)
            )
        )
        observed = {row.date: row.data for row in rows}
        days = [
            {"date": day.isoformat(), **observed.get(day.isoformat(), {})} for day in daterange(first, today)
        ]
        activity_rows = (
            list(
                db.scalars(
                    select(Activity).where(
                        Activity.user_id == ws.user_id,
                        Activity.date >= first.isoformat(),
                        Activity.date <= today.isoformat(),
                    )
                )
            )
            if kind == "energy"
            else []
        )
    activity_by_day: dict[str, list[dict]] = {}
    for row in activity_rows:
        activity_by_day.setdefault(row.date, []).append(row.data)
    result = []
    for day in days:
        item = {"date": day["date"]}
        if kind == "sleep":
            item.update(
                minutes=sleep_minutes(day),
                need_minutes=day.get("sleep_need_minutes") or day.get("sleep_need"),
                score=day.get("sleep_score"),
                start=day.get("sleep_start"),
                end=day.get("sleep_end"),
                stages=stage_ranges(day),
                awake_count=day.get("sleep_awake_count"),
                avg_hr=day.get("sleep_avg_hr"),
                respiration=day.get("sleep_respiration"),
                spo2=day.get("sleep_spo2_avg"),
                feedback=day.get("sleep_feedback"),
                sentence=sleep_sentence(day),
            )
        elif kind == "heart":
            item.update(
                resting_hr=day.get("resting_hr"),
                hr_min=day.get("hr_min"),
                hr_max=day.get("hr_max"),
                hrv=day.get("hrv"),
                hrv_weekly=day.get("hrv_weekly"),
                hrv_status=day.get("hrv_status"),
                balanced_low=day.get("hrv_balanced_low"),
                balanced_high=day.get("hrv_balanced_high"),
            )
        elif kind == "energy":
            item.update(body_battery_day(day, activity_by_day.get(day["date"])))
        elif kind == "stress":
            item.update(stress_day(day))
        elif kind == "steps":
            item.update(
                steps=day.get("steps"),
                goal=day.get("steps_goal")
                if prefs.get("steps_goal_source", "garmin") == "garmin"
                else prefs.get("steps_goal"),
                floors_up=day.get("floors_up"),
                floors_down=day.get("floors_down"),
                moderate_minutes=day.get("intensity_moderate"),
                vigorous_minutes=day.get("intensity_vigorous"),
                intensity_goal=day.get("intensity_goal"),
            )
        result.append(item)
    summary: dict = {"count": len(result), "latest": result[-1] if result else None}
    sentences: list[str] = []
    if kind == "sleep":
        summary.update(debt=sleep_debt(days, today), bedtime_rhythm=bedtime_rhythm(days, today))
        sentences = [summary["debt"]["sentence"], summary["bedtime_rhythm"]["sentence"]]
    elif kind == "steps":
        summary.update(steps_summary(days, prefs, today))
        sentences = (
            [f"You averaged {summary['weekly_average']} steps over days with readings."]
            if summary.get("weekly_average") is not None
            else []
        )
    elif kind == "energy" and result:
        sentences = [result[-1]["sentence"]] if result[-1].get("sentence") else []
    elif kind == "stress" and result:
        sentences = [result[-1]["title"]] if result[-1].get("title") else []
    return {
        "range": range,
        "from": first.isoformat(),
        "to": today.isoformat(),
        "days": result,
        "summary": summary,
        "sentences": sentences,
        "method": f"wellness_{kind}@1",
    }


def make_endpoint(selected: str):
    def endpoint(request: Request, range: Range = "4W"):
        return health_series(request, selected, range)

    return endpoint


def register(app):
    for kind in ("sleep", "heart", "energy", "stress", "steps"):
        endpoint = make_endpoint(kind)

        app.add_api_route(f"/api/wellness/{kind}", endpoint, methods=["GET"], name=f"wellness_{kind}")
        app.add_api_route(
            f"/api/demo/wellness/{kind}", endpoint, methods=["GET"], name=f"demo_wellness_{kind}"
        )

    @app.get("/api/wellness/overview")
    @app.get("/api/demo/wellness/overview")
    def overview(request: Request, range: Range = "4W"):
        tabs = {
            kind: health_series(request, kind, range)
            for kind in ("sleep", "heart", "energy", "stress", "steps")
        }
        return {
            "range": range,
            "tabs": {
                kind: {
                    "latest": series["summary"]["latest"],
                    "sentences": series["sentences"],
                    "spark": series["days"],
                }
                for kind, series in tabs.items()
            },
            "method": "wellness_overview@1",
        }
