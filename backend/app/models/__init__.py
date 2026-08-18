"""SQLAlchemy ORM models — Phase 3.

All models are imported here so that:
1. SQLAlchemy's Base.metadata registers every table.
2. Alembic autogenerate can discover all models.
3. Relationship strings (e.g. "User") resolve correctly.
"""

from app.models.user import User
from app.models.donor_profile import DonorProfile
from app.models.blood_request import BloodRequest
from app.models.donor_response import DonorResponse
from app.models.donation_record import DonationRecord
from app.models.notification import Notification

__all__ = [
    "User",
    "DonorProfile",
    "BloodRequest",
    "DonorResponse",
    "DonationRecord",
    "Notification",
]
