"""Check-ins remain available after the retired journey routes are hidden."""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

from server.db.store import Store
from server.main import create_app


def test_demo_checkin_stays_available_without_journey_endpoints():
    today = datetime.now(ZoneInfo("America/Toronto")).date()
    with TestClient(create_app(Store(in_memory=True), start_worker=False)) as client:
        response = client.put(
            f"/api/demo/checkins/{today.isoformat()}",
            json={"mood": 4, "energy": 5, "soreness": 0, "note": "Nice day"},
        )
        assert response.status_code == 200
        assert response.json()["reply"]["id"] == "checkin_reply_4"
        assert (
            client.put(
                f"/api/demo/checkins/{(today - timedelta(days=8)).isoformat()}",
                json={"mood": 3},
            ).status_code
            == 422
        )
        assert client.get("/api/demo/journey").status_code == 404
        assert client.post("/api/demo/milestones/seen", json={"ids": ["hello"]}).status_code == 405
        assert client.get("/api/demo/recaps/2026-11-02").status_code == 404
