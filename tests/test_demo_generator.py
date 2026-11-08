from datetime import date, timedelta
from time import perf_counter

from sqlalchemy import func, select

from server.db.models import Activity, ActivitySamples, CheckIn, Daily, MilestoneAward, Note
from server.demo.generator import generate_demo
from server.demo.seed import build_demo_workspace


def test_demo_generator_is_deterministic_complete_and_fast():
    today = date(2026, 11, 8)
    start = perf_counter()
    first = generate_demo(today)
    assert perf_counter() - start < 2
    assert first == generate_demo(today)
    assert len(first["activities"]) >= 250
    assert len(first["daily"]) == 365
    assert first["daily"][0]["date"] == (today - timedelta(days=364)).isoformat()
    assert first["daily"][-1]["date"] == today.isoformat()
    assert all(item["data"]["normalizer_version"] == 2 for item in first["activities"] + first["daily"])
    assert all(item["data"]["id"] == str(item["raw"]["activityId"]) for item in first["activities"])
    assert all(item["samples"] for item in first["activities"])
    sports = {item["data"]["sport"] for item in first["activities"]}
    assert {"walking", "running", "strength", "cycling"} <= sports
    runners = [item["data"] for item in first["activities"] if item["data"]["sport"] == "running"]
    cyclists = [item["data"] for item in first["activities"] if item["data"]["sport"] == "cycling"]
    for field in (
        "cadence_spm",
        "stride_length_m",
        "ground_contact_ms",
        "vertical_oscillation_cm",
        "body_battery_impact",
    ):
        assert sum(item[field] is not None for item in runners) / len(runners) >= 0.8
    assert sum(item["cadence_rpm"] is not None for item in cyclists) / len(cyclists) >= 0.8
    for field in ("steps", "hrv", "sleep_seconds", "bb_latest", "sleep_need_minutes", "steps_goal"):
        assert sum(item["data"][field] is not None for item in first["daily"]) / 365 >= 0.8
    assert all(5000 <= item["data"]["steps"] <= 11000 for item in first["daily"])
    first_rhr = sum(item["data"]["resting_hr"] for item in first["daily"][:30]) / 30
    last_rhr = sum(item["data"]["resting_hr"] for item in first["daily"][-30:]) / 30
    assert first_rhr - last_rhr >= 5
    dip_dates = {(today - timedelta(days=364) + timedelta(days=i)).isoformat() for i in range(195, 216)}
    assert sum(item["date"] in dip_dates for item in first["activities"]) <= 7


def test_seed_populates_notes_checkins_milestone_and_streams():
    ws = build_demo_workspace()
    with ws.store.sessions() as db:
        assert db.scalar(select(func.count()).select_from(Activity)) >= 250
        assert db.scalar(select(func.count()).select_from(Daily)) == 365
        assert db.scalar(select(func.count()).select_from(ActivitySamples)) >= 250
        assert db.scalar(select(func.count()).select_from(Note)) == 1
        assert db.scalar(select(func.count()).select_from(CheckIn)) == 5
        award = db.scalar(select(MilestoneAward))
        assert award and not award.seen
