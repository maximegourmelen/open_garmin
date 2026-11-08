from datetime import date, timedelta

from fastapi.testclient import TestClient

from server.analytics.relationships import relationship
from server.db.store import Store
from server.main import create_app


def test_relationship_pairing_lag_and_missing_days():
    first = date(2026, 10, 1)
    days = [
        {
            "date": (first + timedelta(days=index)).isoformat(),
            "sleep_minutes": 400 + index * 5,
            "checkin_energy": index + 1,
        }
        for index in range(20)
    ]
    same = relationship(days, "sleep_minutes", "checkin_energy")
    assert same["n"] == 20 and same["rho"] == 1.0
    assert "strong" in same["words"].lower()
    lagged = relationship(days, "sleep_minutes", "checkin_energy", 1)
    assert lagged["n"] == 19
    days[3]["checkin_energy"] = None
    assert relationship(days, "sleep_minutes", "checkin_energy")["n"] == 19
    assert relationship(days[:13], "sleep_minutes", "checkin_energy")["rho"] is None


def test_demo_relationship_route_validates_inputs():
    with TestClient(create_app(Store(in_memory=True), start_worker=False)) as client:
        result = client.get("/api/demo/relationships?x=sleep_minutes&y=resting_hr")
        assert result.status_code == 200
        data = result.json()
        assert data["n"] >= 14 and data["rho"] is not None
        assert "cause and effect" in data["disclaimer"]
        assert client.get("/api/demo/relationships?x=unknown&y=steps").status_code == 422
        assert client.get("/api/demo/relationships?x=steps&y=hrv&lag=2").status_code == 422
        assert client.get("/api/relationships?x=steps&y=hrv").status_code == 401
