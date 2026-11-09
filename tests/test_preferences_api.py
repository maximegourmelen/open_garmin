"""Workspace preferences stay scoped to the selected data source."""

from fastapi.testclient import TestClient

from server.db.store import Store
from server.main import create_app


def test_demo_preferences_drive_today_layout_without_live_auth():
    app = create_app(Store(in_memory=True), start_worker=False)
    with TestClient(app) as client:
        original = client.get("/api/demo/preferences")
        assert original.status_code == 200
        prefs = original.json()
        prefs["today_layout"] = ["week", "suggestion"]
        assert client.put("/api/demo/preferences", json=prefs).status_code == 200
        assert client.get("/api/demo/preferences").json()["today_layout"] == ["week", "suggestion"]
        assert client.get("/api/demo/today").json()["layout"] == ["week", "suggestion"]
        assert client.get("/api/preferences").status_code == 401


def test_demo_preferences_validate_card_ids():
    app = create_app(Store(in_memory=True), start_worker=False)
    with TestClient(app) as client:
        prefs = client.get("/api/demo/preferences").json()
        prefs["today_layout"] = ["unknown"]
        assert client.put("/api/demo/preferences", json=prefs).status_code == 422
