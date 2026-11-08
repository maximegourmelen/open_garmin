from __future__ import annotations

import os
import threading
from pathlib import Path

from cryptography.fernet import Fernet
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import sessionmaker

from .models import Activity, ActivitySamples, Base


class Store:
    def __init__(self, directory: str | Path | None = None, database_url: str | None = None):
        self.directory = Path(directory or os.environ.get("OPEN_GARMIN_DATA_DIR", ".runtime")).resolve()
        self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.directory.chmod(0o700)
        keyfile = self.directory / "encryption.key"
        try:
            fd = os.open(keyfile, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            pass
        else:
            with os.fdopen(fd, "wb") as file:
                file.write(Fernet.generate_key())
        keyfile.chmod(0o600)
        self.fernet = Fernet(keyfile.read_bytes())
        self.archive_lock = threading.RLock()
        url = (
            database_url
            or os.environ.get("OPEN_GARMIN_DATABASE_URL")
            or f"sqlite:///{self.directory / 'app.db'}"
        )
        self.engine = create_engine(
            url,
            connect_args={"check_same_thread": False, "timeout": 30} if url.startswith("sqlite") else {},
            pool_pre_ping=True,
        )
        if url.startswith("sqlite"):

            @event.listens_for(self.engine, "connect")
            def configure_sqlite(connection, _):
                connection.execute("PRAGMA foreign_keys=ON")
                connection.execute("PRAGMA journal_mode=WAL")

        self.sessions = sessionmaker(self.engine, expire_on_commit=False)
        Base.metadata.create_all(self.engine)
        # Upgrade the initial pilot's inline samples once, without a network call.
        # Keeping streams separate makes ordinary dashboard polls inexpensive.
        with self.sessions.begin() as db:
            for row in db.scalars(select(Activity).execution_options(yield_per=20)):
                samples = row.data.get("samples", [])
                if len(samples) > 80 and not db.get(ActivitySamples, (row.user_id, row.id)):
                    db.add(ActivitySamples(user_id=row.user_id, activity_id=row.id, samples=samples))
                    step = max(1, (len(samples) + 69) // 70)
                    row.data = {**row.data, "samples": samples[::step], "sample_count": len(samples)}

    def encrypt(self, value: str) -> str:
        return self.fernet.encrypt(value.encode()).decode()

    def decrypt(self, value: str) -> str:
        return self.fernet.decrypt(value.encode()).decode()

    def archive_path(self, user_id: str, activity_id: str) -> Path:
        # Only app-generated user IDs and numeric Garmin IDs reach this path.
        import hashlib

        folder = self.directory / "originals" / hashlib.sha256(user_id.encode()).hexdigest()
        folder.mkdir(parents=True, exist_ok=True, mode=0o700)
        return folder / f"{hashlib.sha256(activity_id.encode()).hexdigest()}.zip"
