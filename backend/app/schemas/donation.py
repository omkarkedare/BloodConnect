from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel

from app.utils.enums import BloodGroup, DonationStatus

class DonationRecordBase(BaseModel):
    donor_id: int
    request_id: Optional[int] = None
    blood_group: BloodGroup
    units_donated: int = 1
    donation_date: date
    hospital_name: Optional[str] = None
    notes: Optional[str] = None

class DonationRecordCreate(DonationRecordBase):
    pass

class DonationRecordUpdate(BaseModel):
    status: Optional[DonationStatus] = None
    notes: Optional[str] = None

class DonationRecordModel(DonationRecordBase):
    id: int
    donor_id: int
    verified_by: Optional[int] = None
    status: DonationStatus
    created_at: datetime

    class Config:
        from_attributes = True
