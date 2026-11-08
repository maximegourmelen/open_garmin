import re
from datetime import date

from server.companion.messages import TEMPLATES, greeting, render_message, today_observation


def test_templates_are_stable_and_kind():
    banned = re.compile(r"\b(failed|missed|only|just|behind|lazy|bad|unhealthy|dangerous)\b", re.I)
    for message_id, tones in TEMPLATES.items():
        assert set(tones) == {"cheerful", "calm"}, message_id
        for tone, variants in tones.items():
            assert 2 <= len(variants) <= 4
            assert all(not banned.search(variant) for variant in variants), message_id
            if tone == "calm":
                assert all(not re.search(r"[🎉💪🌙🔥👏🌱⭐]", variant) for variant in variants)
    day = date(2026, 11, 8)
    first = render_message("milestone", "u1", day, title="Hello there")
    assert first == render_message("milestone", "u1", day, title="Hello there")
    assert first["pose"] == "cheer"
    assert greeting(9, "Alex", "u1", day).startswith(("Good morning", "Morning"))


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
