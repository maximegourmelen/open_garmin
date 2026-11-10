"""Evidence-first, beginner-friendly insight catalog."""

from __future__ import annotations

import json
import statistics
from datetime import date, timedelta
from pathlib import Path

from ..copy.format import duration_summary
from ..copy.format import hrv as format_hrv
from ..copy.labels import garmin_label
from .common import spearman, week_start
from .fitness import fitness_signals
from .sleep import bedtime_rhythm, sleep_minutes
from .zones import intensity_mix

RESEARCH = Path(__file__).resolve().parents[2] / "research"
CLAIMS = json.loads((RESEARCH / "claims.json").read_text())["claims"]
PAPERS = {paper["id"]: paper for paper in json.loads((RESEARCH / "index.json").read_text())["papers"]}
CAUSATION = "This describes your data; it doesn't prove cause and effect."
CATALOG_IDS = (
    "weekly-volume",
    "zone-distribution",
    "sleep-context",
    "hrv-context",
    "ramp",
    "goal-streak",
    "new-best",
    "rhr-trend",
    "efficiency",
    "sleep-rhythm",
    "short-sleep-run",
    "rest-days",
    "steps-goal",
    "checkin-energy",
    "building-history",
)


def claims_for_insight(insight_id: str) -> list[dict]:
    return [
        {
            "id": claim["id"],
            "title": claim["title"],
            "summary": claim["summary"],
            "sources": [
                {"label": PAPERS[paper_id]["title"], "url": PAPERS[paper_id]["pubmed_url"]}
                for paper_id in claim["paper_ids"]
                if paper_id in PAPERS
            ],
        }
        for claim in CLAIMS
        if insight_id in claim["applies_to"]
    ]


def _insight(
    insight_id: str,
    category: str,
    tone: str,
    title: str,
    body: str,
    evidence: str,
    dates: list[str],
    activity_ids: list[str] | None = None,
) -> dict:
    return {
        "id": insight_id,
        "category": category,
        "tone": tone,
        "title": title,
        "body": body,
        "evidence": f"{evidence} {CAUSATION}",
        "dates": dates,
        "activity_ids": activity_ids or [],
        "method": f"insight_{insight_id.replace('-', '_')}@1",
        "claims": claims_for_insight(insight_id),
    }


def insights_for(
    activities: list[dict],
    daily: list[dict],
    checkins: list[dict],
    today: date,
    prefs: dict | None = None,
    best_efforts: list[dict] | None = None,
    streak: dict | None = None,
) -> list[dict]:
    prefs = prefs or {}
    top = [item for item in activities if not item.get("parent_id") and item.get("date")]
    by_day = {day["date"]: day for day in daily if day.get("date")}
    results = []
    current_start = date.fromisoformat(week_start(today, prefs.get("week_start", "monday")))
    elapsed = (today - current_start).days
    previous_start = current_start - timedelta(days=7)
    prior_cutoff = previous_start + timedelta(days=elapsed)
    current = [item for item in top if current_start.isoformat() <= item["date"] <= today.isoformat()]
    previous = [
        item for item in top if previous_start.isoformat() <= item["date"] <= prior_cutoff.isoformat()
    ]
    if current and previous:
        current_seconds = sum(item.get("duration") or 0 for item in current)
        previous_seconds = sum(item.get("duration") or 0 for item in previous)
        if previous_seconds > 0:
            direction = "More" if current_seconds >= previous_seconds else "Less"
            results.append(
                _insight(
                    "weekly-volume",
                    "Activity",
                    "neutral",
                    f"{direction} activity time than this time last week",
                    f"Recorded activity time: {duration_summary(current_seconds)} this week, "
                    f"compared with {duration_summary(previous_seconds)} by the same day last week.",
                    f"Compared {len(current)} activities this week with {len(previous)} "
                    f"last week through {prior_cutoff}. Method: same-weekday activity time.",
                    [
                        current_start.isoformat(),
                        today.isoformat(),
                        previous_start.isoformat(),
                        prior_cutoff.isoformat(),
                    ],
                    [item["id"] for item in current + previous if item.get("id")],
                )
            )

    mix = intensity_mix(top, today)
    measured = mix["easy_minutes"] + mix["moderate_minutes"] + mix["hard_minutes"]
    if measured >= 60:
        results.append(
            _insight(
                "zone-distribution",
                "Activity",
                "positive",
                "Mostly easy effort lately" if mix["percentages"][0] >= 50 else "Your recent effort mix",
                mix["sentence"],
                f"{round(measured)} measured zone minutes from {mix['n']} activities over 28 days. "
                "Method: intensity_mix@1.",
                [mix["window"]["from"], mix["window"]["to"]],
                [item["id"] for item in top if item.get("zone_minutes") and item.get("id")],
            )
        )

    def latest_context(key: str):
        observed = sorted(
            (
                day
                for day in daily
                if day.get(key) is not None and day.get("date") and day["date"] <= today.isoformat()
            ),
            key=lambda day: day["date"],
        )
        if not observed:
            return None
        latest = observed[-1]
        prior = [
            day
            for day in observed[:-1]
            if day["date"] >= (date.fromisoformat(latest["date"]) - timedelta(days=28)).isoformat()
        ]
        return (latest, prior) if len(prior) >= 14 else None

    sleep = latest_context("sleep_seconds")
    if sleep:
        latest, prior = sleep
        usual = statistics.median(day["sleep_seconds"] for day in prior) / 60
        difference = (latest["sleep_seconds"] / 60) - usual
        title = (
            "Sleep within your usual range"
            if abs(difference) < 15
            else f"{duration_summary(round(abs(difference) / 5) * 300)} "
            f"{'more' if difference > 0 else 'less'} sleep than your recent median"
        )
        results.append(
            _insight(
                "sleep-context",
                "Sleep",
                "attention" if difference < -40 else "neutral",
                title,
                f"Your latest recorded sleep was {duration_summary(latest['sleep_seconds'])}.",
                f"Compared with the median of {len(prior)} preceding nights; "
                f"latest night {latest['date']}. Method: preceding-night median.",
                [day["date"] for day in prior] + [latest["date"]],
            )
        )
    hrv = latest_context("hrv")
    if hrv:
        latest, prior = hrv
        usual = statistics.median(day["hrv"] for day in prior)
        results.append(
            _insight(
                "hrv-context",
                "Recovery",
                "neutral",
                "Your HRV in context",
                f"Your latest overnight HRV was {format_hrv(latest['hrv'])}, "
                f"compared with {format_hrv(usual)} for your recent median.",
                f"{len(prior)} preceding readings; latest night {latest['date']}; "
                f"Garmin status: {garmin_label(latest.get('hrv_status'), 'hrv_status') or 'not reported'}. "
                "Method: preceding-night median.",
                [day["date"] for day in prior] + [latest["date"]],
            )
        )

    from .load import ramp_check

    ramp = ramp_check(top, today, prefs.get("week_start", "monday"))
    if ramp["band"] in ("building", "big_jump"):
        results.append(
            _insight(
                "ramp",
                "Activity",
                "attention" if ramp["band"] == "big_jump" else "neutral",
                "A big jump this week" if ramp["band"] == "big_jump" else "A bigger week than usual",
                ramp["sentence"],
                f"Current effort {ramp['this_week']} pts; {ramp['n']} prior weeks; "
                f"ratio {ramp['ratio']}. Method: ramp_check@1.",
                [current_start.isoformat(), today.isoformat()],
            )
        )
    if streak and streak.get("current", 0) >= 2:
        results.append(
            _insight(
                "goal-streak",
                "Journey",
                "positive",
                f"Weekly goal met {streak['current']} weeks in a row",
                f"Your weekly goal was met {streak['current']} weeks in a row.",
                f"{streak['current']} consecutive weeks met the current goal. Method: streak@1.",
                [current_start.isoformat()],
            )
        )
    recent_best = [
        item
        for item in best_efforts or []
        if item.get("date", "") >= (today - timedelta(days=6)).isoformat()
        and item.get("date", "") <= today.isoformat()
    ]
    if recent_best:
        best = recent_best[-1]
        results.append(
            _insight(
                "new-best",
                "Progress",
                "positive",
                "New record",
                "A new personal record was recorded.",
                f"{best['kind']} on {best['date']}. Method: bests@1.",
                [best["date"]],
                [best["activity_id"]] if best.get("activity_id") else [],
            )
        )
    signals = {signal["id"]: signal for signal in fitness_signals(top, daily, today)}
    for signal_id, insight_id, title in (
        ("resting_hr", "rhr-trend", "Resting heart rate is trending down"),
        ("efficiency", "efficiency", "More distance per heartbeat"),
    ):
        signal = signals.get(signal_id)
        if signal and signal["status"] == "improving":
            results.append(
                _insight(
                    insight_id,
                    "Progress",
                    "positive",
                    title,
                    signal["sentence"],
                    f"{signal['n_before']} earlier and {signal['n_after']} recent readings. "
                    f"Method: {signal['method']}.",
                    [(today - timedelta(days=55)).isoformat(), today.isoformat()],
                )
            )

    rhythm = bedtime_rhythm(daily, today)
    if rhythm["within_7"] is not None:
        results.append(
            _insight(
                "sleep-rhythm",
                "Sleep",
                "positive" if rhythm["within_7"] >= 5 else "neutral",
                "Regular bedtimes this week" if rhythm["within_7"] >= 5 else "Your bedtime rhythm",
                rhythm["sentence"],
                f"{rhythm['within_7']} of 7 nights near your usual bedtime. Method: bedtime_rhythm@1.",
                [(today - timedelta(days=13)).isoformat(), today.isoformat()],
            )
        )
    recent_five = [by_day.get((today - timedelta(days=offset)).isoformat(), {}) for offset in range(5)]
    short = [
        day
        for day in recent_five
        if (minutes := sleep_minutes(day)) is not None
        and minutes < (day.get("sleep_need_minutes") or day.get("sleep_need") or 420) - 60
    ]
    if len(short) >= 3:
        results.append(
            _insight(
                "short-sleep-run",
                "Sleep",
                "attention",
                "A few short nights in a row",
                "An earlier bedtime may help you feel more rested.",
                f"{len(short)} of the last 5 nights were more than one hour under Garmin's "
                "reported need. Method: sleep_vs_need@1.",
                [(today - timedelta(days=4)).isoformat(), today.isoformat()],
            )
        )
    active_days = {item["date"] for item in top}
    completed_weeks = []
    for week_index in range(1, 5):
        start = current_start - timedelta(days=week_index * 7)
        week_days = [(start + timedelta(days=offset)).isoformat() for offset in range(7)]
        completed_weeks.append(
            sum(day in active_days for day in week_days) >= 3
            and any(day not in active_days for day in week_days)
        )
    if all(completed_weeks):
        results.append(
            _insight(
                "rest-days",
                "Activity",
                "positive",
                "Good balance of activity and rest",
                "You made room for both movement and recovery.",
                "At least 3 active days and 1 rest day in each of 4 complete weeks. Method: rest_days@1.",
                [
                    (current_start - timedelta(days=28)).isoformat(),
                    (current_start - timedelta(days=1)).isoformat(),
                ],
            )
        )
    recent_seven = [by_day.get((today - timedelta(days=offset)).isoformat(), {}) for offset in range(7)]
    met_steps = sum(
        day.get("steps") is not None
        and day.get("steps_goal") is not None
        and day["steps"] >= day["steps_goal"]
        for day in recent_seven
    )
    if met_steps >= 5:
        results.append(
            _insight(
                "steps-goal",
                "Activity",
                "positive",
                f"Step goal hit {met_steps} days this week",
                "Your daily steps have been steady.",
                f"{met_steps} of 7 days met Garmin's reported step goal. Method: steps@1.",
                [(today - timedelta(days=6)).isoformat(), today.isoformat()],
            )
        )
    checkin_days = {
        item["date"]: item
        for item in checkins
        if item.get("date") and item["date"] >= (today - timedelta(days=27)).isoformat()
    }
    paired = [(item.get("energy"), sleep_minutes(by_day.get(day, {}))) for day, item in checkin_days.items()]
    valid = [(energy, sleep) for energy, sleep in paired if energy is not None and sleep is not None]
    rho = spearman((pair[0] for pair in valid), (pair[1] for pair in valid)) if len(valid) >= 10 else None
    if rho is not None and rho >= 0.4:
        results.append(
            _insight(
                "checkin-energy",
                "You",
                "neutral",
                "You feel more energetic after longer sleep",
                "Your check-ins and sleep readings have tended to move together.",
                f"{len(valid)} paired days in 28 days; Spearman rho {rho:.2f}. Method: relationship@1.",
                sorted(checkin_days),
            )
        )
    if not results:
        results.append(
            _insight(
                "building-history",
                "Your data",
                "neutral",
                "Your story is taking shape",
                "As activities and nights arrive, this space will show patterns you can explore.",
                "No insight passed its minimum-data rule.",
                [],
            )
        )
    return results
