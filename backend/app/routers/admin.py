from typing import Any, List, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.deps import get_current_admin_user
from app.database.database import get_db
from app.models.user import User
from app.models.blood_request import BloodRequest
from app.models.donor_profile import DonorProfile
from app.models.donor_response import DonorResponse
from app.models.donation_record import DonationRecord
from app.schemas.user import UserResponse
from app.schemas.blood_request import BloodRequestResponse
from app.schemas.donor import DonorProfileResponse
from app.schemas.response import DonorResponseModel
from app.schemas.donation import DonationRecordModel
from app.utils.enums import UserRole, RequestStatus, DonationStatus

router = APIRouter()

class UserStatusUpdate(BaseModel):
    is_active: bool

@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> Any:
    """Retrieve all users."""
    return db.query(User).all()

@router.put("/users/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int,
    status_in: UserStatusUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> Any:
    """Activate or deactivate a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.is_active = status_in.is_active
    db.commit()
    db.refresh(user)
    return user

@router.get("/requests", response_model=List[BloodRequestResponse])
def get_all_requests(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> Any:
    """Retrieve all blood requests."""
    return db.query(BloodRequest).all()

@router.get("/donors", response_model=List[DonorProfileResponse])
def get_all_donors(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> Any:
    """Retrieve all donor profiles."""
    return db.query(DonorProfile).all()

@router.get("/responses", response_model=List[DonorResponseModel])
def get_all_responses(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> Any:
    """Retrieve all donor responses."""
    return db.query(DonorResponse).all()

@router.get("/donations", response_model=List[DonationRecordModel])
def get_all_donations(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> Any:
    """Retrieve all donation records."""
    return db.query(DonationRecord).all()

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> Dict[str, Any]:
    """Retrieve basic dashboard statistics."""
    total_users = db.query(User).count()
    total_donors = db.query(User).filter(User.role == UserRole.DONOR.value).count()
    active_blood_requests = db.query(BloodRequest).filter(
        BloodRequest.status.in_([RequestStatus.OPEN.value, RequestStatus.IN_PROGRESS.value])
    ).count()
    completed_donations = db.query(DonationRecord).filter(
        DonationRecord.status == DonationStatus.VERIFIED.value
    ).count()
    
    # Alternatively count all donations if verification is not fully mapped out:
    # let's just count all for this basic version since earlier it defaults to PENDING.
    # To be safe, let's include all. Wait, prompt says "completed donations", verified is best.
    
    return {
        "total_users": total_users,
        "total_donors": total_donors,
        "active_blood_requests": active_blood_requests,
        "completed_donations": completed_donations
    }
