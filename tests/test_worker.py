from sqlalchemy import select

from server.garmin import GarminError
from server.storage import Activity, Connection, Daily, Job, Store, User
from server.worker import Worker


class FakeGarmin:
    def __init__(self, key, region):
        self.token, self.expires = None, 0

    def close(self):
        pass

    def get(self, path, params=None, binary=False):
        if "activities/search" in path:
            return [
                {
                    "activityId": 42,
                    "activityName": "Test run",
                    "startTimeLocal": "2026-10-20T10:00:00",
                    "activityType": {"typeKey": "running"},
                    "duration": 1800,
                    "distance": 5000,
                }
            ]
        if "v2/dailysummaries" in path:
            return {"data": [{"calendarDate": "2026-10-20", "movement": {"steps": {"value": 8000}}}]}
        if "dailySleepSummaries" in path:
            return [{"calendarDate": "2026-10-20", "sleepTimeSeconds": 28000}]
        if "hrv/daily" in path:
            # Garmin returns null summaries for some empty historical windows.
            return {"hrvSummaries": None}
        if "usersummary/daily" in path:
            return {"calendarDate": "2026-10-20", "restingHeartRate": 50}
        raise GarminError("Original is unavailable", 404)


def setup_store(tmp_path):
    store = Store(tmp_path)
    with store.sessions.begin() as db:
        user = User(
            email="athlete@example.test", name="Test", password_hash="unused", preferences={"timezone": "UTC"}
        )
        db.add(user)
        db.flush()
        uid = user.id
        db.add(Connection(user_id=uid, encrypted_key=store.encrypt("test-key"), region="com", profile={}))
    return store, uid


def test_repeated_sync_is_idempotent_and_empty_hrv_is_not_a_failure(tmp_path):
    store, uid = setup_store(tmp_path)
    worker = Worker(store, FakeGarmin)
    for _ in range(2):
        job = worker.enqueue(uid, 1)
        worker.run(job)
    with store.sessions() as db:
        assert len(list(db.scalars(select(Activity)))) == 1
        assert len(list(db.scalars(select(Daily)))) in (1, 2)
        daily = db.get(Daily, (uid, "2026-10-20"))
        assert daily.data["steps"] == 8000
        assert daily.data["sleep_seconds"] == 28000
        assert db.get(Job, job).state == "complete"
        assert db.get(Connection, uid).state == "ok"


def test_enqueue_deduplicates_pending_work(tmp_path):
    store, uid = setup_store(tmp_path)
    worker = Worker(store, FakeGarmin)
    assert worker.enqueue(uid, 3) == worker.enqueue(uid, 3)


def test_authentication_failure_pauses_the_connection(tmp_path):
    class Refused(FakeGarmin):
        def get(self, *args, **kwargs):
            raise GarminError("Key rejected", 401)

    store, uid = setup_store(tmp_path)
    worker = Worker(store, Refused)
    job = worker.enqueue(uid)
    worker.run(job)
    with store.sessions() as db:
        assert db.get(Job, job).state == "failed"
        assert db.get(Connection, uid).state == "needs_key"


def test_replacing_a_key_prevents_old_worker_results_being_written(tmp_path):
    store, uid = setup_store(tmp_path)
    worker = Worker(store, FakeGarmin)
    with store.sessions.begin() as db:
        db.get(Connection, uid).revision = 2
    worker.save_daily(uid, "2026-10-20", {"steps": 8000}, "summary", {}, revision=1)
    with store.sessions() as db:
        assert db.get(Daily, (uid, "2026-10-20")) is None


def test_rate_limit_sets_a_persistent_cooldown(tmp_path):
    class Limited(FakeGarmin):
        def get(self, *args, **kwargs):
            raise GarminError("Wait", 429, 90)

    store, uid = setup_store(tmp_path)
    worker = Worker(store, Limited)
    worker.run(worker.enqueue(uid))
    with store.sessions() as db:
        conn = db.get(Connection, uid)
        assert conn.state == "rate_limited"
        assert conn.profile["_retry_after"] > 0
