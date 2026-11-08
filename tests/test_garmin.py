import base64
import io
import json
import time
import zipfile
from datetime import date

import httpx
import pytest

from server.garmin import GarminClient, GarminError, chunks, normalize_activity, normalize_daily, number, parse_original, sleep_values


def token():
    payload = base64.urlsafe_b64encode(json.dumps({"exp": time.time() + 86400}).encode()).decode().rstrip("=")
    return f"header.{payload}.signature"


def test_personal_key_is_exchanged_and_never_used_as_bearer():
    requests = []
    def handle(request):
        requests.append(request)
        if request.method == "POST":
            assert request.headers["Authorization"] == "ApiKey test-private-key"
            return httpx.Response(200, text=token())
        assert request.headers["Authorization"].startswith("Bearer header.")
        assert "test-private-key" not in str(request.url)
        return httpx.Response(200, json={"ok": True})
    c = GarminClient("test-private-key", transport=httpx.MockTransport(handle))
    assert c.get("/test") == {"ok": True}
    assert c.get("/test") == {"ok": True}
    assert [r.method for r in requests] == ["POST", "GET", "GET"]


def test_original_download_advertises_the_actual_garmin_content_types():
    def handle(request):
        if request.method == "POST":
            return httpx.Response(200, text=token())
        assert "application/x-zip-compressed" in request.headers["Accept"]
        return httpx.Response(200, content=b"original")
    c = GarminClient("not-a-real-key", transport=httpx.MockTransport(handle))
    assert c.get("/download", binary=True) == b"original"


def test_401_refreshes_once_without_a_retry_loop():
    counts = {"POST": 0, "GET": 0}
    def handle(request):
        counts[request.method] += 1
        return httpx.Response(200, text=token()) if request.method == "POST" else httpx.Response(401, text="private response body")
    with pytest.raises(GarminError) as error:
        GarminClient("secret", transport=httpx.MockTransport(handle)).get("/test")
    assert error.value.status == 401
    assert counts == {"POST": 2, "GET": 2}
    assert "private response body" not in str(error.value)


def test_rate_limit_preserves_retry_after_and_does_not_retry():
    def handle(request):
        return httpx.Response(200, text=token()) if request.method == "POST" else httpx.Response(429, headers={"Retry-After": "90"})
    with pytest.raises(GarminError) as error:
        GarminClient("secret", transport=httpx.MockTransport(handle)).get("/test")
    assert error.value.status == 429
    assert error.value.retry_after == 90


def test_v2_daily_summary_matches_observed_nested_shapes():
    d = normalize_daily({"calendarDate": "2026-10-20", "movement": {"steps": {"value": 0}}, "calories": {"burnedTotal": 2100}, "heartRate": {"restingValue": 50}, "stress": {"avgLevel": 24}, "respiration": {"avgValue": 13.5}})
    assert d["steps"] == 0
    assert d["calories"] == 2100
    assert d["resting_hr"] == 50
    assert d["stress"] == 24
    assert d["respiration"] == 13.5
    assert d["hrv"] is None
    assert d["body_battery"] is None


def test_summary_zeros_are_not_replaced_with_missing():
    a = normalize_activity({"activityId": 42, "startTimeLocal": "2026-10-20T10:00:00", "activityType": {"typeKey": "strength_training"}, "aerobicTrainingEffect": 0, "duration": 600})
    assert a["sport"] == "strength"
    assert a["aerobic_te"] == 0
    assert a["distance"] is None
    assert a["average_speed"] is None
    assert number(True) is None
    assert number(float("nan")) is None


def test_sleep_values_preserve_missing_score():
    result = sleep_values({"sleepTimeSeconds": 28000, "sleepScores": {"overall": {"value": 84}}, "sleepNeed": {"actual": 480}})
    assert result["sleep_score"] == 84
    assert result["sleep_need"] == 480
    assert sleep_values({})["sleep_score"] is None


def test_date_chunks_cover_inclusive_range_once_across_leap_day():
    result = list(chunks(date(2024, 2, 1), date(2024, 3, 1), 28))
    assert result == [("2024-02-01", "2024-02-28"), ("2024-02-29", "2024-03-01")]


TCX = b'''<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"><Activities><Activity Sport="Running"><Lap><TotalTimeSeconds>60</TotalTimeSeconds><DistanceMeters>200</DistanceMeters><Track><Trackpoint><Time>2026-10-20T12:00:00Z</Time><DistanceMeters>0</DistanceMeters><HeartRateBpm><Value>120</Value></HeartRateBpm></Trackpoint><Trackpoint><Time>2026-10-20T12:01:00Z</Time><DistanceMeters>200</DistanceMeters><HeartRateBpm><Value>130</Value></HeartRateBpm></Trackpoint></Track></Lap></Activity></Activities></TrainingCenterDatabase>'''


def test_tcx_is_read_in_memory_without_extracting_archive_paths(tmp_path):
    data = io.BytesIO()
    with zipfile.ZipFile(data, "w") as z:
        z.writestr("../../escape.tcx", TCX)
    parsed = parse_original(data.getvalue())
    assert len(parsed["samples"]) == 2
    assert parsed["samples"][1]["time"] == 60
    assert parsed["samples"][0]["lat"] is None
    assert parsed["laps"][0]["speed"] == pytest.approx(200 / 60)
    assert not (tmp_path.parent / "escape.tcx").exists()


def test_archive_expansion_is_bounded():
    data = io.BytesIO()
    with zipfile.ZipFile(data, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for n in range(13):
            z.writestr(f"{n}.fit", b"invalid")
    with pytest.raises(ValueError, match="safe extraction"):
        parse_original(data.getvalue())
