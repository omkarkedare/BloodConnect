"""Donor profile completion and readiness validation service."""

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional, List
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.donor_profile import DonorProfile
from app.models.blood_request import BloodRequest
from app.utils.enums import BloodGroup, Gender

MANDATORY_PROFILE_FIELDS = [
    "blood_group",
    "date_of_birth",
    "gender",
    "city",
    "weight_kg",
]

# ABO and Rh Blood Group Compatibility Matrix
# Recipient blood group -> List of medically compatible donor blood groups
COMPATIBLE_DONORS = {
    BloodGroup.A_POSITIVE: [BloodGroup.A_POSITIVE, BloodGroup.A_NEGATIVE, BloodGroup.O_POSITIVE, BloodGroup.O_NEGATIVE],
    BloodGroup.A_NEGATIVE: [BloodGroup.A_NEGATIVE, BloodGroup.O_NEGATIVE],
    BloodGroup.B_POSITIVE: [BloodGroup.B_POSITIVE, BloodGroup.B_NEGATIVE, BloodGroup.O_POSITIVE, BloodGroup.O_NEGATIVE],
    BloodGroup.B_NEGATIVE: [BloodGroup.B_NEGATIVE, BloodGroup.O_NEGATIVE],
    BloodGroup.AB_POSITIVE: [
        BloodGroup.A_POSITIVE, BloodGroup.A_NEGATIVE,
        BloodGroup.B_POSITIVE, BloodGroup.B_NEGATIVE,
        BloodGroup.AB_POSITIVE, BloodGroup.AB_NEGATIVE,
        BloodGroup.O_POSITIVE, BloodGroup.O_NEGATIVE,
    ],
    BloodGroup.AB_NEGATIVE: [BloodGroup.A_NEGATIVE, BloodGroup.B_NEGATIVE, BloodGroup.AB_NEGATIVE, BloodGroup.O_NEGATIVE],
    BloodGroup.O_POSITIVE: [BloodGroup.O_POSITIVE, BloodGroup.O_NEGATIVE],
    BloodGroup.O_NEGATIVE: [BloodGroup.O_NEGATIVE],
}


@dataclass
class DonorReadinessResult:
    is_active: bool
    has_profile: bool
    is_complete: bool
    missing_fields: List[str] = field(default_factory=list)
    validation_errors: List[str] = field(default_factory=list)
    is_available: bool = False
    can_respond: bool = False
    reasons: List[str] = field(default_factory=list)
    profile: Optional[DonorProfile] = None
    blood_group: Optional[str] = None
    city: Optional[str] = None
    weight_kg: Optional[float] = None


def check_donor_profile_completion(user: User, db: Session) -> DonorReadinessResult:
    """
    Centralized validation for donor profile completeness.
    Checks:
    1. The donor account is active.
    2. A DonorProfile exists.
    3. All required profile fields are present and valid (blood_group, date_of_birth, gender, city, weight_kg).
    4. Blood group is supported.
    5. Age is at least 18 years and weight is at least 45kg.
    6. Availability status.
    
    Keep profile completeness separate from current donation eligibility.
    Does NOT require a previous donation or verified donation history.
    """
    is_active = bool(user.is_active)
    validation_errors: List[str] = []
    if not is_active:
        validation_errors.append("User account is inactive.")

    profile = db.query(DonorProfile).filter(DonorProfile.user_id == user.id).first()
    
    if profile is None:
        missing_fields = list(MANDATORY_PROFILE_FIELDS)
        reasons = [
            "Donor profile has not been created yet.",
            f"Missing required profile fields: {', '.join(missing_fields)}."
        ]
        if not is_active:
            reasons.insert(0, "User account is inactive.")

        return DonorReadinessResult(
            is_active=is_active,
            has_profile=False,
            is_complete=False,
            missing_fields=missing_fields,
            validation_errors=validation_errors,
            is_available=False,
            can_respond=False,
            reasons=reasons,
            profile=None,
            blood_group=None,
            city=None,
            weight_kg=None,
        )

    missing_fields: List[str] = []

    # Blood group check
    valid_blood_groups = [e.value for e in BloodGroup]
    if not profile.blood_group or profile.blood_group not in valid_blood_groups:
        missing_fields.append("blood_group")

    # Date of birth and Age >= 18 check
    if not profile.date_of_birth:
        missing_fields.append("date_of_birth")
    else:
        dob = profile.date_of_birth
        if isinstance(dob, datetime):
            dob = dob.date()
        today = date.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        if age < 18:
            validation_errors.append("Donor must be at least 18 years old to donate.")

    # Gender check
    valid_genders = [e.value for e in Gender]
    if not profile.gender or profile.gender not in valid_genders:
        missing_fields.append("gender")

    # City check
    if not profile.city or not str(profile.city).strip():
        missing_fields.append("city")

    # Weight check (weight_kg >= 45)
    if profile.weight_kg is None:
        missing_fields.append("weight_kg")
    elif float(profile.weight_kg) < 45.0:
        validation_errors.append("Weight must be at least 45kg to donate.")

    is_complete = bool(is_active and not missing_fields and not validation_errors)
    is_available = bool(profile.is_available)
    can_respond = bool(is_complete and is_available)

    reasons: List[str] = []
    if not is_active:
        reasons.append("User account is inactive.")
    if missing_fields:
        reasons.append(f"Missing required profile fields: {', '.join(missing_fields)}.")
    if validation_errors:
        reasons.extend(validation_errors)
    if is_complete and not is_available:
        reasons.append("You are currently marked as unavailable for blood donation. Enable availability in your profile before responding.")
    if can_respond:
        reasons.append("Profile is complete and ready to respond to compatible blood requests.")

    return DonorReadinessResult(
        is_active=is_active,
        has_profile=True,
        is_complete=is_complete,
        missing_fields=missing_fields,
        validation_errors=validation_errors,
        is_available=is_available,
        can_respond=can_respond,
        reasons=reasons,
        profile=profile,
        blood_group=profile.blood_group,
        city=profile.city,
        weight_kg=float(profile.weight_kg) if profile.weight_kg is not None else None,
    )


def validate_donor_can_respond(
    donor: User,
    blood_request: BloodRequest,
    db: Session,
) -> DonorProfile:
    """
    Validates that a donor is fully eligible to respond to a blood request.
    Enforces:
    1. Profile completeness (DONOR_PROFILE_INCOMPLETE)
    2. Donor availability (DONOR_UNAVAILABLE)
    3. ABO/Rh blood group compatibility (BLOOD_GROUP_INCOMPATIBLE)
    """
    status = check_donor_profile_completion(donor, db)

    if not status.is_complete:
        missing_or_errors = []
        if status.missing_fields:
            missing_or_errors.append(f"missing fields: {', '.join(status.missing_fields)}")
        if status.validation_errors:
            missing_or_errors.extend(status.validation_errors)
        detail_msg = "; ".join(missing_or_errors) if missing_or_errors else "profile incomplete"
        raise HTTPException(
            status_code=400,
            detail=f"DONOR_PROFILE_INCOMPLETE: Please complete your donor profile before responding ({detail_msg})."
        )

    if not status.is_available:
        raise HTTPException(
            status_code=400,
            detail="DONOR_UNAVAILABLE: You are currently marked as unavailable for blood donation. Please enable availability in your profile before responding."
        )

    # Medically compatible check
    try:
        recipient_bg = BloodGroup(blood_request.blood_group)
        compatible_donor_groups = COMPATIBLE_DONORS.get(recipient_bg, [recipient_bg])
        donor_bg = BloodGroup(status.profile.blood_group)
    except (ValueError, KeyError):
        raise HTTPException(
            status_code=400,
            detail="BLOOD_GROUP_INCOMPATIBLE: Invalid blood group encountered during compatibility check."
        )

    if donor_bg not in compatible_donor_groups:
        raise HTTPException(
            status_code=400,
            detail=f"BLOOD_GROUP_INCOMPATIBLE: Donor blood group {donor_bg.value} is not medically compatible with recipient blood group {recipient_bg.value}."
        )

    return status.profile
