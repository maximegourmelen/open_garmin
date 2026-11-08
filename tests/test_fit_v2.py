from server.garmin.fit import record_to_sample, session_to_meta


def test_running_cadence_uses_both_legs_and_fraction():
    sample = record_to_sample({"cadence": 85, "fractional_cadence": 0.5}, "running")
    assert sample["cadence"] == 85
    assert sample["cadence_spm"] == 171
    assert sample["cadence_rpm"] is None
    assert record_to_sample({"cadence": 85}, "hiking")["cadence_spm"] == 170


def test_cycling_cadence_is_not_doubled():
    sample = record_to_sample({"cadence": 85, "fractional_cadence": 0.5}, "cycling")
    assert sample["cadence_rpm"] == 85
    assert sample["cadence_spm"] is None


def test_record_channels_have_explicit_units():
    sample = record_to_sample(
        {
            "stance_time": 265,
            "vertical_oscillation": 82,
            "vertical_ratio": 8.5,
            "step_length": 1100,
            "temperature": 12,
            "position_lat": 2**30,
            "position_long": -(2**30),
        },
        "running",
    )
    assert (sample["gct"], sample["vo"], sample["vr"], sample["step_len"], sample["temp"]) == (
        265,
        8.2,
        8.5,
        1.1,
        12,
    )
    assert (sample["lat"], sample["lon"]) == (90, -90)
    assert sample["cadence_spm"] is None


def test_session_feel_effort_and_hiking_sport():
    assert session_to_meta(
        {"sport": "walking", "sub_sport": "hiking", "workout_feel": 75, "workout_rpe": 60}
    ) == {
        "sport": "hiking",
        "watch_feel": 4,
        "watch_rpe": 6,
    }
    assert session_to_meta({"sport": "running", "workout_feel": 0, "workout_rpe": 100})["watch_feel"] == 1
    assert session_to_meta({"sport": "running", "workout_feel": 100})["watch_feel"] == 5
    assert session_to_meta({"sport": "running"})["watch_rpe"] is None
