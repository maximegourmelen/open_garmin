"""Documented Personal API transport and loss-aware normalization.

The small token exchange is implemented here to keep credentials in the app's
encrypted per-user store rather than the reference client's shared file cache.
No Garmin SSO, passwords, or undocumented Connect endpoints are used.
"""
from __future__ import annotations

import base64
import io
import json
import math
import time
import zipfile
from datetime import date, datetime, timedelta, timezone

import fitdecode
import httpx

TOKEN_PATH = "/personalapitoken-service/personal-api/personal-api-key/token"


class GarminError(Exception):
    def __init__(self, message: str, status: int = 502, retry_after: int | None = None):
        super().__init__(message)
        self.status = status
        self.retry_after = retry_after


class GarminClient:
    def __init__(self, key: str, region: str = "com", transport=None):
        if region not in ("com", "cn"):
            raise ValueError("Unknown Garmin region")
        self.key = key
        self.token: str | None = None
        self.expires = 0.0
        self.http = httpx.Client(base_url=f"https://personal.connectapi.garmin.{region}", timeout=30, transport=transport, follow_redirects=False)

    def close(self):
        self.http.close()

    def _check(self, response: httpx.Response):
        if response.is_success:
            return
        status = response.status_code
        if status == 429:
            value = response.headers.get("Retry-After", "")
            delay = int(value) if value.isdigit() else 60
            raise GarminError("Garmin is limiting requests. Your imported data is still available; try syncing later.", 429, delay)
        if status == 401:
            raise GarminError("Garmin did not accept the key. It may have expired or been revoked. Replace it in Settings.", 401)
        if status == 403:
            raise GarminError("Garmin refused access to this resource. Your saved data is still available.", 403)
        if status == 404:
            raise GarminError("This data is not available from Garmin.", 404)
        raise GarminError(f"Garmin returned HTTP {status}. Try again later.", status if status in (400, 422) else 502)

    def authenticate(self):
        try:
            response = self.http.post(TOKEN_PATH, headers={"Authorization": f"ApiKey {self.key}"})
            self._check(response)
            token = response.text.strip().strip('"')
            if response.headers.get("content-type", "").startswith("application/json"):
                try:
                    body = response.json()
                    if isinstance(body, dict):
                        token = body.get("access_token") or body.get("accessToken") or ""
                except ValueError:
                    pass
            if not token or len(token) > 20000:
                raise GarminError("Garmin returned an invalid access token.")
            try:
                payload = token.split(".")[1]
                expiry = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))["exp"]
                self.expires = float(expiry)
            except (ValueError, KeyError, IndexError, TypeError):
                raise GarminError("Garmin returned an invalid access token.") from None
            self.token = token
        except httpx.RequestError:
            raise GarminError("Could not reach Garmin. Check your internet connection and try again.") from None

    def get(self, path: str, params: dict | None = None, binary: bool = False):
        if not self.token or self.expires < time.time() + 60:
            self.authenticate()
        try:
            for attempt in range(2):
                with self.http.stream("GET", path, params=params, headers={"Authorization": f"Bearer {self.token}", "Accept": "application/zip, application/x-zip-compressed, application/octet-stream" if binary else "application/json"}) as response:
                    if response.status_code == 401 and attempt == 0:
                        self.authenticate()
                        continue
                    self._check(response)
                    limit = (60 if binary else 20) * 1024 * 1024
                    pieces, size = [], 0
                    for piece in response.iter_bytes():
                        size += len(piece)
                        if size > limit:
                            raise GarminError("The Garmin response exceeds this import's size limit.")
                        pieces.append(piece)
                    content = b"".join(pieces)
                if binary:
                    return content
                if not content:
                    return None
                try:
                    return json.loads(content)
                except ValueError:
                    raise GarminError("Garmin returned an unexpected response. No data was replaced.") from None
        except httpx.RequestError:
            raise GarminError("Could not reach Garmin. Your imported data is still available.") from None


def number(value):
    if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value):
        return value
    return None


def pick(*values):
    return next((v for v in values if v is not None), None)


def sport_name(key: str) -> str:
    key = str(key or "other").lower()
    if any(v in key for v in ("running", "treadmill", "trail_run", "virtual_run")):
        return "running"
    if any(v in key for v in ("cycling", "biking", "gravel", "mountain_bike")):
        return "cycling"
    if any(v in key for v in ("strength", "weight", "functional")):
        return "strength"
    if "swim" in key:
        return "swimming"
    if "walk" in key or "hiking" in key:
        return "walking"
    return "other"


def normalize_activity(raw: dict) -> dict:
    summary = raw.get("summaryDTO") or raw
    typ = raw.get("activityTypeDTO") or raw.get("activityType") or {}
    kind = typ.get("typeKey") if isinstance(typ, dict) else str(typ)
    start = summary.get("startTimeLocal") or raw.get("startTimeLocal") or summary.get("startTimeGMT") or ""
    result = {
        "id": str(raw.get("activityId") or ""), "name": raw.get("activityName") or "Untitled activity",
        "sport": sport_name(kind), "type": kind or "other", "start": start,
        "start_utc": summary.get("startTimeGMT") or raw.get("startTimeGMT"), "date": start[:10],
        "distance": number(summary.get("distance")), "duration": number(summary.get("duration")),
        "elapsed": number(summary.get("elapsedDuration")), "moving": number(summary.get("movingDuration")),
        "average_hr": number(pick(summary.get("averageHR"), summary.get("average_hr"))),
        "max_hr": number(summary.get("maxHR")), "average_speed": number(summary.get("averageSpeed")),
        "elevation": number(summary.get("elevationGain")), "calories": number(summary.get("calories")),
        "power": number(pick(summary.get("averagePower"), summary.get("avgPower"))),
        "cadence": number(pick(summary.get("averageRunCadence"), summary.get("averageRunningCadenceInStepsPerMinute"), summary.get("averageBikeCadence"))),
        "aerobic_te": number(pick(summary.get("trainingEffect"), summary.get("aerobicTrainingEffect"))),
        "anaerobic_te": number(pick(summary.get("anaerobicTrainingEffect"), summary.get("anaerobicTE"))),
        "training_load": number(summary.get("activityTrainingLoad")),
        "vo2max": number(pick(summary.get("vO2MaxValue"), summary.get("vo2MaxValue"))),
        "description": raw.get("description") or "", "parent_id": raw.get("parentId"),
        "is_parent": bool(raw.get("isMultiSportParent") or raw.get("isParent") or raw.get("parent")),
        "device": "Garmin",
        "source": "garmin", "zones": [number(summary.get(f"hrTimeInZone_{i}")) for i in range(1, 6)],
        "samples": [], "laps": [], "sets": [], "detail_state": "not_loaded",
    }
    if result["average_speed"] is None and result["distance"] is not None and result["duration"]:
        result["average_speed"] = result["distance"] / result["duration"]
    return result


def _nested(raw: dict, section: str, *fields):
    part = raw.get(section) or {}
    return next((part[name] for name in fields if isinstance(part, dict) and part.get(name) is not None), None)


def normalize_daily(raw: dict) -> dict:
    steps = _nested(raw, "movement", "totalSteps", "steps")
    if isinstance(steps, dict):
        steps = steps.get("value")
    return {
        "date": raw.get("calendarDate") or raw.get("date"),
        "steps": number(pick(raw.get("totalSteps"), steps)),
        "resting_hr": number(pick(raw.get("restingHeartRate"), _nested(raw, "heartRate", "restingHeartRate", "restingValue"))),
        "stress": number(pick(raw.get("averageStressLevel"), _nested(raw, "stress", "averageStressLevel", "averageValue", "avgLevel"))),
        "body_battery": number(pick(raw.get("bodyBatteryMostRecentValue"), _nested(raw, "bodyBattery", "latestValue", "endOfDayValue"))),
        "body_battery_high": number(pick(raw.get("bodyBatteryHighestValue"), _nested(raw, "bodyBattery", "maxValue"))),
        "calories": number(pick(raw.get("totalKilocalories"), _nested(raw, "calories", "totalKilocalories", "totalKilocalorieValue", "burnedTotal"))),
        "respiration": number(pick(raw.get("avgWakingRespirationValue"), _nested(raw, "respiration", "avgWakingRespirationValue", "averageValue", "avgValue"))),
        "sleep_seconds": None, "sleep_score": None, "sleep_need": None, "hrv": None,
        "hrv_status": None, "source": "garmin",
    }


def sleep_values(raw: dict) -> dict:
    raw = raw.get("dailySleepDTO") or raw
    scores = raw.get("sleepScores") or {}
    overall = scores.get("overall") or scores.get("overallScore") or {}
    need = raw.get("sleepNeed") or {}
    return {"sleep_seconds": number(raw.get("sleepTimeSeconds")), "sleep_score": number(overall.get("value") if isinstance(overall, dict) else overall),
            "sleep_need": number(need.get("actual")) if isinstance(need, dict) else None,
            "sleep_start": raw.get("sleepStartTimestampLocal"), "sleep_end": raw.get("sleepEndTimestampLocal"),
            "deep_seconds": number(raw.get("deepSleepSeconds")), "rem_seconds": number(raw.get("remSleepSeconds")),
            "light_seconds": number(raw.get("lightSleepSeconds")), "awake_seconds": number(raw.get("awakeSleepSeconds")),
            "sleep_respiration": number(raw.get("averageRespirationValue"))}


def chunks(start: date, end: date, size: int):
    while start <= end:
        until = min(end, start + timedelta(days=size - 1))
        yield start.isoformat(), until.isoformat()
        start = until + timedelta(days=1)


def parse_original(content: bytes) -> dict:
    """Decode original FIT/TCX without extracting untrusted archive paths."""
    if len(content) > 60 * 1024 * 1024:
        raise ValueError("Archive exceeds the 60 MB limit")
    if content[:2] == b"PK":
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            files = [f for f in archive.infolist() if not f.is_dir() and f.filename.lower().endswith((".fit", ".tcx"))]
            if len(files) > 12 or sum(f.file_size for f in archive.infolist()) > 100 * 1024 * 1024:
                raise ValueError("Archive exceeds safe extraction limits")
            if not files:
                raise ValueError("No FIT or TCX activity in the original archive")
            # The container can include extra files; select the main activity file.
            original = max(files, key=lambda f: f.file_size)
            data = archive.read(original)
            suffix = original.filename.lower().rsplit(".", 1)[-1]
    else:
        data, suffix = content, "fit"
    if suffix == "tcx":
        return parse_tcx(data)
    samples, laps, sets, events, session_metrics = [], [], [], [], []
    started = None
    with fitdecode.FitReader(io.BytesIO(data), check_crc=fitdecode.CrcCheck.WARN) as reader:
        for frame in reader:
            if not isinstance(frame, fitdecode.FitDataMessage):
                continue
            f = {x.name: x.value for x in frame.fields}
            if frame.name == "record":
                stamp = f.get("timestamp")
                if not isinstance(stamp, datetime):
                    continue
                started = started or stamp
                sample = {"time": max(0, (stamp - started).total_seconds()), "distance": number(f.get("distance")),
                          "hr": number(f.get("heart_rate")), "speed": number(pick(f.get("enhanced_speed"), f.get("speed"))),
                          "elevation": number(pick(f.get("enhanced_altitude"), f.get("altitude"))),
                          "power": number(f.get("power")), "cadence": number(f.get("cadence")),
                          "lat": number(f.get("position_lat")), "lon": number(f.get("position_long"))}
                for key in ("lat", "lon"):
                    if sample[key] is not None:
                        sample[key] = sample[key] * 180 / 2**31
                samples.append(sample)
            elif frame.name == "lap":
                duration = number(f.get("total_timer_time"))
                distance = number(f.get("total_distance"))
                laps.append({"index": len(laps) + 1, "duration": duration, "distance": distance,
                             "hr": number(f.get("avg_heart_rate")), "speed": number(pick(f.get("enhanced_avg_speed"), f.get("avg_speed"))),
                             "power": number(f.get("avg_power"))})
            elif frame.name == "set":
                sets.append({"index": len(sets) + 1, "type": str(f.get("set_type") or "unknown"),
                             "reps": number(f.get("repetitions")), "weight": number(f.get("weight")),
                             "duration": number(f.get("duration")), "exercise": str(f.get("category") or "Exercise")})
            elif frame.name == "event":
                events.append({"event": str(f.get("event")), "type": str(f.get("event_type"))})
            elif frame.name == "session":
                for field in frame.fields:
                    value = number(field.value)
                    if value is not None and not field.name.startswith("unknown"):
                        session_metrics.append({"name": field.name, "value": value, "unit": field.units or "", "source": "original_fit"})
    if len(samples) > 6000:
        # Keep temporal endpoints; originals remain available for full-resolution export.
        step = math.ceil(len(samples) / 6000)
        samples = samples[::step] + ([samples[-1]] if (len(samples) - 1) % step else [])
    return {"samples": samples, "laps": laps, "sets": sets, "events": events, "session_metrics": session_metrics, "detail_state": "ready", "sample_resolution": "Original samples; downsampled for display above 6,000 points"}


def parse_tcx(data: bytes) -> dict:
    from xml.etree import ElementTree as ET
    if len(data) > 30 * 1024 * 1024 or b"<!DOCTYPE" in data.upper() or b"<!ENTITY" in data.upper():
        raise ValueError("Unsupported TCX document")
    root = ET.fromstring(data)
    ns = {"t": "http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"}
    samples, laps = [], []
    started = None
    def val(node, path):
        text = node.findtext(path, namespaces=ns)
        try:
            return float(text) if text is not None else None
        except ValueError:
            return None
    for node in root.findall(".//t:Trackpoint", ns):
        text = node.findtext("t:Time", namespaces=ns)
        if not text:
            continue
        stamp = datetime.fromisoformat(text.replace("Z", "+00:00"))
        started = started or stamp
        samples.append({"time": (stamp - started).total_seconds(), "distance": val(node, "t:DistanceMeters"),
                        "hr": val(node, "t:HeartRateBpm/t:Value"), "lat": val(node, "t:Position/t:LatitudeDegrees"),
                        "lon": val(node, "t:Position/t:LongitudeDegrees"), "elevation": val(node, "t:AltitudeMeters"),
                        "cadence": val(node, "t:Cadence"), "speed": None, "power": None})
    for node in root.findall(".//t:Lap", ns):
        seconds, distance = val(node, "t:TotalTimeSeconds"), val(node, "t:DistanceMeters")
        laps.append({"index": len(laps) + 1, "duration": seconds, "distance": distance,
                     "speed": distance / seconds if distance is not None and seconds else None,
                     "hr": val(node, "t:AverageHeartRateBpm/t:Value"), "power": None})
    return {"samples": samples, "laps": laps, "sets": [], "detail_state": "ready"}
