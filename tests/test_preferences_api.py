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


def test_finishing_onboarding_awards_first_milestone():
    app = create_app(Store(in_memory=True), start_worker=False)
    with TestClient(app) as client:
        signed_in = client.post(
            "/api/auth/register",
            json={"email": "new@example.test", "password": "a-long-test-password", "name": "New Athlete"},
        )
        assert signed_in.status_code == 200
        client.headers["X-CSRF-Token"] = signed_in.json()["csrf_token"]
        before = client.get("/api/journey").json()
        assert not next(item for item in before["milestones"] if item["id"] == "hello")["earned"]
        prefs = client.get("/api/preferences").json()
        prefs["onboarded"] = True
        assert client.put("/api/preferences", json=prefs).status_code == 200
        after = client.get("/api/journey").json()
        assert next(item for item in after["milestones"] if item["id"] == "hello")["earned"]


def test_display_name_update_is_scoped_and_rejects_blank_names():
    app = create_app(Store(in_memory=True), start_worker=False)
    with TestClient(app) as client:
        signed_in = client.post(
            "/api/auth/register",
            json={"email": "name@example.test", "password": "a-long-test-password", "name": "Original"},
        )
        assert signed_in.status_code == 200
        client.headers["X-CSRF-Token"] = signed_in.json()["csrf_token"]
        assert client.put("/api/profile", json={"name": "  Updated  "}).json()["name"] == "Updated"
        assert client.get("/api/session").json()["user"]["name"] == "Updated"
        assert client.put("/api/profile", json={"name": "   "}).status_code == 422
