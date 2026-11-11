"""Workspace preferences stay scoped to the selected data source."""

from fastapi.testclient import TestClient

from server.db.store import Store
from server.main import create_app


def test_legacy_today_layout_preference_is_accepted_but_ignored_by_overview():
    app = create_app(Store(in_memory=True), start_worker=False)
    with TestClient(app) as client:
        original = client.get("/api/demo/preferences")
        assert original.status_code == 200
        prefs = original.json()
        prefs["today_layout"] = ["week", "suggestion"]
        assert client.put("/api/demo/preferences", json=prefs).status_code == 200
        assert client.get("/api/demo/preferences").json()["today_layout"] == ["week", "suggestion"]
        assert "layout" not in client.get("/api/demo/today").json()
        assert client.get("/api/preferences").status_code == 401


def test_demo_preferences_validate_card_ids():
    app = create_app(Store(in_memory=True), start_worker=False)
    with TestClient(app) as client:
        prefs = client.get("/api/demo/preferences").json()
        prefs["today_layout"] = ["unknown"]
        assert client.put("/api/demo/preferences", json=prefs).status_code == 422


def test_tour_completion_is_persisted_and_validated_in_sample_workspace():
    app = create_app(Store(in_memory=True), start_worker=False)
    with TestClient(app) as client:
        prefs = client.get("/api/demo/preferences").json()
        prefs["tour_completed"] = ["overview", "activity"]
        assert client.put("/api/demo/preferences", json=prefs).status_code == 200
        assert client.get("/api/demo/preferences").json()["tour_completed"] == ["overview", "activity"]
        prefs["tour_completed"] = ["unknown"]
        assert client.put("/api/demo/preferences", json=prefs).status_code == 422


def test_page_hint_dismissals_are_scoped_to_sample_preferences():
    app = create_app(Store(in_memory=True), start_worker=False)
    with TestClient(app) as client:
        prefs = client.get("/api/demo/preferences").json()
        prefs["dismissed_hints"] = ["activities", "health-sleep"]
        assert client.put("/api/demo/preferences", json=prefs).status_code == 200
        assert client.get("/api/demo/preferences").json()["dismissed_hints"] == ["activities", "health-sleep"]
        prefs["dismissed_hints"] = ["unknown"]
        assert client.put("/api/demo/preferences", json=prefs).status_code == 422
        assert client.get("/api/preferences").status_code == 401


def test_finishing_onboarding_persists_preference():
    app = create_app(Store(in_memory=True), start_worker=False)
    with TestClient(app) as client:
        signed_in = client.post(
            "/api/auth/register",
            json={"email": "new@example.test", "password": "a-long-test-password", "name": "New Athlete"},
        )
        assert signed_in.status_code == 200
        client.headers["X-CSRF-Token"] = signed_in.json()["csrf_token"]
        prefs = client.get("/api/preferences").json()
        prefs["onboarded"] = True
        prefs["dismissed_hints"] = ["overview"]
        assert client.put("/api/preferences", json=prefs).status_code == 200
        saved = client.get("/api/preferences").json()
        assert saved["onboarded"] is True
        assert saved["dismissed_hints"] == ["overview"]


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
