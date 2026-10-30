"""
Tests for Admin Step B: Successful Donations & Advanced Reports.
Validates:
1. Admin Certificate Access:
   - Admin can access any verified donation's appreciation certificate via /api/donations/{id}/certificate.
   - Non-admin and non-owner callers receive 403 Forbidden.
   - Unverified (pending/rejected) donations receive 400 Bad Request.
2. Admin Donations Query & Status Filtering:
   - /api/admin/donations?status=verified returns only medically verified donations.
   - /api/admin/donations?status=pending returns only pending audit records.
   - /api/admin/donations returns all records.
3. Strict Metric Separation:
   - Fulfilled blood requests and medically verified donations remain strictly separate in /api/admin/stats.
"""

import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.blood_request import BloodRequest
from app.models.donation_record import DonationRecord
from app.utils.enums import BloodGroup, DonationStatus, RequestStatus, UserRole
from app.core.security import create_access_token


@pytest.fixture(scope="module")
def db_engine():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="module")
def db_session_factory(db_engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=db_engine)


@pytest.fixture
def db(db_session_factory):
    session = db_session_factory()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def client(db_session_factory):
    def override_get_db():
        session = db_session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def make_test_user(db, email, name, role):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            full_name=name,
            password_hash="fakehash",
            role=role.value,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def test_admin_can_view_any_verified_donation_certificate(client, db):
    """
    Verify that an administrator can fetch any verified donation's official certificate.
    """
    admin = make_test_user(db, "admin_cert_auditor@test.com", "Admin Auditor", UserRole.ADMIN)
    donor = make_test_user(db, "donor_hero_1@test.com", "Hero Donor", UserRole.DONOR)

    # Create a verified donation
    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 20),
        hospital_name="City Central Hospital",
        status=DonationStatus.VERIFIED.value,
        verified_by=admin.id,
        notes="[Verified on 2026-10-20 by Admin #1 | Ref: HOSP-REC-9988]",
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    admin_token = create_access_token(subject=admin.id)
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get(f"/api/donations/{donation.id}/certificate", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["certificate_id"].startswith("BC-CERT-")
    assert data["donation_id"] == donation.id
    assert data["donor_name"] == "Hero Donor"
    assert data["blood_group"] == BloodGroup.O_POSITIVE.value
    assert data["units_donated"] == 1
    assert data["hospital_name"] == "City Central Hospital"
    assert data["verification_reference"] == "HOSP-REC-9988"
    assert data["verifier_name"] == "Admin Auditor"


def test_non_admin_cannot_view_others_certificate(client, db):
    """
    Ensure a non-admin, non-owning donor or requester cannot view another donor's certificate.
    """
    admin = make_test_user(db, "admin_cert_sec@test.com", "Admin Sec", UserRole.ADMIN)
    donor1 = make_test_user(db, "donor_owner@test.com", "Owner Donor", UserRole.DONOR)
    donor2 = make_test_user(db, "donor_stranger@test.com", "Stranger Donor", UserRole.DONOR)

    donation = DonationRecord(
        donor_id=donor1.id,
        blood_group=BloodGroup.A_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 22),
        hospital_name="Metro Clinic",
        status=DonationStatus.VERIFIED.value,
        verified_by=admin.id,
        notes="[Verified on 2026-10-22 by Admin #1 | Ref: METRO-001]",
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    # Donor 2 attempts to view Donor 1's certificate
    donor2_token = create_access_token(subject=donor2.id)
    headers = {"Authorization": f"Bearer {donor2_token}"}

    res = client.get(f"/api/donations/{donation.id}/certificate", headers=headers)
    assert res.status_code == 403


def test_unverified_donation_cannot_issue_certificate(client, db):
    """
    Verify that unverified (pending or rejected) donations return 400 Bad Request
    when attempting to retrieve a certificate.
    """
    admin = make_test_user(db, "admin_pending_cert@test.com", "Admin Pending", UserRole.ADMIN)
    donor = make_test_user(db, "donor_pending_cert@test.com", "Donor Pending", UserRole.DONOR)

    pending_don = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.B_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 25),
        hospital_name="Metro Clinic",
        status=DonationStatus.PENDING.value,
    )
    db.add(pending_don)
    db.commit()
    db.refresh(pending_don)

    admin_token = create_access_token(subject=admin.id)
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get(f"/api/donations/{pending_don.id}/certificate", headers=headers)
    assert res.status_code == 400
    assert "verified" in res.json()["detail"].lower()


def test_admin_donations_filtering_and_successful_isolation(client, db):
    """
    Verify /api/admin/donations supports filtering by status (verified, pending, rejected).
    """
    admin = make_test_user(db, "admin_filter_test@test.com", "Admin Filter", UserRole.ADMIN)
    donor = make_test_user(db, "donor_filter_test@test.com", "Donor Filter", UserRole.DONOR)

    d_ver = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_NEGATIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 24),
        hospital_name="Hospital Verified",
        status=DonationStatus.VERIFIED.value,
        verified_by=admin.id,
    )
    d_pen = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.A_NEGATIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 26),
        hospital_name="Hospital Pending",
        status=DonationStatus.PENDING.value,
    )
    d_rej = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.B_NEGATIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 27),
        hospital_name="Hospital Rejected",
        status=DonationStatus.REJECTED.value,
    )
    db.add_all([d_ver, d_pen, d_rej])
    db.commit()

    admin_token = create_access_token(subject=admin.id)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Filter by verified (Successful Donations)
    res_ver = client.get("/api/admin/donations?status=verified", headers=headers)
    assert res_ver.status_code == 200
    items_ver = res_ver.json()
    assert all(d["status"] == "verified" for d in items_ver)
    assert any(d["id"] == d_ver.id for d in items_ver)

    # 2. Filter by pending
    res_pen = client.get("/api/admin/donations?status=pending", headers=headers)
    assert res_pen.status_code == 200
    items_pen = res_pen.json()
    assert all(d["status"] == "pending" for d in items_pen)
    assert any(d["id"] == d_pen.id for d in items_pen)

    # 3. All donations
    res_all = client.get("/api/admin/donations", headers=headers)
    assert res_all.status_code == 200
    items_all = res_all.json()
    assert len(items_all) >= 3


def test_fulfilled_requests_vs_verified_donations_isolation(client, db):
    """
    Verify strict metric separation between fulfilled requests and medically verified donations.
    """
    admin = make_test_user(db, "admin_isolation@test.com", "Admin Isolation", UserRole.ADMIN)
    donor = make_test_user(db, "donor_isolation@test.com", "Donor Isolation", UserRole.DONOR)
    requester = make_test_user(db, "req_isolation@test.com", "Req Isolation", UserRole.REQUESTER)

    # 1 Fulfilled blood request
    req = BloodRequest(
        requester_id=requester.id,
        patient_name="Patient Milestone",
        blood_group=BloodGroup.AB_POSITIVE.value,
        units_needed=2,
        urgency="normal",
        hospital_name="St Jude Hospital",
        city="Pune",
        contact_phone="+91 9888877777",
        required_date=date(2026, 10, 15),
        status=RequestStatus.FULFILLED.value,
    )
    db.add(req)

    # 1 Verified donation record
    don = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.AB_POSITIVE.value,
        units_donated=2,
        donation_date=date(2026, 10, 16),
        hospital_name="St Jude Hospital",
        status=DonationStatus.VERIFIED.value,
        verified_by=admin.id,
    )
    db.add(don)
    db.commit()

    admin_token = create_access_token(subject=admin.id)
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get("/api/admin/stats", headers=headers)
    assert res.status_code == 200
    stats_data = res.json()

    # completed_donations and fulfilled_requests are separate counters
    assert "completed_donations" in stats_data
    assert "fulfilled_requests" in stats_data
    assert stats_data["completed_donations"] >= 1
    assert stats_data["fulfilled_requests"] >= 1
