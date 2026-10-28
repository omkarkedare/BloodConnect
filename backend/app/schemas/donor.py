from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel

from app.utils.enums import BloodGroup, Gender

class DonorProfileBase(BaseModel):
    blood_group: BloodGroup
    date_of_birth: date
    gender: Gender
    weight_kg: Optional[float] = None
    address: Optional[str] = None
    city: str
    state: Optional[str] = None
    is_available: bool = True
    medical_conditions: Optional[str] = None

class DonorProfileCreate(DonorProfileBase):
    pass

class DonorProfileUpdate(BaseModel):
    blood_group: Optional[BloodGroup] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    weight_kg: Optional[float] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    is_available: Optional[bool] = None
    medical_conditions: Optional[str] = None

class DonorProfileResponse(DonorProfileBase):
    id: int
    user_id: int
    last_donation_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class EmergencyDonorMatchResponse(BaseModel):
    id: int
    user_id: int
    blood_group: BloodGroup
    gender: Gender
    city: Optional[str] = None
    state: Optional[str] = None
    is_available: bool = True
    last_donation_date: Optional[date] = None
    is_same_city: bool = False
    match_type: str = "COMPATIBLE"
    match_reasons: list[str] = []

    class Config:
        from_attributes = True

class AdminDonorResponse(BaseModel):
    id: int
    user_id: int
    profile_id: Optional[int] = None
    full_name: str
    email: str
    phone: Optional[str] = None
    role: str
    is_active: bool
    has_completed_profile: bool
    blood_group: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    is_available: bool = False
    last_donation_date: Optional[date] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DonorReadinessResponse(BaseModel):
    is_active: bool
    has_profile: bool
    is_complete: bool
    missing_fields: list[str] = []
    validation_errors: list[str] = []
    is_available: bool = False
    can_respond: bool = False
    reasons: list[str] = []
    blood_group: Optional[str] = None
    city: Optional[str] = None
    weight_kg: Optional[float] = None

    class Config:
        from_attributes = True
