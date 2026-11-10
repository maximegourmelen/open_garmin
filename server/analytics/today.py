"""A small, transparent rule set for today's movement suggestion."""

from __future__ import annotations

import statistics
from datetime import date, timedelta

from ..copy.format import duration_summary
from ..copy.labels import garmin_label
from ..copy.sentences import today_suggestion


def suggestion(daily: list[dict], activities: list[dict], checkin: dict | None, today: date) -> dict:
    by_day = {item["date"]: item for item in daily if item.get("date")}
    current = by_day.get(today.isoformat(), {})
    signals = []

    def add(id: str, label: str, state: str, value: str, source: str):
        signals.append({"id": id, "label": label, "state": state, "value_text": value, "source": source})

    seconds = current.get("sleep_seconds")
    if seconds is not None:
        minutes = seconds / 60
        need = current.get("sleep_need_minutes") or current.get("sleep_need")
        if need is None:
            state = "good" if minutes >= 420 else "low" if minutes < 360 else "ok"
        else:
            diff = minutes - need
            state = "good" if diff >= -15 else "low" if diff < -60 else "ok"
        add("sleep", "Sleep", state, duration_summary(seconds), "garmin")
    hrv_status = (current.get("hrv_status") or "").upper()
    if hrv_status in ("BALANCED", "UNBALANCED", "LOW", "POOR"):
        state = "good" if hrv_status == "BALANCED" else "ok" if hrv_status == "UNBALANCED" else "low"
        add("hrv", "HRV", state, garmin_label(hrv_status, "hrv_status"), "garmin")
    battery = current.get("bb_at_wake")
    if battery is None:
        battery = current.get("bb_max")
    if battery is not None:
        state = "good" if battery >= 60 else "low" if battery < 35 else "ok"
        add("body_battery", "Body Battery", state, str(round(battery)), "garmin")
    rhr = current.get("resting_hr")
    previous = [
        item["resting_hr"]
        for item in daily
        if item.get("resting_hr") is not None
        and (today - timedelta(days=28)).isoformat() <= item.get("date", "") < today.isoformat()
    ]
    if rhr is not None and len(previous) >= 14:
        usual = statistics.median(previous)
        diff = rhr - usual
        state = "good" if diff <= 2 else "low" if diff >= 6 else "ok"
        add("resting_hr", "Resting heart rate", state, f"{round(rhr)} bpm", "calculated")
    if checkin:
        energy = checkin.get("energy")
        if energy is not None:
            state = "good" if energy >= 4 else "low" if energy <= 2 else "ok"
            add("checkin_energy", "Your energy", state, f"{energy} of 5", "user")
        soreness = checkin.get("soreness")
        if soreness is not None:
            state = "good" if soreness == 0 else "ok" if soreness == 1 else "low"
            add("soreness", "Soreness", state, ("None", "Some", "A lot")[soreness], "user")
    recent_effort = {}
    for item in activities:
        day = item.get("date")
        if (
            item.get("parent_id")
            or not day
            or not (today - timedelta(days=28)).isoformat() <= day < today.isoformat()
        ):
            continue
        if item.get("effort_points") is not None:
            recent_effort[day] = recent_effort.get(day, 0) + item["effort_points"]
    if len(recent_effort) >= 7:
        values = sorted(
            recent_effort.get((today - timedelta(days=offset)).isoformat(), 0) for offset in range(1, 29)
        )
        p75 = values[20] * 0.75 + values[21] * 0.25
        yesterday = recent_effort.get((today - timedelta(days=1)).isoformat(), 0)
        state = "low" if p75 > 0 and yesterday > p75 * 1.5 else "good" if yesterday <= p75 else "ok"
        add("yesterday_effort", "Yesterday's effort", state, f"{round(yesterday)} pts", "calculated")
    low = sum(item["state"] == "low" for item in signals)
    ok = sum(item["state"] == "ok" for item in signals)
    if (checkin and checkin.get("soreness") == 2) or low >= 2:
        kind = "rest"
    elif low == 1 or ok >= 3:
        kind = "easy"
    elif len(signals) >= 2:
        kind = "go"
    else:
        kind = "unknown"
    title, text = today_suggestion(kind)
    return {
        "kind": kind,
        "title": title,
        "text": text,
        "pose": "calm",
        "signals": signals,
        "footnote": "A suggestion based on your data, not medical advice.",
        "rules_version": 1,
        "source": "calculated",
        "method": "today_suggestion@1",
    }
