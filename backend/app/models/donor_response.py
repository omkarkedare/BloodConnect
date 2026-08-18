"""DonorResponse model — a donor's response to a blood request."""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.utils.enums import ResponseStatus


class DonorResponse(Base):
    __tablename__ = "donor_responses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    request_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("blood_requests.id", ondelete="CASCADE"), nullable=False
    )
    donor_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        Enum(ResponseStatus, values_callable=lambda e: [v.value for v in e]),
        nullable=False,
        default=ResponseStatus.PENDING.value,
    )
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default=None)
    responded_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ──────────────────────────────────────────
    # Many-to-One: DonorResponse → BloodRequest
    blood_request: Mapped["BloodRequest"] = relationship(
        "BloodRequest", back_populates="responses"
    )

    # Many-to-One: DonorResponse → User (donor)
    donor: Mapped["User"] = relationship(
        "User", back_populates="donor_responses", foreign_keys=[donor_id]
    )

    # ── Constraints & Indexes ──────────────────────────────────
    __table_args__ = (
        UniqueConstraint("request_id", "donor_id", name="uq_donor_request"),
        Index("ix_donor_responses_status", "status"),
    )

    def __repr__(self) -> str:
        return f"<DonorResponse(id={self.id}, request_id={self.request_id}, donor_id={self.donor_id}, status='{self.status}')>"
