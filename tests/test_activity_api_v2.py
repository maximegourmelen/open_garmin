from xml.etree import ElementTree as ET

from fastapi.testclient import TestClient

from server.app import create_app
from server.db.models import Activity
from server.db.store import Store


def test_demo_list_detail_gpx_and_note(tmp_path):
    app = create_app(Store(tmp_path), start_worker=False)
    with TestClient(app) as client:
        first = client.get("/api/demo/activities?limit=3")
        assert first.status_code == 200
        data = first.json()
        assert len(data["items"]) == 3
        assert data["next_cursor"] == "3"
        assert data["totals"]["sessions"] >= 250
        item = data["items"][0]
        assert item["effort_points"] is not None
        assert item["source"] == "demo"
        assert client.get("/api/demo/activities?q=nonexistent").json()["items"] == []
        assert client.get("/api/demo/activities?sport=running").json()["totals"]["sessions"] > 0
        assert client.get("/api/activities").status_code == 401
        detail = client.get("/api/demo/activities/900000").json()
        assert detail["splits_km"]
        assert detail["streams"] and detail["streams"]["time"]
        assert detail["summary"]["text"]
        assert detail["note"]["feel"] is None
        assert (
            client.put(
                "/api/demo/activities/900000/note",
                json={"text": "Enjoyed the walk", "rpe": 3, "feel": 4, "tags": ["easy"]},
            ).status_code
            == 200
        )
        note = client.get("/api/demo/activities/900000").json()["note"]
        assert note == {"text": "Enjoyed the walk", "rpe": 3, "feel": 4, "tags": ["easy"]}
        assert client.put("/api/demo/activities/900000/note", json={"feel": 6}).status_code == 422
        gpx = client.get("/api/demo/activities/900000/gpx")
        assert gpx.status_code == 200
        assert gpx.headers["content-type"].startswith("application/gpx+xml")
        root = ET.fromstring(gpx.content)
        assert len(root.findall(".//{http://www.topografix.com/GPX/1/1}trkpt")) >= 2


def test_activity_list_excludes_child_laps(tmp_path):
    app = create_app(Store(tmp_path), start_worker=False)
    ws = app.state.demo_workspace
    with ws.store.sessions.begin() as db:
        parent = db.get(Activity, (ws.user_id, "900000"))
        activity_date = parent.date
        db.add(
            Activity(
                user_id=ws.user_id,
                id="lap-example",
                date=parent.date,
                data={**parent.data, "id": "lap-example", "parent_id": parent.id},
                raw={},
            )
        )
    with TestClient(app) as client:
        result = client.get(f"/api/demo/activities?from={activity_date}&to={activity_date}").json()
        assert all(item["id"] != "lap-example" for item in result["items"])
        assert len(result["items"]) == result["totals"]["sessions"]
