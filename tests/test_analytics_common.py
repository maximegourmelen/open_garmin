import math
from datetime import date

import pytest

from server.analytics.common import (
    daterange,
    downsample_samples,
    local_today,
    lttb,
    rolling_median,
    safe_div,
    spearman,
    usual_range,
    week_start,
)


def test_weeks_dates_and_medians():
    assert week_start("2026-11-01", "monday") == "2026-10-26"
    assert week_start("2026-11-01", "sunday") == "2026-11-01"
    assert list(daterange("2026-10-31", "2026-11-02")) == [
        date(2026, 10, 31),
        date(2026, 11, 1),
        date(2026, 11, 2),
    ]
    assert isinstance(local_today({"timezone": "America/Toronto"}), date)
    assert rolling_median([None, 2, 10, 4], min_n=3) == 4
    assert rolling_median([None, 2, 10, 4], min_n=4) is None
    assert safe_div(10, 2) == 5 and safe_div(1, 0) is None
    with pytest.raises(ValueError):
        week_start("2026-11-01", "friday")


def test_spearman_ties_missing_and_constant():
    assert spearman([1, 2, 2, 4], [4, 1, 1, 2]) == pytest.approx(-1 / 3)
    assert spearman([1, 2, 3], [1, 2, 3]) == pytest.approx(1)
    assert spearman([1, None, 3], [1, 2, 3]) is None
    assert spearman([1, 1, 1], [1, 2, 3]) is None


def test_usual_range_requires_fourteen_readings_and_uses_recent_mad():
    assert usual_range([56] * 13) is None
    result = usual_range([999] + [54, 55, 56, 57] * 4)
    assert result["median"] == 56
    assert result["n"] == 17
    assert result["low"] < 54 and result["high"] > 57
    recent = usual_range([999] + [55] * 14, days=14)
    assert recent == {"low": 55, "high": 55, "median": 55, "n": 14}


def test_lttb_preserves_sine_extremes_and_endpoints():
    points = [(float(i), math.sin(i * 2 * math.pi / 997)) for i in range(10000)]
    sampled = lttb(points, 1500)
    assert len(sampled) == 1500
    assert sampled[0] == points[0] and sampled[-1] == points[-1]
    assert max(y for _, y in sampled) >= 0.99 * max(y for _, y in points)
    assert min(y for _, y in sampled) <= 0.99 * min(y for _, y in points)
    assert lttb(points[:3], 10) == points[:3]
    assert lttb(points, 2) == [points[0], points[-1]]
    with pytest.raises(ValueError):
        lttb(points, 1)


def test_stream_selection_keeps_channels_aligned():
    samples = [
        {"time": i, "hr": 100 + math.sin(i / 10), "speed": i / 10, "distance": i, "elevation": i % 10}
        for i in range(10000)
    ]
    sampled = downsample_samples(samples)
    assert len(sampled) == 1500
    assert sampled[0] is samples[0] and sampled[-1] is samples[-1]
    assert all(sample["speed"] == sample["time"] / 10 for sample in sampled)
