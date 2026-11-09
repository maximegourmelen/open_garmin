from __future__ import annotations

import os
import threading
from pathlib import Path
from tempfile import TemporaryDirectory

from cryptography.fernet import Fernet
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from .models import Base


class Store:
    def __init__(
        self,
        directory: str | Path | None = None,
        database_url: str | None = None,
        in_memory: bool = False,
        temporary: bool = False,
    ):
        self._temporary_directory = (
            TemporaryDirectory(prefix="open-garmin-demo-") if in_memory or temporary else None
        )
        root = self._temporary_directory.name if self._temporary_directory else directory
        self.directory = Path(root or os.environ.get("OPEN_GARMIN_DATA_DIR", ".runtime")).resolve()
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
            "sqlite+pysqlite:///:memory:"
            if in_memory
            else database_url
            or os.environ.get("OPEN_GARMIN_DATABASE_URL")
            or f"sqlite:///{self.directory / 'app.db'}"
        )
        self.engine = create_engine(
            url,
            connect_args={"check_same_thread": False, "timeout": 30} if url.startswith("sqlite") else {},
            pool_pre_ping=True,
            **({"poolclass": StaticPool} if in_memory else {}),
        )
        if url.startswith("sqlite"):

            @event.listens_for(self.engine, "connect")
            def configure_sqlite(connection, _):
                connection.execute("PRAGMA foreign_keys=ON")
                connection.execute("PRAGMA journal_mode=WAL")

        self.sessions = sessionmaker(self.engine, expire_on_commit=False)
        Base.metadata.create_all(self.engine)

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
