from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel

from app.utils.enums import BloodGroup, UrgencyLevel, RequestStatus

class BloodRequestBase(BaseModel):
    patient_name: str
    blood_group: BloodGroup
    units_needed: int = 1
    urgency: UrgencyLevel = UrgencyLevel.NORMAL
    hospital_name: str
    hospital_address: Optional[str] = None
    city: str
    contact_phone: str
    required_date: date
    description: Optional[str] = None

class BloodRequestCreate(BloodRequestBase):
    pass

class BloodRequestUpdate(BaseModel):
    patient_name: Optional[str] = None
    blood_group: Optional[BloodGroup] = None
    units_needed: Optional[int] = None
    urgency: Optional[UrgencyLevel] = None
    hospital_name: Optional[str] = None
    hospital_address: Optional[str] = None
    city: Optional[str] = None
    contact_phone: Optional[str] = None
    required_date: Optional[date] = None
    description: Optional[str] = None
    status: Optional[RequestStatus] = None

class BloodRequestResponse(BloodRequestBase):
    id: int
    requester_id: int
    status: RequestStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
