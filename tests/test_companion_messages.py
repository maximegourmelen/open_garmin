import re
from datetime import date

from server.companion.messages import MESSAGES, greeting, render_message, today_observation


def test_templates_are_stable_and_neutral():
    banned = re.compile(r"\b(failed|missed|lazy|bad|unhealthy|dangerous)\b", re.I)
    for message_id, template in MESSAGES.items():
        assert not banned.search(template), message_id
        assert "!" not in template
    day = date(2026, 11, 8)
    first = render_message("milestone", "u1", day, title="Hello there")
    assert first == render_message("milestone", "u1", day, title="Hello there")
    assert first["pose"] == "calm"
    assert greeting(9, "Alex", "u1", day) == "Sunday, 8 November"


def test_observation_priority():
    day = date(2026, 11, 8)
    context = {
        "unseen_milestone": {"id": "hello", "title": "Hello there"},
        "recent_pb": {"distance": "5 km", "time": "30:00", "activity_id": "a1"},
        "suggestion": "rest",
    }
    assert today_observation("u", day, "calm", context)["id"] == "milestone"
    del context["unseen_milestone"]
    assert today_observation("u", day, "calm", context)["id"] == "pb"
    del context["recent_pb"]
    assert today_observation("u", day, "calm", context)["id"] == "rest_day"
