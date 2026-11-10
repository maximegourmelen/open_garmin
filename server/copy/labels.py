"""Human-readable Garmin labels; unknown values remain descriptive, not raw enums."""

from __future__ import annotations

HRV_STATUS = {
    "BALANCED": "Within your usual range",
    "UNBALANCED": "Outside your usual range",
    "LOW": "Below your usual range",
    "POOR": "Below your usual range",
    "GOOD": "Good",
}
TRAINING_EFFECT = {
    "RECOVERY": "Recovery",
    "AEROBIC_BASE": "Aerobic base",
    "TEMPO": "Tempo",
    "LACTATE_THRESHOLD": "Threshold",
    "VO2MAX": "VO₂ max",
    "ANAEROBIC_CAPACITY": "Anaerobic capacity",
    "SPRINT": "Sprint",
}


def garmin_label(value: str | None, category: str) -> str | None:
    if not value:
        return None
    normalized = value.upper().replace(" ", "_")
    labels = (
        HRV_STATUS if category == "hrv_status" else TRAINING_EFFECT if category == "training_effect" else {}
    )
    return labels.get(normalized, value.replace("_", " ").strip().capitalize())
