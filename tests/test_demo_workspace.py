import time

from fastapi.testclient import TestClient

from server.app import create_app
from server.demo.seed import build_demo_workspace
from server.db.store import Store


def test_demo_seeds_quickly_in_isolated_temporary_database():
    start = time.perf_counter()
    ws = build_demo_workspace()
    assert time.perf_counter() - start < 3
    assert ws.user_id == "demo" and ws.mode == "demo" and ws.read_only
    assert ws.store.engine.url.database == str(ws.store.directory / "app.db")
    assert (ws.store.directory / "app.db").exists()


def test_demo_status_and_forbidden_mutations_are_isolated(tmp_path):
    app = create_app(Store(tmp_path), start_worker=False)
    with TestClient(app) as client:
        demo = client.get("/api/demo/status")
        assert demo.status_code == 200
        assert demo.json()["mode"] == "demo"
        assert demo.json()["user"] == {"name": "Alex"}
        assert client.get("/api/status").status_code == 401
        assert client.get("/api/activities").status_code == 401
        for method, path in (
            ("post", "/api/demo/connection"),
            ("delete", "/api/demo/connection"),
            ("post", "/api/demo/sync"),
            ("post", "/api/demo/import/fit"),
            ("get", "/api/demo/export"),
            ("delete", "/api/demo/data"),
        ):
            assert getattr(client, method)(path).status_code == 403
