"""Plain explanations for every server calculation and its provenance."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import Request

from ..analytics.insights import CATALOG_IDS
from ..workspace import workspace

RESEARCH = Path(__file__).resolve().parents[2] / "research"


def _entry(id: str, title: str, plain: str, formula: str, inputs: list[str], minimum_data: str) -> dict:
    name, version = id.rsplit("@", 1)
    return {
        "id": name,
        "version": int(version),
        "title": title,
        "plain": plain,
        "formula": formula,
        "inputs": inputs,
        "minimum_data": minimum_data,
    }


METHODS = [
    _entry(
        "active_minutes@1",
        "Active minutes",
        "How much you moved this week.",
        "Garmin moderate minutes + 2 × vigorous minutes; activity duration when intensity is missing.",
        ["daily intensity minutes", "activity duration"],
        "One day or activity",
    ),
    _entry(
        "goal_suggestion@1",
        "Goal suggestion",
        "A weekly goal that follows your recent rhythm.",
        "Round 110% of the median of four complete weeks to the nearest five minutes; "
        "limit changes to 30 minutes.",
        ["weekly active minutes", "current goal"],
        "Two complete weeks or a beginner starter goal",
    ),
    _entry(
        "steps@1",
        "Steps",
        "Your daily steps and recent average.",
        "Mean over days with readings; compare with Garmin or custom goal.",
        ["daily steps", "step goal"],
        "One day with steps",
    ),
    _entry(
        "ramp_check@1",
        "Weekly effort change",
        "How this week compares with your recent weeks.",
        "Current effort divided by mean of the previous four weeks; project only after four days.",
        ["effort points"],
        "Three prior weeks",
    ),
    _entry(
        "effort_trend@1",
        "Effort trend",
        "Your recent effort beside your longer pattern.",
        "Seven-day mean and 28-day mean of daily effort points.",
        ["effort points"],
        "Seven and 21 days respectively",
    ),
    _entry(
        "rhr_trend@1",
        "Resting heart-rate trend",
        "Whether your resting heart rate changed from your usual.",
        "Median of 14 days now versus a 14-day window six weeks earlier.",
        ["resting heart rate"],
        "Ten readings in each window",
    ),
    _entry(
        "efficiency_trend@1",
        "Distance per heartbeat",
        "How much ground you cover per heartbeat on similar walks or runs.",
        "Median of speed × 60 / average heart rate in each of two four-week windows.",
        ["activity speed", "average heart rate"],
        "Three eligible activities in each window",
    ),
    _entry(
        "longest_trend@1",
        "Longest session",
        "How your longest outings compare across months.",
        "Maximum activity duration in each of two four-week windows.",
        ["activity duration"],
        "One activity in each window",
    ),
    _entry(
        "vo2max_trend@1",
        "Garmin VO₂ max trend",
        "How Garmin's estimate has changed.",
        "Latest reported estimate compared with one from four to eight weeks earlier.",
        ["Garmin VO₂ max"],
        "Two readings a month apart",
    ),
    _entry(
        "consistency_trend@1",
        "Movement consistency",
        "How many days you chose to move.",
        "Active days in the latest four weeks versus the preceding four weeks.",
        ["activity dates"],
        "One recorded activity",
    ),
    _entry(
        "zones_from_samples@1",
        "Heart-rate zones",
        "Time spent at different heart-rate levels.",
        "Classify each recorded sample using five percentages of maximum heart rate.",
        ["heart-rate samples", "maximum heart rate"],
        "Two usable samples",
    ),
    _entry(
        "effort_points@1",
        "Effort points",
        "A simple measure of how long and how hard a session was.",
        "Sum of zone minutes weighted 1 through 5.",
        ["heart-rate zone minutes"],
        "Time in all five zones",
    ),
    _entry(
        "intensity_mix@1",
        "Effort mix",
        "The share of easy, moderate and hard minutes lately.",
        "Add zones 1–2, zone 3 and zones 4–5 over 28 days.",
        ["zone minutes"],
        "60 measured minutes",
    ),
    _entry(
        "activity_detail@1",
        "Activity details",
        "A session's splits, best efforts and pace pattern.",
        "Calculate from full-resolution recorded samples.",
        ["activity samples"],
        "Recorded activity",
    ),
    _entry(
        "activity_summary@1",
        "Activity summary",
        "A short observation about your session.",
        "Choose the first applicable template from best, longest and intensity evidence.",
        ["activity details"],
        "Recorded activity",
    ),
    _entry(
        "bests@1",
        "Personal bests",
        "Your best recorded effort for each distance or duration.",
        "Smallest time for fixed distances; largest duration or distance for longest records.",
        ["activity efforts"],
        "One qualifying effort",
    ),
    _entry(
        "five_k_estimate@1",
        "5K estimate",
        "A rough estimate from a recent longer effort.",
        "Riegel formula: T₂ = T₁ × (5000 / D₁)^1.06.",
        ["recent 3–10 km best effort"],
        "One effort of at least 10 minutes in 90 days",
    ),
    _entry(
        "sleep_debt_7d@1",
        "Sleep shortfall",
        "How much reported sleep need was unmet this week.",
        "Sum max(0, need − sleep) over seven nights with data.",
        ["sleep duration", "Garmin sleep need"],
        "One night with sleep data",
    ),
    _entry(
        "bedtime_rhythm@1",
        "Bedtime rhythm",
        "Whether your bedtimes stayed near your usual time.",
        "Median bedtime over 14 nights; band is at least 30 minutes or the median absolute deviation.",
        ["local sleep start"],
        "Seven nights in 14 days",
    ),
    _entry(
        "body_battery@1",
        "Body Battery",
        "Garmin's reported charge and drain for the day.",
        "Display reported values without recalculation.",
        ["Garmin Body Battery"],
        "One day reported by Garmin",
    ),
    _entry(
        "stress_day@1",
        "Stress breakdown",
        "How Garmin divided measured time into stress levels.",
        "Convert Garmin duration milliseconds to minutes; divide by measured time.",
        ["Garmin stress durations"],
        "One day reported by Garmin",
    ),
    _entry(
        "relationship@1",
        "Relationship explorer",
        "How two of your daily values moved together.",
        "Spearman rank correlation on paired days; an optional one-day lag.",
        ["paired daily readings"],
        "14 paired days",
    ),
    _entry(
        "weekly_recap@1",
        "Weekly story",
        "A recap built from your recorded week.",
        "Select slides when activity, sleep and progress data exist.",
        ["activities", "daily readings", "goals"],
        "One completed week",
    ),
    _entry(
        "streak@1",
        "Weekly streak",
        "How many weeks in a row you reached a movement goal.",
        "A week counts when minutes or sessions meet the current goal; "
        "an unfinished week cannot end a streak.",
        ["activities", "intensity minutes", "current goals"],
        "One complete week",
    ),
    _entry(
        "journey_progress@1",
        "Journey progress",
        "How you are doing against each week's chosen targets.",
        "Mean of each target's completion, capped at 100%.",
        ["activities", "daily readings", "journey targets"],
        "Chosen journey",
    ),
    _entry(
        "wellness_overview@1",
        "Health overview",
        "The latest health reading from each section.",
        "Select the most recent reading in the chosen range.",
        ["daily readings"],
        "One daily reading",
    ),
    _entry(
        "progress_overview@1",
        "Progress overview",
        "Your fitness signs, personal bests, weekly volume and movement days.",
        "Combine the listed calculations over their own evidence windows.",
        ["activities", "daily readings", "effort points"],
        "One recorded activity or daily reading",
    ),
    _entry(
        "progress_deeper@1",
        "Deeper progress",
        "Detailed trends for your recent activities and effort.",
        "Show recorded values and calculated trend series over the selected range.",
        ["activities", "effort points"],
        "One recorded activity",
    ),
    _entry(
        "today_suggestion@1",
        "Today's suggestion",
        "A gentle movement idea from your available signals.",
        "Classify sleep, HRV, Body Battery, resting heart rate, check-in and recent effort; "
        "choose rest, easy, go or unknown by the published rule order.",
        ["daily readings", "check-in", "effort points"],
        "Two signals for a go suggestion; fewer returns unknown",
    ),
    _entry(
        "today_overview@1",
        "Today overview",
        "Your most relevant movement and recovery information in one place.",
        "Combine the latest readings, week progress and evidence-backed insights.",
        ["activities", "daily readings", "goals", "check-ins"],
        "A workspace; cards appear when data is available",
    ),
]

for kind, title, inputs in (
    ("sleep", "Sleep history", ["Garmin sleep duration", "sleep stages", "sleep need"]),
    ("heart", "Heart history", ["resting heart rate", "HRV"]),
    ("energy", "Energy history", ["Garmin Body Battery"]),
    ("stress", "Stress history", ["Garmin stress"]),
    ("steps", "Step history", ["Garmin steps", "step goal"]),
):
    METHODS.append(
        _entry(
            f"wellness_{kind}@1",
            title,
            f"Your {title.lower()} over the selected range.",
            "Show reported days; leave missing days empty.",
            inputs,
            "One day with a reading",
        )
    )

for insight_id in CATALOG_IDS:
    METHODS.append(
        _entry(
            f"insight_{insight_id.replace('-', '_')}@1",
            insight_id.replace("-", " ").capitalize(),
            "A pattern in your own recorded data.",
            "Show only when this insight's evidence rule is met.",
            ["recorded daily or activity data"],
            "Varies by insight; see its evidence card",
        )
    )


def register(app):
    @app.get("/api/methods")
    @app.get("/api/demo/methods")
    def methods(request: Request):
        workspace(request)
        return METHODS

    @app.get("/api/research")
    @app.get("/api/demo/research")
    def research(request: Request):
        workspace(request)
        return {
            "papers": json.loads((RESEARCH / "index.json").read_text())["papers"],
            "reviews": json.loads((RESEARCH / "reviews.json").read_text())["reviews"],
            "claims": json.loads((RESEARCH / "claims.json").read_text())["claims"],
        }
