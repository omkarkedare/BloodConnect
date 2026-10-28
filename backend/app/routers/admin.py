from datetime import datetime, timezone
from typing import Any, List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.deps import get_current_admin_user
from app.database.database import get_db
from app.models.user import User
from app.models.blood_request import BloodRequest
from app.models.donor_profile import DonorProfile
from app.models.donor_response import DonorResponse
from app.models.donation_record import DonationRecord
from app.models.notification import Notification
from app.schemas.user import UserResponse
from app.schemas.blood_request import BloodRequestResponse
from app.schemas.donor import DonorProfileResponse, AdminDonorResponse
from app.schemas.response import DonorResponseModel
from app.schemas.donation import (
    DonationRecordModel,
    DonationVerificationCreate,
    DonationRejectionCreate,
    AdminDonationRecordResponse,
)
from app.utils.enums import UserRole, RequestStatus, DonationStatus, NotificationType

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

@router.get("/donors", response_model=List[AdminDonorResponse])
def get_all_donors(
    limit: Optional[int] = Query(default=None, description="Limit result count"),
    skip: int = Query(default=0, ge=0, description="Offset result count"),
    has_profile: Optional[bool] = Query(default=None, description="Filter by profile completion status"),
    blood_group: Optional[str] = Query(default=None, description="Filter by blood group"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> Any:
    """
    Retrieve all registered donors (including those without completed profiles).
    Uses an outer join to guarantee no registered donor is missed.
    """
    query = (
        db.query(User, DonorProfile)
        .outerjoin(DonorProfile, User.id == DonorProfile.user_id)
        .filter(User.role == UserRole.DONOR.value)
        .order_by(User.created_at.desc())
    )

    results = query.all()

    donor_list = []
    for user, profile in results:
        has_completed = profile is not None
        if has_profile is not None and has_completed != has_profile:
            continue

        bg_val = None
        if profile and profile.blood_group:
            bg_val = (
                profile.blood_group.value
                if hasattr(profile.blood_group, "value")
                else str(profile.blood_group)
            )

        if blood_group and bg_val != blood_group:
            continue

        gender_val = None
        if profile and profile.gender:
            gender_val = (
                profile.gender.value
                if hasattr(profile.gender, "value")
                else str(profile.gender)
            )

        donor_list.append(
            AdminDonorResponse(
                id=user.id,
                user_id=user.id,
                profile_id=profile.id if profile else None,
                full_name=user.full_name,
                email=user.email,
                phone=user.phone,
                role=user.role.value if hasattr(user.role, "value") else str(user.role),
                is_active=user.is_active,
                has_completed_profile=has_completed,
                blood_group=bg_val,
                date_of_birth=profile.date_of_birth if profile else None,
                gender=gender_val,
                city=profile.city if profile else None,
                state=profile.state if profile else None,
                is_available=profile.is_available if profile else False,
                last_donation_date=profile.last_donation_date if profile else None,
                created_at=user.created_at,
            )
        )

    if skip > 0:
        donor_list = donor_list[skip:]
    if limit is not None and limit > 0:
        donor_list = donor_list[:limit]

    return donor_list

@router.get("/responses", response_model=List[DonorResponseModel])
def get_all_responses(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> Any:
    """Retrieve all donor responses."""
    return db.query(DonorResponse).all()

@router.get("/donations", response_model=List[AdminDonationRecordResponse])
def get_all_donations(
    status: Optional[str] = Query(default=None, description="Filter by status (pending, verified, rejected)"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> Any:
    """Retrieve all donation records with enriched donor, request, and verifier details."""
    query = db.query(DonationRecord).order_by(DonationRecord.created_at.desc())
    if status:
        query = query.filter(DonationRecord.status == status)
    donations = query.all()

    responses = []
    for d in donations:
        donor_name = d.donor.full_name if d.donor else None
        donor_email = d.donor.email if d.donor else None
        patient_name = d.blood_request.patient_name if d.blood_request else None
        verifier_name = d.verifier.full_name if d.verifier else None

        responses.append(
            AdminDonationRecordResponse(
                id=d.id,
                donor_id=d.donor_id,
                request_id=d.request_id,
                blood_group=d.blood_group,
                units_donated=d.units_donated,
                donation_date=d.donation_date,
                hospital_name=d.hospital_name,
                notes=d.notes,
                verified_by=d.verified_by,
                status=d.status,
                created_at=d.created_at,
                donor_name=donor_name,
                donor_email=donor_email,
                patient_name=patient_name,
                verifier_name=verifier_name,
            )
        )
    return responses

@router.put("/donations/{donation_id}/verify", response_model=AdminDonationRecordResponse)
def verify_donation(
    donation_id: int,
    verification_in: DonationVerificationCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> Any:
    """
    Verify an eligible PENDING donation record with required confirmation reference.
    Idempotent and executed in a single transaction.
    """
    if not verification_in.reference_number or not verification_in.reference_number.strip():
        raise HTTPException(
            status_code=400,
            detail="Verification reference or hospital record ID is required.",
        )

    donation = db.query(DonationRecord).filter(DonationRecord.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation record not found.")

    # Idempotency & Eligibility
    if donation.status == DonationStatus.VERIFIED.value:
        raise HTTPException(status_code=400, detail="Donation record has already been verified.")
    if donation.status != DonationStatus.PENDING.value:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot verify donation with status '{donation.status}'. Only PENDING donations can be verified.",
        )

    ref_clean = verification_in.reference_number.strip()
    actual_date = verification_in.actual_donation_date or donation.donation_date

    # Update donation fields
    donation.status = DonationStatus.VERIFIED.value
    donation.verified_by = admin_user.id
    donation.donation_date = actual_date
    if verification_in.hospital_name and verification_in.hospital_name.strip():
        donation.hospital_name = verification_in.hospital_name.strip()

    # Verification audit note
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    audit_note = f"[Verified on {now_utc} by Admin #{admin_user.id} ({admin_user.full_name}) | Ref: {ref_clean}]"
    if verification_in.notes and verification_in.notes.strip():
        audit_note += f" Notes: {verification_in.notes.strip()}"

    donation.notes = f"{donation.notes}\n{audit_note}" if donation.notes else audit_note

    # Update DonorProfile last_donation_date using actual donation date
    donor_profile = db.query(DonorProfile).filter(DonorProfile.user_id == donation.donor_id).first()
    if donor_profile:
        donor_profile.last_donation_date = actual_date
        db.add(donor_profile)

    # Send in-app DONATION_VERIFIED notification to donor
    notification = Notification(
        user_id=donation.donor_id,
        type=NotificationType.DONATION_VERIFIED.value,
        title="Donation Verified",
        message=(
            f"Your blood donation of {donation.units_donated} unit(s) ({donation.blood_group}) "
            f"at {donation.hospital_name or 'the hospital'} has been officially verified (Ref: {ref_clean})."
        ),
        link="/donor/donations",
    )
    db.add(notification)

    # Notify owning requester if donation is linked to a blood request
    if donation.blood_request and donation.blood_request.requester_id:
        req_notif = Notification(
            user_id=donation.blood_request.requester_id,
            type=NotificationType.DONATION_VERIFIED.value,
            title="Blood Donation Verified",
            message=(
                f"Great news! The blood donation of {donation.units_donated} unit(s) ({donation.blood_group}) "
                f"for patient {donation.blood_request.patient_name} has been officially verified."
            ),
            link=f"/requester/requests/{donation.blood_request.id}",
        )
        db.add(req_notif)

    db.commit()
    db.refresh(donation)

    return AdminDonationRecordResponse(
        id=donation.id,
        donor_id=donation.donor_id,
        request_id=donation.request_id,
        blood_group=donation.blood_group,
        units_donated=donation.units_donated,
        donation_date=donation.donation_date,
        hospital_name=donation.hospital_name,
        notes=donation.notes,
        verified_by=donation.verified_by,
        status=donation.status,
        created_at=donation.created_at,
        donor_name=donation.donor.full_name if donation.donor else None,
        donor_email=donation.donor.email if donation.donor else None,
        patient_name=donation.blood_request.patient_name if donation.blood_request else None,
        verifier_name=admin_user.full_name,
    )

@router.put("/donations/{donation_id}/reject", response_model=AdminDonationRecordResponse)
def reject_donation(
    donation_id: int,
    rejection_in: DonationRejectionCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> Any:
    """Reject an eligible PENDING donation record."""
    if not rejection_in.rejection_reason or not rejection_in.rejection_reason.strip():
        raise HTTPException(status_code=400, detail="Rejection reason is required.")

    donation = db.query(DonationRecord).filter(DonationRecord.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation record not found.")

    if donation.status != DonationStatus.PENDING.value:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject donation with status '{donation.status}'. Only PENDING donations can be rejected.",
        )

    reason_clean = rejection_in.rejection_reason.strip()
    donation.status = DonationStatus.REJECTED.value
    donation.verified_by = admin_user.id

    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    audit_note = f"[Rejected on {now_utc} by Admin #{admin_user.id} ({admin_user.full_name}) | Reason: {reason_clean}]"
    donation.notes = f"{donation.notes}\n{audit_note}" if donation.notes else audit_note

    # Notify donor of rejection
    notification = Notification(
        user_id=donation.donor_id,
        type=NotificationType.SYSTEM.value,
        title="Donation Verification Rejected",
        message=f"Your donation record #{donation.id} could not be verified. Reason: {reason_clean}",
        link="/donor/donations",
    )
    db.add(notification)

    # Notify owning requester if linked to a blood request
    if donation.blood_request and donation.blood_request.requester_id:
        req_notif = Notification(
            user_id=donation.blood_request.requester_id,
            type=NotificationType.SYSTEM.value,
            title="Donation Verification Rejected",
            message=(
                f"Attention: A blood donation attempt for patient {donation.blood_request.patient_name} "
                f"could not be verified by the admin. Please review your request to coordinate a replacement donor."
            ),
            link=f"/requester/requests/{donation.blood_request.id}",
        )
        db.add(req_notif)

    db.commit()
    db.refresh(donation)

    return AdminDonationRecordResponse(
        id=donation.id,
        donor_id=donation.donor_id,
        request_id=donation.request_id,
        blood_group=donation.blood_group,
        units_donated=donation.units_donated,
        donation_date=donation.donation_date,
        hospital_name=donation.hospital_name,
        notes=donation.notes,
        verified_by=donation.verified_by,
        status=donation.status,
        created_at=donation.created_at,
        donor_name=donation.donor.full_name if donation.donor else None,
        donor_email=donation.donor.email if donation.donor else None,
        patient_name=donation.blood_request.patient_name if donation.blood_request else None,
        verifier_name=admin_user.full_name,
    )

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

    return {
        "total_users": total_users,
        "total_donors": total_donors,
        "active_blood_requests": active_blood_requests,
        "completed_donations": completed_donations
    }
