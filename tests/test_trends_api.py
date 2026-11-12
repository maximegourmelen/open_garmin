"""Trends and reports share the active-minute source used by Overview."""

from datetime import date, timedelta

from fastapi.testclient import TestClient

from server.db.store import Store
from server.main import create_app


def test_trends_ranges_and_report_match_overview():
    with TestClient(create_app(Store(in_memory=True), start_worker=False)) as client:
        overview = client.get("/api/demo/overview").json()
        for range_name, weeks in (("30D", 5), ("90D", 13), ("1Y", 52)):
            response = client.get(f"/api/demo/trends?range={range_name}")
            assert response.status_code == 200
            data = response.json()
            assert len(data["volume"]) == weeks
            assert [item["id"] for item in data["signals"]] == [
                "resting_hr",
                "efficiency",
                "longest",
                "vo2max",
            ]
            assert len(data["consistency"]["days"]) == 84
            assert data["volume"][-1]["minutes"] == overview["week"]["active_minutes"]
            assert data["volume"][-1]["sessions"] == overview["week"]["activity_count"]
        start = data["volume"][-1]["start"]
        report = client.get(f"/api/demo/reports/week/{start}")
        assert report.status_code == 200
        week = report.json()
        assert week["minutes"] == overview["week"]["active_minutes"]
        assert week["sessions"] == overview["week"]["activity_count"]
        assert len(week["daily"]) == 7
        assert {"sleep", "resting_hr", "hrv"} == set(week["health"])
        assert client.get("/api/demo/trends?range=bogus").status_code == 422


def test_report_validates_week_and_live_access():
    with TestClient(create_app(Store(in_memory=True), start_worker=False)) as client:
        current = client.get("/api/demo/trends").json()["volume"][-1]["start"]
        next_day = (date.fromisoformat(current) + timedelta(days=1)).isoformat()
        future = (date.fromisoformat(current) + timedelta(days=7)).isoformat()
        assert client.get(f"/api/demo/reports/week/{next_day}").status_code == 422
        assert client.get(f"/api/demo/reports/week/{future}").status_code == 422
        assert client.get("/api/trends").status_code == 401
        assert client.get(f"/api/reports/week/{current}").status_code == 401
