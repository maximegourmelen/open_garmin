from datetime import date, datetime, timedelta

from fastapi.testclient import TestClient

from server.analytics.energy import body_battery_day, stress_day
from server.analytics.sleep import bedtime_rhythm, sleep_debt, sleep_sentence, stage_ranges
from server.db.store import Store
from server.main import create_app


def test_sleep_need_debt_and_ranges():
    today = date(2026, 11, 8)
    day = {
        "date": today.isoformat(),
        "sleep_seconds": 7 * 3600,
        "sleep_need_minutes": 480,
        "deep_seconds": 75 * 60,
        "light_seconds": 260 * 60,
        "rem_seconds": 85 * 60,
        "sleep_subscores": {"deepPercentage": {"optimal_start": 15, "optimal_end": 25}},
    }
    assert "little less" in sleep_sentence(day)
    assert sleep_debt([day], today)["minutes"] == 60
    assert stage_ranges(day)["deep"]["in_range"] is True
    assert stage_ranges(day)["light"]["in_range"] is None
    assert sleep_sentence({}) == "No sleep reading for this night."


def test_bedtime_wraps_midnight():
    today = date(2026, 11, 8)
    nights = []
    for offset in range(8):
        day = today - timedelta(days=offset)
        bedtime = datetime.fromisoformat(f"{day - timedelta(days=1)}T23:30:00")
        nights.append({"date": day.isoformat(), "sleep_start": bedtime.isoformat()})
    rhythm = bedtime_rhythm(nights, today)
    assert rhythm["usual_minutes_after_18"] == 330
    assert rhythm["within_7"] == 7
    assert "regular" in rhythm["sentence"]


def test_energy_and_stress_keep_missing_values_missing():
    assert body_battery_day({})["sentence"] is None
    assert body_battery_day({"bb_charged": 50, "bb_drained": 30})["charged"] == 50
    stress = stress_day({"stress_rest_s": 1800, "stress_high_s": 1800, "stress_qualifier": "BALANCED"})
    assert stress["pct"] == {"rest": 50.0, "low": None, "medium": None, "high": 50.0}
    assert stress["title"] == "Balanced day"


def test_demo_wellness_endpoints():
    with TestClient(create_app(Store(in_memory=True), start_worker=False)) as client:
        for kind in ("sleep", "heart", "energy", "stress", "steps"):
            result = client.get(f"/api/demo/wellness/{kind}?range=7D")
            assert result.status_code == 200
            data = result.json()
            assert len(data["days"]) == 7
            assert data["summary"]["latest"] is not None
            assert data["method"] == f"wellness_{kind}@1"
        assert client.get("/api/demo/wellness/overview?range=bogus").status_code == 422
        assert len(client.get("/api/demo/wellness/overview").json()["tabs"]) == 5
        assert client.get("/api/wellness/sleep").status_code == 401
