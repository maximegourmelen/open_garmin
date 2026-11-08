from fastapi.testclient import TestClient

from server.db.store import Store
from server.main import create_app


def test_demo_progress_overview_and_deeper():
    with TestClient(create_app(Store(in_memory=True), start_worker=False)) as client:
        overview = client.get("/api/demo/progress")
        assert overview.status_code == 200
        data = overview.json()
        assert len(data["volume"]) == 12
        assert len(data["consistency"]["days"]) == 84
        assert data["consistency"]["active_days_28"] > 0
        assert data["bests"]
        assert data["signals"]
        deeper = client.get("/api/demo/progress/deeper?range=4W")
        assert deeper.status_code == 200
        detail = deeper.json()
        assert len(detail["effort_trend"]["days"]) == 28
        assert detail["pace_hr"]
        assert detail["running_form"]
        assert client.get("/api/demo/progress/deeper?range=invalid").status_code == 422
        assert client.get("/api/progress").status_code == 401
