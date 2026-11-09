import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine, inspect, select
from sqlalchemy.orm import Session

from server.app import create_app
from server.config import DEFAULT_PREFS
from server.db.models import Activity, ActivitySamples, Base, Connection, Daily, Job, LoginSession, Note, User
from server.main import Preferences
from server.db.store import Store


def test_create_all_adds_new_tables_without_changing_existing_user(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'app.db'}")
    old_tables = [
        User.__table__,
        LoginSession.__table__,
        Connection.__table__,
        Activity.__table__,
        Daily.__table__,
        ActivitySamples.__table__,
        Note.__table__,
        Job.__table__,
    ]
    Base.metadata.create_all(engine, tables=old_tables)
    with Session(engine) as db:
        db.add(
            User(
                id="existing",
                email="person@example.test",
                password_hash="hash",
                name="Existing",
                preferences={"theme": "light"},
            )
        )
        db.commit()
    store = Store(tmp_path)
    assert {"activity_derived", "best_efforts", "checkins", "milestone_awards", "weekly_recaps"} <= set(
        inspect(store.engine).get_table_names()
    )
    with store.sessions() as db:
        user = db.scalar(select(User).where(User.id == "existing"))
        assert user.name == "Existing" and user.preferences == {"theme": "light"}


def test_preference_defaults_and_validation():
    prefs = Preferences.model_validate(DEFAULT_PREFS)
    assert prefs.theme == "dark" and prefs.weekly_minutes == 150
    assert Preferences(theme="system", companion_name="  Dot  ").companion_name == "Dot"
    for invalid in (
        {"theme": "blue"},
        {"companion_tone": "angry"},
        {"companion_name": "  "},
        {"today_layout": ["week", "week"]},
        {"today_layout": ["unknown"]},
        {"max_hr": 119},
        {"zone_source": "custom"},
        {"journey": {"id": "unknown", "started": "2026-11-03"}},
        {"journey": {"id": "move_more_8w", "started": "tomorrow"}},
        {"unknown": 1},
    ):
        with pytest.raises(ValidationError):
            Preferences.model_validate(invalid)
    assert Preferences(journey={"id": "move_more_8w", "started": "2026-11-03"}).journey.id == "move_more_8w"
    assert Preferences(zone_source="custom", max_hr=190).max_hr == 190


def test_api_respects_existing_saved_light_theme(tmp_path, monkeypatch):
    monkeypatch.setenv("OPEN_GARMIN_LOCAL_MODE", "1")
    store = Store(tmp_path)
    app = create_app(store, start_worker=False)
    with store.sessions.begin() as db:
        db.add(
            User(
                id="existing",
                email="person@example.test",
                password_hash="hash",
                name="Existing",
                preferences={"theme": "light"},
            )
        )
    with TestClient(app, base_url="http://localhost") as client:
        assert client.get("/api/session").json()["user"]["name"] == "Existing"
        prefs = client.get("/api/preferences").json()
        assert prefs["theme"] == "light" and prefs["weekly_minutes"] == 150
