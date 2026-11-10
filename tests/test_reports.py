from datetime import date

from server.analytics.reports import weekly_recap


def test_weekly_recap_uses_only_available_slides():
    recap = weekly_recap(date(2026, 11, 8), [], [], {"week_start": "monday", "weekly_minutes": 150})
    assert recap["week_start"] == "2026-11-02"
    assert [slide["kind"] for slide in recap["slides"]] == ["headline", "next_week"]
    assert recap["slides"][0]["big"] == "0 activities · 0\u202fmin"


def test_weekly_recap_highlight_and_sleep():
    activities = [
        {"id": "a1", "date": "2026-11-03", "sport": "walking", "name": "Park walk", "duration": 3600}
    ]
    daily = [
        {"date": "2026-11-03", "sleep_seconds": 7 * 3600, "intensity_moderate": 60, "intensity_vigorous": 0}
    ]
    recap = weekly_recap(
        date(2026, 11, 8),
        activities,
        daily,
        {"week_start": "monday", "weekly_minutes": 60},
        milestone_ids=["hello"],
    )
    kinds = {slide["kind"] for slide in recap["slides"]}
    assert {"highlight", "sleep", "milestones"} <= kinds
    assert recap["slides"][1]["pct"] == 100
