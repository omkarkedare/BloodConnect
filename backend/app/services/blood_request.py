"""
Service for computing requester-facing blood request lifecycle and donation progress.
Preserves existing MySQL database enums while providing accurate, transparent progress states.
"""

from typing import Optional, List, Tuple
from datetime import date, datetime

from app.models.blood_request import BloodRequest
from app.models.donation_record import DonationRecord
from app.models.donor_response import DonorResponse
from app.utils.enums import RequestStatus, ResponseStatus, DonationStatus
from app.schemas.blood_request import RequestDonationSummary, BloodRequestResponse


def compute_request_display_progress(
    blood_req: BloodRequest,
    donation_records: Optional[List[DonationRecord]] = None,
    responses: Optional[List[DonorResponse]] = None,
) -> Tuple[str, str, Optional[str], int, int, List[RequestDonationSummary]]:
    """
    Computes:
    - display_status: str (e.g. 'OPEN', 'MATCHED', 'PENDING', 'PARTIALLY_VERIFIED', 'VERIFIED', 'REJECTED', 'EXPIRED', 'CANCELLED')
    - display_label: str (e.g. 'Open', 'Matched', 'Pending Verification', 'Partially Verified (1/2 Units)', 'Donation Verified', 'Donation Rejected', 'Expired', 'Cancelled')
    - donation_status: Optional[str] ('pending', 'partially_verified', 'verified', 'rejected', None)
    - verified_units: int
    - required_units: int
    - safe_donations: List[RequestDonationSummary]
    """
    req_status_val = blood_req.status.value if hasattr(blood_req.status, "value") else blood_req.status
    required_units = blood_req.units_needed or 1

    # 1. Base terminal states
    if req_status_val == RequestStatus.CANCELLED.value:
        return ("CANCELLED", "Cancelled", None, 0, required_units, [])
    if req_status_val == RequestStatus.EXPIRED.value:
        return ("EXPIRED", "Expired", None, 0, required_units, [])

    # If relations not explicitly passed, inspect model attributes
    donations = donation_records if donation_records is not None else getattr(blood_req, "donation_records", []) or []
    resps = responses if responses is not None else getattr(blood_req, "responses", []) or []

    # Build safe, privacy-scrubbed donation summaries
    safe_donations = []
    for d in donations:
        donor_name = None
        if hasattr(d, "donor") and d.donor:
            donor_name = d.donor.full_name
        d_date = d.donation_date
        if isinstance(d_date, datetime):
            d_date = d_date.date()
        status_val = d.status.value if hasattr(d.status, "value") else d.status
        safe_donations.append(
            RequestDonationSummary(
                id=d.id,
                donor_id=d.donor_id,
                donor_name=donor_name,
                units_donated=d.units_donated or 1,
                donation_date=d_date,
                hospital_name=d.hospital_name,
                status=status_val,
                created_at=d.created_at,
            )
        )

    # Check for accepted response
    has_accepted_response = any(
        (r.status.value if hasattr(r.status, "value") else r.status) == ResponseStatus.ACCEPTED.value
        for r in resps
    )

    # 2. Open state
    if req_status_val == RequestStatus.OPEN.value:
        if has_accepted_response:
            return ("MATCHED", "Matched", None, 0, required_units, safe_donations)
        return ("OPEN", "Open", None, 0, required_units, safe_donations)

    # 3. Fulfilled or In Progress state
    verified_records = [
        d for d in donations
        if (d.status.value if hasattr(d.status, "value") else d.status) == DonationStatus.VERIFIED.value
    ]
    pending_records = [
        d for d in donations
        if (d.status.value if hasattr(d.status, "value") else d.status) == DonationStatus.PENDING.value
    ]
    rejected_records = [
        d for d in donations
        if (d.status.value if hasattr(d.status, "value") else d.status) == DonationStatus.REJECTED.value
    ]

    # Sum verified units without double counting
    verified_units = sum(d.units_donated for d in verified_records)

    # Fully verified: verified units satisfy total required units
    if verified_records and verified_units >= required_units:
        return ("VERIFIED", "Donation Verified", "verified", verified_units, required_units, safe_donations)

    # Partial verification: some units verified, but still less than required
    if verified_units > 0:
        return (
            "PARTIALLY_VERIFIED",
            f"Partially Verified ({verified_units}/{required_units} Units)",
            "partially_verified",
            verified_units,
            required_units,
            safe_donations,
        )

    # Pending verification
    if pending_records:
        return ("PENDING", "Pending Verification", "pending", 0, required_units, safe_donations)

    # All rejected
    if rejected_records and not verified_records and not pending_records:
        return ("REJECTED", "Donation Rejected", "rejected", 0, required_units, safe_donations)

    # Fulfilled without donation records yet (e.g. accepted response without donation record)
    if has_accepted_response:
        return ("MATCHED", "Matched", None, 0, required_units, safe_donations)

    return ("FULFILLED", "Fulfilled", None, 0, required_units, safe_donations)


def build_blood_request_response(
    blood_req: BloodRequest,
    donation_records: Optional[List[DonationRecord]] = None,
    responses: Optional[List[DonorResponse]] = None,
) -> BloodRequestResponse:
    """Builds an enriched BloodRequestResponse model with computed display progress."""
    (
        display_status,
        display_label,
        donation_status,
        verified_units,
        required_units,
        safe_donations,
    ) = compute_request_display_progress(blood_req, donation_records, responses)

    return BloodRequestResponse(
        id=blood_req.id,
        requester_id=blood_req.requester_id,
        patient_name=blood_req.patient_name,
        blood_group=blood_req.blood_group,
        units_needed=blood_req.units_needed,
        urgency=blood_req.urgency,
        hospital_name=blood_req.hospital_name,
        hospital_address=blood_req.hospital_address,
        city=blood_req.city,
        contact_phone=blood_req.contact_phone,
        required_date=blood_req.required_date,
        description=blood_req.description,
        status=blood_req.status,
        display_status=display_status,
        display_label=display_label,
        verified_units=verified_units,
        required_units=required_units,
        donation_status=donation_status,
        donations=safe_donations,
        expires_at=blood_req.expires_at,
        created_at=blood_req.created_at,
        updated_at=blood_req.updated_at,
    )
