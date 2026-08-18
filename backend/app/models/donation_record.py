"""DonationRecord model — records of completed blood donations."""

from datetime import datetime, timezone
from typing import Optional

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
from app.utils.enums import BloodGroup, DonationStatus


class DonationRecord(Base):
    __tablename__ = "donation_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    donor_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    request_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("blood_requests.id", ondelete="SET NULL"), nullable=True, default=None
    )
    blood_group: Mapped[str] = mapped_column(
        Enum(BloodGroup, values_callable=lambda e: [v.value for v in e]),
        nullable=False,
    )
    units_donated: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    donation_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    hospital_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, default=None)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default=None)
    verified_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, default=None
    )
    status: Mapped[str] = mapped_column(
        Enum(DonationStatus, values_callable=lambda e: [v.value for v in e]),
        nullable=False,
        default=DonationStatus.PENDING.value,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # ── Relationships ──────────────────────────────────────────
    # Many-to-One: DonationRecord → User (donor)
    donor: Mapped["User"] = relationship(
        "User", back_populates="donations", foreign_keys=[donor_id]
    )

    # Many-to-One: DonationRecord → BloodRequest (optional)
    blood_request: Mapped[Optional["BloodRequest"]] = relationship(
        "BloodRequest", back_populates="donation_records"
    )

    # Many-to-One: DonationRecord → User (admin verifier)
    verifier: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[verified_by]
    )

    # ── Constraints & Indexes ──────────────────────────────────
    __table_args__ = (
        CheckConstraint("units_donated >= 1", name="ck_donation_records_units_min"),
        Index("ix_donation_records_donor_id", "donor_id"),
        Index("ix_donation_records_donation_date", "donation_date"),
    )

    def __repr__(self) -> str:
        return f"<DonationRecord(id={self.id}, donor_id={self.donor_id}, status='{self.status}')>"
