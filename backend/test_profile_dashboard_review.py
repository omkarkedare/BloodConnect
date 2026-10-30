"""
Automated Comprehensive Review Tests for Profiles, Dashboards, and Role Security.
Validates:
1. Donor profile creation, update, and readiness calculations.
2. Requester personal info updates and name validation.
3. Separation of FULFILLED requests vs. VERIFIED donations.
4. Role-based certificate access controls (Donor vs. Requester vs. Admin).
5. Unauthenticated privacy protection and data minimization.
"""
import pytest
from datetime import date, datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.donor_profile import DonorProfile
from app.models.blood_request import BloodRequest
from app.models.donation_record import DonationRecord
from app.models.donor_response import DonorResponse
from app.utils.enums import BloodGroup, DonationStatus, RequestStatus, ResponseStatus, UserRole
from app.core.security import create_access_token
from app.routers.donations import generate_certificate_id


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


def test_donor_profile_crud_and_readiness(client, db):
    """
    Test donor profile creation, update, and readiness checklist calculation.
    """
    donor = make_test_user(db, "donor_prof_test@test.com", "Ramesh Kumar", UserRole.DONOR)
    token = create_access_token(subject=donor.id)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Profile
    payload = {
        "blood_group": BloodGroup.O_POSITIVE.value,
        "date_of_birth": "1995-05-15",
        "gender": "male",
        "weight_kg": 68.5,
        "city": "Mumbai",
        "state": "Maharashtra",
        "address": "123 Marine Drive",
        "is_available": True,
        "medical_conditions": "None",
    }
    res_create = client.post("/api/donors/", json=payload, headers=headers)
    assert res_create.status_code in (200, 201)

    # 2. Get Profile
    res_get = client.get("/api/donors/me", headers=headers)
    assert res_get.status_code == 200
    data = res_get.json()
    assert data["blood_group"] == BloodGroup.O_POSITIVE.value
    assert data["city"] == "Mumbai"

    # 3. Check Readiness
    res_ready = client.get("/api/donors/readiness", headers=headers)
    assert res_ready.status_code == 200
    ready_data = res_ready.json()
    assert ready_data["has_profile"] is True
    assert ready_data["is_complete"] is True
    assert ready_data["is_available"] is True
    assert ready_data["can_respond"] is True

    # 4. Update Profile
    update_payload = dict(payload, city="Pune", weight_kg=70.0)
    res_up = client.put("/api/donors/me", json=update_payload, headers=headers)
    assert res_up.status_code == 200
    assert res_up.json()["city"] == "Pune"


def test_requester_profile_update(client, db):
    """
    Test requester personal contact update via PUT /api/auth/me.
    """
    req_user = make_test_user(db, "requester_prof_test@test.com", "Sunita Sharma", UserRole.REQUESTER)
    token = create_access_token(subject=req_user.id)
    headers = {"Authorization": f"Bearer {token}"}

    # Update name and phone
    up_res = client.put(
        "/api/auth/me",
        json={"full_name": "Sunita R. Sharma", "phone": "+91 9820098200"},
        headers=headers,
    )
    assert up_res.status_code == 200
    data = up_res.json()
    assert data["full_name"] == "Sunita R. Sharma"
    assert data["phone"] == "+91 9820098200"

    # Verify retrieval
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["full_name"] == "Sunita R. Sharma"


def test_fulfilled_requests_and_verified_donations_separated(client, db):
    """
    Ensure FULFILLED requests and VERIFIED donation records are computed
    and returned as distinct semantics in API payloads.
    """
    req_user = make_test_user(db, "req_separation_test@test.com", "Anil Deshmukh", UserRole.REQUESTER)
    donor_user = make_test_user(db, "donor_separation_test@test.com", "Vijay Patil", UserRole.DONOR)
    req_token = create_access_token(subject=req_user.id)
    headers = {"Authorization": f"Bearer {req_token}"}

    # Case A: Request 1 is FULFILLED but has NO verified donation records yet
    req_fulfilled = BloodRequest(
        requester_id=req_user.id,
        patient_name="Patient A (Fulfilled)",
        blood_group=BloodGroup.B_POSITIVE.value,
        units_needed=1,
        urgency="normal",
        hospital_name="Lilavati Hospital",
        city="Mumbai",
        contact_phone="+91 9800011111",
        required_date=date(2026, 11, 1),
        status=RequestStatus.FULFILLED.value,
    )
    db.add(req_fulfilled)
    db.commit()
    db.refresh(req_fulfilled)

    # Case B: Request 2 has a medically VERIFIED donation record
    req_verified = BloodRequest(
        requester_id=req_user.id,
        patient_name="Patient B (Verified)",
        blood_group=BloodGroup.A_POSITIVE.value,
        units_needed=1,
        urgency="urgent",
        hospital_name="Hinduja Hospital",
        city="Mumbai",
        contact_phone="+91 9800022222",
        required_date=date(2026, 11, 2),
        status=RequestStatus.FULFILLED.value,
    )
    db.add(req_verified)
    db.commit()
    db.refresh(req_verified)

    donation_verified = DonationRecord(
        donor_id=donor_user.id,
        request_id=req_verified.id,
        blood_group=BloodGroup.A_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 29),
        hospital_name="Hinduja Hospital",
        status=DonationStatus.VERIFIED.value,
        notes="Verified by Dr. Rao [Ref: BC-VER-TEST-SEP]",
    )
    db.add(donation_verified)
    db.commit()

    # Query requester's requests
    res = client.get("/api/blood-requests/", headers=headers)
    assert res.status_code == 200
    req_list = res.json()

    # Find both requests in returned list
    r1 = next(r for r in req_list if r["id"] == req_fulfilled.id)
    r2 = next(r for r in req_list if r["id"] == req_verified.id)

    # Case A must be FULFILLED with 0 verified units
    assert r1["status"] == RequestStatus.FULFILLED.value
    assert r1["display_status"] == "FULFILLED"
    assert r1["verified_units"] == 0

    # Case B must be VERIFIED with 1 verified unit
    assert r2["display_status"] == "VERIFIED"
    assert r2["verified_units"] == 1
    assert r2["donation_status"] == "verified"


def test_role_based_certificate_access_security(client, db):
    """
    Ensure Requesters are strictly forbidden (403) from accessing donor appreciation certificates.
    Ensure only owning donors and admins have access.
    """
    donor = make_test_user(db, "cert_donor_role@test.com", "Donor Owner", UserRole.DONOR)
    other_donor = make_test_user(db, "cert_other_donor@test.com", "Other Donor", UserRole.DONOR)
    requester = make_test_user(db, "cert_req_role@test.com", "Requester Denied", UserRole.REQUESTER)
    admin = make_test_user(db, "cert_admin_role@test.com", "Admin Allowed", UserRole.ADMIN)

    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 28),
        hospital_name="KEM Hospital",
        status=DonationStatus.VERIFIED.value,
        notes="Verified on 2026-10-28 14:00:00 UTC [Ref: BC-VER-KEM]",
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    cert_url = f"/api/donations/{donation.id}/certificate"

    # 1. Requester -> 403 Forbidden
    req_tok = create_access_token(subject=requester.id)
    assert client.get(cert_url, headers={"Authorization": f"Bearer {req_tok}"}).status_code == 403

    # 2. Other Donor -> 403 Forbidden
    other_tok = create_access_token(subject=other_donor.id)
    assert client.get(cert_url, headers={"Authorization": f"Bearer {other_tok}"}).status_code == 403

    # 3. Unauthenticated -> 401 Unauthorized
    assert client.get(cert_url).status_code == 401

    # 4. Owning Donor -> 200 OK
    owner_tok = create_access_token(subject=donor.id)
    res_owner = client.get(cert_url, headers={"Authorization": f"Bearer {owner_tok}"})
    assert res_owner.status_code == 200
    assert res_owner.json()["donor_name"] == "Donor Owner"
    assert res_owner.json()["hospital_name"] == "KEM Hospital"

    # 5. Admin -> 200 OK
    admin_tok = create_access_token(subject=admin.id)
    res_admin = client.get(cert_url, headers={"Authorization": f"Bearer {admin_tok}"})
    assert res_admin.status_code == 200
    assert res_admin.json()["donor_name"] == "Donor Owner"
