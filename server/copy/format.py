"""The server half of the shared display-format contract."""

from __future__ import annotations

import math
from datetime import date, datetime

SPACE = "\u202f"
MISSING = "—"
MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
MONTHS_LONG = (
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
)
WEEKDAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
WEEKDAYS_SHORT = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")


def _valid(value: float | int | None) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _rounded(value: float | int) -> int:
    return math.floor(value + 0.5) if value >= 0 else math.ceil(value - 0.5)


def duration_summary(seconds: float | int | None) -> str:
    if not _valid(seconds):
        return MISSING
    minutes = max(0, _rounded(seconds / 60))
    hours, remainder = divmod(minutes, 60)
    return f"{hours}{SPACE}h {remainder:02d}{SPACE}min" if hours else f"{minutes}{SPACE}min"


def duration_clock(seconds: float | int | None) -> str:
    if not _valid(seconds):
        return MISSING
    total = max(0, _rounded(seconds))
    hours, remainder = divmod(total, 3600)
    minutes, secs = divmod(remainder, 60)
    return f"{hours}:{minutes:02d}:{secs:02d}" if hours else f"{minutes}:{secs:02d}"


def pace(speed_mps: float | int | None, units: str = "metric") -> str:
    if not _valid(speed_mps) or speed_mps <= 0:
        return MISSING
    divisor = 1000 if units == "metric" else 1609.344
    total = _rounded(divisor / speed_mps)
    minutes, secs = divmod(total, 60)
    return f"{minutes}:{secs:02d} /{'km' if units == 'metric' else 'mi'}"


def speed(speed_mps: float | int | None, units: str = "metric") -> str:
    if not _valid(speed_mps):
        return MISSING
    factor = 3.6 if units == "metric" else 2.2369362921
    return f"{speed_mps * factor:.1f}{SPACE}{'km/h' if units == 'metric' else 'mph'}"


def distance(metres: float | int | None, units: str = "metric", table: bool = False) -> str:
    if not _valid(metres):
        return MISSING
    divisor = 1000 if units == "metric" else 1609.344
    value = metres / divisor
    digits = 2 if table and abs(value) < 1 else 1
    return f"{value:.{digits}f}{SPACE}{'km' if units == 'metric' else 'mi'}"


def heart_rate(value: float | int | None) -> str:
    return f"{_rounded(value)}{SPACE}bpm" if _valid(value) else MISSING


def hrv(value: float | int | None) -> str:
    return f"{_rounded(value)}{SPACE}ms" if _valid(value) else MISSING


def count(value: float | int | None, unit: str = "") -> str:
    if not _valid(value):
        return MISSING
    number = f"{_rounded(value):,}"
    return f"{number}{SPACE}{unit}" if unit else number


def percent(value: float | int | None) -> str:
    return f"{_rounded(value)}%" if _valid(value) else MISSING


def plural(value: int, singular: str, plural_form: str | None = None) -> str:
    return singular if value == 1 else (plural_form or f"{singular}s")


def _date(value: str | date | datetime) -> date:
    if isinstance(value, datetime):
        return value.date()
    return date.fromisoformat(value[:10]) if isinstance(value, str) else value


def date_list(value: str | date | datetime, today: str | date, time: str | None = None) -> str:
    day = _date(value)
    reference = _date(today)
    age = (reference - day).days
    if age == 0:
        label = "Today"
    elif 0 < age <= 6:
        label = WEEKDAYS_SHORT[day.weekday()]
    else:
        label = f"{day.day} {MONTHS[day.month - 1]}"
        if day.year != reference.year:
            label += f" {day.year}"
    return f"{label}, {time}" if time else label


def date_title(value: str | date | datetime) -> str:
    day = _date(value)
    return f"{WEEKDAYS[day.weekday()]}, {day.day} {MONTHS_LONG[day.month - 1]}"


def week(value: str | date | datetime) -> str:
    day = _date(value)
    return f"Week of {day.day} {MONTHS[day.month - 1]}"


def clock_time(value: str, hour12: bool = False) -> str:
    hour, minute = (int(part) for part in value[:5].split(":"))
    if hour12:
        return f"{hour % 12 or 12}:{minute:02d} {'am' if hour < 12 else 'pm'}"
    return f"{hour:02d}:{minute:02d}"
