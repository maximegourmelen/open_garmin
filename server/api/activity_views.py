"""Present normalized activities and their app-calculated details."""

from __future__ import annotations

from ..analytics.common import downsample_samples
from ..copy.sentences import activity_summary

STREAM_CHANNELS = ("time", "distance", "hr", "speed", "elevation", "cadence_spm", "power", "lat", "lon")


def summary(data: dict, derived: dict | None = None) -> dict:
    derived = derived or {}
    return {
        "id": data.get("id", ""),
        "name": data.get("name", "Untitled activity"),
        "sport": data.get("sport", "other"),
        "type": data.get("type", "other"),
        "date": data.get("date", ""),
        "start": data.get("start", ""),
        "distance": data.get("distance"),
        "duration": data.get("duration"),
        "average_speed": data.get("average_speed"),
        "gap_speed": data.get("gap_speed"),
        "average_hr": data.get("average_hr"),
        "elevation": data.get("elevation"),
        "effort_points": derived.get("effort_points"),
        "zone_minutes": derived.get("zone_minutes"),
        "has_route": bool(
            data.get("has_route")
            or sum(
                1
                for sample in data.get("samples", [])
                if sample.get("lat") is not None and sample.get("lon") is not None
            )
            >= 2
        ),
        "detail_state": data.get("detail_state", "not_loaded"),
        "location_name": data.get("location_name"),
        "is_best": bool(derived.get("is_best", False)),
        "device": data.get("device", "Garmin"),
        "source": data.get("source", "garmin"),
    }


def streams(samples: list[dict]) -> dict | None:
    if not samples:
        return None
    displayed = downsample_samples(samples)
    positions = {id(sample): index for index, sample in enumerate(samples)}
    result = {"index": [positions[id(sample)] for sample in displayed]}
    for channel in STREAM_CHANNELS:
        result[channel] = [sample.get(channel) for sample in displayed]
    return result


def detail(
    data: dict,
    derived: dict | None,
    samples: list[dict],
    note: dict | None,
    milestones: list[dict] | None = None,
) -> dict:
    derived = derived or {}
    base = summary(data, derived)
    zone_minutes = derived.get("zone_minutes")
    companion = derived.get("summary") or activity_summary(data, None)
    result = {
        **data,
        **base,
        "elapsed": data.get("elapsed"),
        "moving": data.get("moving"),
        "max_hr": data.get("max_hr"),
        "max_speed": data.get("max_speed"),
        "calories": data.get("calories"),
        "steps": data.get("steps"),
        "cadence_spm": data.get("cadence_spm"),
        "cadence_rpm": data.get("cadence_rpm"),
        "power": data.get("power"),
        "normalized_power": data.get("normalized_power"),
        "max_power": data.get("max_power"),
        "elevation_loss": data.get("elevation_loss"),
        "temperature_min": data.get("temperature_min"),
        "temperature_max": data.get("temperature_max"),
        "aerobic_te": data.get("aerobic_te"),
        "anaerobic_te": data.get("anaerobic_te"),
        "te_label": data.get("te_label"),
        "body_battery_impact": data.get("body_battery_impact"),
        "vo2max": data.get("vo2max"),
        "running_form": {
            "stride_length_m": data.get("stride_length_m"),
            "ground_contact_ms": data.get("ground_contact_ms"),
            "vertical_oscillation_cm": data.get("vertical_oscillation_cm"),
            "vertical_ratio_pct": data.get("vertical_ratio_pct"),
        }
        if data.get("sport") in ("running", "walking", "hiking")
        else None,
        "zone_details": {"minutes": zone_minutes, "source": derived.get("zone_source", "garmin")}
        if zone_minutes
        else None,
        "power_zones": data.get("power_zones"),
        "streams": streams(samples),
        "splits_km": derived.get("splits_km", []),
        "splits_mi": derived.get("splits_mi", []),
        "laps": data.get("laps", []),
        "sets": data.get("sets", []),
        "best_efforts": [
            {
                "kind": kind,
                "label": kind.replace("distance:", "") + " m",
                "time_s": value["time_s"],
                "is_pb": False,
                "source": value["source"],
            }
            for kind, value in derived.get("best_efforts", {}).items()
        ],
        "efficiency": derived.get("efficiency"),
        "summary": {
            "id": "activity_summary",
            "text": companion["text"],
            "pose": "proud",
            "data_refs": ["effort_points"] if derived.get("effort_points") is not None else [],
        },
        "milestones": milestones or [],
        "note": note or {"text": "", "rpe": None, "feel": None, "tags": []},
        "watch_feel": data.get("watch_feel"),
        "watch_rpe": data.get("watch_rpe"),
        "session_metrics": data.get("session_metrics", []),
        "effort_source": "calculated" if derived else None,
        "effort_method": "effort_points@1" if derived else None,
        "samples": downsample_samples(samples),
        "sample_count": data.get("sample_count", len(samples)),
    }
    return result
