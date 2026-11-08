from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

from server.db.store import Store
from server.main import create_app


def test_demo_journey_checkins_milestones_and_recap():
    today = datetime.now(ZoneInfo("America/Toronto")).date()
    with TestClient(create_app(Store(in_memory=True), start_worker=False)) as client:
        journey = client.get("/api/demo/journey")
        assert journey.status_code == 200
        data = journey.json()
        assert data["journey"]["id"] == "walk_to_run_9w"
        assert data["streak"]["method"] == "streak@1"
        assert len(data["milestones"]) >= 35
        assert len(data["recaps"]) >= 50
        assert data["recaps"][0]["seen"] is False
        change = client.put("/api/demo/journey", json={"id": "habit_4w"})
        assert change.status_code == 200
        assert change.json()["journey"]["id"] == "habit_4w"
        pause = client.put("/api/demo/journey", json={"action": "pause"})
        assert pause.json()["journey"]["paused"] is True
        checkin = client.put(
            f"/api/demo/checkins/{today.isoformat()}",
            json={"mood": 4, "energy": 5, "soreness": 0, "note": "Nice day"},
        )
        assert checkin.status_code == 200
        assert checkin.json()["reply"]["id"] == "checkin_reply_4"
        assert (
            client.put(
                f"/api/demo/checkins/{(today - timedelta(days=8)).isoformat()}", json={"mood": 3}
            ).status_code
            == 422
        )
        assert client.post("/api/demo/milestones/seen", json={"ids": ["hello"]}).status_code == 200
        prior_week = today - timedelta(days=7)
        week_start = prior_week - timedelta(days=prior_week.weekday())
        recap = client.get(f"/api/demo/recaps/{week_start.isoformat()}")
        assert recap.status_code == 200
        assert len(recap.json()["slides"]) >= 3
        assert client.post(f"/api/demo/recaps/{week_start.isoformat()}/seen").status_code == 200
        assert client.get("/api/journey").status_code == 401
