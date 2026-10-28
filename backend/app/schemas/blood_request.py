import unicodedata
from typing import Optional
from datetime import date, datetime, timezone
from pydantic import BaseModel, field_validator

from app.utils.enums import BloodGroup, UrgencyLevel, RequestStatus
from app.utils.validators import validate_human_name

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

    @field_validator('patient_name')
    @classmethod
    def validate_patient_name(cls, v: str) -> str:
        return validate_human_name(v, field_label='Patient name', min_length=2, max_length=150, required=True)

    @field_validator('hospital_name')
    @classmethod
    def validate_hospital_name(cls, v: str) -> str:
        cleaned = v.strip() if v else ""
        if len(cleaned) < 2:
            raise ValueError('Hospital / medical location name must be at least 2 characters.')
        return cleaned

    @field_validator('city')
    @classmethod
    def validate_city(cls, v: str) -> str:
        cleaned = v.strip() if v else ""
        if len(cleaned) < 2:
            raise ValueError('City name must be at least 2 characters.')
        return cleaned

    @field_validator('contact_phone')
    @classmethod
    def validate_contact_phone(cls, v: str) -> str:
        cleaned = v.strip() if v else ""
        digits = [c for c in cleaned if c.isdigit()]
        if len(digits) < 7:
            raise ValueError('Contact phone must contain at least 7 digits.')
        return cleaned

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

    @field_validator('patient_name')
    @classmethod
    def validate_patient_name_update(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return BloodRequestCreate.validate_patient_name(v)

    @field_validator('hospital_name')
    @classmethod
    def validate_hospital_name_update(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError('Hospital / medical location name must be at least 2 characters.')
        return cleaned

    @field_validator('city')
    @classmethod
    def validate_city_update(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError('City name must be at least 2 characters.')
        return cleaned

    @field_validator('contact_phone')
    @classmethod
    def validate_contact_phone_update(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        cleaned = v.strip()
        digits = [c for c in cleaned if c.isdigit()]
        if len(digits) < 7:
            raise ValueError('Contact phone must contain at least 7 digits.')
        return cleaned

class RequestDonationSummary(BaseModel):
    id: int
    donor_id: int
    donor_name: Optional[str] = None
    units_donated: int = 1
    donation_date: date
    hospital_name: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class BloodRequestResponse(BloodRequestBase):
    id: int
    requester_id: int
    status: RequestStatus
    display_status: str = "OPEN"
    display_label: str = "Open"
    verified_units: int = 0
    required_units: int = 1
    donation_status: Optional[str] = None
    donations: list[RequestDonationSummary] = []
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
