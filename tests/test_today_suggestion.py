from datetime import date, timedelta

from server.analytics.today import suggestion


def test_all_suggestion_branches_and_missing_inputs():
    today = date(2026, 11, 8)
    assert suggestion([], [], None, today)["kind"] == "unknown"
    good = [
        {
            "date": today.isoformat(),
            "sleep_seconds": 8 * 3600,
            "sleep_need_minutes": 480,
            "hrv_status": "BALANCED",
        }
    ]
    assert suggestion(good, [], None, today)["kind"] == "go"
    low = [
        {
            "date": today.isoformat(),
            "sleep_seconds": 5 * 3600,
            "sleep_need_minutes": 480,
            "hrv_status": "BALANCED",
        }
    ]
    assert suggestion(low, [], None, today)["kind"] == "easy"
    rest = [
        {"date": today.isoformat(), "sleep_seconds": 5 * 3600, "sleep_need_minutes": 480, "hrv_status": "LOW"}
    ]
    assert suggestion(rest, [], None, today)["kind"] == "rest"
    assert suggestion(good, [], {"soreness": 2}, today)["kind"] == "rest"


def test_resting_hr_uses_fourteen_prior_readings():
    today = date(2026, 11, 8)
    days = [
        {"date": (today - timedelta(days=offset)).isoformat(), "resting_hr": 60} for offset in range(1, 15)
    ]
    days.append({"date": today.isoformat(), "resting_hr": 67})
    result = suggestion(days, [], None, today)
    assert result["signals"][0]["id"] == "resting_hr"
    assert result["signals"][0]["state"] == "low"
