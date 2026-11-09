from fastapi.testclient import TestClient
from statistics import median
from time import perf_counter

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


def test_demo_today_stays_under_300ms_after_warmup():
    with TestClient(create_app(Store(in_memory=True), start_worker=False)) as client:
        assert client.get("/api/demo/today").status_code == 200
        timings = []
        for _ in range(5):
            start = perf_counter()
            assert client.get("/api/demo/today").status_code == 200
            timings.append(perf_counter() - start)
        assert median(timings) < 0.3, f"median Today response: {median(timings):.3f}s"
