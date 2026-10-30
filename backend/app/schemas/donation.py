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

class DonationVerificationCreate(BaseModel):
    reference_number: str
    actual_donation_date: Optional[date] = None
    hospital_name: Optional[str] = None
    notes: Optional[str] = None

class DonationRejectionCreate(BaseModel):
    rejection_reason: str

class DonationRecordModel(DonationRecordBase):
    id: int
    donor_id: int
    verified_by: Optional[int] = None
    status: DonationStatus
    created_at: datetime

    class Config:
        from_attributes = True

class AdminDonationRecordResponse(DonationRecordModel):
    donor_name: Optional[str] = None
    donor_email: Optional[str] = None
    patient_name: Optional[str] = None
    verifier_name: Optional[str] = None

class DonationCertificateResponse(BaseModel):
    certificate_id: str
    donation_id: int
    donor_id: int
    donor_name: str
    blood_group: str
    units_donated: int
    donation_date: date
    hospital_name: Optional[str] = None
    verification_reference: Optional[str] = None
    verifier_name: Optional[str] = None
    verified_at: Optional[str] = None
    issued_at: datetime
    issuer: str = "BloodConnect Blood Donor Management System"

    class Config:
        from_attributes = True


class PublicCertificateVerificationResponse(BaseModel):
    is_valid: bool
    certificate_id: str
    status: Optional[str] = None
    donor_name: Optional[str] = None
    donor_name_masked: Optional[str] = None
    blood_group: Optional[str] = None
    units_donated: Optional[int] = None
    donation_date: Optional[date] = None
    hospital_name: Optional[str] = None
    verification_reference: Optional[str] = None
    verified_at: Optional[str] = None
    issuer: Optional[str] = None
    is_authenticated_view: bool = False
    name_verified: Optional[bool] = None
    message: str

    class Config:
        from_attributes = True
