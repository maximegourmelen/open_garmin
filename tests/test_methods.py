from fastapi.testclient import TestClient

from server.db.store import Store
from server.main import create_app


def _methods(value):
    if isinstance(value, dict):
        for key, item in value.items():
            if key in ("method", "effort_method") and isinstance(item, str) and "@" in item:
                yield item
            else:
                yield from _methods(item)
    elif isinstance(value, list):
        for item in value:
            yield from _methods(item)


def test_every_demo_method_has_registry_entry():
    with TestClient(create_app(Store(in_memory=True), start_worker=False)) as client:
        registry = client.get("/api/demo/methods").json()
        known = {f"{item['id']}@{item['version']}" for item in registry}
        assert len(known) == len(registry)
        paths = [
            "status",
            "activities",
            "wellness/overview",
            "wellness/sleep",
            "wellness/heart",
            "wellness/energy",
            "wellness/stress",
            "wellness/steps",
            "relationships?x=steps&y=hrv",
            "insights",
            "journey",
        ]
        responses = []
        for path in paths:
            result = client.get(f"/api/demo/{path}")
            assert result.status_code == 200, path
            responses.append(result.json())
        activity_id = responses[1]["items"][0]["id"]
        responses.append(client.get(f"/api/demo/activities/{activity_id}").json())
        found = {method for response in responses for method in _methods(response)}
        assert found <= known, found - known
        assert len(found) >= 12
        assert client.get("/api/methods").status_code == 401
        assert len(client.get("/api/demo/research").json()["papers"]) > 0
