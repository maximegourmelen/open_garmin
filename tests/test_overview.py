from statistics import median
from time import perf_counter

from fastapi.testclient import TestClient

from server.db.store import Store
from server.main import create_app


def test_overview_uses_one_definition_for_weekly_active_minutes():
    app = create_app(Store(in_memory=True), start_worker=False)
    with TestClient(app) as client:
        overview = client.get("/api/demo/overview")
        assert overview.status_code == 200
        data = overview.json()
        assert client.get("/api/demo/today").json() == data
        assert len(data["recent_activities"]) <= 3
        assert len(data["notes"]) <= 3
        assert data["summary_sentence"]
        assert client.get("/api/overview").status_code == 401


def test_overview_stays_under_300ms_after_warmup():
    with TestClient(create_app(Store(in_memory=True), start_worker=False)) as client:
        assert client.get("/api/demo/overview").status_code == 200
        timings = []
        for _ in range(5):
            start = perf_counter()
            assert client.get("/api/demo/overview").status_code == 200
            timings.append(perf_counter() - start)
        assert median(timings) < 0.3, f"median Overview response: {median(timings):.3f}s"
