from datetime import date, timedelta

from server.analytics.fitness import efficiency_signal, fitness_signals, resting_hr_signal


def test_efficiency_trend_uses_medians_for_same_sport():
    today = date(2026, 11, 8)
    activities = []
    for offset, ef in zip((40, 38, 36, 20, 18, 16), (1.20, 1.22, 1.18, 1.26, 1.25, 1.27), strict=True):
        activities.append(
            {
                "date": (today - timedelta(days=offset)).isoformat(),
                "sport": "walking",
                "duration": 1800,
                "distance": 3600,
                "average_hr": 120,
                "gap_speed": ef * 2,
            }
        )
    signal = efficiency_signal(activities, today)
    assert signal["before"] == 1.20
    assert signal["after"] == 1.26
    assert signal["before_display"] == "1.20 m/beat"
    assert signal["after_display"] == "1.26 m/beat"
    assert "1.20 to 1.26 m/beat" in signal["sentence"]
    assert signal["status"] == "improving"
    assert signal["n_before"] == 3 and signal["n_after"] == 3
    assert signal["method"] == "efficiency_trend@1"


def test_rhr_signal_and_available_signals():
    today = date(2026, 11, 8)
    daily = [
        {"date": (today - timedelta(days=offset)).isoformat(), "resting_hr": 62} for offset in range(43, 57)
    ] + [{"date": (today - timedelta(days=offset)).isoformat(), "resting_hr": 59} for offset in range(14)]
    assert resting_hr_signal(daily, today)["status"] == "improving"
    activities = [
        {
            "date": (today - timedelta(days=40)).isoformat(),
            "sport": "running",
            "duration": 1800,
            "vo2max": 42,
        },
        {"date": (today - timedelta(days=5)).isoformat(), "sport": "running", "duration": 2100, "vo2max": 43},
    ]
    signals = fitness_signals(activities, daily, today)
    assert {signal["id"] for signal in signals} >= {"resting_hr", "longest", "vo2max"}
    longest = next(signal for signal in signals if signal["id"] == "longest")
    assert longest["unit"] == "s"
    assert "min" in longest["sentence"] and "1800" not in longest["sentence"]
    assert longest["before_display"] == "30\u202fmin"
    assert len(signals) <= 4
    assert fitness_signals([], [], today)[0]["id"] == "consistency"
