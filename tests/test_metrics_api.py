"""Metric summaries use actual workspace readings and preserve missing days."""

from fastapi.testclient import TestClient

from server.api.metrics import SPECS
from server.db.store import Store
from server.main import create_app


def test_every_metric_has_a_demo_summary():
    with TestClient(create_app(Store(in_memory=True), start_worker=False)) as client:
        for metric_id in SPECS:
            response = client.get(f"/api/demo/metrics/{metric_id}/summary")
            assert response.status_code == 200, metric_id
            data = response.json()
            assert data["id"] == metric_id
            assert len(data["series"]) == 30
            assert data["latest"] is None or data["latest"] in data["series"]


def test_resting_heart_summary_has_personal_range_and_null_gaps():
    with TestClient(create_app(Store(in_memory=True), start_worker=False)) as client:
        data = client.get("/api/demo/metrics/resting_hr/summary").json()
        assert data["latest"]["value"] > 0
        assert data["unit"] == "bpm"
        assert data["source"] == "garmin"
        assert data["usual_range"]["n"] >= 14
        hrv = client.get("/api/demo/metrics/hrv/summary").json()
        assert any(point["value"] is None for point in hrv["series"])


def test_metric_summary_validates_id_and_window_and_requires_live_auth():
    with TestClient(create_app(Store(in_memory=True), start_worker=False)) as client:
        assert client.get("/api/demo/metrics/not-a-metric/summary").status_code == 404
        assert client.get("/api/demo/metrics/hrv/summary?days=3").status_code == 422
        assert client.get("/api/demo/metrics/hrv/summary?days=7").json()["series"] == [
            *client.get("/api/demo/metrics/hrv/summary").json()["series"][-7:]
        ]
        assert client.get("/api/metrics/hrv/summary").status_code == 401


def test_activity_distance_summary_uses_selected_units():
    with TestClient(create_app(Store(in_memory=True), start_worker=False)) as client:
        metric = client.get("/api/demo/metrics/activity_distance/summary").json()
        assert metric["unit"] == "km"
        assert metric["latest"]["value"] > 0
        prefs = client.get("/api/demo/preferences").json()
        prefs["units"] = "imperial"
        assert client.put("/api/demo/preferences", json=prefs).status_code == 200
        imperial = client.get("/api/demo/metrics/activity_distance/summary").json()
        assert imperial["unit"] == "mi"
        assert imperial["latest"]["value"] < metric["latest"]["value"]
        pace = client.get("/api/demo/metrics/activity_avg_pace/summary").json()
        speed = client.get("/api/demo/metrics/activity_avg_speed/summary").json()
        swim = client.get("/api/demo/metrics/activity_swim_pace/summary").json()
        assert pace["unit"] == "s/mi"
        assert speed["unit"] == "mph"
        assert swim["unit"] == "s/100yd"
