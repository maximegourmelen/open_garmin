"""Build an isolated, disposable demo workspace."""

from __future__ import annotations

from copy import deepcopy

from ..config import DEFAULT_PREFS
from ..db.models import User
from ..db.store import Store
from ..workspace import Workspace


def build_demo_workspace() -> Workspace:
    store = Store(in_memory=True)
    prefs = deepcopy(DEFAULT_PREFS)
    prefs["onboarded"] = True
    with store.sessions.begin() as db:
        db.add(
            User(
                id="demo", email="demo@open-garmin.invalid", password_hash="", name="Alex", preferences=prefs
            )
        )
    return Workspace(store, "demo", "demo", True)
