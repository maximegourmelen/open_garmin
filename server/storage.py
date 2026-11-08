from __future__ import annotations

import os
import secrets
import threading
from datetime import UTC, datetime
from pathlib import Path

from cryptography.fernet import Fernet
from sqlalchemy import (
    JSON,
    Boolean,
    Float,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    Text,
    create_engine,
    event,
    select,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: secrets.token_hex(16))
    email: Mapped[str] = mapped_column(String(320), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(String(120), default="Athlete")
    preferences: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[str] = mapped_column(String(40), default=now_iso)


class LoginSession(Base):
    __tablename__ = "sessions"
    digest: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[float] = mapped_column(Float)


class Connection(Base):
    __tablename__ = "connections"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    encrypted_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    region: Mapped[str] = mapped_column(String(8), default="com")
    profile: Mapped[dict] = mapped_column(JSON, default=dict)
    state: Mapped[str] = mapped_column(String(40), default="connected")
    last_checked: Mapped[str | None] = mapped_column(String(40), nullable=True)
    last_success: Mapped[str | None] = mapped_column(String(40), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)


class Activity(Base):
    __tablename__ = "activities"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    date: Mapped[str] = mapped_column(String(10), index=True)
    data: Mapped[dict] = mapped_column(JSON)
    raw: Mapped[dict] = mapped_column(JSON, default=dict)
    details_loaded: Mapped[bool] = mapped_column(Boolean, default=False)


class Daily(Base):
    __tablename__ = "daily"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    date: Mapped[str] = mapped_column(String(10), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON)
    raw: Mapped[dict] = mapped_column(JSON, default=dict)


class ActivitySamples(Base):
    __tablename__ = "activity_samples"
    __table_args__ = (
        ForeignKeyConstraint(
            ["user_id", "activity_id"], ["activities.user_id", "activities.id"], ondelete="CASCADE"
        ),
    )
    user_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    activity_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    samples: Mapped[list] = mapped_column(JSON, default=list)


class Note(Base):
    __tablename__ = "notes"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    activity_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    text: Mapped[str] = mapped_column(Text, default="")
    rpe: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tags: Mapped[list] = mapped_column(JSON, default=list)


class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: secrets.token_hex(16))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(30), default="sync")
    activity_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    days: Mapped[int] = mapped_column(Integer, default=90)
    state: Mapped[str] = mapped_column(String(30), default="queued", index=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    message: Mapped[str] = mapped_column(Text, default="Waiting to sync")
    created_at: Mapped[str] = mapped_column(String(40), default=now_iso)
    completed_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


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
