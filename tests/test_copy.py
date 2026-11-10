import json
import re
from pathlib import Path

import pytest

from server.copy import format as display
from server.copy.labels import garmin_label
from server.copy.sentences import MESSAGES, activity_summary, record_distance, sleep_summary, week_progress

CASES = json.loads((Path(__file__).parent / "fixtures" / "format_cases.json").read_text())


@pytest.mark.parametrize("case", CASES, ids=lambda case: case["kind"] + ":" + str(case["value"]))
def test_shared_format_cases(case):
    kind = case["kind"]
    kwargs = {key: value for key, value in case.items() if key not in ("kind", "value", "expected")}
    assert getattr(display, kind)(case["value"], **kwargs) == case["expected"]


def test_copy_is_neutral_deterministic_and_grounded_in_data():
    for template in MESSAGES.values():
        assert "!" not in template
        assert not re.search(r"[🎉💪🌙🔥👏🌱⭐]", template)
    assert activity_summary({"sport": "running"}, "easy")["text"].startswith("Mostly easy")
    assert activity_summary({}, None)["text"] == "Activity recorded. Effort details are not available."
    assert sleep_summary({}) == "No sleep reading for this night."
    assert "45\u202fmin less" in sleep_summary({"sleep_seconds": 7 * 3600 + 15 * 60, "sleep_need": 480})
    assert "Garmin did not report" in sleep_summary({"sleep_seconds": 7 * 3600})
    assert "150 active minutes" in week_progress(150, 200)
    assert "1\u202fh 15\u202fmin" in week_progress(150, 200, 4500)
    assert record_distance(1609.344, "imperial") == "1.0\u202fmi"
    assert record_distance(1000, "metric") == "1.0\u202fkm"
    assert garmin_label("BALANCED", "hrv_status") == "Within your usual range"
    assert garmin_label("AEROBIC_BASE", "training_effect") == "Aerobic base"
    assert garmin_label(None, "hrv_status") is None
