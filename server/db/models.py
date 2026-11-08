from __future__ import annotations

import secrets
from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Float,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


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


class ActivityDerived(Base):
    __tablename__ = "activity_derived"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    activity_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    version: Mapped[int] = mapped_column(Integer)
    data: Mapped[dict] = mapped_column(JSON)


class BestEffort(Base):
    __tablename__ = "best_efforts"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    activity_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    kind: Mapped[str] = mapped_column(String(60), primary_key=True)
    date: Mapped[str] = mapped_column(String(10), index=True)
    sport: Mapped[str] = mapped_column(String(20))
    value: Mapped[float] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String(20))
    start_offset_s: Mapped[float | None] = mapped_column(Float, nullable=True)


class CheckIn(Base):
    __tablename__ = "checkins"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    date: Mapped[str] = mapped_column(String(10), primary_key=True)
    mood: Mapped[int | None] = mapped_column(Integer, nullable=True)
    energy: Mapped[int | None] = mapped_column(Integer, nullable=True)
    soreness: Mapped[int | None] = mapped_column(Integer, nullable=True)
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[str] = mapped_column(String(40), default=now_iso)
    updated_at: Mapped[str] = mapped_column(String(40), default=now_iso)


class MilestoneAward(Base):
    __tablename__ = "milestone_awards"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    milestone_id: Mapped[str] = mapped_column(String(60), primary_key=True)
    earned_on: Mapped[str] = mapped_column(String(10))
    activity_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    value: Mapped[float | None] = mapped_column(Float, nullable=True)
    seen: Mapped[bool] = mapped_column(Boolean, default=False)


class WeeklyRecap(Base):
    __tablename__ = "weekly_recaps"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    week_start: Mapped[str] = mapped_column(String(10), primary_key=True)
    version: Mapped[int] = mapped_column(Integer)
    data: Mapped[dict] = mapped_column(JSON)
    seen: Mapped[bool] = mapped_column(Boolean, default=False)
