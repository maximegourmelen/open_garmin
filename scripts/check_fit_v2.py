"""Print aggregate FIT channel ranges from locally stored originals, with no identifiers."""

from __future__ import annotations

import argparse
import statistics
from pathlib import Path

from server.garmin.fit import parse_original

CHANNELS = ("cadence_spm", "cadence_rpm", "gct", "vo", "vr", "step_len", "temp")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path, help="Data directory containing originals/")
    args = parser.parse_args()
    values: dict[str, list[float]] = {key: [] for key in CHANNELS}
    watches: dict[str, list[float]] = {key: [] for key in ("watch_feel", "watch_rpe")}
    parsed = 0
    errors = 0
    for path in (args.directory / "originals").rglob("*.zip"):
        try:
            result = parse_original(path.read_bytes())
        except Exception:  # malformed originals are counted without exposing their contents
            errors += 1
            continue
        parsed += 1
        for sample in result.get("samples", []):
            for key in CHANNELS:
                value = sample.get(key)
                if isinstance(value, (int, float)):
                    values[key].append(value)
        for key in watches:
            value = result.get(key)
            if isinstance(value, (int, float)):
                watches[key].append(value)
    print(f"archives parsed={parsed} errors={errors}")
    for key, numbers in {**values, **watches}.items():
        if numbers:
            minimum = min(numbers)
            median = statistics.median(numbers)
            maximum = max(numbers)
            print(f"{key}: count={len(numbers)} min={minimum:.2f} median={median:.2f} max={maximum:.2f}")
        else:
            print(f"{key}: count=0")


if __name__ == "__main__":
    main()
