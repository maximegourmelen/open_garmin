"""Pure date, statistics, and stream sampling helpers."""

from __future__ import annotations

import math
import statistics
from collections.abc import Iterable, Iterator
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo


def week_start(day: date | str, start: str = "monday") -> str:
    """Return the first local date of the week as YYYY-MM-DD."""
    if start not in ("monday", "sunday"):
        raise ValueError("Week start must be monday or sunday")
    current = date.fromisoformat(day) if isinstance(day, str) else day
    offset = current.weekday() if start == "monday" else (current.weekday() + 1) % 7
    return (current - timedelta(days=offset)).isoformat()


def local_today(prefs: dict) -> date:
    return datetime.now(ZoneInfo(prefs["timezone"])).date()


def daterange(first: date | str, last: date | str) -> Iterator[date]:
    current = date.fromisoformat(first) if isinstance(first, str) else first
    end = date.fromisoformat(last) if isinstance(last, str) else last
    while current <= end:
        yield current
        current += timedelta(days=1)


def rolling_median(values: Iterable[float | None], min_n: int = 1) -> float | None:
    observed = [float(value) for value in values if value is not None and math.isfinite(value)]
    return float(statistics.median(observed)) if len(observed) >= min_n else None


def safe_div(numerator: float | None, denominator: float | None) -> float | None:
    if numerator is None or denominator is None or denominator == 0:
        return None
    result = numerator / denominator
    return result if math.isfinite(result) else None


def _average_ranks(values: list[float]) -> list[float]:
    order = sorted(range(len(values)), key=values.__getitem__)
    ranks = [0.0] * len(values)
    i = 0
    while i < len(order):
        j = i + 1
        while j < len(order) and values[order[j]] == values[order[i]]:
            j += 1
        rank = (i + 1 + j) / 2
        for index in order[i:j]:
            ranks[index] = rank
        i = j
    return ranks


def spearman(xs: Iterable[float | None], ys: Iterable[float | None]) -> float | None:
    pairs = [
        (float(x), float(y))
        for x, y in zip(xs, ys, strict=False)
        if x is not None and y is not None and math.isfinite(x) and math.isfinite(y)
    ]
    if len(pairs) < 3:
        return None
    rx = _average_ranks([x for x, _ in pairs])
    ry = _average_ranks([y for _, y in pairs])
    mean_x = statistics.mean(rx)
    mean_y = statistics.mean(ry)
    numerator = sum((x - mean_x) * (y - mean_y) for x, y in zip(rx, ry, strict=True))
    denominator = math.sqrt(sum((x - mean_x) ** 2 for x in rx) * sum((y - mean_y) ** 2 for y in ry))
    return numerator / denominator if denominator else None


def lttb_indexes(points: list[tuple[float, float]], threshold: int) -> list[int]:
    """Largest Triangle Three Buckets; return selected source indexes."""
    if threshold < 2:
        raise ValueError("Threshold must preserve both endpoints")
    n = len(points)
    if n <= threshold:
        return list(range(n))
    if threshold == 2:
        return [0, n - 1]
    size = (n - 2) / (threshold - 2)
    selected = [0]
    previous = 0
    for bucket in range(threshold - 2):
        next_start = int(math.floor((bucket + 1) * size)) + 1
        next_end = min(int(math.floor((bucket + 2) * size)) + 1, n)
        if next_start >= next_end:
            next_start = min(next_start, n - 1)
            next_end = min(next_start + 1, n)
        avg_x = statistics.mean(x for x, _ in points[next_start:next_end])
        avg_y = statistics.mean(y for _, y in points[next_start:next_end])
        start = int(math.floor(bucket * size)) + 1
        end = min(int(math.floor((bucket + 1) * size)) + 1, n - 1)
        best_index = start
        best_area = -1.0
        px, py = points[previous]
        for index in range(start, max(start + 1, end)):
            x, y = points[index]
            area = abs((px - avg_x) * (y - py) - (px - x) * (avg_y - py))
            if area > best_area:
                best_area = area
                best_index = index
        selected.append(best_index)
        previous = best_index
    selected.append(n - 1)
    return selected


def lttb(points: list[tuple[float, float]], threshold: int) -> list[tuple[float, float]]:
    return [points[index] for index in lttb_indexes(points, threshold)]


def downsample_samples(samples: list[dict], threshold: int = 1500) -> list[dict]:
    """Select one shared index set for all stream channels."""
    if len(samples) <= threshold:
        return samples
    channel = next(
        (name for name in ("hr", "speed", "distance") if any(s.get(name) is not None for s in samples)),
        None,
    )
    if channel is None:
        indexes = [round(i * (len(samples) - 1) / (threshold - 1)) for i in range(threshold)]
    else:
        valid = [
            (index, (float(sample.get("time", index)), float(sample[channel])))
            for index, sample in enumerate(samples)
            if sample.get(channel) is not None
        ]
        if len(valid) >= threshold:
            indexes = [valid[index][0] for index in lttb_indexes([point for _, point in valid], threshold)]
        else:
            indexes = [round(i * (len(samples) - 1) / (threshold - 1)) for i in range(threshold)]
    indexes[0], indexes[-1] = 0, len(samples) - 1
    return [samples[index] for index in sorted(set(indexes))]
