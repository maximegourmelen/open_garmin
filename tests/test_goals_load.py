from datetime import date, timedelta

import pytest

from server.analytics.activity_goals import goal_suggestion, steps_summary, weekly_active_minutes
from server.analytics.load import effort_trend, ramp_check


def test_weekly_minutes_prefers_garmin_then_activity_fallback():
    today = date(2026, 11, 8)
    activities = [
        {"id": "a", "date": "2026-11-02", "duration": 1800, "sport": "walking"},
        {
            "id": "b", "date": "2026-11-03", "duration": 3600, "sport": "running",
            "intensity_minutes_moderate": 30, "intensity_minutes_vigorous": 15,
        },
    ]
    daily = [
        {"date": "2026-11-02", "intensity_moderate": 20, "intensity_vigorous": 10, "intensity_goal": 150}
    ]
    result = weekly_active_minutes(
        activities, daily, {"week_start": "monday", "weekly_minutes": 120, "weekly_sessions": 3}, today
    )
    assert result["minutes"] == 100
    assert result["days_with_garmin_intensity"] == 1
    assert result["days_fallback"] == 1
    assert result["days_missing"] == 5
    assert result["active_minutes"] == 100
    assert result["activity_seconds"] == 5400
    assert result["activity_count"] == 2
    assert result["daily_active_minutes"][:2] == [40, 60]
    assert result["sessions"] == 2
    assert result["goal"] == 120 and result["remaining_minutes"] == 20
    assert result["days_left"] == 0 and result["pct"] == 83
    assert result["method"] == "active_minutes@1"


def test_activity_time_never_becomes_active_minutes_without_garmin_intensity():
    result = weekly_active_minutes(
        [{"id": "a", "date": "2026-11-08", "duration": 1800, "sport": "walking"}],
        [],
        {"week_start": "monday", "weekly_minutes": 150, "weekly_sessions": 3},
        date(2026, 11, 8),
    )
    assert result["active_minutes"] is None
    assert result["activity_seconds"] == 1800
    assert result["sentence"] == "No active-minute reading is available for this week."


def test_goal_suggestion_and_steps_summary():
    suggestion = goal_suggestion([100, 120, 130, 140], 120)
    assert suggestion["minutes"] == 140
    assert suggestion["weeks_met"] == 3
    assert goal_suggestion([119, 121, 119, 121], 120) is None
    assert goal_suggestion([], 150, "move_more")["minutes"] == 90
    today = date(2026, 11, 8)
    steps = steps_summary(
        [
            {"date": today.isoformat(), "steps": 8000, "steps_goal": 7500},
            {"date": (today - timedelta(days=1)).isoformat(), "steps": 5000},
        ],
        {"steps_goal_source": "garmin", "steps_goal": 8000},
        today,
    )
    assert steps["goal"] == 7500 and steps["today"] == 8000
    assert steps["weekly_average"] == 6500 and steps["days_at_goal"] == 1


def test_ramp_bands_and_insufficient_history():
    today = date(2026, 11, 8)
    previous = [
        {"date": (date(2026, 11, 2) - timedelta(days=7 * weeks)).isoformat(), "effort_points": 400}
        for weeks in range(1, 5)
    ]
    result = ramp_check(previous + [{"date": "2026-11-03", "effort_points": 560}], today)
    assert result["ratio"] == pytest.approx(1.4)
    assert result["band"] == "building"
    assert result["method"] == "ramp_check@1"
    assert ramp_check([], today)["band"] == "building_history"
    early = ramp_check(previous + [{"date": "2026-11-02", "effort_points": 100}], date(2026, 11, 2))
    assert early["projected"] is None
    assert early["status"] == "too_early" and early["ratio"] is None
    assert "too early" in early["sentence"]


def test_effort_trend_uses_seven_and_twenty_eight_day_means():
    first = date(2026, 10, 29)
    last = date(2026, 11, 8)
    activities = [
        {"date": (first - timedelta(days=27) + timedelta(days=i)).isoformat(), "effort_points": 10}
        for i in range(38)
    ]
    result = effort_trend(activities, first, last)
    assert len(result["days"]) == 11
    assert result["days"][-1]["acute"] == 10
    assert result["days"][-1]["chronic"] == 10
    assert result["days"][-1]["ratio"] == 1
    assert result["method"] == "effort_trend@1"
