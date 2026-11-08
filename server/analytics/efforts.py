"""Personal best candidates and cautious 5K estimates."""

from __future__ import annotations

from datetime import date, timedelta

from .common import week_start


def collect_best_efforts(activities: list[dict]) -> list[dict]:
    """Create one candidate per activity, kind and week from plain activity dicts."""
    candidates = []
    week_minutes: dict[str, float] = {}
    for item in activities:
        activity = item.get("activity", item)
        derived = item.get("derived", {})
        if activity.get("parent_id"):
            continue
        activity_id = activity.get("id")
        day = activity.get("date")
        sport = activity.get("sport", "other")
        if not activity_id or not day:
            continue
        for kind, effort in derived.get("best_efforts", {}).items():
            if effort.get("time_s") is None:
                continue
            candidates.append(
                {
                    "activity_id": activity_id,
                    "kind": kind,
                    "date": day,
                    "sport": sport,
                    "value": effort["time_s"],
                    "source": effort.get("source", "calculated"),
                    "start_offset_s": effort.get("start_offset_s"),
                }
            )
        for kind, value in (
            (f"longest:distance:{sport}", activity.get("distance")),
            ("longest:duration", activity.get("duration")),
        ):
            if value is not None:
                candidates.append(
                    {
                        "activity_id": activity_id,
                        "kind": kind,
                        "date": day,
                        "sport": sport,
                        "value": value,
                        "source": "garmin" if activity.get("source") == "garmin" else "calculated",
                        "start_offset_s": None,
                    }
                )
        if activity.get("duration") is not None:
            week = week_start(day)
            week_minutes[week] = week_minutes.get(week, 0.0) + activity["duration"] / 60
    for week, minutes in week_minutes.items():
        candidates.append(
            {
                "activity_id": f"week:{week}",
                "kind": "most_active_week",
                "date": week,
                "sport": "other",
                "value": round(minutes, 1),
                "source": "calculated",
                "start_offset_s": None,
            }
        )
    return candidates


def bests(candidates: list[dict], today: date) -> dict:
    """Return all-time and last-90-day records for each kind."""
    recent_start = today - timedelta(days=89)
    new_start = today - timedelta(days=13)
    grouped: dict[str, list[dict]] = {}
    for candidate in candidates:
        grouped.setdefault(candidate["kind"], []).append(candidate)
    results = []
    for kind, rows in sorted(grouped.items()):
        reverse = not kind.startswith("distance:")
        ordered = sorted(rows, key=lambda row: (row["value"], row["date"]), reverse=reverse)
        all_time = ordered[0]
        recent = next(
            (row for row in ordered if recent_start.isoformat() <= row["date"] <= today.isoformat()), None
        )
        results.append(
            {
                "kind": kind,
                "all_time": {**all_time, "is_new": all_time["date"] >= new_start.isoformat()},
                "recent_90": {**recent, "is_new": recent["date"] >= new_start.isoformat()}
                if recent
                else None,
            }
        )
    return {"items": results, "source": "calculated", "method": "bests@1", "n": len(candidates)}


def five_k_estimate(candidates: list[dict], today: date) -> dict:
    cutoff = today - timedelta(days=89)
    options = []
    for item in candidates:
        if (
            not item["kind"].startswith("distance:")
            or not cutoff.isoformat() <= item["date"] <= today.isoformat()
        ):
            continue
        distance = float(item["kind"].split(":", 1)[1])
        if not 3000 <= distance <= 10000 or item["value"] < 600:
            continue
        predicted = item["value"] * (5000 / distance) ** 1.06
        options.append((predicted, item))
    if not options:
        return {
            "seconds": None,
            "based_on": None,
            "sentence": "Not enough recent effort data for an estimate.",
            "source": "calculated",
            "method": "five_k_estimate@1",
        }
    seconds, best = min(options, key=lambda entry: entry[0])
    rounded = round(seconds)
    clock = f"{rounded // 60}:{rounded % 60:02}"
    return {
        "seconds": round(seconds, 1),
        "based_on": {"kind": best["kind"], "activity_id": best["activity_id"], "date": best["date"]},
        "sentence": (
            f"About {clock} — an estimate based on your best recent effort. "
            "Training runs are usually slower than races."
        ),
        "source": "calculated",
        "method": "five_k_estimate@1",
    }
