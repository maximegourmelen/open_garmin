import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from server.app import create_app
from server.db.models import Activity, ActivitySamples, Connection, User
from server.db.store import Store


@pytest.fixture
def app(tmp_path, monkeypatch):
    monkeypatch.setenv("OPEN_GARMIN_ALLOW_REGISTRATION", "1")
    return create_app(Store(tmp_path), start_worker=False)


def register(client, email="athlete@example.test"):
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "a-long-test-password", "name": "Test Athlete"},
    )
    assert response.status_code == 200
    csrf = response.json()["csrf_token"]
    client.headers["X-CSRF-Token"] = csrf
    return csrf


def seed(app, email, aid="42"):
    with app.state.store.sessions.begin() as db:
        user = db.scalar(select(User).where(User.email == email))
        db.add(
            Activity(
                user_id=user.id,
                id=aid,
                date="2026-10-20",
                data={"id": aid, "name": "=SUM(A1)", "date": "2026-10-20", "samples": [], "source": "garmin"},
                raw={"private": "source"},
            )
        )
        return user.id


def test_fit_import_is_private_and_deduplicated(app, monkeypatch):
    import server.app as app_module

    monkeypatch.setattr(
        app_module,
        "parse_original",
        lambda _: {
            "recorded_start": "2026-10-20T10:00:00+00:00",
            "recorded_sport": "running",
            "recorded_device": "Garmin Forerunner",
            "samples": [{"time": 0, "distance": 0, "hr": 120}, {"time": 60, "distance": 180, "hr": 140}],
            "laps": [],
            "sets": [],
            "events": [],
            "session_metrics": [],
            "detail_state": "ready",
        },
    )
    with TestClient(app) as client:
        assert client.post("/api/import/fit", files={"file": ("run.fit", b"fixture")}).status_code == 401
        register(client)
        first = client.post("/api/import/fit", files={"file": ("run.fit", b"fixture")})
        assert first.status_code == 200 and first.json()["status"] == "imported"
        second = client.post("/api/import/fit", files={"file": ("run.fit", b"fixture")})
        assert second.json() == {"id": first.json()["id"], "status": "duplicate"}
        row = next(a for a in client.get("/api/activities").json()["items"] if a["id"] == first.json()["id"])
        assert row["source"] == "imported_fit" and row["device"] == "Garmin Forerunner"


def test_demo_requires_no_auth_but_real_data_does(app):
    with TestClient(app) as client:
        assert client.get("/api/session").json()["user"] is None
        assert client.get("/api/activities").status_code == 401
        assert client.get("/api/export").status_code == 401


def test_sessions_and_csrf_are_required_for_mutations(app):
    with TestClient(app) as client:
        csrf = register(client)
        assert client.cookies.get("og_session")
        assert (
            "httponly"
            in client.post(
                "/api/auth/login", json={"email": "athlete@example.test", "password": "a-long-test-password"}
            )
            .headers["set-cookie"]
            .lower()
        )
        # Login rotates the session; use its new CSRF token.
        csrf = client.get("/api/session").json()["csrf_token"]
        client.headers.pop("X-CSRF-Token", None)
        assert client.delete("/api/data").status_code == 403
        client.headers["X-CSRF-Token"] = csrf
        assert client.delete("/api/data").status_code == 200


def test_cross_origin_mutation_is_rejected_even_with_session(app):
    with TestClient(app) as client:
        register(client)
        assert client.delete("/api/data", headers={"Origin": "https://evil.example"}).status_code == 403


def test_activity_and_export_isolation_between_accounts(app):
    alice, bob = TestClient(app), TestClient(app)
    register(alice, "alice@example.test")
    register(bob, "bob@example.test")
    seed(app, "alice@example.test")
    assert alice.get("/api/activities/42").status_code == 200
    assert bob.get("/api/activities/42").status_code == 404
    assert bob.put("/api/activities/42/note", json={"text": "attempt"}).status_code == 404
    assert bob.get("/api/export").json()["activities"] == []
    assert "source" in alice.get("/api/export").text
    assert alice.get("/api/activities/42/original").status_code == 404


def test_notes_export_and_rpe_validation(app):
    with TestClient(app) as client:
        register(client)
        seed(app, "athlete@example.test")
        assert (
            client.put(
                "/api/activities/42/note", json={"text": "Felt steady", "rpe": 4, "tags": ["easy"]}
            ).status_code
            == 200
        )
        a = client.get("/api/activities/42").json()
        assert a["note"] == {"text": "Felt steady", "rpe": 4, "feel": None, "tags": ["easy"]}
        assert client.put("/api/activities/42/note", json={"rpe": 11}).status_code == 422
        exported = client.get("/api/export").json()
        assert exported["notes"][0]["rpe"] == 4
        assert exported["schema_version"] == 1
        assert "'=SUM(A1)" in client.get("/api/export?format=csv").text


def test_key_validation_errors_do_not_echo_submitted_credentials(app):
    with TestClient(app) as client:
        register(client)
        secret = "short-secret"
        r = client.post("/api/connection", json={"api_key": secret})
        assert r.status_code == 422
        assert secret not in r.text


def test_local_workspace_connects_key_without_app_sign_in(tmp_path, monkeypatch):
    monkeypatch.setenv("OPEN_GARMIN_LOCAL_MODE", "1")

    class GarminStub:
        def __init__(self, key, region):
            assert key == "private-personal-key-12345"
            assert region == "com"

        def get(self, path):
            assert path == "/userprofile-service/userprofile/settings"
            return {"displayName": "runner"}

        def close(self):
            pass

    local_app = create_app(Store(tmp_path), start_worker=False, client_factory=GarminStub)
    with TestClient(local_app, base_url="http://127.0.0.1:8000") as client:
        opened = client.get("/api/session")
        assert opened.status_code == 200
        assert opened.json()["local_mode"] is True
        assert opened.json()["user"] is not None
        assert client.cookies.get("og_session")
        client.headers["X-CSRF-Token"] = opened.json()["csrf_token"]
        response = client.post(
            "/api/connection", json={"api_key": "private-personal-key-12345", "region": "com"}
        )
        assert response.status_code == 200 and response.json()["job_id"]
        assert client.get("/api/status").json()["connection"]["connected"] is True
        with local_app.state.store.sessions() as db:
            conn = db.scalar(select(Connection))
            assert conn.encrypted_key != "private-personal-key-12345"
            assert local_app.state.store.decrypt(conn.encrypted_key) == "private-personal-key-12345"
        assert "private-personal-key-12345" not in client.get("/api/status").text
    with TestClient(local_app, base_url="http://127.0.0.1:8000") as restarted:
        resumed = restarted.get("/api/session")
        assert resumed.json()["user"] is not None
        assert restarted.get("/api/status").json()["connection"]["connected"] is True


def test_local_workspace_reuses_single_existing_user_and_rejects_other_hosts(tmp_path, monkeypatch):
    monkeypatch.setenv("OPEN_GARMIN_LOCAL_MODE", "1")
    local_app = create_app(Store(tmp_path), start_worker=False)
    with TestClient(local_app, base_url="http://127.0.0.1:8000") as client:
        register(client)
        user_id = seed(local_app, "athlete@example.test")
        client.post("/api/auth/logout")
        assert client.post("/api/auth/local").status_code == 200
        assert client.get("/api/activities").json()["items"][0]["id"] == "42"
        with local_app.state.store.sessions() as db:
            assert db.scalar(select(User)).id == user_id
    with TestClient(local_app, base_url="http://example.com") as remote:
        assert remote.post("/api/auth/local").status_code == 404


def test_preferences_validate_timezone_and_keep_goals(app):
    with TestClient(app) as client:
        register(client)
        assert client.put("/api/preferences", json={"timezone": "Not/AZone"}).status_code == 422
        assert (
            client.put(
                "/api/preferences",
                json={"timezone": "Europe/Paris", "units": "imperial", "weekly_distance": 50000},
            ).status_code
            == 200
        )
        assert client.get("/api/preferences").json()["weekly_distance"] == 50000


def test_encrypted_key_storage_and_disconnect_keep_data(app):
    store = app.state.store
    with TestClient(app) as client:
        register(client)
        uid = seed(app, "athlete@example.test")
        with store.sessions.begin() as db:
            db.add(
                Connection(
                    user_id=uid,
                    encrypted_key=store.encrypt("private-key-that-must-not-leak"),
                    region="com",
                    profile={},
                )
            )
        assert "private-key" not in (store.directory / "app.db").read_bytes().decode(errors="ignore")
        assert "private-key" not in client.get("/api/status").text
        assert client.delete("/api/connection").status_code == 200
        assert len(client.get("/api/activities").json()["items"]) == 1
        with store.sessions() as db:
            assert db.get(Connection, uid).encrypted_key is None


def test_deletion_is_scoped_and_account_deletion_invalidates_session(app):
    a, b = TestClient(app), TestClient(app)
    register(a, "alice@example.test")
    register(b, "bob@example.test")
    seed(app, "alice@example.test")
    seed(app, "bob@example.test")
    assert a.delete("/api/account").status_code == 200
    assert a.get("/api/activities").status_code == 401
    assert len(b.get("/api/activities").json()["items"]) == 1


def test_security_and_cache_headers(app):
    with TestClient(app) as client:
        response = client.get("/api/session")
        assert response.headers["cache-control"] == "no-store"
        assert response.headers["x-content-type-options"] == "nosniff"
        assert response.headers["x-frame-options"] == "DENY"


def test_stream_storage_is_private_exportable_and_cascades_on_delete(app):
    alice, bob = TestClient(app), TestClient(app)
    register(alice, "alice@example.test")
    register(bob, "bob@example.test")
    uid = seed(app, "alice@example.test")
    samples = [{"time": i, "hr": 120} for i in range(250)]
    with app.state.store.sessions.begin() as db:
        row = db.get(Activity, (uid, "42"))
        row.data = {**row.data, "samples": samples[::5], "sample_count": len(samples)}
        db.add(ActivitySamples(user_id=uid, activity_id="42", samples=samples))
    preview = alice.get("/api/activities").json()["items"][0]
    assert "samples" not in preview
    assert alice.get("/api/activities/42").json()["sample_count"] == 250
    assert alice.get("/api/activities/42").json()["samples"] == samples
    assert alice.get("/api/export").json()["activities"][0]["samples"] == samples
    assert bob.get("/api/activities/42").status_code == 404
    assert bob.get("/api/export").json()["activities"] == []
    assert alice.delete("/api/data").status_code == 200
    with app.state.store.sessions() as db:
        assert db.get(ActivitySamples, (uid, "42")) is None
