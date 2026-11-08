from datetime import date

import pytest

from server.analytics.efforts import bests, collect_best_efforts, five_k_estimate


def test_best_candidates_and_recent_all_time_views():
    activities = [
        {
            "activity": {
                "id": "a",
                "date": "2026-08-01",
                "sport": "running",
                "distance": 10000,
                "duration": 3000,
                "source": "garmin",
            },
            "derived": {
                "best_efforts": {
                    "distance:10000": {"time_s": 3000, "start_offset_s": 0, "source": "calculated"}
                }
            },
        },
        {
            "activity": {
                "id": "b",
                "date": "2026-11-02",
                "sport": "running",
                "distance": 11000,
                "duration": 3200,
                "source": "garmin",
            },
            "derived": {
                "best_efforts": {
                    "distance:10000": {"time_s": 3100, "start_offset_s": 120, "source": "calculated"}
                }
            },
        },
        {
            "activity": {
                "id": "child",
                "date": "2026-11-02",
                "sport": "running",
                "distance": 20000,
                "duration": 4000,
                "parent_id": "parent",
            }
        },
    ]
    candidates = collect_best_efforts(activities)
    assert not any(row["activity_id"] == "child" for row in candidates)
    result = bests(candidates, date(2026, 11, 8))
    distance = next(item for item in result["items"] if item["kind"] == "distance:10000")
    assert distance["all_time"]["activity_id"] == "a"
    assert distance["recent_90"]["activity_id"] == "b"
    longest = next(item for item in result["items"] if item["kind"] == "longest:distance:running")
    assert longest["all_time"]["activity_id"] == "b"
    assert longest["all_time"]["is_new"]
    assert result["method"] == "bests@1"


def test_five_k_estimate_uses_recent_qualifying_effort():
    candidates = [
        {
            "kind": "distance:10000",
            "value": 3000,
            "activity_id": "a",
            "date": "2026-11-01",
            "source": "calculated",
        }
    ]
    estimate = five_k_estimate(candidates, date(2026, 11, 8))
    assert estimate["seconds"] == pytest.approx(3000 * 0.5**1.06, abs=0.1)
    assert estimate["sentence"].startswith("About 23:59")
    assert five_k_estimate([], date(2026, 11, 8))["seconds"] is None
    old = [{**candidates[0], "date": "2026-01-01"}]
    assert five_k_estimate(old, date(2026, 11, 8))["seconds"] is None
