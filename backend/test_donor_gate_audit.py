"""
Focused test suite for Donor Profile Completion Gate (Phase 5.5).
Uses an isolated in-memory SQLite database to ensure zero writes to MySQL.
Covers all 10 audit requirements from Step 7.
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
from app.models.notification import Notification
from app.core.security import create_access_token, get_password_hash
from app.utils.enums import UserRole, BloodGroup, RequestStatus, ResponseStatus, UrgencyLevel, Gender

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
    city="Mumbai",
    status=RequestStatus.OPEN.value,
    expires_at=None,
    required_date=None,
):
    req = BloodRequest(
        requester_id=requester_id,
        patient_name="Patient Gate",
        blood_group=blood_group,
        units_needed=2,
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
# 1. Donor without profile cannot respond (DONOR_PROFILE_INCOMPLETE)
# ─────────────────────────────────────────────────────────────────────────────
def test_donor_without_profile_cannot_respond(client, db):
    requester = make_user(db, "req_gate1@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, requester.id, blood_group=BloodGroup.A_POSITIVE.value)

    # Donor with role='donor' but NO DonorProfile
    donor_no_profile = make_user(db, "donor_no_prof@test.com", role=UserRole.DONOR.value)

    resp = client.post(
        "/api/responses/",
        json={"request_id": req.id, "message": "I want to donate"},
        headers=auth_headers(donor_no_profile),
    )
    assert resp.status_code == 400
    assert "DONOR_PROFILE_INCOMPLETE" in resp.json()["detail"]

    # Ensure no response record was inserted
    count = db.query(DonorResponse).filter(DonorResponse.donor_id == donor_no_profile.id).count()
    assert count == 0


# ─────────────────────────────────────────────────────────────────────────────
# 2. Donor with missing mandatory field cannot respond
# ─────────────────────────────────────────────────────────────────────────────
def test_donor_with_missing_mandatory_field_cannot_respond(client, db):
    requester = make_user(db, "req_gate2@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, requester.id, blood_group=BloodGroup.A_POSITIVE.value)

    # Donor missing weight
    d_no_weight = make_user(db, "donor_noweight@test.com")
    make_donor_profile(db, d_no_weight.id, weight=None)

    resp = client.post(
        "/api/responses/",
        json={"request_id": req.id, "message": "Can I donate?"},
        headers=auth_headers(d_no_weight),
    )
    assert resp.status_code == 400
    assert "DONOR_PROFILE_INCOMPLETE" in resp.json()["detail"]
    assert "weight_kg" in resp.json()["detail"]

    # Donor with empty city
    d_no_city = make_user(db, "donor_nocity@test.com")
    make_donor_profile(db, d_no_city.id, city="")

    resp2 = client.post(
        "/api/responses/",
        json={"request_id": req.id, "message": "Can I donate?"},
        headers=auth_headers(d_no_city),
    )
    assert resp2.status_code == 400
    assert "DONOR_PROFILE_INCOMPLETE" in resp2.json()["detail"]
    assert "city" in resp2.json()["detail"]


# ─────────────────────────────────────────────────────────────────────────────
# 3. Underage donor (<18) or under-weight (<45kg) cannot respond
# ─────────────────────────────────────────────────────────────────────────────
def test_underage_or_underweight_donor_cannot_respond(client, db):
    requester = make_user(db, "req_gate3@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, requester.id, blood_group=BloodGroup.A_POSITIVE.value)

    # Underage donor (16 years old)
    today = date.today()
    underage_dob = date(today.year - 16, today.month, today.day)
    d_underage = make_user(db, "donor_minor@test.com")
    make_donor_profile(db, d_underage.id, dob=underage_dob)

    resp = client.post(
        "/api/responses/",
        json={"request_id": req.id, "message": "I want to help"},
        headers=auth_headers(d_underage),
    )
    assert resp.status_code == 400
    assert "DONOR_PROFILE_INCOMPLETE" in resp.json()["detail"]
    assert "18" in resp.json()["detail"]

    # Underweight donor (<45kg) profile creation blocked
    d_underweight = make_user(db, "donor_underweight@test.com")
    resp_create_underweight = client.post(
        "/api/donors/",
        json={
            "blood_group": BloodGroup.A_POSITIVE.value,
            "date_of_birth": "1995-05-10",
            "gender": "male",
            "weight_kg": 42.0,
            "city": "Mumbai",
        },
        headers=auth_headers(d_underweight),
    )
    assert resp_create_underweight.status_code == 400
    assert "45kg" in resp_create_underweight.json()["detail"]

    # Because profile was blocked, responding is rejected with DONOR_PROFILE_INCOMPLETE
    resp2 = client.post(
        "/api/responses/",
        json={"request_id": req.id, "message": "I want to help"},
        headers=auth_headers(d_underweight),
    )
    assert resp2.status_code == 400
    assert "DONOR_PROFILE_INCOMPLETE" in resp2.json()["detail"]

    # Verify validator directly handles weight < 45kg
    from app.services.donor_profile import check_donor_profile_completion
    d_mock = make_user(db, "donor_mock_weight@test.com")
    p_mock = make_donor_profile(db, d_mock.id, weight=50.0)
    p_mock.weight_kg = 42.0
    res = check_donor_profile_completion(d_mock, db)
    assert res.is_complete is False
    assert any("45kg" in err for err in res.validation_errors)


# ─────────────────────────────────────────────────────────────────────────────
# 4. Unavailable donor cannot respond (clear actionable DONOR_UNAVAILABLE)
# ─────────────────────────────────────────────────────────────────────────────
def test_unavailable_donor_cannot_respond(client, db):
    requester = make_user(db, "req_gate4@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, requester.id, blood_group=BloodGroup.A_POSITIVE.value)

    # Complete profile, but marked unavailable
    d_unavailable = make_user(db, "donor_unavail@test.com")
    make_donor_profile(db, d_unavailable.id, is_available=False)

    resp = client.post(
        "/api/responses/",
        json={"request_id": req.id, "message": "Responding while unavailable"},
        headers=auth_headers(d_unavailable),
    )
    assert resp.status_code == 400
    assert "DONOR_UNAVAILABLE" in resp.json()["detail"]

    count = db.query(DonorResponse).filter(DonorResponse.donor_id == d_unavailable.id).count()
    assert count == 0


# ─────────────────────────────────────────────────────────────────────────────
# 5. Incompatible blood group donor cannot respond (BLOOD_GROUP_INCOMPATIBLE)
# ─────────────────────────────────────────────────────────────────────────────
def test_incompatible_blood_group_donor_cannot_respond(client, db):
    requester = make_user(db, "req_gate5@test.com", role=UserRole.REQUESTER.value)
    # Recipient needs A+ (compatible: A+, A-, O+, O-)
    req = make_request(db, requester.id, blood_group=BloodGroup.A_POSITIVE.value)

    # Complete profile, available, but blood group is B+
    d_incompatible = make_user(db, "donor_b_incomp@test.com")
    make_donor_profile(db, d_incompatible.id, blood_group=BloodGroup.B_POSITIVE.value)

    resp = client.post(
        "/api/responses/",
        json={"request_id": req.id, "message": "I have B+ blood"},
        headers=auth_headers(d_incompatible),
    )
    assert resp.status_code == 400
    assert "BLOOD_GROUP_INCOMPATIBLE" in resp.json()["detail"]
    assert "B+" in resp.json()["detail"]


# ─────────────────────────────────────────────────────────────────────────────
# 6. First-time donor with COMPLETE profile CAN respond successfully
# ─────────────────────────────────────────────────────────────────────────────
def test_first_time_donor_with_complete_profile_can_respond(client, db):
    requester = make_user(db, "req_gate6@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, requester.id, blood_group=BloodGroup.A_POSITIVE.value)

    # First-time donor: complete profile, available, zero previous donations
    d_first_time = make_user(db, "first_time_donor@test.com")
    make_donor_profile(db, d_first_time.id, blood_group=BloodGroup.A_POSITIVE.value, last_donation_date=None)

    resp = client.post(
        "/api/responses/",
        json={"request_id": req.id, "message": "First time donor ready to help!"},
        headers=auth_headers(d_first_time),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == ResponseStatus.PENDING.value
    assert data["donor_id"] == d_first_time.id
    assert data["request_id"] == req.id

    # Verify notification created for requester
    notif = db.query(Notification).filter(Notification.user_id == requester.id).first()
    assert notif is not None
    assert "A+ blood" in notif.message


# ─────────────────────────────────────────────────────────────────────────────
# 7. Donor cannot respond to expired request
# ─────────────────────────────────────────────────────────────────────────────
def test_donor_cannot_respond_to_expired_request(client, db):
    requester = make_user(db, "req_gate7@test.com", role=UserRole.REQUESTER.value)
    past_expiry = datetime.now(timezone.utc) - timedelta(hours=2)
    req = make_request(
        db,
        requester.id,
        blood_group=BloodGroup.A_POSITIVE.value,
        expires_at=past_expiry,
    )

    d_valid = make_user(db, "donor_expired_test@test.com")
    make_donor_profile(db, d_valid.id, blood_group=BloodGroup.A_POSITIVE.value)

    resp = client.post(
        "/api/responses/",
        json={"request_id": req.id, "message": "Too late"},
        headers=auth_headers(d_valid),
    )
    assert resp.status_code == 400
    assert "expired" in resp.json()["detail"].lower()


# ─────────────────────────────────────────────────────────────────────────────
# 8. Donor cannot respond to non-open request
# ─────────────────────────────────────────────────────────────────────────────
def test_donor_cannot_respond_to_non_open_request(client, db):
    requester = make_user(db, "req_gate8@test.com", role=UserRole.REQUESTER.value)
    req = make_request(
        db,
        requester.id,
        blood_group=BloodGroup.A_POSITIVE.value,
        status=RequestStatus.FULFILLED.value,
    )

    d_valid = make_user(db, "donor_fulfilled_test@test.com")
    make_donor_profile(db, d_valid.id, blood_group=BloodGroup.A_POSITIVE.value)

    resp = client.post(
        "/api/responses/",
        json={"request_id": req.id, "message": "Responding to fulfilled"},
        headers=auth_headers(d_valid),
    )
    assert resp.status_code == 400
    assert "fulfilled" in resp.json()["detail"].lower()


# ─────────────────────────────────────────────────────────────────────────────
# 9. Donor cannot respond twice to the same request
# ─────────────────────────────────────────────────────────────────────────────
def test_donor_cannot_respond_twice_to_same_request(client, db):
    requester = make_user(db, "req_gate9@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, requester.id, blood_group=BloodGroup.A_POSITIVE.value)

    d_valid = make_user(db, "donor_twice_test@test.com")
    make_donor_profile(db, d_valid.id, blood_group=BloodGroup.A_POSITIVE.value)

    # First response succeeds
    resp1 = client.post(
        "/api/responses/",
        json={"request_id": req.id, "message": "First response"},
        headers=auth_headers(d_valid),
    )
    assert resp1.status_code == 200

    # Second response fails
    resp2 = client.post(
        "/api/responses/",
        json={"request_id": req.id, "message": "Second response attempt"},
        headers=auth_headers(d_valid),
    )
    assert resp2.status_code == 400
    assert "already responded" in resp2.json()["detail"].lower()


# ─────────────────────────────────────────────────────────────────────────────
# 10. Donor readiness endpoint returns accurate completion checklist & status
# ─────────────────────────────────────────────────────────────────────────────
def test_donor_readiness_endpoint_status_and_checklist(client, db):
    # Donor without profile
    d_no_prof = make_user(db, "readiness_no_prof@test.com")
    resp_np = client.get("/api/donors/readiness", headers=auth_headers(d_no_prof))
    assert resp_np.status_code == 200
    np_data = resp_np.json()
    assert np_data["has_profile"] is False
    assert np_data["is_complete"] is False
    assert np_data["can_respond"] is False
    assert len(np_data["missing_fields"]) == 5
    assert "blood_group" in np_data["missing_fields"]
    assert "weight_kg" in np_data["missing_fields"]

    # Donor with incomplete profile (missing weight)
    d_incomp = make_user(db, "readiness_incomp@test.com")
    make_donor_profile(db, d_incomp.id, weight=None)
    resp_inc = client.get("/api/donors/readiness", headers=auth_headers(d_incomp))
    assert resp_inc.status_code == 200
    inc_data = resp_inc.json()
    assert inc_data["has_profile"] is True
    assert inc_data["is_complete"] is False
    assert inc_data["can_respond"] is False
    assert "weight_kg" in inc_data["missing_fields"]

    # Donor with complete profile but unavailable
    d_unavail = make_user(db, "readiness_unavail@test.com")
    make_donor_profile(db, d_unavail.id, is_available=False)
    resp_un = client.get("/api/donors/readiness", headers=auth_headers(d_unavail))
    assert resp_un.status_code == 200
    un_data = resp_un.json()
    assert un_data["is_complete"] is True
    assert un_data["is_available"] is False
    assert un_data["can_respond"] is False
    assert len(un_data["missing_fields"]) == 0

    # Donor with complete profile and available (ready to donate)
    d_ready = make_user(db, "readiness_ready@test.com")
    make_donor_profile(db, d_ready.id, is_available=True)
    resp_rdy = client.get("/api/donors/readiness", headers=auth_headers(d_ready))
    assert resp_rdy.status_code == 200
    rdy_data = resp_rdy.json()
    assert rdy_data["is_complete"] is True
    assert rdy_data["is_available"] is True
    assert rdy_data["can_respond"] is True
    assert len(rdy_data["missing_fields"]) == 0
    assert rdy_data["blood_group"] == BloodGroup.A_POSITIVE.value
    assert rdy_data["city"] == "Mumbai"
