"""BloodRequest model — blood requests created by requesters."""

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.utils.enums import BloodGroup, RequestStatus, UrgencyLevel


class BloodRequest(Base):
    __tablename__ = "blood_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    requester_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    patient_name: Mapped[str] = mapped_column(String(150), nullable=False)
    blood_group: Mapped[str] = mapped_column(
        Enum(BloodGroup, values_callable=lambda e: [v.value for v in e]),
        nullable=False,
    )
    units_needed: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    urgency: Mapped[str] = mapped_column(
        Enum(UrgencyLevel, values_callable=lambda e: [v.value for v in e]),
        nullable=False,
        default=UrgencyLevel.NORMAL.value,
    )
    hospital_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hospital_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, default=None)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    contact_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    required_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default=None)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=None)
    status: Mapped[str] = mapped_column(
        Enum(RequestStatus, values_callable=lambda e: [v.value for v in e]),
        nullable=False,
        default=RequestStatus.OPEN.value,
    )
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
    # Many-to-One: BloodRequest → User (requester)
    requester: Mapped["User"] = relationship(
        "User", back_populates="blood_requests", foreign_keys=[requester_id]
    )

    # One-to-Many: BloodRequest → DonorResponse
    responses: Mapped[List["DonorResponse"]] = relationship(
        "DonorResponse", back_populates="blood_request", cascade="all, delete-orphan"
    )

    # One-to-Many: BloodRequest → DonationRecord (optional link)
    donation_records: Mapped[List["DonationRecord"]] = relationship(
        "DonationRecord", back_populates="blood_request"
    )

    # ── Constraints & Indexes ──────────────────────────────────
    __table_args__ = (
        CheckConstraint("units_needed >= 1", name="ck_blood_requests_units_min"),
        Index("ix_blood_requests_blood_group", "blood_group"),
        Index("ix_blood_requests_city", "city"),
        Index("ix_blood_requests_status", "status"),
        Index("ix_blood_requests_urgency", "urgency"),
        Index("ix_blood_requests_expires_at", "expires_at"),
    )

    def __repr__(self) -> str:
        return f"<BloodRequest(id={self.id}, blood_group='{self.blood_group}', status='{self.status}')>"
