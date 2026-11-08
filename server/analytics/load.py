"""Gentle effort ramp checks and rolling effort trends."""

from __future__ import annotations

import statistics
from datetime import date, timedelta

from .common import daterange, week_start


def _daily_effort(activities: list[dict]) -> dict[str, float]:
    daily: dict[str, float] = {}
    for item in activities:
        if item.get("parent_id") or item.get("effort_points") is None or not item.get("date"):
            continue
        daily[item["date"]] = daily.get(item["date"], 0) + item["effort_points"]
    return daily


def ramp_check(activities: list[dict], today: date, start: str = "monday") -> dict:
    daily = _daily_effort(activities)
    current_start = date.fromisoformat(week_start(today, start))
    elapsed = (today - current_start).days + 1
    this_week = sum(daily.get(day.isoformat(), 0) for day in daterange(current_start, today))
    previous = []
    for weeks_ago in range(1, 5):
        first = current_start - timedelta(days=7 * weeks_ago)
        dates = [day.isoformat() for day in daterange(first, first + timedelta(days=6))]
        if any(day in daily for day in dates):
            previous.append(sum(daily.get(day, 0) for day in dates))
    if len(previous) < 3 or not statistics.mean(previous):
        return {
            "band": "building_history",
            "ratio": None,
            "this_week": round(this_week),
            "average_four_weeks": None,
            "projected": None,
            "sentence": "I need about 3 weeks of activities to compare.",
            "n": len(previous),
            "source": "calculated",
            "method": "ramp_check@1",
        }
    average = statistics.mean(previous)
    projected = this_week / elapsed * 7 if elapsed >= 4 else None
    comparable_current = projected if projected is not None else this_week
    comparable_average = average if projected is not None else average / 7 * elapsed
    ratio = comparable_current / comparable_average if comparable_average else None
    if ratio < 0.6:
        band, sentence = "lighter", "A lighter week than usual — totally fine, especially if you needed rest."
    elif ratio <= 1.3:
        band, sentence = "steady", "Right around your usual. Nice and steady."
    elif ratio <= 1.6:
        band, sentence = "building", "A bigger week than usual. Build gradually and keep some easy days."
    else:
        band, sentence = (
            "big_jump",
            "Quite a jump from your usual! Your body likes gradual increases — consider an easy day.",
        )
    return {
        "band": band,
        "ratio": round(ratio, 2),
        "this_week": round(this_week),
        "average_four_weeks": round(average),
        "projected": round(projected) if projected is not None else None,
        "sentence": sentence,
        "n": len(previous),
        "source": "calculated",
        "method": "ramp_check@1",
    }


def effort_trend(activities: list[dict], first: date, last: date) -> dict:
    daily = _daily_effort(activities)
    warmup = first - timedelta(days=27)
    series = []
    efforts = []
    for day in daterange(warmup, last):
        effort = daily.get(day.isoformat(), 0.0)
        efforts.append(effort)
        acute = statistics.mean(efforts[-7:]) if len(efforts) >= 7 else None
        chronic = statistics.mean(efforts[-28:]) if len(efforts) >= 21 else None
        ratio = acute / chronic if chronic is not None and chronic >= 5 and acute is not None else None
        if day >= first:
            series.append(
                {
                    "date": day.isoformat(),
                    "effort": round(effort, 1),
                    "acute": round(acute, 1) if acute is not None else None,
                    "chronic": round(chronic, 1) if chronic is not None else None,
                    "ratio": round(ratio, 2) if ratio is not None else None,
                }
            )
    return {
        "days": series,
        "caption": (
            "Compares your last week with your last month. "
            "It describes your training; it does not predict injuries."
        ),
        "window": {"from": first.isoformat(), "to": last.isoformat()},
        "source": "calculated",
        "method": "effort_trend@1",
    }
