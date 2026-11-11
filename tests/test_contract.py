"""Validate demo responses against Pydantic's exported JSON Schemas."""

import json
from pathlib import Path

from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator
from pydantic import TypeAdapter

from server.api.schemas import (
    EXPORTED_SCHEMAS,
    ActivityDetail,
    ActivityList,
    DeeperResponse,
    HealthSeries,
    Insight,
    Method,
    ProgressResponse,
    RelationshipResponse,
    StatusResponse,
    TodayResponse,
)
from server.db.store import Store
from server.main import create_app


def test_exported_schema_files_match_models():
    root = Path(__file__).resolve().parents[1] / "docs" / "api-schemas"
    for name, model in EXPORTED_SCHEMAS.items():
        assert json.loads((root / f"{name}.json").read_text()) == TypeAdapter(model).json_schema()


def test_demo_response_schemas():
    cases = [
        ("status", StatusResponse),
        ("activities", ActivityList),
        ("today", TodayResponse),
        ("wellness/sleep", HealthSeries),
        ("wellness/heart", HealthSeries),
        ("wellness/energy", HealthSeries),
        ("wellness/stress", HealthSeries),
        ("wellness/steps", HealthSeries),
        ("relationships?x=steps&y=hrv", RelationshipResponse),
        ("insights", list[Insight]),
        ("progress", ProgressResponse),
        ("progress/deeper", DeeperResponse),
        ("methods", list[Method]),
    ]
    app = create_app(Store(in_memory=True), start_worker=False)
    with TestClient(app) as client:
        for path, model in cases:
            result = client.get(f"/api/demo/{path}")
            assert result.status_code == 200, path
            schema = TypeAdapter(model).json_schema()
            Draft202012Validator.check_schema(schema)
            Draft202012Validator(schema).validate(result.json())
        activity_id = client.get("/api/demo/activities").json()["items"][0]["id"]
        detail = client.get(f"/api/demo/activities/{activity_id}")
        assert detail.status_code == 200
        Draft202012Validator(TypeAdapter(ActivityDetail).json_schema()).validate(detail.json())
        expected_paths = {f"/api/demo/{path.split('?')[0]}" for path, _ in cases}
        expected_paths.add("/api/demo/activities/{activity_id}")
        for route in app.routes:
            if getattr(route, "path", "") in expected_paths and getattr(route, "methods", set()) == {"GET"}:
                assert route.response_model is not None, route.path
