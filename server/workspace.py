"""Select the authenticated live or synthetic demo workspace."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from fastapi import Request

from .db.store import Store


@dataclass(frozen=True)
class Workspace:
    store: Store
    user_id: str
    mode: Literal["live", "demo"]
    read_only: bool


def workspace(request: Request) -> Workspace:
    if request.url.path.startswith("/api/demo/"):
        return request.app.state.demo_workspace
    user = request.app.state.current_user(request)
    return Workspace(request.app.state.store, user.id, "live", False)
