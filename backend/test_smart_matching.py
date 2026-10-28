"""
Focused test suite for Smart Emergency Donor Finder.
Uses an isolated in-memory SQLite database to ensure zero writes to MySQL.
Covers all 9 audit requirements from Phase 2.
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
from app.core.security import create_access_token, get_password_hash
from app.utils.enums import UserRole, BloodGroup, RequestStatus, ResponseStatus, UrgencyLevel, Gender, DonationStatus

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
    
    # Override FastAPI get_db dependency
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

def make_donor_profile(db, user_id, blood_group=BloodGroup.A_POSITIVE.value, city="Mumbai", is_available=True, last_donation_date=None):
    p = DonorProfile(
        user_id=user_id,
        blood_group=blood_group,
        date_of_birth=date(1995, 5, 10),
        gender=Gender.MALE.value,
        weight_kg=65.0,
        address="123 Private Street, Area X",
        city=city,
        state="Maharashtra",
        is_available=is_available,
        last_donation_date=last_donation_date,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p

def make_request(db, requester_id, blood_group=BloodGroup.A_POSITIVE.value, city="Mumbai", units_needed=2):
    req = BloodRequest(
        requester_id=requester_id,
        patient_name="Emergency Patient",
        blood_group=blood_group,
        units_needed=units_needed,
        urgency=UrgencyLevel.CRITICAL.value,
        hospital_name="City Hospital",
        hospital_address="456 Hospital Road",
        city=city,
        contact_phone="9123456780",
        required_date=date.today() + timedelta(days=2),
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        status=RequestStatus.OPEN.value,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req

def auth_headers(user):
    token = create_access_token(subject=user.id)
    return {"Authorization": f"Bearer {token}"}

# ─────────────────────────────────────────────────────────────────────────────
# 1. Compatible and incompatible donor filtering
# ─────────────────────────────────────────────────────────────────────────────
def test_compatible_and_incompatible_donor_filtering(client, db):
    requester = make_user(db, "req1@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, requester.id, blood_group=BloodGroup.A_POSITIVE.value, city="Mumbai")

    # A+ can receive from A+, A-, O+, O- (incompatible with B+, B-, AB+, AB-)
    d_a_pos = make_user(db, "donor_apos@test.com")
    make_donor_profile(db, d_a_pos.id, blood_group=BloodGroup.A_POSITIVE.value, city="Mumbai")

    d_o_neg = make_user(db, "donor_oneg@test.com")
    make_donor_profile(db, d_o_neg.id, blood_group=BloodGroup.O_NEGATIVE.value, city="Mumbai")

    d_b_pos = make_user(db, "donor_bpos@test.com")
    make_donor_profile(db, d_b_pos.id, blood_group=BloodGroup.B_POSITIVE.value, city="Mumbai")

    resp = client.get(f"/api/blood-requests/{req.id}/matches", headers=auth_headers(requester))
    assert resp.status_code == 200
    data = resp.json()

    matched_user_ids = [d["user_id"] for d in data]
    assert d_a_pos.id in matched_user_ids, "A+ donor should be matched for A+ request"
    assert d_o_neg.id in matched_user_ids, "O- universal donor should be matched for A+ request"
    assert d_b_pos.id not in matched_user_ids, "B+ donor must be excluded for A+ request"

# ─────────────────────────────────────────────────────────────────────────────
# 2. Unavailable and inactive donor exclusion
# ─────────────────────────────────────────────────────────────────────────────
def test_unavailable_and_inactive_donor_exclusion(client, db):
    requester = make_user(db, "req2@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, requester.id, blood_group=BloodGroup.O_POSITIVE.value, city="Mumbai")

    # Available and active -> included
    d_avail = make_user(db, "d_avail@test.com", is_active=True)
    make_donor_profile(db, d_avail.id, blood_group=BloodGroup.O_POSITIVE.value, is_available=True)

    # Unavailable -> excluded
    d_unavail = make_user(db, "d_unavail@test.com", is_active=True)
    make_donor_profile(db, d_unavail.id, blood_group=BloodGroup.O_POSITIVE.value, is_available=False)

    # Inactive account -> excluded
    d_inactive = make_user(db, "d_inactive@test.com", is_active=False)
    make_donor_profile(db, d_inactive.id, blood_group=BloodGroup.O_POSITIVE.value, is_available=True)

    resp = client.get(f"/api/blood-requests/{req.id}/matches", headers=auth_headers(requester))
    assert resp.status_code == 200
    data = resp.json()

    matched_user_ids = [d["user_id"] for d in data]
    assert d_avail.id in matched_user_ids
    assert d_unavail.id not in matched_user_ids, "Unavailable donor must be excluded"
    assert d_inactive.id not in matched_user_ids, "Inactive user account must be excluded"

# ─────────────────────────────────────────────────────────────────────────────
# 3. Same-city donor prioritization
# ─────────────────────────────────────────────────────────────────────────────
def test_same_city_donor_prioritization(client, db):
    requester = make_user(db, "req3@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, requester.id, blood_group=BloodGroup.B_POSITIVE.value, city="Pune")

    d_other_city = make_user(db, "d_other_city@test.com")
    make_donor_profile(db, d_other_city.id, blood_group=BloodGroup.B_POSITIVE.value, city="Mumbai")

    d_same_city = make_user(db, "d_same_city@test.com")
    make_donor_profile(db, d_same_city.id, blood_group=BloodGroup.B_POSITIVE.value, city="Pune")

    resp = client.get(f"/api/blood-requests/{req.id}/matches", headers=auth_headers(requester))
    assert resp.status_code == 200
    data = resp.json()

    assert len(data) >= 2
    assert data[0]["user_id"] == d_same_city.id, "Same-city donor must be ranked first"
    assert data[0]["is_same_city"] is True
    assert data[1]["user_id"] == d_other_city.id, "Different-city donor must rank second"
    assert data[1]["is_same_city"] is False

# ─────────────────────────────────────────────────────────────────────────────
# 4. City capitalization, whitespace, and missing values
# ─────────────────────────────────────────────────────────────────────────────
def test_city_normalization_and_safe_fallback(client, db):
    requester = make_user(db, "req4@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, requester.id, blood_group=BloodGroup.O_NEGATIVE.value, city="  Bengaluru  ")

    # City with mixed casing and extra whitespace
    d_normalized = make_user(db, "d_norm@test.com")
    make_donor_profile(db, d_normalized.id, blood_group=BloodGroup.O_NEGATIVE.value, city="bengaluru")

    # City with whitespace only
    d_whitespace = make_user(db, "d_white@test.com")
    make_donor_profile(db, d_whitespace.id, blood_group=BloodGroup.O_NEGATIVE.value, city="   ")

    resp = client.get(f"/api/blood-requests/{req.id}/matches", headers=auth_headers(requester))
    assert resp.status_code == 200
    data = resp.json()

    norm_match = next((d for d in data if d["user_id"] == d_normalized.id), None)
    assert norm_match is not None
    assert norm_match["is_same_city"] is True, "Normalized city comparison must match '  Bengaluru  ' and 'bengaluru'"

    white_match = next((d for d in data if d["user_id"] == d_whitespace.id), None)
    assert white_match is not None
    assert white_match["is_same_city"] is False, "Whitespace-only city must not trigger same-city match"

# ─────────────────────────────────────────────────────────────────────────────
# 5. Exact versus compatible blood-group ranking
# ─────────────────────────────────────────────────────────────────────────────
def test_exact_vs_compatible_blood_group_ranking(client, db):
    requester = make_user(db, "req5@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, requester.id, blood_group=BloodGroup.A_POSITIVE.value, city="Delhi")

    # Both in same city, but one is exact (A+) and one is compatible (O-)
    d_comp = make_user(db, "d_comp_same@test.com")
    make_donor_profile(db, d_comp.id, blood_group=BloodGroup.O_NEGATIVE.value, city="Delhi")

    d_exact = make_user(db, "d_exact_same@test.com")
    make_donor_profile(db, d_exact.id, blood_group=BloodGroup.A_POSITIVE.value, city="Delhi")

    resp = client.get(f"/api/blood-requests/{req.id}/matches", headers=auth_headers(requester))
    assert resp.status_code == 200
    data = resp.json()

    assert data[0]["user_id"] == d_exact.id, "Exact match must rank before compatible match in same city"
    assert data[0]["match_type"] == "EXACT"
    assert data[1]["user_id"] == d_comp.id
    assert data[1]["match_type"] == "COMPATIBLE"

# ─────────────────────────────────────────────────────────────────────────────
# 6. Non-owner and donor access returning HTTP 403
# ─────────────────────────────────────────────────────────────────────────────
def test_non_owner_and_donor_access_forbidden(client, db):
    owner = make_user(db, "owner@test.com", role=UserRole.REQUESTER.value)
    other_requester = make_user(db, "other_req@test.com", role=UserRole.REQUESTER.value)
    donor_user = make_user(db, "donor_actor@test.com", role=UserRole.DONOR.value)
    admin_user = make_user(db, "admin_actor@test.com", role=UserRole.ADMIN.value)

    req = make_request(db, owner.id, blood_group=BloodGroup.AB_POSITIVE.value, city="Chennai")

    # Owner requester -> 200 OK
    resp_owner = client.get(f"/api/blood-requests/{req.id}/matches", headers=auth_headers(owner))
    assert resp_owner.status_code == 200

    # Other requester -> 403 Forbidden
    resp_other = client.get(f"/api/blood-requests/{req.id}/matches", headers=auth_headers(other_requester))
    assert resp_other.status_code == 403

    # Donor user -> 403 Forbidden
    resp_donor = client.get(f"/api/blood-requests/{req.id}/matches", headers=auth_headers(donor_user))
    assert resp_donor.status_code == 403

    # Admin user -> 200 OK
    resp_admin = client.get(f"/api/blood-requests/{req.id}/matches", headers=auth_headers(admin_user))
    assert resp_admin.status_code == 200

    # Nonexistent request -> 404 Not Found
    resp_404 = client.get("/api/blood-requests/999999/matches", headers=auth_headers(owner))
    assert resp_404.status_code == 404

# ─────────────────────────────────────────────────────────────────────────────
# 7. Unauthorized exposure of contact details
# ─────────────────────────────────────────────────────────────────────────────
def test_unauthorized_exposure_of_contact_details(client, db):
    requester = make_user(db, "req7@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, requester.id, blood_group=BloodGroup.A_POSITIVE.value, city="Kolkata")

    donor = make_user(db, "secret_donor@test.com", phone="9988776655")
    make_donor_profile(db, donor.id, blood_group=BloodGroup.A_POSITIVE.value, city="Kolkata")

    resp = client.get(f"/api/blood-requests/{req.id}/matches", headers=auth_headers(requester))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1

    match = data[0]
    # Check that private fields are NOT in the payload keys
    assert "email" not in match, "Email must never be exposed in match finder"
    assert "phone" not in match, "Phone must never be exposed in match finder"
    assert "address" not in match, "Street address must never be exposed in match finder"
    assert "medical_conditions" not in match, "Medical conditions must never be exposed in match finder"

    # Verify explainable match reasons are returned without fake AI scores
    assert "match_reasons" in match
    assert isinstance(match["match_reasons"], list)
    assert any("Exact blood group match" in r for r in match["match_reasons"])
    assert any("Donor located in the same city" in r for r in match["match_reasons"])
    assert "ai_score" not in match
    assert "confidence" not in match

# ─────────────────────────────────────────────────────────────────────────────
# 8. Preserved donor response and acceptance workflow
# ─────────────────────────────────────────────────────────────────────────────
def test_preserved_donor_response_and_acceptance_workflow(client, db):
    requester = make_user(db, "req8@test.com", role=UserRole.REQUESTER.value)
    donor = make_user(db, "donor8@test.com", phone="9112233445", role=UserRole.DONOR.value)
    make_donor_profile(db, donor.id, blood_group=BloodGroup.O_POSITIVE.value, city="Nagpur")
    req = make_request(db, requester.id, blood_group=BloodGroup.O_POSITIVE.value, city="Nagpur")

    # 1. Donor creates response
    resp_create = client.post(
        "/api/responses/",
        json={"request_id": req.id, "message": "Ready to donate"},
        headers=auth_headers(donor)
    )
    assert resp_create.status_code == 200
    resp_id = resp_create.json()["id"]

    # 2. Before acceptance, requester views responses -> contact details must be masked
    resp_list = client.get(f"/api/blood-requests/{req.id}/responses", headers=auth_headers(requester))
    assert resp_list.status_code == 200
    pending_resp = resp_list.json()[0]
    assert pending_resp["status"] == "pending"
    assert pending_resp["donor"]["email"] == "", "Email must be masked while pending"
    assert pending_resp["donor"]["phone"] is None, "Phone must be masked while pending"

    # 3. Requester accepts donor
    resp_accept = client.put(
        f"/api/responses/{resp_id}",
        json={"status": ResponseStatus.ACCEPTED.value},
        headers=auth_headers(requester)
    )
    assert resp_accept.status_code == 200

    # 4. After acceptance, contact details are revealed
    resp_list_accepted = client.get(f"/api/blood-requests/{req.id}/responses", headers=auth_headers(requester))
    accepted_resp = resp_list_accepted.json()[0]
    assert accepted_resp["status"] == "accepted"
    assert accepted_resp["donor"]["email"] == donor.email, "Email revealed upon acceptance"
    assert accepted_resp["donor"]["phone"] == donor.phone, "Phone revealed upon acceptance"

    # 5. BloodRequest status updated to fulfilled
    db.refresh(req)
    assert req.status == RequestStatus.FULFILLED.value, "Request must be fulfilled upon donor acceptance"

    # 6. DonationRecord created in pending status
    donation = db.query(DonationRecord).filter(DonationRecord.request_id == req.id).first()
    assert donation is not None
    assert donation.status == DonationStatus.PENDING.value
    assert donation.donor_id == donor.id

# ─────────────────────────────────────────────────────────────────────────────
# 9. Consistent matching results and stable sorting
# ─────────────────────────────────────────────────────────────────────────────
def test_consistent_matching_results_and_stable_sorting(client, db):
    requester = make_user(db, "req9@test.com", role=UserRole.REQUESTER.value)
    req = make_request(db, requester.id, blood_group=BloodGroup.AB_POSITIVE.value, city="Hyderabad")

    # Create 3 donors in different cities / groups
    d1 = make_user(db, "d_stable1@test.com")
    make_donor_profile(db, d1.id, blood_group=BloodGroup.O_NEGATIVE.value, city="Hyderabad")

    d2 = make_user(db, "d_stable2@test.com")
    make_donor_profile(db, d2.id, blood_group=BloodGroup.AB_POSITIVE.value, city="Hyderabad")

    d3 = make_user(db, "d_stable3@test.com")
    make_donor_profile(db, d3.id, blood_group=BloodGroup.AB_POSITIVE.value, city="Bangalore")

    # Run query twice
    res1 = client.get(f"/api/blood-requests/{req.id}/matches", headers=auth_headers(requester)).json()
    res2 = client.get(f"/api/blood-requests/{req.id}/matches", headers=auth_headers(requester)).json()

    order1 = [d["id"] for d in res1]
    order2 = [d["id"] for d in res2]
    assert order1 == order2, "Matching results must be completely deterministic and stable across calls"
    # First: d2 (same city, exact AB+)
    # Second: d1 (same city, compatible O-)
    # Third: d3 (different city, exact AB+)
    assert order1 == [d2.donor_profile.id, d1.donor_profile.id, d3.donor_profile.id]
