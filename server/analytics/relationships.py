"""Paired daily observations with cautious correlation wording."""

from __future__ import annotations

from datetime import date, timedelta

from .common import spearman

VARIABLES = frozenset(
    {
        "sleep_minutes",
        "sleep_score",
        "hrv",
        "resting_hr",
        "bb_at_wake",
        "stress_avg",
        "steps",
        "active_minutes",
        "effort_points",
        "checkin_energy",
        "checkin_mood",
    }
)


def relationship(days: list[dict], x: str, y: str, lag: int = 0) -> dict:
    if x not in VARIABLES or y not in VARIABLES:
        raise ValueError("Choose two available daily values.")
    if lag not in (0, 1):
        raise ValueError("Lag must be zero or one day.")
    indexed = {day["date"]: day for day in days if day.get("date")}
    points = []
    for day_key in sorted(indexed):
        x_value = indexed[day_key].get(x)
        y_date = (date.fromisoformat(day_key) + timedelta(days=lag)).isoformat()
        y_value = indexed.get(y_date, {}).get(y)
        if x_value is not None and y_value is not None:
            points.append([x_value, y_value, day_key])
    n = len(points)
    rho = spearman((point[0] for point in points), (point[1] for point in points)) if n >= 14 else None
    if rho is None:
        words = "More paired days are needed to see a relationship."
    else:
        strength = (
            "no clear relationship"
            if abs(rho) < 0.2
            else "weak relationship"
            if abs(rho) < 0.4
            else "moderate relationship"
            if abs(rho) < 0.6
            else "strong relationship"
        )
        direction = (
            "They tend to go up together."
            if rho >= 0.2
            else "One tends to go down when the other goes up."
            if rho <= -0.2
            else ""
        )
        words = f"{strength.capitalize()}. {direction}".strip()
    return {
        "x": x,
        "y": y,
        "lag": lag,
        "points": points,
        "rho": round(rho, 3) if rho is not None else None,
        "n": n,
        "words": words,
        "disclaimer": "This describes your data; it doesn't prove cause and effect.",
        "method": "relationship@1",
    }
