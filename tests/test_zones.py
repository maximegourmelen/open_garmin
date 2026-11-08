from datetime import date

from fastapi.testclient import TestClient

from server.analytics.zones import activity_zones, effort_points, estimate_max_hr, intensity_mix
from server.app import create_app
from server.storage import Store


def test_garmin_zones_and_edwards_points():
    result = activity_zones({"zones": [600, 1800, 300, 0, 0]}, prefs={"zone_source": "garmin"})
    assert result["zone_minutes"] == [10, 30, 5, 0, 0]
    assert result["source"] == "garmin"
    assert effort_points(result["zone_minutes"])["effort_points"] == 85
    assert effort_points(None)["effort_points"] is None
    assert effort_points([10, None, 5, 0, 0])["effort_points"] is None


def test_sample_zones_use_left_heart_rate_and_cap_gaps():
    samples = [
        {"time": 0, "hr": 100},
        {"time": 5, "hr": 130},
        {"time": 10, "hr": 150},
        {"time": 15, "hr": 170},
    ]
    zones = activity_zones({"zones": [None] * 5}, samples, {"zone_source": "custom", "max_hr": 190})
    assert zones["zone_minutes"] == [0.083, 0.083, 0.083, 0, 0]
    assert zones["method"] == "zones_from_samples@1"
    assert activity_zones(
        {}, [{"time": 0, "hr": 100}, {"time": 100, "hr": 100}], {"zone_source": "custom", "max_hr": 190}
    )["zone_minutes"] == [0.167, 0, 0, 0, 0]
    assert activity_zones({}, [], {})["zone_minutes"] is None


def test_estimated_max_hr_and_intensity_mix():
    today = date(2026, 11, 8)
    activities = [{"date": "2026-11-01", "max_hr": hr} for hr in (150, 160, 170, 180, 190)]
    assert estimate_max_hr(activities, today) == 190
    assert estimate_max_hr(activities[:4], today) is None
    mix = intensity_mix(
        [
            {"date": "2026-11-01", "zone_minutes": [30, 45, 10, 5, 0]},
            {"date": "2026-11-03", "zone_minutes": [20, 30, 5, 0, 0]},
            {"date": "2026-10-01", "zone_minutes": [100, 0, 0, 0, 0]},
        ],
        today,
    )
    assert mix["easy_minutes"] == 125
    assert mix["n"] == 2
    assert mix["sentence"].startswith("Mostly easy")
    assert mix["method"] == "intensity_mix@1"


def test_demo_activity_exposes_derived_effort_without_live_session(tmp_path):
    app = create_app(Store(tmp_path), start_worker=False)
    with TestClient(app) as client:
        result = client.get("/api/demo/activities/900000")
        assert result.status_code == 200
        data = result.json()
        assert data["source"] == "demo"
        assert data["effort_source"] == "calculated"
        assert data["effort_method"] == "effort_points@1"
        assert data["effort_points"] is not None
        assert len(data["zone_minutes"]) == 5
        assert client.get("/api/activities/900000").status_code == 401
