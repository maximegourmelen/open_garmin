from datetime import date, timedelta

from server.companion.milestones import catalog, evaluate_milestones


def test_milestone_catalog_ids_and_threshold_dates():
    ids = [item["id"] for item in catalog()]
    assert len(ids) == len(set(ids))
    assert {
        "hello",
        "first_activity",
        "sessions_10",
        "total_25km",
        "streak_26",
        "journey_move_more_8w_complete",
    } <= set(ids)
    today = date(2026, 11, 8)
    activities = [
        {
            "id": f"a{i}",
            "date": (today - timedelta(days=20 - i)).isoformat(),
            "sport": "walking",
            "distance": 3000,
            "duration": 1800,
            "start": "2026-10-20T06:30:00",
        }
        for i in range(10)
    ]
    awards = {
        item["id"]: item
        for item in evaluate_milestones(
            activities, [], [], [], {"onboarded": True, "weekly_minutes": 150, "weekly_sessions": 3}, today
        )
    }
    assert awards["first_activity"]["earned_on"] == activities[0]["date"]
    assert awards["sessions_10"]["earned_on"] == activities[9]["date"]
    assert awards["total_25km"]["earned_on"] == activities[8]["date"]
    assert awards["early_bird"]["earned"]
    assert not awards["first_run"]["earned"]
    assert awards["first_run"]["progress"] is None
