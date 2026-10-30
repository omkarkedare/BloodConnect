"""Donor Badges and Achievements Service.

Calculates milestone recognition badges strictly from distinct, admin-verified
successful blood donations.
"""

from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.donation_record import DonationRecord
from app.utils.enums import DonationStatus

BADGE_CONFIG = [
    {
        "id": "first_lifesaver",
        "name": "First Lifesaver",
        "threshold": 1,
        "description": "Completed 1 verified blood donation, saving lives.",
    },
    {
        "id": "bronze_donor",
        "name": "Bronze Donor",
        "threshold": 3,
        "description": "Completed 3 verified blood donations.",
    },
    {
        "id": "silver_donor",
        "name": "Silver Donor",
        "threshold": 5,
        "description": "Completed 5 verified blood donations.",
    },
    {
        "id": "gold_donor",
        "name": "Gold Donor",
        "threshold": 10,
        "description": "Completed 10 verified blood donations — distinguished lifesaver.",
    },
]


def get_distinct_verified_donations(donor_id: int, db: Session) -> List[DonationRecord]:
    """
    Retrieve distinct, admin-verified donation records for a specific donor.

    Deduplication rules:
    - Multiple records with the same blood request ID count as a single donation.
    - Voluntary records (without request ID) or separate verified records are preserved;
      legitimate donations sharing the same date and hospital are not excluded.
    - Non-verified donations (PENDING, REJECTED) are strictly excluded.
    - Ordered chronologically by donation_date asc, id asc.
    """
    records = (
        db.query(DonationRecord)
        .filter(
            DonationRecord.donor_id == donor_id,
            DonationRecord.status == DonationStatus.VERIFIED.value,
        )
        .order_by(DonationRecord.donation_date.asc(), DonationRecord.id.asc())
        .all()
    )

    distinct_records: List[DonationRecord] = []
    seen_request_ids = set()

    for r in records:
        if r.request_id is not None:
            if r.request_id in seen_request_ids:
                continue
            seen_request_ids.add(r.request_id)
            distinct_records.append(r)
        else:
            distinct_records.append(r)

    return distinct_records


def calculate_donor_achievements(donor_id: int, db: Session) -> Dict[str, Any]:
    """
    Calculate earned badges, highest achievement, and next milestone progress
    for a donor based strictly on distinct, verified successful donations.
    """
    verified_donations = get_distinct_verified_donations(donor_id, db)
    total_count = len(verified_donations)

    earned_badges: List[Dict[str, Any]] = []
    all_badges: List[Dict[str, Any]] = []
    highest_badge: Optional[Dict[str, Any]] = None
    next_milestone: Optional[Dict[str, Any]] = None

    for cfg in BADGE_CONFIG:
        threshold = cfg["threshold"]
        is_earned = total_count >= threshold

        unlocked_at = None
        if is_earned and len(verified_donations) >= threshold:
            unlocked_donation = verified_donations[threshold - 1]
            unlocked_at = getattr(unlocked_donation, "created_at", None)

        badge_item = {
            "id": cfg["id"],
            "name": cfg["name"],
            "threshold": threshold,
            "description": cfg["description"],
            "is_earned": is_earned,
            "progress_count": min(total_count, threshold),
            "unlocked_at": unlocked_at,
        }
        all_badges.append(badge_item)
        if is_earned:
            earned_badges.append(badge_item)
            highest_badge = badge_item

    # Find the next unearned milestone
    for cfg in BADGE_CONFIG:
        threshold = cfg["threshold"]
        if total_count < threshold:
            remaining = threshold - total_count
            pct = int((total_count / threshold) * 100) if threshold > 0 else 0
            next_milestone = {
                "badge_id": cfg["id"],
                "badge_name": cfg["name"],
                "target_count": threshold,
                "current_count": total_count,
                "remaining_count": remaining,
                "progress_percentage": min(100, max(0, pct)),
            }
            break

    return {
        "total_verified_donations": total_count,
        "earned_badges": earned_badges,
        "all_badges": all_badges,
        "highest_badge": highest_badge,
        "next_milestone": next_milestone,
    }
