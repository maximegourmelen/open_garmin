"""The local validator reads existing data without mutating the database."""

from scripts.validate_live import validate_database
from server.config import DEFAULT_PREFS
from server.db.models import User
from server.db.store import Store


def test_validator_reports_empty_sections_without_writing(tmp_path):
    store = Store(directory=tmp_path)
    with store.sessions.begin() as db:
        db.add(
            User(
                id="local-test",
                email="local@example.invalid",
                password_hash="",
                preferences=DEFAULT_PREFS.copy(),
            )
        )
    database = tmp_path / "app.db"
    before = database.read_bytes()
    reports = validate_database(database)
    assert database.read_bytes() == before
    assert len(reports) == 1
    assert reports[0]["activity_rows"] == 0
    assert "Activities: no recorded activities" in reports[0]["empty_sections"]
    assert "Health: sleep (last 30 days)" in reports[0]["empty_sections"]
    assert "Trends: weekly report" in reports[0]["empty_sections"]
