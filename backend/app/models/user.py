"""User model — core authentication and profile entity."""

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Index,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.utils.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default=None)
    role: Mapped[str] = mapped_column(
        Enum(UserRole, values_callable=lambda e: [v.value for v in e]),
        nullable=False,
        default=UserRole.DONOR.value,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ──────────────────────────────────────────
    # One-to-One: User → DonorProfile
    donor_profile: Mapped[Optional["DonorProfile"]] = relationship(
        "DonorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )

    # One-to-Many: User (as requester) → BloodRequest
    blood_requests: Mapped[List["BloodRequest"]] = relationship(
        "BloodRequest", back_populates="requester", cascade="all, delete-orphan",
        foreign_keys="BloodRequest.requester_id",
    )

    # One-to-Many: User (as donor) → DonorResponse
    donor_responses: Mapped[List["DonorResponse"]] = relationship(
        "DonorResponse", back_populates="donor", cascade="all, delete-orphan",
        foreign_keys="DonorResponse.donor_id",
    )

    # One-to-Many: User (as donor) → DonationRecord
    donations: Mapped[List["DonationRecord"]] = relationship(
        "DonationRecord", back_populates="donor", cascade="all, delete-orphan",
        foreign_keys="DonationRecord.donor_id",
    )

    # One-to-Many: User → Notification
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan",
        foreign_keys="Notification.user_id",
    )

    # ── Table indexes ──────────────────────────────────────────
    __table_args__ = (
        Index("ix_users_role", "role"),
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"
