"""Compatibility exports for Garmin transport, normalization, and FIT parsing."""

from .client import TOKEN_PATH, GarminClient, GarminError
from .fit import parse_original, parse_tcx
from .normalize import (
    chunks,
    device_name,
    normalize_activity,
    normalize_daily,
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
    "normalize_daily",
    "number",
    "parse_original",
    "parse_tcx",
    "pick",
    "sleep_values",
    "sport_name",
]
