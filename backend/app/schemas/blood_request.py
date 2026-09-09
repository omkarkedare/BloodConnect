from typing import Optional
from datetime import date, datetime, timezone
from pydantic import BaseModel, field_validator

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
    expires_at: datetime

    @field_validator('required_date')
    @classmethod
    def date_must_not_be_in_past(cls, v: date):
        if v < date.today():
            raise ValueError('Required date cannot be in the past')
        return v

    @field_validator('expires_at')
    @classmethod
    def expires_at_must_be_in_future(cls, v: datetime):
        now = datetime.now(timezone.utc)
        # Make naive datetimes UTC-aware for comparison
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        if v <= now:
            raise ValueError('Expiration time must be in the future')
        return v

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
    expires_at: Optional[datetime] = None

class BloodRequestResponse(BloodRequestBase):
    id: int
    requester_id: int
    status: RequestStatus
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
