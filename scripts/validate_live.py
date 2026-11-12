"""Inspect a local workspace without changing data or contacting Garmin.

Run from the repository root: .venv/bin/python scripts/validate_live.py
The script opens the existing SQLite database in read-only mode and prints only
coverage counts and the names of sections that would be empty.
"""

from __future__ import annotations

import argparse
import os
import sqlite3
from datetime import date
from pathlib import Path
from types import SimpleNamespace

from fastapi import Request
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from server.api.overview import overview_view
from server.api.trends import report_view, trends_view
from server.api.wellness import health_series
from server.db.models import Activity, Daily, User


class ReadOnlyStore:
    def __init__(self, database: Path):
        def connect():
            connection = sqlite3.connect(database.as_uri() + "?mode=ro", uri=True)
            connection.execute("PRAGMA query_only=ON")
            return connection

        self.engine = create_engine("sqlite://", creator=connect, poolclass=NullPool)
        self.sessions = sessionmaker(self.engine, expire_on_commit=False)

    def close(self):
        self.engine.dispose()


def _request(store: ReadOnlyStore, user_id: str, path: str) -> Request:
    app = SimpleNamespace(
        state=SimpleNamespace(
            store=store,
            current_user=lambda request: SimpleNamespace(id=user_id),
        )
    )
    return Request(
        {"type": "http", "method": "GET", "path": path, "headers": [], "query_string": b"", "app": app}
    )


def _has_health_reading(kind: str, days: list[dict]) -> bool:
    keys = {
        "sleep": ("minutes",),
        "heart": ("resting_hr", "hrv"),
        "energy": ("latest", "at_wake", "high", "low"),
        "stress": ("average", "max"),
        "steps": ("steps",),
    }[kind]
    return any(any(day.get(key) is not None for key in keys) for day in days)


def validate_database(database: Path) -> list[dict]:
    if not database.is_file():
        raise FileNotFoundError("No existing local workspace database was found.")
    store = ReadOnlyStore(database)
    try:
        with store.sessions() as session:
            user_ids = list(session.scalars(select(User.id)))
        reports = []
        for user_id in user_ids:
            with store.sessions() as session:
                activity_count = session.scalar(
                    select(func.count()).select_from(Activity).where(Activity.user_id == user_id)
                )
                daily_count = session.scalar(
                    select(func.count()).select_from(Daily).where(Daily.user_id == user_id)
                )
            overview = overview_view(_request(store, user_id, "/api/overview"))
            trends = trends_view(_request(store, user_id, "/api/trends"))
            empty = []
            if not activity_count:
                empty.append("Activities: no recorded activities")
            if not overview["recent_activities"]:
                empty.append("Overview: recent activities")
            if overview["week"]["active_minutes"] is None:
                empty.append("Overview: weekly active minutes")
            if all(metric["value"] is None for metric in overview["last_night"].values()):
                empty.append("Overview: last-night readings")
            if not overview["notes"]:
                empty.append("Overview: notes")
            if overview["feeling_today"] is None:
                empty.append("Overview: today's check-in")
            health_coverage = {}
            for kind in ("sleep", "heart", "energy", "stress", "steps"):
                series = health_series(_request(store, user_id, f"/api/wellness/{kind}"), kind, "30D")
                has_data = _has_health_reading(kind, series["days"])
                health_coverage[kind] = has_data
                if not has_data:
                    empty.append(f"Health: {kind} (last 30 days)")
            if not any(week["minutes"] is not None for week in trends["volume"]):
                empty.append("Trends: weekly volume")
            for signal in trends["signals"]:
                if signal["status"] == "insufficient":
                    empty.append(f"Trends: {signal['id']} signal (insufficient history)")
            if not trends["records"]:
                empty.append("Trends: personal records")
            completed_report = next(
                (week for week in trends["reports"] if not week["partial"] and week["minutes"] is not None),
                None,
            )
            if completed_report is None:
                empty.append("Trends: weekly report")
            else:
                report_view(
                    _request(store, user_id, f"/api/reports/week/{completed_report['start']}"),
                    date.fromisoformat(completed_report["start"]),
                )
            reports.append(
                {
                    "activity_rows": activity_count,
                    "daily_rows": daily_count,
                    "health_30d": health_coverage,
                    "empty_sections": empty,
                }
            )
        return reports
    finally:
        store.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--database",
        type=Path,
        default=Path(os.environ.get("OPEN_GARMIN_DATA_DIR", ".runtime")) / "app.db",
        help="Existing local SQLite database path (default: OPEN_GARMIN_DATA_DIR/app.db)",
    )
    args = parser.parse_args()
    try:
        reports = validate_database(args.database.resolve())
    except (FileNotFoundError, sqlite3.DatabaseError) as error:
        print(f"Validation unavailable: {error}")
        return 2
    if not reports:
        print("No live workspace exists in the local database.")
        return 0
    for number, report in enumerate(reports, start=1):
        print(f"Workspace {number}: {report['activity_rows']} activities, {report['daily_rows']} daily rows")
        if report["empty_sections"]:
            print("Sections without usable data:")
            for section in report["empty_sections"]:
                print(f"  - {section}")
        else:
            print("All inspected sections have usable data.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
