from sqlalchemy import func, select

from server.db.models import Activity, ActivityDerived, ActivitySamples, Daily, User
from server.derive import rederive_user
from server.db.store import Store


def test_rederive_is_idempotent_preserves_details_and_raw(tmp_path):
    store = Store(tmp_path)
    activity_raw = {
        "activityId": 42,
        "activityName": "Park walk",
        "activityType": {"typeKey": "walking"},
        "startTimeLocal": "2026-10-20T08:00:00",
        "duration": 1200,
        "distance": 1600,
        "steps": 2200,
        "hrTimeInZone_1": 600,
    }
    daily_raw = {
        "summary": {"calendarDate": "2026-10-20", "movement": {"steps": 8000}},
        "sleep": {"calendarDate": "2026-10-20", "sleepTimeSeconds": 26000},
    }
    old_details = {
        "samples": [{"time": 0, "hr": 100}],
        "laps": [{"index": 1}],
        "sets": [],
        "events": [],
        "session_metrics": [{"name": "x", "value": 1}],
        "detail_state": "ready",
        "detail_error": None,
        "sample_count": 1,
        "sample_resolution": "original",
    }
    with store.sessions.begin() as db:
        db.add(User(id="u", email="u@example.test", password_hash="hash", name="U", preferences={}))
        db.flush()
        db.add(
            Activity(
                user_id="u",
                id="42",
                date="2026-10-20",
                raw=activity_raw,
                data={"id": "42", "date": "2026-10-20", **old_details},
                details_loaded=True,
            )
        )
        db.add(
            Daily(user_id="u", date="2026-10-20", raw=daily_raw, data={"date": "2026-10-20", "steps": 7000})
        )
    rederive_user(store, "u")
    with store.sessions() as db:
        activity = db.get(Activity, ("u", "42"))
        daily = db.get(Daily, ("u", "2026-10-20"))
        assert activity.data["normalizer_version"] == 2
        assert activity.data["steps"] == 2200
        assert all(activity.data[key] == value for key, value in old_details.items())
        assert activity.raw == activity_raw
        assert daily.data["normalizer_version"] == 2 and daily.data["steps"] == 8000
        assert daily.raw == daily_raw
        assert db.scalar(select(func.count()).select_from(ActivityDerived)) == 1
        first_activity_data = activity.data.copy()
        first_daily_data = daily.data.copy()
    rederive_user(store, "u")
    with store.sessions() as db:
        assert db.get(Activity, ("u", "42")).data == first_activity_data
        assert db.get(Daily, ("u", "2026-10-20")).data == first_daily_data
        assert db.scalar(select(func.count()).select_from(ActivityDerived)) == 1


def test_rederive_moves_large_inline_stream_once(tmp_path):
    store = Store(tmp_path)
    samples = [{"time": i, "distance": i * 2} for i in range(100)]
    with store.sessions.begin() as db:
        db.add(User(id="u", email="u@example.test", password_hash="hash", name="U", preferences={}))
        db.flush()
        db.add(
            Activity(
                user_id="u",
                id="43",
                date="2026-10-21",
                raw={},
                data={"id": "43", "date": "2026-10-21", "samples": samples, "detail_state": "ready"},
                details_loaded=False,
            )
        )
    rederive_user(store, "u")
    with store.sessions() as db:
        assert db.get(ActivitySamples, ("u", "43")).samples == samples
        assert db.get(Activity, ("u", "43")).data["sample_count"] == 100
        assert len(db.get(Activity, ("u", "43")).data["samples"]) <= 70
    rederive_user(store, "u")
    with store.sessions() as db:
        assert db.scalar(select(func.count()).select_from(ActivitySamples)) == 1


def test_rederive_preserves_imported_fit_without_garmin_activity_raw(tmp_path):
    store = Store(tmp_path)
    with store.sessions.begin() as db:
        db.add(User(id="u", email="u@example.test", password_hash="hash", name="U", preferences={}))
        db.flush()
        db.add(
            Activity(
                user_id="u",
                id="fit-example",
                date="2026-10-21",
                raw={"imported": "fit"},
                data={
                    "id": "fit-example",
                    "date": "2026-10-21",
                    "name": "My workout",
                    "sport": "running",
                    "source": "imported_fit",
                    "samples": [],
                },
                details_loaded=False,
            )
        )
    rederive_user(store, "u")
    with store.sessions() as db:
        data = db.get(Activity, ("u", "fit-example")).data
        assert data["name"] == "My workout"
        assert data["source"] == "imported_fit"
        assert data["sport"] == "running"
        assert data["normalizer_version"] == 2
