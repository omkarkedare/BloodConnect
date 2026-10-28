"""
Comprehensive automated test suite for BloodConnect Phase 5: Admin Module Fixes.
Uses an isolated in-memory SQLite database to ensure zero writes to MySQL.
Validates all requirements for registered donor visibility and donation verification.
"""

import sys
import os
from datetime import date, datetime, timedelta, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.donor_profile import DonorProfile
from app.models.blood_request import BloodRequest
from app.models.donor_response import DonorResponse
from app.models.donation_record import DonationRecord
from app.models.notification import Notification
from app.core.security import create_access_token, get_password_hash
from app.utils.enums import (
    UserRole,
    BloodGroup,
    RequestStatus,
    ResponseStatus,
    UrgencyLevel,
    Gender,
    DonationStatus,
    NotificationType,
)

# Isolated in-memory SQLite engine
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    """Create all tables in memory once for the test module."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db():
    """Provide a transactional database session for each test function."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield session

    session.close()
    transaction.rollback()
    connection.close()
    app.dependency_overrides.pop(get_db, None)

@pytest.fixture
def client():
    return TestClient(app)

def create_user(db, email, role=UserRole.DONOR.value, full_name="Test User", phone="1234567890", is_active=True):
    user = User(
        email=email,
        password_hash=get_password_hash("secret123"),
        full_name=full_name,
        phone=phone,
        role=role,
        is_active=is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def create_donor_profile(db, user_id, blood_group=BloodGroup.A_POSITIVE.value, city="Mumbai", is_available=True, last_donation_date=None):
    profile = DonorProfile(
        user_id=user_id,
        blood_group=blood_group,
        date_of_birth=date(1995, 5, 15),
        gender=Gender.MALE.value,
        weight_kg=68.5,
        city=city,
        state="Maharashtra",
        is_available=is_available,
        last_donation_date=last_donation_date,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

def get_auth_headers(user_id):
    token = create_access_token(user_id)
    return {"Authorization": f"Bearer {token}"}

# =========================================================================
# 1. Registered Donor Visibility & Outer Join Tests
# =========================================================================

def test_admin_sees_all_registered_donors_including_incomplete_profiles(client, db):
    """Verify admin query includes donors with and without DonorProfile."""
    admin = create_user(db, "admin1@test.com", role=UserRole.ADMIN.value, full_name="Admin Admin")
    donor_with_prof = create_user(db, "donor_prof@test.com", role=UserRole.DONOR.value, full_name="Profile Donor")
    create_donor_profile(db, donor_with_prof.id, blood_group=BloodGroup.O_POSITIVE.value, city="Pune")

    donor_no_prof = create_user(db, "donor_noprof@test.com", role=UserRole.DONOR.value, full_name="NoProfile Donor")

    # Also create a requester to ensure they are NOT in the donor list
    requester = create_user(db, "requester1@test.com", role=UserRole.REQUESTER.value, full_name="Req User")

    resp = client.get("/api/admin/donors", headers=get_auth_headers(admin.id))
    assert resp.status_code == 200
    donors = resp.json()

    donor_ids = [d["user_id"] for d in donors]
    assert donor_with_prof.id in donor_ids
    assert donor_no_prof.id in donor_ids
    assert requester.id not in donor_ids

    # Find the two donors in the response
    dp_item = next(d for d in donors if d["user_id"] == donor_with_prof.id)
    assert dp_item["has_completed_profile"] is True
    assert dp_item["blood_group"] == BloodGroup.O_POSITIVE.value
    assert dp_item["city"] == "Pune"
    assert dp_item["email"] == "donor_prof@test.com"

    dnp_item = next(d for d in donors if d["user_id"] == donor_no_prof.id)
    assert dnp_item["has_completed_profile"] is False
    assert dnp_item["blood_group"] is None
    assert dnp_item["city"] is None
    assert dnp_item["email"] == "donor_noprof@test.com"

def test_no_duplicate_rows_in_donor_listings(client, db):
    """Ensure outer join produces strictly unique donor entries."""
    admin = create_user(db, "admin_dup@test.com", role=UserRole.ADMIN.value)
    for i in range(5):
        u = create_user(db, f"donor_uniq_{i}@test.com", role=UserRole.DONOR.value)
        if i % 2 == 0:
            create_donor_profile(db, u.id)

    resp = client.get("/api/admin/donors", headers=get_auth_headers(admin.id))
    assert resp.status_code == 200
    donors = resp.json()
    returned_ids = [d["user_id"] for d in donors]
    assert len(returned_ids) == len(set(returned_ids))

def test_donors_and_requesters_forbidden_from_admin_donor_endpoint(client, db):
    """RBAC check: non-admins cannot query admin donors."""
    donor = create_user(db, "donor_forbidden@test.com", role=UserRole.DONOR.value)
    requester = create_user(db, "req_forbidden@test.com", role=UserRole.REQUESTER.value)

    r1 = client.get("/api/admin/donors", headers=get_auth_headers(donor.id))
    assert r1.status_code == 403

    r2 = client.get("/api/admin/donors", headers=get_auth_headers(requester.id))
    assert r2.status_code == 403

def test_incomplete_profiles_excluded_from_emergency_matching(client, db):
    """Verify that donors without completed DonorProfile are excluded from emergency matching."""
    requester = create_user(db, "req_matching@test.com", role=UserRole.REQUESTER.value)
    
    # Blood Request for A+
    req = BloodRequest(
        requester_id=requester.id,
        patient_name="Patient Matching",
        blood_group=BloodGroup.A_POSITIVE.value,
        units_needed=2,
        urgency=UrgencyLevel.CRITICAL.value,
        hospital_name="City Hospital",
        city="Mumbai",
        contact_phone="9876543210",
        required_date=date.today(),
        expires_at=datetime.now(timezone.utc) + timedelta(days=2),
        status=RequestStatus.OPEN.value,
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # Incomplete donor (no DonorProfile)
    donor_incomplete = create_user(db, "donor_incomp@test.com", role=UserRole.DONOR.value)

    # Complete donor (has DonorProfile with A+)
    donor_complete = create_user(db, "donor_comp@test.com", role=UserRole.DONOR.value)
    create_donor_profile(db, donor_complete.id, blood_group=BloodGroup.A_POSITIVE.value, city="Mumbai", is_available=True)

    resp = client.get(f"/api/blood-requests/{req.id}/matches", headers=get_auth_headers(requester.id))
    assert resp.status_code == 200
    matches = resp.json()

    match_user_ids = [m["user_id"] for m in matches]
    assert donor_complete.id in match_user_ids
    assert donor_incomplete.id not in match_user_ids

# =========================================================================
# 2. Donation Verification Workflow Tests
# =========================================================================

def test_admin_verify_valid_pending_donation(client, db):
    """Verify an eligible pending donation with hospital reference."""
    admin = create_user(db, "admin_v1@test.com", role=UserRole.ADMIN.value, full_name="Admin Verifier")
    donor = create_user(db, "donor_v1@test.com", role=UserRole.DONOR.value, full_name="Donor Person")
    prof = create_donor_profile(db, donor.id, blood_group=BloodGroup.B_POSITIVE.value)

    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.B_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 8, 10),
        hospital_name="MGM Hospital",
        status=DonationStatus.PENDING.value,
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    actual_donation_date = "2026-08-12"
    verify_payload = {
        "reference_number": "HOSP-REF-9988",
        "actual_donation_date": actual_donation_date,
        "hospital_name": "MGM Central Hospital",
        "notes": "Verified against blood bank physical ledger #42",
    }

    resp = client.put(
        f"/api/admin/donations/{donation.id}/verify",
        json=verify_payload,
        headers=get_auth_headers(admin.id),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == DonationStatus.VERIFIED.value
    assert data["verified_by"] == admin.id
    assert data["verifier_name"] == "Admin Verifier"
    assert data["donation_date"] == actual_donation_date

    # Verify donor profile last_donation_date updated
    db.refresh(prof)
    assert str(prof.last_donation_date) == actual_donation_date

    # Verify notification created
    notif = db.query(Notification).filter(Notification.user_id == donor.id).order_by(Notification.id.desc()).first()
    assert notif is not None
    assert notif.type == NotificationType.DONATION_VERIFIED.value
    assert "HOSP-REF-9988" in notif.message

def test_verification_without_reference_number_rejected(client, db):
    """Validation test: reference_number cannot be empty."""
    admin = create_user(db, "admin_v2@test.com", role=UserRole.ADMIN.value)
    donor = create_user(db, "donor_v2@test.com", role=UserRole.DONOR.value)
    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_NEGATIVE.value,
        units_donated=1,
        donation_date=date.today(),
        status=DonationStatus.PENDING.value,
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    resp = client.put(
        f"/api/admin/donations/{donation.id}/verify",
        json={"reference_number": "   "},
        headers=get_auth_headers(admin.id),
    )
    assert resp.status_code == 400
    assert "reference" in resp.json()["detail"].lower()

def test_duplicate_verification_is_prevented(client, db):
    """Idempotency test: already verified donation cannot be verified again."""
    admin = create_user(db, "admin_v3@test.com", role=UserRole.ADMIN.value)
    donor = create_user(db, "donor_v3@test.com", role=UserRole.DONOR.value)
    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.A_POSITIVE.value,
        units_donated=1,
        donation_date=date.today(),
        status=DonationStatus.PENDING.value,
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    # First verification
    resp1 = client.put(
        f"/api/admin/donations/{donation.id}/verify",
        json={"reference_number": "SLIP-101"},
        headers=get_auth_headers(admin.id),
    )
    assert resp1.status_code == 200

    # Second attempt
    resp2 = client.put(
        f"/api/admin/donations/{donation.id}/verify",
        json={"reference_number": "SLIP-101"},
        headers=get_auth_headers(admin.id),
    )
    assert resp2.status_code == 400
    assert "already been verified" in resp2.json()["detail"]

def test_non_admin_cannot_verify_donation(client, db):
    """RBAC check: donor and requester cannot verify donations."""
    donor = create_user(db, "donor_v4@test.com", role=UserRole.DONOR.value)
    requester = create_user(db, "req_v4@test.com", role=UserRole.REQUESTER.value)
    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.A_POSITIVE.value,
        units_donated=1,
        donation_date=date.today(),
        status=DonationStatus.PENDING.value,
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    r1 = client.put(
        f"/api/admin/donations/{donation.id}/verify",
        json={"reference_number": "REF-123"},
        headers=get_auth_headers(donor.id),
    )
    assert r1.status_code == 403

    r2 = client.put(
        f"/api/admin/donations/{donation.id}/verify",
        json={"reference_number": "REF-123"},
        headers=get_auth_headers(requester.id),
    )
    assert r2.status_code == 403

def test_admin_reject_pending_donation(client, db):
    """Verify admin rejection of invalid pending donation record."""
    admin = create_user(db, "admin_rej@test.com", role=UserRole.ADMIN.value)
    donor = create_user(db, "donor_rej@test.com", role=UserRole.DONOR.value)
    prof = create_donor_profile(db, donor.id, blood_group=BloodGroup.AB_POSITIVE.value, last_donation_date=date(2026, 1, 1))

    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.AB_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 8, 20),
        status=DonationStatus.PENDING.value,
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    resp = client.put(
        f"/api/admin/donations/{donation.id}/reject",
        json={"rejection_reason": "Donor was deemed ineligible at hospital screening"},
        headers=get_auth_headers(admin.id),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == DonationStatus.REJECTED.value

    # Verify donor profile last_donation_date was NOT touched
    db.refresh(prof)
    assert prof.last_donation_date == date(2026, 1, 1)

    # Verify notification created
    notif = db.query(Notification).filter(Notification.user_id == donor.id).order_by(Notification.id.desc()).first()
    assert notif is not None
    assert "Rejected" in notif.title

def test_dashboard_stats_completed_donations_counter(client, db):
    """Verify /api/admin/stats completed_donations increments when verified."""
    admin = create_user(db, "admin_stats@test.com", role=UserRole.ADMIN.value)
    donor = create_user(db, "donor_stats@test.com", role=UserRole.DONOR.value)

    stats_before = client.get("/api/admin/stats", headers=get_auth_headers(admin.id)).json()
    initial_completed = stats_before["completed_donations"]

    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_POSITIVE.value,
        units_donated=1,
        donation_date=date.today(),
        status=DonationStatus.PENDING.value,
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    # Pending does NOT increment completed
    stats_pending = client.get("/api/admin/stats", headers=get_auth_headers(admin.id)).json()
    assert stats_pending["completed_donations"] == initial_completed

    # Verify donation
    client.put(
        f"/api/admin/donations/{donation.id}/verify",
        json={"reference_number": "SLIP-COUNT-1"},
        headers=get_auth_headers(admin.id),
    )

    stats_after = client.get("/api/admin/stats", headers=get_auth_headers(admin.id)).json()
    assert stats_after["completed_donations"] == initial_completed + 1

def test_donor_donation_history_continues_working(client, db):
    """Verify GET /api/donations/me reflects verified status for donor."""
    donor = create_user(db, "donor_hist@test.com", role=UserRole.DONOR.value)
    admin = create_user(db, "admin_hist@test.com", role=UserRole.ADMIN.value)

    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.B_NEGATIVE.value,
        units_donated=1,
        donation_date=date(2026, 7, 10),
        status=DonationStatus.PENDING.value,
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    # Donor sees pending
    r1 = client.get("/api/donations/me", headers=get_auth_headers(donor.id))
    assert r1.status_code == 200
    assert r1.json()[0]["status"] == DonationStatus.PENDING.value

    # Admin verifies
    client.put(
        f"/api/admin/donations/{donation.id}/verify",
        json={"reference_number": "HIST-REF-1"},
        headers=get_auth_headers(admin.id),
    )

    # Donor sees verified
    r2 = client.get("/api/donations/me", headers=get_auth_headers(donor.id))
    assert r2.status_code == 200
    assert r2.json()[0]["status"] == DonationStatus.VERIFIED.value
