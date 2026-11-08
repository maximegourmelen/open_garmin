from datetime import date, timedelta

from server.companion.streaks import streak


def test_partial_week_does_not_break_streak_and_sunday_start():
    today = date(2026, 11, 8)
    activities = []
    for offset in (1, 2, 8, 9):
        day = today - timedelta(days=offset)
        activities.append({"date": day.isoformat(), "duration": 1800})
    prefs = {"week_start": "sunday", "weekly_minutes": 60, "weekly_sessions": 3}
    result = streak(activities, [], prefs, today)
    assert result["current"] == 2
    assert result["longest"] == 2
    assert result["weeks"][-1]["start"] == "2026-11-08"
    assert result["method"] == "streak@1"


def test_current_week_can_extend_streak_and_risk_flag():
    today = date(2026, 11, 8)
    prior = today - timedelta(days=7)
    activities = [{"date": prior.isoformat(), "duration": 3600}]
    prefs = {"week_start": "monday", "weekly_minutes": 60, "weekly_sessions": 3}
    result = streak(activities, [], prefs, today)
    assert result["current"] == 1 and result["at_risk"]
    activities.append({"date": today.isoformat(), "duration": 3600})
    result = streak(activities, [], prefs, today)
    assert result["current"] == 2 and not result["at_risk"]
