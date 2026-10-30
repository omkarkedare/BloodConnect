import hashlib
import hmac
import re
from datetime import datetime, timezone
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_donor_user, get_current_active_user, get_optional_current_user
from app.core.rate_limiter import rate_limit_certificate_verification
from app.database.database import get_db
from app.models.user import User
from app.models.donation_record import DonationRecord
from app.schemas.donation import (
    DonationRecordCreate,
    DonationRecordModel,
    DonationCertificateResponse,
    PublicCertificateVerificationResponse,
)
from app.schemas.donor import DonorAchievementsResponse
from app.services.achievements import calculate_donor_achievements
from app.models.notification import Notification
from app.utils.enums import DonationStatus, NotificationType, UserRole

router = APIRouter()


def generate_certificate_id(
    donation_id: int,
    donor_id: int,
    donation_date: str,
    secret_key: Optional[str] = None,
) -> str:
    """
    Generate a stable, tamper-resistant, collision-free Certificate ID.
    Derived deterministically via HMAC-SHA256 using the platform's active SECRET_KEY.
    Format: BC-CERT-{YYYYMMDD}-{DONATION_ID:05d}-{CHECKSUM:8s}
    """
    key = (secret_key or settings.SECRET_KEY).encode("utf-8")
    message = f"BC-CERT:{donation_id}:{donor_id}:{donation_date}".encode("utf-8")
    digest = hmac.new(key, message, hashlib.sha256).hexdigest().upper()
    date_compact = str(donation_date).replace("-", "")
    short_checksum = digest[:8]
    return f"BC-CERT-{date_compact}-{donation_id:05d}-{short_checksum}"


def mask_donor_name(name: Optional[str]) -> str:
    """
    Privacy-mask donor name for unauthenticated public viewers.
    Preserves initial grapheme/character of each token and masks remaining characters.
    Handles English, Devanagari (Hindi/Marathi), and other multilingual scripts.
    Example: 'John Alexander Doe' -> 'J*** A*** D***'
             'ओंकार केदारे' -> 'ओ*** के***'
    """
    if not name or not name.strip():
        return "V**** D****"

    tokens = name.strip().split()
    masked = []
    for t in tokens:
        if len(t) <= 1:
            masked.append(t)
        else:
            masked.append(f"{t[0]}***")
    return " ".join(masked)


def is_valid_certificate_hmac(
    provided_cert_id: str,
    donation_id: int,
    donor_id: int,
    donation_date: str,
) -> bool:
    """
    Verify HMAC checksum with active SECRET_KEY, falling back to
    historical PREVIOUS_SECRET_KEYS for safe zero-downtime key rotation.
    Uses constant-time comparison to eliminate timing side-channels.
    """
    try:
        # 1. Primary check against active SECRET_KEY
        expected_active = generate_certificate_id(
            donation_id, donor_id, donation_date, secret_key=settings.SECRET_KEY
        )
        if hmac.compare_digest(provided_cert_id.upper(), expected_active.upper()):
            return True

        # 2. Historical fallback against rotated previous keys (if configured)
        for past_key in settings.previous_secret_keys_list:
            expected_past = generate_certificate_id(
                donation_id, donor_id, donation_date, secret_key=past_key
            )
            if hmac.compare_digest(provided_cert_id.upper(), expected_past.upper()):
                return True
    except Exception:
        return False

    return False


def extract_verification_details(notes: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    """
    Extract reference number and audit verification timestamp from donation notes if available.
    """
    if not notes:
        return None, None
    ref_match = re.search(r"Ref:\s*([^\s\]]+)", notes)
    verified_at_match = re.search(r"Verified on\s+([0-9\-]+ [0-9:]+ UTC)", notes)
    ref = ref_match.group(1) if ref_match else None
    verified_at = verified_at_match.group(1) if verified_at_match else None
    return ref, verified_at


@router.get("/me", response_model=list[DonationRecordModel])
def get_my_donations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_donor_user),
) -> Any:
    """Get all donations for the current donor."""
    return db.query(DonationRecord).filter(DonationRecord.donor_id == current_user.id).all()


@router.get("/achievements", response_model=DonorAchievementsResponse)
def get_my_donation_achievements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_donor_user),
) -> Any:
    """Get the current donor's earned badges and milestone progress from verified donations."""
    return calculate_donor_achievements(current_user.id, db)


MAX_CERTIFICATE_ID_LEN = 64
CERTIFICATE_ID_REGEX = re.compile(r"^BC-CERT-(\d{8})-(\d{1,7})-([A-Fa-f0-9]{8})$")


def verify_certificate_record(
    certificate_id: str,
    db: Session,
    current_user: Optional[User] = None,
    verify_name: Optional[str] = None,
) -> PublicCertificateVerificationResponse:
    """
    Publicly verify the authenticity of a BloodConnect appreciation certificate.
    Applies privacy data minimization, rate limiting, and zero-leakage uniform rejection.
    """
    cleaned_id = (certificate_id or "").strip()
    if not cleaned_id or len(cleaned_id) > MAX_CERTIFICATE_ID_LEN:
        return PublicCertificateVerificationResponse(
            is_valid=False,
            certificate_id=cleaned_id[:MAX_CERTIFICATE_ID_LEN],
            message="Certificate not found or could not be verified.",
        )

    match = CERTIFICATE_ID_REGEX.match(cleaned_id)
    if not match:
        return PublicCertificateVerificationResponse(
            is_valid=False,
            certificate_id=cleaned_id,
            message="Certificate not found or could not be verified.",
        )

    date_compact, donation_id_str, _ = match.groups()
    try:
        donation_id = int(donation_id_str)
    except ValueError:
        return PublicCertificateVerificationResponse(
            is_valid=False,
            certificate_id=cleaned_id,
            message="Certificate not found or could not be verified.",
        )

    donation = db.query(DonationRecord).filter(DonationRecord.id == donation_id).first()
    if not donation:
        # Uniform failure message — do NOT reveal whether donation ID exists
        return PublicCertificateVerificationResponse(
            is_valid=False,
            certificate_id=cleaned_id,
            message="Certificate not found or could not be verified.",
        )

    status_val = donation.status.value if hasattr(donation.status, "value") else str(donation.status)
    if status_val.lower() != DonationStatus.VERIFIED.value.lower():
        # Uniform failure message — do NOT reveal if pending or rejected
        return PublicCertificateVerificationResponse(
            is_valid=False,
            certificate_id=cleaned_id,
            message="Certificate not found or could not be verified.",
        )

    # Re-compute & validate HMAC with key-rotation tolerance
    if not is_valid_certificate_hmac(cleaned_id, donation.id, donation.donor_id, str(donation.donation_date)):
        return PublicCertificateVerificationResponse(
            is_valid=False,
            certificate_id=cleaned_id,
            message="Certificate not found or could not be verified.",
        )

    donor_user = donation.donor if hasattr(donation, "donor") and donation.donor else db.query(User).filter(User.id == donation.donor_id).first()
    raw_donor_name = donor_user.full_name if donor_user else "Valued Blood Donor"
    masked_name = mask_donor_name(raw_donor_name)
    bg_val = donation.blood_group.value if hasattr(donation.blood_group, "value") else str(donation.blood_group)

    # Check if request is authenticated as owner donor or admin
    is_authenticated_viewer = False
    if current_user:
        is_owner = (donation.donor_id == current_user.id)
        is_admin = (current_user.role == UserRole.ADMIN.value)
        if is_owner or is_admin:
            is_authenticated_viewer = True

    # Check optional name verification request (by holder of certificate)
    name_matched = None
    if verify_name and verify_name.strip():
        norm_input = re.sub(r"\s+", " ", verify_name.strip().lower())
        norm_record = re.sub(r"\s+", " ", raw_donor_name.strip().lower())
        name_matched = (norm_input == norm_record)

    expected_cert_id = generate_certificate_id(donation.id, donation.donor_id, str(donation.donation_date))

    # PRIVACY DATA MINIMIZATION:
    # Full unmasked details only for authenticated owner or admin
    if is_authenticated_viewer:
        ref_num, verified_at = extract_verification_details(donation.notes)
        return PublicCertificateVerificationResponse(
            is_valid=True,
            certificate_id=expected_cert_id,
            status=DonationStatus.VERIFIED.value,
            donor_name=raw_donor_name,
            donor_name_masked=masked_name,
            blood_group=bg_val,
            units_donated=donation.units_donated or 1,
            donation_date=donation.donation_date,
            hospital_name=donation.hospital_name,
            verification_reference=ref_num,
            verified_at=verified_at,
            issuer="BloodConnect Blood Donor Management System",
            is_authenticated_view=True,
            name_verified=True,
            message="Certificate is authentic and officially verified by BloodConnect.",
        )

    # Public unauthenticated viewer: Minimized PII
    display_name = raw_donor_name if name_matched is True else masked_name
    msg = (
        "Certificate is authentic and donor name successfully verified."
        if name_matched is True
        else (
            "Certificate is authentic, but provided name does not match registry records."
            if name_matched is False
            else "Certificate is authentic and officially verified by BloodConnect."
        )
    )

    return PublicCertificateVerificationResponse(
        is_valid=True,
        certificate_id=expected_cert_id,
        status=DonationStatus.VERIFIED.value,
        donor_name=display_name,
        donor_name_masked=masked_name,
        blood_group=bg_val,
        units_donated=donation.units_donated or 1,
        donation_date=donation.donation_date,
        hospital_name=None,               # Withheld from public for privacy
        verification_reference=None,      # Withheld from public for privacy
        verified_at=None,                 # Withheld from public for privacy
        issuer="BloodConnect Blood Donor Management System",
        is_authenticated_view=False,
        name_verified=name_matched,
        message=msg,
    )


@router.get("/verify/{certificate_id}", response_model=PublicCertificateVerificationResponse)
def verify_certificate_public(
    certificate_id: str,
    name: Optional[str] = Query(None, description="Optional donor name printed on certificate to verify match"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
    _rate_limit: None = Depends(rate_limit_certificate_verification),
) -> Any:
    """
    Public endpoint to verify the authenticity of a BloodConnect donation certificate.
    Rate-limited, privacy-hardened, and protected against certificate enumeration.
    """
    return verify_certificate_record(certificate_id, db, current_user=current_user, verify_name=name)


@router.get("/certificates/verify/{certificate_id}", response_model=PublicCertificateVerificationResponse)
def verify_certificate_public_alias(
    certificate_id: str,
    name: Optional[str] = Query(None, description="Optional donor name printed on certificate to verify match"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
    _rate_limit: None = Depends(rate_limit_certificate_verification),
) -> Any:
    """
    Alias public endpoint for certificate verification.
    Rate-limited and privacy-hardened.
    """
    return verify_certificate_record(certificate_id, db, current_user=current_user, verify_name=name)


@router.get("/{donation_id}/certificate", response_model=DonationCertificateResponse)
def get_donation_certificate(
    donation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get the official appreciation certificate for a verified blood donation.
    Authorized for the owning donor or administrators only.
    """
    donation = db.query(DonationRecord).filter(DonationRecord.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation record not found.")

    # Authorization: Owning donor or admin only
    is_owner = (donation.donor_id == current_user.id and current_user.role == UserRole.DONOR.value)
    is_admin = (current_user.role == UserRole.ADMIN.value)
    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view or download this certificate.",
        )

    # Verification status check
    status_val = donation.status.value if hasattr(donation.status, "value") else str(donation.status)
    if status_val.lower() != DonationStatus.VERIFIED.value.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Appreciation certificates can only be issued for verified donations.",
        )

    donor_user = donation.donor if hasattr(donation, "donor") and donation.donor else db.query(User).filter(User.id == donation.donor_id).first()
    donor_name = donor_user.full_name if donor_user else "Valued Blood Donor"

    verifier_user = donation.verifier if hasattr(donation, "verifier") and donation.verifier else None
    verifier_name = verifier_user.full_name if verifier_user else "Authorized Medical Admin"

    ref_num, verified_at = extract_verification_details(donation.notes)

    cert_id = generate_certificate_id(
        donation_id=donation.id,
        donor_id=donation.donor_id,
        donation_date=str(donation.donation_date),
    )

    bg_val = donation.blood_group.value if hasattr(donation.blood_group, "value") else str(donation.blood_group)

    return DonationCertificateResponse(
        certificate_id=cert_id,
        donation_id=donation.id,
        donor_id=donation.donor_id,
        donor_name=donor_name,
        blood_group=bg_val,
        units_donated=donation.units_donated or 1,
        donation_date=donation.donation_date,
        hospital_name=donation.hospital_name,
        verification_reference=ref_num,
        verifier_name=verifier_name,
        verified_at=verified_at,
        issued_at=datetime.now(timezone.utc),
        issuer="BloodConnect Blood Donor Management System",
    )

@router.post("/", response_model=DonationRecordModel)
def finalize_donation(
    *,
    db: Session = Depends(get_db),
    donation_in: DonationRecordCreate,
    current_user: User = Depends(get_current_donor_user),
) -> Any:
    """Record a finalized donation."""
    if donation_in.units_donated < 1:
        raise HTTPException(status_code=400, detail="Units donated must be at least 1.")

    db_donation = DonationRecord(
        donor_id=donation_in.donor_id,
        request_id=donation_in.request_id,
        blood_group=donation_in.blood_group.value,
        units_donated=donation_in.units_donated,
        donation_date=donation_in.donation_date,
        hospital_name=donation_in.hospital_name,
        notes=donation_in.notes,
        status=DonationStatus.PENDING.value,
    )
    db.add(db_donation)
    
    # Notify donor
    notification = Notification(
        user_id=donation_in.donor_id,
        type=NotificationType.DONATION_VERIFIED.value,
        title="Donation Recorded",
        message=f"A donation of {donation_in.units_donated} units of {donation_in.blood_group.value} blood has been recorded.",
        link="/donor/donations"
    )
    db.add(notification)
    
    if donation_in.request_id:
        from app.models.blood_request import BloodRequest
        from app.utils.enums import RequestStatus
        blood_req = db.query(BloodRequest).filter(BloodRequest.id == donation_in.request_id).first()
        if blood_req:
            blood_req.status = RequestStatus.FULFILLED.value
            
            # Notify requester
            req_notification = Notification(
                user_id=blood_req.requester_id,
                type=NotificationType.SYSTEM.value,
                title="Donation Finalized",
                message=f"A donation of {donation_in.units_donated} units of {donation_in.blood_group.value} blood has been finalized for your request.",
                link=f"/requester/requests/{blood_req.id}"
            )
            db.add(req_notification)
    
    db.commit()
    db.refresh(db_donation)
    return db_donation
