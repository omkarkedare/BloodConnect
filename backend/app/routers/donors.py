from datetime import date, datetime
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_active_user, get_current_donor_user, get_current_requester_user
from app.database.database import get_db
from app.models.user import User
from app.models.donor_profile import DonorProfile
from app.schemas.donor import (
    DonorProfileCreate,
    DonorProfileUpdate,
    DonorProfileResponse,
    DonorReadinessResponse,
    DonorAchievementsResponse,
)
from app.services.donor_profile import check_donor_profile_completion
from app.services.achievements import calculate_donor_achievements
from app.utils.enums import BloodGroup

router = APIRouter()

@router.post("/", response_model=DonorProfileResponse)
def create_donor_profile(
    *,
    db: Session = Depends(get_db),
    profile_in: DonorProfileCreate,
    current_user: User = Depends(get_current_donor_user),
) -> Any:
    """Create a donor profile for the current user."""
    profile = db.query(DonorProfile).filter(DonorProfile.user_id == current_user.id).first()
    if profile:
        raise HTTPException(status_code=400, detail="Donor profile already exists.")
    
    if profile_in.weight_kg is not None and profile_in.weight_kg < 45:
        raise HTTPException(status_code=400, detail="Weight must be at least 45kg to donate.")

    if profile_in.date_of_birth:
        today = date.today()
        dob = profile_in.date_of_birth
        if isinstance(dob, datetime):
            dob = dob.date()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        if age < 18:
            raise HTTPException(status_code=400, detail="Donor must be at least 18 years old to donate.")

    db_profile = DonorProfile(
        user_id=current_user.id,
        blood_group=profile_in.blood_group.value,
        date_of_birth=profile_in.date_of_birth,
        gender=profile_in.gender.value,
        weight_kg=profile_in.weight_kg,
        address=profile_in.address,
        city=profile_in.city,
        state=profile_in.state,
        is_available=profile_in.is_available,
        medical_conditions=profile_in.medical_conditions,
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

@router.get("/readiness", response_model=DonorReadinessResponse)
def get_my_donor_readiness(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_donor_user),
) -> Any:
    """Get the current donor's profile completeness and response readiness status."""
    readiness = check_donor_profile_completion(current_user, db)
    return DonorReadinessResponse(
        is_active=readiness.is_active,
        has_profile=readiness.has_profile,
        is_complete=readiness.is_complete,
        missing_fields=readiness.missing_fields,
        validation_errors=readiness.validation_errors,
        is_available=readiness.is_available,
        can_respond=readiness.can_respond,
        reasons=readiness.reasons,
        blood_group=readiness.blood_group,
        city=readiness.city,
        weight_kg=readiness.weight_kg,
    )

@router.get("/achievements", response_model=DonorAchievementsResponse)
def get_my_donor_achievements(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_donor_user),
) -> Any:
    """Get the current donor's earned badges, highest achievement, and milestone progress."""
    return calculate_donor_achievements(current_user.id, db)

@router.get("/me", response_model=DonorProfileResponse)
def get_my_donor_profile(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_donor_user),
) -> Any:
    """Get the current user's donor profile."""
    profile = db.query(DonorProfile).filter(DonorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Donor profile not found.")
    return profile

@router.put("/me", response_model=DonorProfileResponse)
def update_my_donor_profile(
    *,
    db: Session = Depends(get_db),
    profile_in: DonorProfileUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Update the current user's donor profile (including availability)."""
    profile = db.query(DonorProfile).filter(DonorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Donor profile not found.")

    if profile_in.weight_kg is not None and profile_in.weight_kg < 45:
        raise HTTPException(status_code=400, detail="Weight must be at least 45kg to donate.")

    if profile_in.date_of_birth:
        today = date.today()
        dob = profile_in.date_of_birth
        if isinstance(dob, datetime):
            dob = dob.date()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        if age < 18:
            raise HTTPException(status_code=400, detail="Donor must be at least 18 years old to donate.")

    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(profile, field):
            if hasattr(value, "value"):  # Enum handling
                setattr(profile, field, value.value)
            else:
                setattr(profile, field, value)
                
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

@router.get("/", response_model=List[DonorProfileResponse])
def search_donors(
    *,
    db: Session = Depends(get_db),
    blood_group: Optional[BloodGroup] = None,
    city: Optional[str] = None,
    is_available: Optional[bool] = Query(default=None, description="Filter by availability"),
    current_user: User = Depends(get_current_requester_user),
) -> Any:
    """Search and filter donor profiles."""
    query = db.query(DonorProfile)
    
    if blood_group:
        query = query.filter(DonorProfile.blood_group == blood_group.value)
    if city:
        query = query.filter(DonorProfile.city.ilike(f"%{city}%"))
    if is_available is not None:
        query = query.filter(DonorProfile.is_available == is_available)
        
    return query.all()
