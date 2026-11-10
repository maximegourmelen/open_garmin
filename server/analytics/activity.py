"""Per-activity splits, best efforts, efficiency and a friendly summary."""

from __future__ import annotations

import statistics

from ..copy.sentences import activity_summary
from .common import safe_div

EFFORT_DISTANCES = (1000.0, 1609.344, 5000.0, 10000.0, 21097.5)


def _distance_points(samples: list[dict]) -> list[dict]:
    valid = []
    previous = -1.0
    for sample in samples:
        distance, elapsed = sample.get("distance"), sample.get("time")
        if distance is None or elapsed is None or distance < previous:
            continue
        if valid and (distance == previous or elapsed <= valid[-1]["time"]):
            continue
        valid.append(sample)
        previous = distance
    return valid


def _time_at(points: list[dict], distance: float) -> float | None:
    if not points or distance < points[0]["distance"] or distance > points[-1]["distance"]:
        return None
    for left, right in zip(points, points[1:], strict=False):
        if left["distance"] <= distance <= right["distance"]:
            fraction = (distance - left["distance"]) / (right["distance"] - left["distance"])
            return left["time"] + fraction * (right["time"] - left["time"])
    return points[0]["time"] if distance == points[0]["distance"] else None


def _smoothed_elevation(points: list[dict]) -> list[float | None]:
    elevations = [point.get("elevation") for point in points]
    smoothed = []
    for index in range(len(points)):
        window = [value for value in elevations[max(0, index - 2) : index + 3] if value is not None]
        smoothed.append(statistics.mean(window) if window else None)
    return smoothed


def splits(samples: list[dict], length_m: float) -> list[dict]:
    """Interpolate exact split boundaries; retain a final partial of at least 100 m."""
    points = _distance_points(samples)
    if len(points) < 2:
        return []
    base = points[0]["distance"]
    end = points[-1]["distance"]
    elevations = _smoothed_elevation(points)
    result = []
    start = base
    while end - start >= 100:
        finish = min(end, start + length_m)
        start_time, end_time = _time_at(points, start), _time_at(points, finish)
        if start_time is None or end_time is None or end_time <= start_time:
            break
        subset = [point for point in points if start <= point["distance"] <= finish]
        hearts = [point["hr"] for point in subset if point.get("hr") is not None]
        cadence = [point["cadence_spm"] for point in subset if point.get("cadence_spm") is not None]
        gain = loss = 0.0
        elevation_pairs = 0
        for index in range(1, len(points)):
            middle = (points[index - 1]["distance"] + points[index]["distance"]) / 2
            before, after = elevations[index - 1], elevations[index]
            if start <= middle <= finish and before is not None and after is not None:
                delta = after - before
                if abs(delta) >= 0.5:
                    gain += max(delta, 0)
                    loss += max(-delta, 0)
                elevation_pairs += 1
        distance = finish - start
        duration = end_time - start_time
        result.append(
            {
                "index": len(result) + 1,
                "distance_m": round(distance, 2),
                "time_s": round(duration, 2),
                "pace_s": round(duration / distance * length_m, 2),
                "avg_hr": round(statistics.mean(hearts)) if hearts else None,
                "elev_gain_m": round(gain, 1) if elevation_pairs else None,
                "elev_loss_m": round(loss, 1) if elevation_pairs else None,
                "cadence_spm": round(statistics.mean(cadence)) if cadence else None,
                "partial": distance < length_m - 0.01,
            }
        )
        start = finish
    return result


def best_efforts(samples: list[dict], sport: str, garmin_splits: dict | None = None) -> dict:
    if sport not in ("running", "walking", "hiking"):
        return {}
    points = _distance_points(samples)
    results = {}
    speed_limit = 10 if sport == "running" else 7
    if len(points) >= 2:
        for distance in EFFORT_DISTANCES:
            end = 1
            best = None
            for start in range(len(points) - 1):
                end = max(end, start + 1)
                target = points[start]["distance"] + distance
                while end < len(points) and points[end]["distance"] < target:
                    end += 1
                if end >= len(points):
                    break
                left, right = points[end - 1], points[end]
                fraction = (target - left["distance"]) / (right["distance"] - left["distance"])
                end_time = left["time"] + fraction * (right["time"] - left["time"])
                duration = end_time - points[start]["time"]
                if duration <= 0 or distance / duration > speed_limit:
                    continue
                if best is None or duration < best["time_s"]:
                    best = {
                        "time_s": round(duration, 2),
                        "start_offset_s": points[start]["time"],
                        "source": "calculated",
                    }
            if best:
                results[f"distance:{round(distance)}"] = best
    if not results and garmin_splits:
        for key, value in garmin_splits.items():
            if value is not None:
                results[f"distance:{key}"] = {"time_s": value, "start_offset_s": None, "source": "garmin"}
    return results


def efficiency(activity: dict, samples: list[dict], intensity: str | None) -> dict | None:
    speed = activity.get("gap_speed") or activity.get("average_speed")
    heart = activity.get("average_hr")
    ef = safe_div(speed * 60, heart) if speed is not None and heart is not None else None
    decoupling = None
    duration = activity.get("duration") or 0
    if activity.get("sport") == "running" and duration >= 2400 and intensity == "easy" and samples:
        measured = [
            sample for sample in samples if sample.get("hr") is not None and sample.get("speed") is not None
        ]
        if len(measured) / len(samples) >= 0.8:
            middle = (samples[0]["time"] + samples[-1]["time"]) / 2
            halves = (
                [sample for sample in measured if sample["time"] <= middle],
                [sample for sample in measured if sample["time"] > middle],
            )
            if all(halves):
                ef1, ef2 = (
                    safe_div(
                        statistics.mean(sample["speed"] for sample in half),
                        statistics.mean(sample["hr"] for sample in half),
                    )
                    for half in halves
                )
                if ef1 is not None and ef2 is not None and ef1 > 0:
                    decoupling = round((ef1 - ef2) / ef1 * 100, 1)
    return (
        {"ef": round(ef, 3) if ef is not None else None, "decoupling_pct": decoupling}
        if ef is not None or decoupling is not None
        else None
    )


def summary_sentence(
    activity: dict, intensity: str | None, is_longest: bool = False, new_best: str | None = None
) -> dict:
    return activity_summary(activity, intensity, is_longest, new_best)


def derive_activity(activity: dict, samples: list[dict], intensity: str | None) -> dict:
    return {
        "splits_km": splits(samples, 1000),
        "splits_mi": splits(samples, 1609.344),
        "best_efforts": best_efforts(
            samples, activity.get("sport", "other"), activity.get("garmin_fastest_splits")
        ),
        "efficiency": efficiency(activity, samples, intensity),
        "summary": summary_sentence(activity, intensity),
        "method": "activity_detail@1",
        "source": "calculated",
    }
