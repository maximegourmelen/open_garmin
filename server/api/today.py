"""One request for the beginner-first Today page."""

from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import Request
from sqlalchemy import select

from ..analytics.activity_goals import steps_summary, weekly_active_minutes
from ..analytics.common import usual_range
from ..analytics.energy import body_battery_day
from ..analytics.insights import insights_for
from ..analytics.sleep import sleep_minutes, sleep_sentence
from ..analytics.today import suggestion
from ..companion.journeys import journey_progress
from ..companion.messages import greeting, today_observation
from ..companion.milestones import evaluate_milestones
from ..companion.streaks import streak
from ..copy.format import distance, duration_clock
from ..copy.labels import garmin_label
from ..copy.sentences import activity_summary as neutral_activity_summary
from ..copy.sentences import usual_sentence
from ..db.models import (
    Activity,
    ActivityDerived,
    ActivitySamples,
    BestEffort,
    CheckIn,
    Daily,
    MilestoneAward,
    User,
    WeeklyRecap,
)
from ..workspace import workspace
from .activity_views import summary as activity_summary


def today_view(request: Request):
    ws = workspace(request)
    with ws.store.sessions() as db:
        user = db.get(User, ws.user_id)
        prefs = user.preferences or {}
        now = datetime.now(ZoneInfo(prefs.get("timezone", "UTC")))
        today = now.date()
        derived = {
            row.activity_id: row.data
            for row in db.scalars(select(ActivityDerived).where(ActivityDerived.user_id == ws.user_id))
        }
        activity_rows = list(db.scalars(select(Activity).where(Activity.user_id == ws.user_id)))
        activities = [{**row.data, **derived.get(row.id, {})} for row in activity_rows]
        daily = [
            {"date": row.date, **row.data}
            for row in db.scalars(select(Daily).where(Daily.user_id == ws.user_id))
        ]
        checkins = [
            {
                "date": row.date,
                "mood": row.mood,
                "energy": row.energy,
                "soreness": row.soreness,
                "note": row.note,
            }
            for row in db.scalars(select(CheckIn).where(CheckIn.user_id == ws.user_id))
        ]
        candidates = [
            {
                "activity_id": row.activity_id,
                "kind": row.kind,
                "date": row.date,
                "sport": row.sport,
                "value": row.value,
            }
            for row in db.scalars(select(BestEffort).where(BestEffort.user_id == ws.user_id))
        ]
        award_rows = list(db.scalars(select(MilestoneAward).where(MilestoneAward.user_id == ws.user_id)))
        latest_recap = db.scalar(
            select(WeeklyRecap)
            .where(WeeklyRecap.user_id == ws.user_id, WeeklyRecap.seen.is_(False))
            .order_by(WeeklyRecap.week_start.desc())
            .limit(1)
        )
        latest_activity_row = max(
            (row for row in activity_rows if not row.data.get("parent_id")),
            key=lambda row: (row.date, row.data.get("start") or ""),
            default=None,
        )
        route_samples = (
            db.get(ActivitySamples, (ws.user_id, latest_activity_row.id)) if latest_activity_row else None
        )
    by_day = {item["date"]: item for item in daily if item.get("date")}
    current = by_day.get(today.isoformat(), {})
    week = weekly_active_minutes(activities, daily, prefs, today)
    week["start"], week["end"] = week["window"]["from"], week["window"]["to"]
    streak_data = streak(activities, daily, prefs, today)
    checkin = next((item for item in checkins if item["date"] == today.isoformat()), None)
    suggested = suggestion(daily, activities, checkin, today)
    sleep = None
    if current.get("sleep_seconds") is not None:
        sleep = {
            "date": today.isoformat(),
            "minutes": sleep_minutes(current),
            "need_minutes": current.get("sleep_need_minutes") or current.get("sleep_need"),
            "score": current.get("sleep_score"),
            "stages": {
                stage: round(current[f"{stage}_seconds"] / 60, 1)
                if current.get(f"{stage}_seconds") is not None
                else None
                for stage in ("deep", "light", "rem", "awake")
            },
            "sentence": sleep_sentence(current),
        }
    battery = (
        body_battery_day(current)
        if any(current.get(key) is not None for key in ("bb_latest", "bb_at_wake", "bb_max"))
        else None
    )
    previous_rhr = [
        item["resting_hr"]
        for item in daily
        if item.get("resting_hr") is not None
        and (today - timedelta(days=28)).isoformat() <= item.get("date", "") < today.isoformat()
    ]
    rhr_range = usual_range(previous_rhr)
    rhr = None
    if current.get("resting_hr") is not None:
        spark = [
            by_day.get((today - timedelta(days=offset)).isoformat(), {}).get("resting_hr")
            for offset in reversed(range(28))
        ]
        rhr_status, rhr_sentence = usual_sentence("resting_hr", current["resting_hr"], rhr_range)
        rhr = {
            "value": current["resting_hr"],
            "usual": rhr_range["median"] if rhr_range else None,
            "usual_range": rhr_range,
            "status": rhr_status,
            "spark": spark,
            "sentence": rhr_sentence,
        }
    hrv_bounds = (
        {"low": current["hrv_balanced_low"], "high": current["hrv_balanced_high"]}
        if current.get("hrv_balanced_low") is not None and current.get("hrv_balanced_high") is not None
        else usual_range(
            [
                item.get("hrv")
                for item in daily
                if (today - timedelta(days=30)).isoformat() <= item.get("date", "") < today.isoformat()
            ]
        )
    )
    hrv_state, hrv_sentence = usual_sentence("hrv", current.get("hrv"), hrv_bounds)
    hrv = (
        {
            "value": current.get("hrv"),
            "status": garmin_label(current.get("hrv_status"), "hrv_status"),
            "range_status": hrv_state,
            "usual_range": hrv_bounds,
            "balanced_low": current.get("hrv_balanced_low"),
            "balanced_high": current.get("hrv_balanced_high"),
            "sentence": hrv_sentence,
        }
        if current.get("hrv") is not None
        else None
    )
    steps = steps_summary(daily, prefs, today)
    steps_view = {"value": steps["today"], "goal": steps["goal"]} if steps["today"] is not None else None
    latest_activity = None
    if latest_activity_row:
        item = latest_activity_row.data
        latest_activity = activity_summary(item, derived.get(latest_activity_row.id))
        samples = route_samples.samples if route_samples else item.get("samples", [])
        coords = [
            [sample["lat"], sample["lon"]]
            for sample in samples
            if sample.get("lat") is not None and sample.get("lon") is not None
        ]
        step = max(1, (len(coords) + 79) // 80)
        latest_activity["route_preview"] = coords[::step][:80] if coords else None
        summary_text = (
            derived.get(latest_activity_row.id, {})
            .get("summary", {})
            .get("text", neutral_activity_summary(item, None)["text"])
        )
        latest_activity["summary"] = {
            "id": "activity_summary",
            "text": summary_text,
            "pose": "proud",
            "data_refs": [latest_activity_row.id],
        }
    computed = evaluate_milestones(activities, daily, candidates, checkins, prefs, today)
    award_by_id = {award.milestone_id: award for award in award_rows}
    milestones = [
        {
            **item,
            "earned": item["id"] in award_by_id,
            "earned_on": award_by_id[item["id"]].earned_on if item["id"] in award_by_id else None,
            "seen": award_by_id[item["id"]].seen if item["id"] in award_by_id else False,
        }
        for item in computed
    ]
    unseen = [item for item in milestones if item["earned"] and not item["seen"]]
    locked = [item for item in milestones if not item["earned"]]
    next_milestone = max(
        locked,
        key=lambda item: (
            min(1, item["progress"]["current"] / item["progress"]["target"])
            if item.get("progress") and item["progress"]["target"]
            else 0
        ),
        default=None,
    )
    winners = {}
    for item in candidates:
        previous = winners.get(item["kind"])
        if previous is None or (
            item["value"] < previous["value"]
            if item["kind"].startswith("distance:")
            else item["value"] > previous["value"]
        ):
            winners[item["kind"]] = item
    recent_best = next(
        (
            item
            for item in winners.values()
            if item["kind"].startswith("distance:")
            and item["date"] >= (today - timedelta(days=1)).isoformat()
        ),
        None,
    )
    pb = None
    if recent_best:
        seconds = round(recent_best["value"])
        pb = {
            "distance": distance(float(recent_best["kind"].split(":")[1]), prefs.get("units", "metric")),
            "time": duration_clock(seconds),
            "activity_id": recent_best["activity_id"],
        }
    cumulative_before = sum(
        item["minutes"] or 0 for item in week["by_day"] if item["date"] < today.isoformat()
    )
    goal_reached_today = bool(week["goal"] and cumulative_before < week["goal"] <= week["minutes"])
    observation = today_observation(
        ws.user_id,
        today,
        prefs.get("companion_tone", "cheerful"),
        {
            "unseen_milestone": unseen[0] if unseen else None,
            "recent_pb": pb,
            "goal_reached_today": goal_reached_today,
            "checkin": checkin,
            "suggestion": suggested["kind"],
            "streak": streak_data,
            "last_activity_date": latest_activity_row.date if latest_activity_row else None,
            "week": week,
        },
    )
    insights = insights_for(activities, daily, checkins, today, prefs, list(winners.values()), streak_data)
    return {
        "date": today.isoformat(),
        "greeting": greeting(now.hour, user.name, ws.user_id, today, prefs.get("companion_tone", "cheerful")),
        "message": observation,
        "week": week,
        "suggestion": suggested,
        "streak": streak_data,
        "sleep": sleep,
        "body_battery": battery,
        "resting_hr": rhr,
        "hrv": hrv,
        "steps": steps_view,
        "checkin": checkin,
        "latest_activity": latest_activity,
        "next_milestone": next_milestone,
        "journey": journey_progress(prefs.get("journey"), activities, daily, today, prefs),
        "insights": insights[:3],
        "unseen_milestones": unseen,
        "recap_ready": latest_recap.week_start if latest_recap else None,
        "layout": prefs.get("today_layout", []),
        "method": "today_overview@1",
    }
