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
