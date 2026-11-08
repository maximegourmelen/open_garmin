import pytest

from server.analytics.activity import best_efforts, derive_activity, efficiency, splits, summary_sentence


def _samples(speed: float, duration: int):
    return [
        {"time": t, "distance": speed * t, "speed": speed, "hr": 120, "elevation": 100, "cadence_spm": 160}
        for t in range(0, duration + 1, 10)
    ]


def test_split_boundaries_are_interpolated():
    rows = splits(_samples(3, 2000), 1000)
    assert len(rows) == 6
    assert all(row["time_s"] == pytest.approx(333.33, abs=0.02) for row in rows)
    assert all(row["distance_m"] == 1000 and not row["partial"] for row in rows)
    assert rows[0]["avg_hr"] == 120
    partial = splits(_samples(3, 370), 1000)
    assert len(partial) == 2
    assert partial[-1]["partial"] and partial[-1]["distance_m"] == 110


def test_best_efforts_and_garmin_fallback():
    best = best_efforts(_samples(4, 1500), "running")
    assert best["distance:1000"]["time_s"] == pytest.approx(250)
    assert best["distance:5000"]["time_s"] == pytest.approx(1250)
    assert best_efforts(_samples(11, 600), "running") == {}
    assert best_efforts([], "running", {"1000": 280}) == {
        "distance:1000": {"time_s": 280, "start_offset_s": None, "source": "garmin"}
    }
    assert best_efforts(_samples(4, 1500), "cycling") == {}


def test_efficiency_and_summary_are_plain_language():
    activity = {"sport": "running", "gap_speed": 2.4, "average_hr": 120, "duration": 3000}
    result = efficiency(activity, _samples(2.4, 3000), "easy")
    assert result["ef"] == pytest.approx(1.2)
    assert result["decoupling_pct"] == pytest.approx(0)
    assert efficiency({"sport": "running"}, [], None) is None
    derived = derive_activity(activity, _samples(2.4, 3000), "easy")
    assert derived["splits_km"] and derived["best_efforts"]
    assert summary_sentence(activity, "easy")["text"].startswith("Mostly easy")
