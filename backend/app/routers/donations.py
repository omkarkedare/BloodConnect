from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_active_user
from app.database.database import get_db
from app.models.user import User
from app.models.donation_record import DonationRecord
from app.schemas.donation import DonationRecordCreate, DonationRecordModel
from app.models.notification import Notification
from app.utils.enums import DonationStatus, NotificationType

router = APIRouter()

@router.post("/", response_model=DonationRecordModel)
def finalize_donation(
    *,
    db: Session = Depends(get_db),
    donation_in: DonationRecordCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Record a finalized donation."""
    if donation_in.units_donated < 1:
        raise HTTPException(status_code=400, detail="Units donated must be at least 1.")

    db_donation = DonationRecord(
        donor_id=donation_in.donor_id,
        request_id=donation_in.request_id,
        blood_group=donation_in.blood_group.value,
        units_donated=donation_in.units_donated,
        donation_date=donation_in.donation_date,
        hospital_name=donation_in.hospital_name,
        notes=donation_in.notes,
        status=DonationStatus.PENDING.value,
    )
    db.add(db_donation)
    
    # Notify donor
    notification = Notification(
        user_id=donation_in.donor_id,
        type=NotificationType.DONATION_VERIFIED.value,
        title="Donation Recorded",
        message=f"A donation of {donation_in.units_donated} units of {donation_in.blood_group.value} blood has been recorded.",
        link="/donations"
    )
    db.add(notification)
    
    db.commit()
    db.refresh(db_donation)
    return db_donation
