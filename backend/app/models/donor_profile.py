"""DonorProfile model — extended profile for users with role='donor'."""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.utils.enums import BloodGroup, Gender


class DonorProfile(Base):
    __tablename__ = "donor_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    blood_group: Mapped[str] = mapped_column(
        Enum(BloodGroup, values_callable=lambda e: [v.value for v in e]),
        nullable=False,
    )
    date_of_birth: Mapped[datetime] = mapped_column(Date, nullable=False)
    gender: Mapped[str] = mapped_column(
        Enum(Gender, values_callable=lambda e: [v.value for v in e]),
        nullable=False,
    )
    weight_kg: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True, default=None)
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, default=None)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default=None)
    is_available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_donation_date: Mapped[Optional[datetime]] = mapped_column(Date, nullable=True, default=None)
    medical_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default=None)
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
    # Many-to-One: DonorProfile → User (1:1 enforced by unique user_id)
    user: Mapped["User"] = relationship("User", back_populates="donor_profile")

    # ── Constraints & Indexes ──────────────────────────────────
    __table_args__ = (
        CheckConstraint("weight_kg >= 45", name="ck_donor_profiles_weight_min"),
        Index("ix_donor_profiles_blood_group", "blood_group"),
        Index("ix_donor_profiles_city", "city"),
        Index("ix_donor_profiles_is_available", "is_available"),
    )

    def __repr__(self) -> str:
        return f"<DonorProfile(id={self.id}, user_id={self.user_id}, blood_group='{self.blood_group}')>"
