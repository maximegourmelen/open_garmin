from fastapi.testclient import TestClient

from server.db.store import Store
from server.main import create_app


def test_demo_today_has_single_request_view():
    with TestClient(create_app(Store(in_memory=True), start_worker=False)) as client:
        result = client.get("/api/demo/today")
        assert result.status_code == 200
        data = result.json()
        assert data["greeting"]
        assert data["week"]["method"] == "active_minutes@1"
        assert data["suggestion"]["method"] == "today_suggestion@1"
        assert data["suggestion"]["footnote"].endswith("not medical advice.")
        assert data["sleep"] and data["body_battery"] and data["resting_hr"]
        assert "route_preview" in data["latest_activity"]
        if data["latest_activity"]["route_preview"]:
            assert data["latest_activity"]["has_route"]
        assert data["next_milestone"]
        assert data["journey"] and data["insights"]
        assert data["unseen_milestones"] and data["recap_ready"]
        assert client.get("/api/today").status_code == 401
