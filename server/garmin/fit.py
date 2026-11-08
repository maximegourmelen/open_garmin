"""Read original FIT and TCX activity files safely."""

from __future__ import annotations

import io
import math
import zipfile
from datetime import datetime

import fitdecode

from .normalize import number, pick, sport_name


def parse_original(content: bytes) -> dict:
    """Decode original FIT/TCX without extracting untrusted archive paths."""
    if len(content) > 60 * 1024 * 1024:
        raise ValueError("Archive exceeds the 60 MB limit")
    if content[:2] == b"PK":
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            files = [
                f
                for f in archive.infolist()
                if not f.is_dir() and f.filename.lower().endswith((".fit", ".tcx"))
            ]
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
    sport = "other"
    device = "Garmin"
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
                sample = {
                    "time": max(0, (stamp - started).total_seconds()),
                    "distance": number(f.get("distance")),
                    "hr": number(f.get("heart_rate")),
                    "speed": number(pick(f.get("enhanced_speed"), f.get("speed"))),
                    "elevation": number(pick(f.get("enhanced_altitude"), f.get("altitude"))),
                    "power": number(f.get("power")),
                    "cadence": number(f.get("cadence")),
                    "lat": number(f.get("position_lat")),
                    "lon": number(f.get("position_long")),
                }
                for key in ("lat", "lon"):
                    if sample[key] is not None:
                        sample[key] = sample[key] * 180 / 2**31
                samples.append(sample)
            elif frame.name == "lap":
                duration = number(f.get("total_timer_time"))
                distance = number(f.get("total_distance"))
                laps.append(
                    {
                        "index": len(laps) + 1,
                        "duration": duration,
                        "distance": distance,
                        "hr": number(f.get("avg_heart_rate")),
                        "speed": number(pick(f.get("enhanced_avg_speed"), f.get("avg_speed"))),
                        "power": number(f.get("avg_power")),
                    }
                )
            elif frame.name == "set":
                sets.append(
                    {
                        "index": len(sets) + 1,
                        "type": str(f.get("set_type") or "unknown"),
                        "reps": number(f.get("repetitions")),
                        "weight": number(f.get("weight")),
                        "duration": number(f.get("duration")),
                        "exercise": str(f.get("category") or "Exercise"),
                    }
                )
            elif frame.name == "event":
                events.append({"event": str(f.get("event")), "type": str(f.get("event_type"))})
            elif frame.name == "session":
                sport = sport_name(f.get("sport") or f.get("sub_sport") or sport)
                for field in frame.fields:
                    value = number(field.value)
                    if value is not None and not field.name.startswith("unknown"):
                        session_metrics.append(
                            {
                                "name": field.name,
                                "value": value,
                                "unit": field.units or "",
                                "source": "original_fit",
                            }
                        )
            elif frame.name == "device_info":
                product = f.get("product_name") or f.get("garmin_product")
                if product:
                    device = f"Garmin {str(product)[:80]}"
    if len(samples) > 6000:
        # Keep temporal endpoints; originals remain available for full-resolution export.
        step = math.ceil(len(samples) / 6000)
        samples = samples[::step] + ([samples[-1]] if (len(samples) - 1) % step else [])
    return {
        "samples": samples,
        "laps": laps,
        "sets": sets,
        "events": events,
        "session_metrics": session_metrics,
        "detail_state": "ready",
        "sample_resolution": "Original samples; downsampled for display above 6,000 points",
        "recorded_start": started.isoformat() if started else None,
        "recorded_sport": sport,
        "recorded_device": device,
    }


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
        samples.append(
            {
                "time": (stamp - started).total_seconds(),
                "distance": val(node, "t:DistanceMeters"),
                "hr": val(node, "t:HeartRateBpm/t:Value"),
                "lat": val(node, "t:Position/t:LatitudeDegrees"),
                "lon": val(node, "t:Position/t:LongitudeDegrees"),
                "elevation": val(node, "t:AltitudeMeters"),
                "cadence": val(node, "t:Cadence"),
                "speed": None,
                "power": None,
            }
        )
    for node in root.findall(".//t:Lap", ns):
        seconds, distance = val(node, "t:TotalTimeSeconds"), val(node, "t:DistanceMeters")
        laps.append(
            {
                "index": len(laps) + 1,
                "duration": seconds,
                "distance": distance,
                "speed": distance / seconds if distance is not None and seconds else None,
                "hr": val(node, "t:AverageHeartRateBpm/t:Value"),
                "power": None,
            }
        )
    return {"samples": samples, "laps": laps, "sets": [], "detail_state": "ready"}
