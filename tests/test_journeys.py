from datetime import date, timedelta

from server.companion.journeys import available_journeys, journey_progress


def test_journey_progress_and_repeated_week():
    today = date(2026, 11, 8)
    journey = {
        "id": "habit_4w",
        "started": (today - timedelta(days=14)).isoformat(),
        "paused": False,
        "repeats": [2],
    }
    activities = []
    for offset in (12, 11, 10, 5, 4, 3):
        activities.append({"date": (today - timedelta(days=offset)).isoformat(), "duration": 1800})
    progress = journey_progress(journey, activities, [], today)
    assert len(progress["weeks"]) == 5
    assert [item["week"] for item in progress["weeks"]] == [1, 2, 2, 3, 4]
    assert progress["current_slot"] is not None
    assert not progress["completed"]
    assert len(available_journeys()) == 5


def test_steps_journey_uses_prior_median():
    today = date(2026, 11, 8)
    daily = [{"date": (today - timedelta(days=offset)).isoformat(), "steps": 6000} for offset in range(1, 15)]
    progress = journey_progress({"id": "steps_6w", "started": today.isoformat()}, [], daily, today)
    assert progress["weeks"][0]["targets"]["avg_steps"] == 6500
