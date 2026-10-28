"""
Focused test suite for Requester Donation Status Synchronization (Phase 5.6).
Uses an isolated in-memory SQLite database to ensure zero writes to MySQL.
Covers all 12 audit and implementation requirements from Step 6.
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
from app.utils.enums import UserRole, BloodGroup, RequestStatus, ResponseStatus, DonationStatus, NotificationType, UrgencyLevel, Gender

# Create isolated in-memory SQLite engine
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
def client(db):
    return TestClient(app)

def make_user(db, email, role=UserRole.DONOR.value, is_active=True, full_name="Test User", phone="9876543210"):
    u = User(
        email=email,
        password_hash=get_password_hash("password123"),
        full_name=full_name,
        phone=phone,
        role=role,
        is_active=is_active,
        is_verified=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u

def make_donor_profile(
    db,
    user_id,
    blood_group=BloodGroup.A_POSITIVE.value,
    dob=date(1995, 5, 10),
    gender=Gender.MALE.value,
    weight=65.0,
    city="Mumbai",
    is_available=True,
    last_donation_date=None,
):
    p = DonorProfile(
        user_id=user_id,
        blood_group=blood_group,
        date_of_birth=dob,
        gender=gender,
        weight_kg=weight,
        address="123 Donor St",
        city=city,
        state="Maharashtra",
        is_available=is_available,
        last_donation_date=last_donation_date,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p

def make_request(
    db,
    requester_id,
    blood_group=BloodGroup.A_POSITIVE.value,
    units_needed=1,
    city="Mumbai",
    status=RequestStatus.OPEN.value,
    expires_at=None,
    required_date=None,
):
    req = BloodRequest(
        requester_id=requester_id,
        patient_name="Patient Phase56",
        blood_group=blood_group,
        units_needed=units_needed,
        urgency=UrgencyLevel.CRITICAL.value,
        hospital_name="City Hospital",
        hospital_address="Hospital Road",
        city=city,
        contact_phone="9876543210",
        required_date=required_date or date.today(),
        expires_at=expires_at,
        status=status,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req

def auth_headers(user):
    token = create_access_token(subject=user.id)
    return {"Authorization": f"Bearer {token}"}


# ─────────────────────────────────────────────────────────────────────────────
# 1. Open request display status
# ─────────────────────────────────────────────────────────────────────────────
def test_open_request_display_status(client, db):
    requester = make_user(db, "req_open@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, requester.id, blood_group=BloodGroup.A_POSITIVE.value)

    resp = client.get(f"/api/blood-requests/{req.id}", headers=auth_headers(requester))
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "open"
    assert data["display_status"] == "OPEN"
    assert data["display_label"] == "Open"
    assert data["donation_status"] is None
    assert data["verified_units"] == 0
    assert data["required_units"] == 1
    assert data["donations"] == []


# ─────────────────────────────────────────────────────────────────────────────
# 2. Accepted donor with pending donation
# ─────────────────────────────────────────────────────────────────────────────
def test_accepted_donor_with_pending_donation(client, db):
    requester = make_user(db, "req_pending@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, requester.id, blood_group=BloodGroup.A_POSITIVE.value)

    donor = make_user(db, "donor_pending@test.com")
    make_donor_profile(db, donor.id, blood_group=BloodGroup.A_POSITIVE.value)

    # Donor responds
    resp_create = client.post(
        "/api/responses/",
        json={"request_id": req.id, "message": "Ready to donate"},
        headers=auth_headers(donor),
    )
    assert resp_create.status_code == 200
    response_id = resp_create.json()["id"]

    # Requester accepts donor response
    resp_accept = client.put(
        f"/api/responses/{response_id}",
        json={"status": "accepted"},
        headers=auth_headers(requester),
    )
    assert resp_accept.status_code == 200

    # Requester views request: DB status is fulfilled, display status is PENDING
    resp_view = client.get(f"/api/blood-requests/{req.id}", headers=auth_headers(requester))
    assert resp_view.status_code == 200
    data = resp_view.json()
    assert data["status"] == "fulfilled"  # DB enum preserved!
    assert data["display_status"] == "PENDING"
    assert data["display_label"] == "Pending Verification"
    assert data["donation_status"] == "pending"
    assert data["verified_units"] == 0
    assert len(data["donations"]) == 1
    assert data["donations"][0]["status"] == "pending"


# ─────────────────────────────────────────────────────────────────────────────
# 3. Fully verified donation
# ─────────────────────────────────────────────────────────────────────────────
def test_fully_verified_donation(client, db):
    admin = make_user(db, "admin_v@test.com", role=UserRole.ADMIN.value)
    requester = make_user(db, "req_v@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, requester.id, blood_group=BloodGroup.A_POSITIVE.value, units_needed=1)

    donor = make_user(db, "donor_v@test.com")
    make_donor_profile(db, donor.id, blood_group=BloodGroup.A_POSITIVE.value)

    # Accept donor -> creates pending donation
    resp_create = client.post("/api/responses/", json={"request_id": req.id}, headers=auth_headers(donor))
    client.put(f"/api/responses/{resp_create.json()['id']}", json={"status": "accepted"}, headers=auth_headers(requester))

    donation = db.query(DonationRecord).filter(DonationRecord.request_id == req.id).first()
    assert donation is not None

    # Admin verifies donation
    resp_verify = client.put(
        f"/api/admin/donations/{donation.id}/verify",
        json={"reference_number": "HOSP-VERIFY-101", "hospital_name": "City Blood Center"},
        headers=auth_headers(admin),
    )
    assert resp_verify.status_code == 200

    # Requester views request: now shows VERIFIED
    resp_view = client.get(f"/api/blood-requests/{req.id}", headers=auth_headers(requester))
    assert resp_view.status_code == 200
    data = resp_view.json()
    assert data["status"] == "fulfilled"  # DB status preserved
    assert data["display_status"] == "VERIFIED"
    assert data["display_label"] == "Donation Verified"
    assert data["donation_status"] == "verified"
    assert data["verified_units"] == 1
    assert data["required_units"] == 1
    assert len(data["donations"]) == 1
    assert data["donations"][0]["status"] == "verified"


# ─────────────────────────────────────────────────────────────────────────────
# 4. Rejected donation
# ─────────────────────────────────────────────────────────────────────────────
def test_rejected_donation(client, db):
    admin = make_user(db, "admin_rej@test.com", role=UserRole.ADMIN.value)
    requester = make_user(db, "req_rej@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, requester.id, blood_group=BloodGroup.A_POSITIVE.value)

    donor = make_user(db, "donor_rej@test.com")
    make_donor_profile(db, donor.id, blood_group=BloodGroup.A_POSITIVE.value)

    resp_create = client.post("/api/responses/", json={"request_id": req.id}, headers=auth_headers(donor))
    client.put(f"/api/responses/{resp_create.json()['id']}", json={"status": "accepted"}, headers=auth_headers(requester))

    donation = db.query(DonationRecord).filter(DonationRecord.request_id == req.id).first()

    # Admin rejects donation
    resp_rej = client.put(
        f"/api/admin/donations/{donation.id}/reject",
        json={"rejection_reason": "Donor failed hemoglobin screening at hospital."},
        headers=auth_headers(admin),
    )
    assert resp_rej.status_code == 200

    # Requester views request: shows REJECTED
    resp_view = client.get(f"/api/blood-requests/{req.id}", headers=auth_headers(requester))
    assert resp_view.status_code == 200
    data = resp_view.json()
    assert data["display_status"] == "REJECTED"
    assert data["display_label"] == "Donation Rejected"
    assert data["donation_status"] == "rejected"
    assert data["verified_units"] == 0


# ─────────────────────────────────────────────────────────────────────────────
# 5. Multiple donation records — full fulfillment
# ─────────────────────────────────────────────────────────────────────────────
def test_multiple_donation_records_full_fulfillment(client, db):
    admin = make_user(db, "admin_multi@test.com", role=UserRole.ADMIN.value)
    requester = make_user(db, "req_multi@test.com", role=UserRole.REQUESTER.value)
    # Request requires 2 units
    req = make_request(db, requester.id, blood_group=BloodGroup.A_POSITIVE.value, units_needed=2, status=RequestStatus.FULFILLED.value)

    donor1 = make_user(db, "d_multi1@test.com")
    donor2 = make_user(db, "d_multi2@test.com")

    # 2 separate donation records linked to request
    d1 = DonationRecord(
        donor_id=donor1.id,
        request_id=req.id,
        blood_group=BloodGroup.A_POSITIVE.value,
        units_donated=1,
        donation_date=date.today(),
        hospital_name="City Hospital",
        status=DonationStatus.VERIFIED.value,
    )
    d2 = DonationRecord(
        donor_id=donor2.id,
        request_id=req.id,
        blood_group=BloodGroup.A_POSITIVE.value,
        units_donated=1,
        donation_date=date.today(),
        hospital_name="City Hospital",
        status=DonationStatus.VERIFIED.value,
    )
    db.add_all([d1, d2])
    db.commit()

    resp = client.get(f"/api/blood-requests/{req.id}", headers=auth_headers(requester))
    assert resp.status_code == 200
    data = resp.json()
    assert data["display_status"] == "VERIFIED"
    assert data["verified_units"] == 2
    assert data["required_units"] == 2
    assert len(data["donations"]) == 2


# ─────────────────────────────────────────────────────────────────────────────
# 6. Partial verification of multi-unit requests
# ─────────────────────────────────────────────────────────────────────────────
def test_partial_verification_of_multi_unit_requests(client, db):
    requester = make_user(db, "req_partial@test.com", role=UserRole.REQUESTER.value)
    # Request requires 3 units
    req = make_request(db, requester.id, blood_group=BloodGroup.A_POSITIVE.value, units_needed=3, status=RequestStatus.FULFILLED.value)

    donor1 = make_user(db, "d_part1@test.com")
    donor2 = make_user(db, "d_part2@test.com")

    # 1 unit verified, 1 unit pending (total 2 units recorded of 3 needed)
    d1 = DonationRecord(
        donor_id=donor1.id,
        request_id=req.id,
        blood_group=BloodGroup.A_POSITIVE.value,
        units_donated=1,
        donation_date=date.today(),
        hospital_name="City Hospital",
        status=DonationStatus.VERIFIED.value,
    )
    d2 = DonationRecord(
        donor_id=donor2.id,
        request_id=req.id,
        blood_group=BloodGroup.A_POSITIVE.value,
        units_donated=1,
        donation_date=date.today(),
        hospital_name="City Hospital",
        status=DonationStatus.PENDING.value,
    )
    db.add_all([d1, d2])
    db.commit()

    resp = client.get(f"/api/blood-requests/{req.id}", headers=auth_headers(requester))
    assert resp.status_code == 200
    data = resp.json()
    assert data["display_status"] == "PARTIALLY_VERIFIED"
    assert data["verified_units"] == 1
    assert data["required_units"] == 3
    assert "1/3 Units" in data["display_label"]
    assert data["donation_status"] == "partially_verified"


# ─────────────────────────────────────────────────────────────────────────────
# 7. Mixed verified, pending and rejected records
# ─────────────────────────────────────────────────────────────────────────────
def test_mixed_verified_pending_and_rejected_records(client, db):
    requester = make_user(db, "req_mixed@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, requester.id, blood_group=BloodGroup.A_POSITIVE.value, units_needed=2, status=RequestStatus.FULFILLED.value)

    d1 = make_user(db, "d_mix1@test.com")
    d2 = make_user(db, "d_mix2@test.com")
    d3 = make_user(db, "d_mix3@test.com")

    # 1 rejected, 1 verified, 1 pending
    rec_rej = DonationRecord(donor_id=d1.id, request_id=req.id, blood_group=BloodGroup.A_POSITIVE.value, units_donated=1, donation_date=date.today(), status=DonationStatus.REJECTED.value)
    rec_ver = DonationRecord(donor_id=d2.id, request_id=req.id, blood_group=BloodGroup.A_POSITIVE.value, units_donated=1, donation_date=date.today(), status=DonationStatus.VERIFIED.value)
    rec_pen = DonationRecord(donor_id=d3.id, request_id=req.id, blood_group=BloodGroup.A_POSITIVE.value, units_donated=1, donation_date=date.today(), status=DonationStatus.PENDING.value)
    db.add_all([rec_rej, rec_ver, rec_pen])
    db.commit()

    resp = client.get(f"/api/blood-requests/{req.id}", headers=auth_headers(requester))
    assert resp.status_code == 200
    data = resp.json()
    assert data["display_status"] == "PARTIALLY_VERIFIED"
    assert data["verified_units"] == 1
    assert data["required_units"] == 2


# ─────────────────────────────────────────────────────────────────────────────
# 8. Existing request enum preservation in MySQL/DB
# ─────────────────────────────────────────────────────────────────────────────
def test_existing_request_enum_preservation(client, db):
    requester = make_user(db, "req_enum@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, requester.id, status=RequestStatus.FULFILLED.value)

    # In DB, the status column is strictly 'fulfilled'
    raw_req = db.query(BloodRequest).filter(BloodRequest.id == req.id).first()
    assert raw_req.status == "fulfilled"
    assert raw_req.status in ["open", "in_progress", "fulfilled", "cancelled", "expired"]


# ─────────────────────────────────────────────────────────────────────────────
# 9. Requester ownership and response privacy
# ─────────────────────────────────────────────────────────────────────────────
def test_requester_ownership_and_response_privacy(client, db):
    req_owner = make_user(db, "req_owner@test.com", role=UserRole.REQUESTER.value)
    req_other = make_user(db, "req_other@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, req_owner.id)

    # Other requester cannot view
    resp_forbidden = client.get(f"/api/blood-requests/{req.id}", headers=auth_headers(req_other))
    assert resp_forbidden.status_code == 403

    # Owning requester views request — check privacy of donations summary
    donor = make_user(db, "d_priv@test.com")
    rec = DonationRecord(
        donor_id=donor.id,
        request_id=req.id,
        blood_group=BloodGroup.A_POSITIVE.value,
        units_donated=1,
        donation_date=date.today(),
        hospital_name="Private Hospital",
        notes="INTERNAL_AUDIT: Verified with doctor secret reference.",
        status=DonationStatus.VERIFIED.value,
    )
    db.add(rec)
    db.commit()

    resp = client.get(f"/api/blood-requests/{req.id}", headers=auth_headers(req_owner))
    assert resp.status_code == 200
    donation_data = resp.json()["donations"][0]
    # Ensure notes or internal audit strings are NEVER leaked in summary
    assert "notes" not in donation_data
    assert "password_hash" not in donation_data


# ─────────────────────────────────────────────────────────────────────────────
# 10. Admin notification creation for requester
# ─────────────────────────────────────────────────────────────────────────────
def test_admin_notification_creation_for_requester(client, db):
    admin = make_user(db, "admin_notif@test.com", role=UserRole.ADMIN.value)
    requester = make_user(db, "req_notif@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, requester.id)

    donor = make_user(db, "donor_notif@test.com")
    donation = DonationRecord(
        donor_id=donor.id,
        request_id=req.id,
        blood_group=BloodGroup.A_POSITIVE.value,
        units_donated=1,
        donation_date=date.today(),
        status=DonationStatus.PENDING.value,
    )
    db.add(donation)
    db.commit()

    # Admin verifies
    resp = client.put(
        f"/api/admin/donations/{donation.id}/verify",
        json={"reference_number": "REF-REQ-NOTIF-1"},
        headers=auth_headers(admin),
    )
    assert resp.status_code == 200

    # Verify notification created for requester
    req_notif = db.query(Notification).filter(Notification.user_id == requester.id).first()
    assert req_notif is not None
    assert req_notif.type == NotificationType.DONATION_VERIFIED.value
    assert "patient" in req_notif.message.lower() or "verified" in req_notif.message.lower()


# ─────────────────────────────────────────────────────────────────────────────
# 11. Existing Smart Finder and Donor Profile Gate preservation
# ─────────────────────────────────────────────────────────────────────────────
def test_smart_finder_and_donor_gate_compatibility(client, db):
    requester = make_user(db, "req_gate_check@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, requester.id, blood_group=BloodGroup.A_POSITIVE.value)

    # Incomplete donor cannot respond (Phase 5.5 gate)
    d_incomplete = make_user(db, "d_incomp_gate@test.com")
    resp_gate = client.post("/api/responses/", json={"request_id": req.id}, headers=auth_headers(d_incomplete))
    assert resp_gate.status_code == 400
    assert "DONOR_PROFILE_INCOMPLETE" in resp_gate.json()["detail"]

    # Complete donor found in Smart Emergency matching (Phase 2)
    d_complete = make_user(db, "d_comp_gate@test.com")
    make_donor_profile(db, d_complete.id, blood_group=BloodGroup.A_POSITIVE.value, city="Mumbai")

    resp_match = client.get(f"/api/blood-requests/{req.id}/matches", headers=auth_headers(requester))
    assert resp_match.status_code == 200
    match_ids = [m["user_id"] for m in resp_match.json()]
    assert d_complete.id in match_ids
    assert d_incomplete.id not in match_ids


# ─────────────────────────────────────────────────────────────────────────────
# 12. Existing admin verification and donor history preservation
# ─────────────────────────────────────────────────────────────────────────────
def test_admin_verification_and_donor_history_preservation(client, db):
    admin = make_user(db, "admin_hist@test.com", role=UserRole.ADMIN.value)
    donor = make_user(db, "donor_hist@test.com")
    prof = make_donor_profile(db, donor.id, blood_group=BloodGroup.O_POSITIVE.value)

    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 15),
        status=DonationStatus.PENDING.value,
    )
    db.add(donation)
    db.commit()

    # Admin verifies with actual donation date
    actual_d = date(2026, 10, 20)
    resp = client.put(
        f"/api/admin/donations/{donation.id}/verify",
        json={"reference_number": "HIST-REF-1", "actual_donation_date": actual_d.isoformat()},
        headers=auth_headers(admin),
    )
    assert resp.status_code == 200

    # Donor profile last_donation_date updated
    db.refresh(prof)
    assert prof.last_donation_date == actual_d
