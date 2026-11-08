"""Heart-rate zone time, effort points, and four-week intensity mix."""

from __future__ import annotations

from datetime import date, timedelta

from .common import safe_div

ZONE_BOUNDS = (0.50, 0.60, 0.70, 0.80, 0.90)


def estimate_max_hr(activities: list[dict], today: date) -> int | None:
    cutoff = today - timedelta(days=365)
    observed = [
        item["max_hr"]
        for item in activities
        if item.get("max_hr") is not None
        and item.get("date")
        and cutoff.isoformat() <= item["date"] <= today.isoformat()
    ]
    return round(max(observed)) if len(observed) >= 5 else None


def activity_zones(
    activity: dict,
    samples: list[dict] | None = None,
    prefs: dict | None = None,
    estimated_max_hr: int | None = None,
) -> dict:
    """Return zone minutes and provenance for a single activity."""
    prefs = prefs or {}
    reported = activity.get("zones") or []
    if prefs.get("zone_source", "garmin") == "garmin" and any(value is not None for value in reported):
        minutes = [round(value / 60, 3) if value is not None else None for value in reported[:5]]
        minutes += [None] * (5 - len(minutes))
        return {"zone_minutes": minutes, "source": "garmin", "method": None}
    max_hr = prefs.get("max_hr") if prefs.get("zone_source") == "custom" else estimated_max_hr
    if not max_hr or not samples or len(samples) < 2:
        return {"zone_minutes": None, "source": "calculated", "method": "zones_from_samples@1"}
    seconds = [0.0] * 5
    pairs = 0
    for left, right in zip(samples, samples[1:], strict=False):
        hr = left.get("hr")
        t0, t1 = left.get("time"), right.get("time")
        if hr is None or t0 is None or t1 is None or t1 <= t0:
            continue
        fraction = hr / max_hr
        zone = next((i for i in range(4, -1, -1) if fraction >= ZONE_BOUNDS[i]), None)
        if zone is None:
            continue
        seconds[zone] += min(t1 - t0, 10)
        pairs += 1
    if not pairs:
        return {"zone_minutes": None, "source": "calculated", "method": "zones_from_samples@1"}
    return {
        "zone_minutes": [round(value / 60, 3) for value in seconds],
        "source": "calculated",
        "method": "zones_from_samples@1",
    }


def effort_points(zone_minutes: list[float | None] | None) -> dict:
    if zone_minutes is None or len(zone_minutes) != 5 or any(value is None for value in zone_minutes):
        points = None
    else:
        points = round(sum(value * (index + 1) for index, value in enumerate(zone_minutes)))
    return {"effort_points": points, "source": "calculated", "method": "effort_points@1"}


def intensity_mix(activities: list[dict], today: date) -> dict:
    first = today - timedelta(days=27)
    buckets = [0.0, 0.0, 0.0]
    covered = 0
    for item in activities:
        if item.get("parent_id") or not first.isoformat() <= item.get("date", "") <= today.isoformat():
            continue
        zones = item.get("zone_minutes")
        if not zones or any(value is None for value in zones):
            continue
        buckets[0] += zones[0] + zones[1]
        buckets[1] += zones[2]
        buckets[2] += zones[3] + zones[4]
        covered += 1
    total = sum(buckets)
    percentages = [round(safe_div(value * 100, total), 1) if total else None for value in buckets]
    if total < 60:
        sentence = "Not enough zone data yet."
    elif percentages[0] >= 70:
        sentence = "Mostly easy — that's how fitness is built for most people."
    elif percentages[2] >= 30:
        sentence = "Lots of hard minutes lately. Mixing in easy days helps you recover."
    else:
        sentence = "A mix of easy and moderate effort."
    return {
        "easy_minutes": round(buckets[0], 1),
        "moderate_minutes": round(buckets[1], 1),
        "hard_minutes": round(buckets[2], 1),
        "percentages": percentages,
        "sentence": sentence,
        "n": covered,
        "window": {"from": first.isoformat(), "to": today.isoformat()},
        "source": "calculated",
        "method": "intensity_mix@1",
    }
