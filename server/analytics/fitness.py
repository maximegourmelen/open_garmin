"""Evidence-based, plain-language signs of improving fitness."""

from __future__ import annotations

from datetime import date, timedelta

from .common import rolling_median, safe_div


def _between(day: str | None, first: date, last: date) -> bool:
    return bool(day and first.isoformat() <= day <= last.isoformat())


def resting_hr_signal(daily: list[dict], today: date) -> dict:
    before_days = [
        item["resting_hr"]
        for item in daily
        if _between(item.get("date"), today - timedelta(days=56), today - timedelta(days=43))
        and item.get("resting_hr") is not None
    ]
    after_days = [
        item["resting_hr"]
        for item in daily
        if _between(item.get("date"), today - timedelta(days=13), today)
        and item.get("resting_hr") is not None
    ]
    before = rolling_median(before_days, 10)
    after = rolling_median(after_days, 10)
    if before is None or after is None:
        status, sentence = (
            "insufficient",
            "A few more weeks of resting heart-rate readings will help show a trend.",
        )
    else:
        difference = after - before
        if difference <= -2:
            status = "improving"
            sentence = (
                f"Your resting heart rate is {abs(round(difference))} bpm lower than six weeks ago. "
                "A lower resting heart rate often comes with better fitness."
            )
        elif difference >= 2:
            status = "declining"
            sentence = "A little higher than six weeks ago — sleep, stress, heat or a cold can do this too."
        else:
            status, sentence = "steady", "Your resting heart rate is staying fairly steady."
    return {
        "id": "resting_hr",
        "status": status,
        "sentence": sentence,
        "before": before,
        "after": after,
        "unit": "bpm",
        "n_before": len(before_days),
        "n_after": len(after_days),
        "source": "calculated",
        "method": "rhr_trend@1",
    }


def efficiency_signal(activities: list[dict], today: date) -> dict:
    recent = [
        item
        for item in activities
        if not item.get("parent_id")
        and item.get("sport") in ("walking", "running")
        and _between(item.get("date"), today - timedelta(days=55), today)
    ]
    counts = {sport: sum(item.get("sport") == sport for item in recent) for sport in ("walking", "running")}
    sport = max(counts, key=counts.get) if recent else None
    eligible = [
        item
        for item in recent
        if item.get("sport") == sport
        and (item.get("duration") or 0) >= 900
        and item.get("average_hr") is not None
        and item.get("distance") is not None
        and (item.get("gap_speed") is not None or item.get("average_speed") is not None)
    ]

    def values(first: date, last: date) -> list[float]:
        return [
            (item.get("gap_speed") or item["average_speed"]) * 60 / item["average_hr"]
            for item in eligible
            if _between(item.get("date"), first, last) and item["average_hr"] > 0
        ]

    earlier = values(today - timedelta(days=55), today - timedelta(days=28))
    later = values(today - timedelta(days=27), today)
    before = rolling_median(earlier, 3)
    after = rolling_median(later, 3)
    pct = safe_div((after - before) * 100, before) if before is not None and after is not None else None
    if pct is None:
        status, sentence = (
            "insufficient",
            "A few more walks or runs with heart-rate data will help show a trend.",
        )
    elif pct >= 3:
        status, sentence = (
            "improving",
            (
                f"You're covering {round(pct)}% more ground per heartbeat than a month ago — "
                "your heart is getting more efficient."
            ),
        )
    elif pct <= -3:
        status, sentence = (
            "declining",
            "Distance per heartbeat is a little lower lately. Heat, hills and tired legs can affect it.",
        )
    else:
        status, sentence = "steady", "Your distance per heartbeat is staying steady."
    return {
        "id": "efficiency",
        "status": status,
        "sentence": sentence,
        "before": round(before, 3) if before is not None else None,
        "after": round(after, 3) if after is not None else None,
        "unit": "m/beat",
        "n_before": len(earlier),
        "n_after": len(later),
        "sport": sport,
        "source": "calculated",
        "method": "efficiency_trend@1",
    }


def longest_signal(activities: list[dict], today: date) -> dict:
    rows = [item for item in activities if not item.get("parent_id") and item.get("duration") is not None]
    before = [
        item["duration"]
        for item in rows
        if _between(item.get("date"), today - timedelta(days=55), today - timedelta(days=28))
    ]
    after = [
        item["duration"] for item in rows if _between(item.get("date"), today - timedelta(days=27), today)
    ]
    before_max, after_max = max(before) if before else None, max(after) if after else None
    if before_max is None or after_max is None or before_max <= 0:
        status, sentence = (
            "insufficient",
            "Keep moving in ways you enjoy; your longer sessions will appear here.",
        )
    elif after_max >= before_max * 1.10:
        status, sentence = (
            "improving",
            f"Your longest session grew from {round(before_max / 60)} to {round(after_max / 60)} minutes.",
        )
    elif after_max < before_max * 0.9:
        status, sentence = (
            "declining",
            "Your longest session was shorter this month. Easier weeks are part of progress.",
        )
    else:
        status, sentence = "steady", "Your longest sessions are holding steady."
    return {
        "id": "longest",
        "status": status,
        "sentence": sentence,
        "before": before_max,
        "after": after_max,
        "unit": "s",
        "n_before": len(before),
        "n_after": len(after),
        "source": "calculated",
        "method": "longest_trend@1",
    }


def vo2max_signal(activities: list[dict], today: date) -> dict:
    rows = sorted(
        (item for item in activities if item.get("vo2max") is not None and item.get("date")),
        key=lambda item: item["date"],
    )
    latest = rows[-1] if rows else None
    earlier = [
        item
        for item in rows[:-1]
        if latest
        and _between(
            item["date"],
            date.fromisoformat(latest["date"]) - timedelta(days=56),
            date.fromisoformat(latest["date"]) - timedelta(days=28),
        )
    ]
    baseline = earlier[-1] if earlier else None
    if not latest or not baseline:
        status, sentence = "insufficient", "Garmin has not reported enough VO₂ max readings for a trend."
    else:
        difference = latest["vo2max"] - baseline["vo2max"]
        if difference >= 1:
            status, sentence = "improving", "Garmin's VO₂ max estimate has risen since last month."
        elif difference <= -1:
            status, sentence = (
                "declining",
                "Garmin's VO₂ max estimate is a little lower lately. It can vary with conditions.",
            )
        else:
            status, sentence = "steady", "Garmin's VO₂ max estimate is holding steady."
    return {
        "id": "vo2max",
        "status": status,
        "sentence": sentence,
        "before": baseline["vo2max"] if baseline else None,
        "after": latest["vo2max"] if latest else None,
        "unit": "ml/kg/min",
        "n_before": len(earlier),
        "n_after": 1 if latest else 0,
        "source": "garmin",
        "method": "vo2max_trend@1",
    }


def consistency_signal(activities: list[dict], today: date) -> dict:
    days = {item["date"] for item in activities if item.get("date") and not item.get("parent_id")}
    before = sum(_between(day, today - timedelta(days=55), today - timedelta(days=28)) for day in days)
    after = sum(_between(day, today - timedelta(days=27), today) for day in days)
    status = "improving" if after >= before + 2 else "declining" if after < before - 2 else "steady"
    return {
        "id": "consistency",
        "status": status,
        "sentence": f"You moved on {after} days in the last four weeks. Every day you chose to move counts.",
        "before": before,
        "after": after,
        "unit": "days",
        "n_before": before,
        "n_after": after,
        "source": "calculated",
        "method": "consistency_trend@1",
    }


def fitness_signals(activities: list[dict], daily: list[dict], today: date) -> list[dict]:
    signals = [
        resting_hr_signal(daily, today),
        efficiency_signal(activities, today),
        longest_signal(activities, today),
        vo2max_signal(activities, today),
    ]
    available = [signal for signal in signals if signal["status"] != "insufficient"]
    if len(available) < 2:
        available.append(consistency_signal(activities, today))
    return available[:4]
