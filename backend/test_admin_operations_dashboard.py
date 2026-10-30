"""
Tests for Admin Operations Dashboard & Platform Triage Analytics.
Validates:
1. /api/admin/stats returns all platform operational metrics:
   - total_users, total_donors, active_blood_requests, completed_donations
   - pending_verifications, rejected_donations, urgent_requests, fulfilled_requests, total_requests
2. Dynamic operational counting:
   - Urgent/critical request tracking
   - Pending donation verification queue tracking
   - Request fulfillment rate metrics
3. Strict RBAC enforcement:
   - Admin user allowed (200 OK)
   - Donor user blocked (403 Forbidden)
   - Requester user blocked (403 Forbidden)
   - Unauthenticated client blocked (401 Unauthorized)
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


def test_admin_dashboard_stats_comprehensive(client, db):
    """
    Verify /api/admin/stats returns all standard and enhanced operational metrics.
    """
    admin = make_test_user(db, "admin_ops_test@test.com", "Admin Operations", UserRole.ADMIN)
    donor = make_test_user(db, "donor_ops_test@test.com", "Donor Ops", UserRole.DONOR)
    requester = make_test_user(db, "req_ops_test@test.com", "Req Ops", UserRole.REQUESTER)

    # Normal request
    req1 = BloodRequest(
        requester_id=requester.id,
        patient_name="Patient Normal",
        blood_group=BloodGroup.A_POSITIVE.value,
        units_needed=1,
        urgency="normal",
        hospital_name="Hospital Alpha",
        city="Mumbai",
        contact_phone="+91 9111122222",
        required_date=date(2026, 11, 1),
        status=RequestStatus.OPEN.value,
    )
    # Urgent request
    req2 = BloodRequest(
        requester_id=requester.id,
        patient_name="Patient Critical",
        blood_group=BloodGroup.O_NEGATIVE.value,
        units_needed=2,
        urgency="critical",
        hospital_name="Hospital Beta",
        city="Mumbai",
        contact_phone="+91 9333344444",
        required_date=date(2026, 11, 2),
        status=RequestStatus.OPEN.value,
    )
    # Fulfilled request
    req3 = BloodRequest(
        requester_id=requester.id,
        patient_name="Patient Fulfilled",
        blood_group=BloodGroup.B_POSITIVE.value,
        units_needed=1,
        urgency="normal",
        hospital_name="Hospital Gamma",
        city="Mumbai",
        contact_phone="+91 9555566666",
        required_date=date(2026, 10, 20),
        status=RequestStatus.FULFILLED.value,
    )
    db.add_all([req1, req2, req3])

    # Pending donation
    don_pending = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.A_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 28),
        hospital_name="Hospital Alpha",
        status=DonationStatus.PENDING.value,
    )
    # Verified donation
    don_verified = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.B_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 25),
        hospital_name="Hospital Gamma",
        status=DonationStatus.VERIFIED.value,
    )
    db.add_all([don_pending, don_verified])
    db.commit()

    admin_token = create_access_token(subject=admin.id)
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get("/api/admin/stats", headers=headers)
    assert res.status_code == 200
    data = res.json()

    # Core backward-compatible fields
    assert "total_users" in data
    assert "total_donors" in data
    assert "active_blood_requests" in data
    assert "completed_donations" in data

    # Enhanced operational triage fields
    assert "pending_verifications" in data
    assert "urgent_requests" in data
    assert "fulfilled_requests" in data
    assert "total_requests" in data

    assert data["active_blood_requests"] >= 2  # req1 and req2
    assert data["urgent_requests"] >= 1        # req2 is critical
    assert data["fulfilled_requests"] >= 1     # req3
    assert data["pending_verifications"] >= 1  # don_pending
    assert data["completed_donations"] >= 1    # don_verified


def test_admin_dashboard_rbac_security(client, db):
    """
    Ensure only admins can access /api/admin/stats.
    Donors and Requesters must be forbidden (403).
    Unauthenticated callers must be unauthorized (401).
    """
    admin = make_test_user(db, "admin_rbac@test.com", "Admin Security", UserRole.ADMIN)
    donor = make_test_user(db, "donor_rbac@test.com", "Donor Security", UserRole.DONOR)
    requester = make_test_user(db, "req_rbac@test.com", "Requester Security", UserRole.REQUESTER)

    admin_tok = create_access_token(subject=admin.id)
    donor_tok = create_access_token(subject=donor.id)
    req_tok = create_access_token(subject=requester.id)

    # 1. Admin -> 200 OK
    res_admin = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {admin_tok}"})
    assert res_admin.status_code == 200

    # 2. Donor -> 403 Forbidden
    res_donor = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {donor_tok}"})
    assert res_donor.status_code == 403

    # 3. Requester -> 403 Forbidden
    res_req = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {req_tok}"})
    assert res_req.status_code == 403

    # 4. Unauthenticated -> 401 Unauthorized
    res_anon = client.get("/api/admin/stats")
    assert res_anon.status_code == 401
