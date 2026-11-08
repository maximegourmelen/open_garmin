"""Compatibility exports for Garmin transport, normalization, and FIT parsing."""

from .garmin.client import TOKEN_PATH, GarminClient, GarminError
from .garmin.fit import parse_original, parse_tcx
from .garmin.normalize import (
    chunks,
    device_name,
    normalize_activity,
    normalize_activity_v2,
    normalize_daily,
    normalize_daily_v2,
    number,
    pick,
    sleep_values,
    sport_name,
)

__all__ = [
    "GarminClient",
    "GarminError",
    "TOKEN_PATH",
    "chunks",
    "device_name",
    "normalize_activity",
    "normalize_activity_v2",
    "normalize_daily",
    "normalize_daily_v2",
    "number",
    "parse_original",
    "parse_tcx",
    "pick",
    "sleep_values",
    "sport_name",
]
