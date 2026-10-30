"""
Tests for Donor Badges and Recognition Achievements System.
Validates:
1. Badge thresholds: First Lifesaver (1), Bronze Donor (3), Silver Donor (5), Gold Donor (10).
2. Status filtering: only admin-VERIFIED donations count; PENDING and REJECTED never count.
3. Dynamic status changes: PENDING -> VERIFIED awards badge; VERIFIED -> REJECTED removes badge.
4. Duplicate prevention: multiple records for same request_id or duplicate voluntary records count once.
5. Role and ownership security: donors only see own achievements; requesters forbidden (403).
6. Mere response acceptance without verified donation does not grant badges.
"""

import pytest
from datetime import date, datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.blood_request import BloodRequest
from app.models.donation_record import DonationRecord
from app.models.donor_response import DonorResponse
from app.utils.enums import BloodGroup, DonationStatus, RequestStatus, ResponseStatus, UserRole
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


def test_badge_thresholds_progression(client, db):
    """
    Test milestone badge thresholds:
    0 -> None
    1 -> First Lifesaver
    3 -> Bronze Donor
    5 -> Silver Donor
    10 -> Gold Donor
    """
    donor = make_test_user(db, "thresh_donor@test.com", "Aarav Sharma", UserRole.DONOR)
    token = create_access_token(subject=donor.id)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. 0 verified donations
    res0 = client.get("/api/donors/achievements", headers=headers)
    assert res0.status_code == 200
    data0 = res0.json()
    assert data0["total_verified_donations"] == 0
    assert len(data0["earned_badges"]) == 0
    assert data0["highest_badge"] is None
    assert data0["next_milestone"] is not None
    assert data0["next_milestone"]["badge_id"] == "first_lifesaver"
    assert data0["next_milestone"]["remaining_count"] == 1
    assert data0["next_milestone"]["progress_percentage"] == 0

    # 2. Add 1 verified donation -> First Lifesaver unlocked
    d1 = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 1, 10),
        hospital_name="Hospital 1",
        status=DonationStatus.VERIFIED.value,
    )
    db.add(d1)
    db.commit()

    res1 = client.get("/api/donors/achievements", headers=headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["total_verified_donations"] == 1
    assert len(data1["earned_badges"]) == 1
    assert data1["earned_badges"][0]["id"] == "first_lifesaver"
    assert data1["highest_badge"]["id"] == "first_lifesaver"
    assert data1["next_milestone"]["badge_id"] == "bronze_donor"
    assert data1["next_milestone"]["target_count"] == 3
    assert data1["next_milestone"]["remaining_count"] == 2
    assert data1["next_milestone"]["progress_percentage"] == 33

    # 3. Add 2 more verified donations (total: 3) -> Bronze Donor unlocked
    d2 = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 3, 15),
        hospital_name="Hospital 2",
        status=DonationStatus.VERIFIED.value,
    )
    d3 = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 5, 20),
        hospital_name="Hospital 3",
        status=DonationStatus.VERIFIED.value,
    )
    db.add_all([d2, d3])
    db.commit()

    res3 = client.get("/api/donors/achievements", headers=headers)
    data3 = res3.json()
    assert data3["total_verified_donations"] == 3
    assert len(data3["earned_badges"]) == 2
    assert [b["id"] for b in data3["earned_badges"]] == ["first_lifesaver", "bronze_donor"]
    assert data3["highest_badge"]["id"] == "bronze_donor"
    assert data3["next_milestone"]["badge_id"] == "silver_donor"
    assert data3["next_milestone"]["target_count"] == 5
    assert data3["next_milestone"]["remaining_count"] == 2
    assert data3["next_milestone"]["progress_percentage"] == 60

    # 4. Add 2 more verified donations (total: 5) -> Silver Donor unlocked
    d4 = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 7, 1),
        hospital_name="Hospital 4",
        status=DonationStatus.VERIFIED.value,
    )
    d5 = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 8, 15),
        hospital_name="Hospital 5",
        status=DonationStatus.VERIFIED.value,
    )
    db.add_all([d4, d5])
    db.commit()

    res5 = client.get("/api/donors/achievements", headers=headers)
    data5 = res5.json()
    assert data5["total_verified_donations"] == 5
    assert len(data5["earned_badges"]) == 3
    assert [b["id"] for b in data5["earned_badges"]] == ["first_lifesaver", "bronze_donor", "silver_donor"]
    assert data5["highest_badge"]["id"] == "silver_donor"
    assert data5["next_milestone"]["badge_id"] == "gold_donor"
    assert data5["next_milestone"]["target_count"] == 10
    assert data5["next_milestone"]["remaining_count"] == 5
    assert data5["next_milestone"]["progress_percentage"] == 50

    # 5. Add 5 more verified donations (total: 10) -> Gold Donor unlocked
    for i in range(6, 11):
        db.add(
            DonationRecord(
                donor_id=donor.id,
                blood_group=BloodGroup.O_POSITIVE.value,
                units_donated=1,
                donation_date=date(2026, 9, i),
                hospital_name=f"Hospital {i}",
                status=DonationStatus.VERIFIED.value,
            )
        )
    db.commit()

    res10 = client.get("/api/donors/achievements", headers=headers)
    data10 = res10.json()
    assert data10["total_verified_donations"] == 10
    assert len(data10["earned_badges"]) == 4
    assert [b["id"] for b in data10["earned_badges"]] == [
        "first_lifesaver",
        "bronze_donor",
        "silver_donor",
        "gold_donor",
    ]
    assert data10["highest_badge"]["id"] == "gold_donor"
    assert data10["next_milestone"] is None  # All milestones completed!


def test_donation_status_changes_and_filters(client, db):
    """
    Ensure only admin-VERIFIED donations count towards achievements.
    PENDING and REJECTED donations must never award badges.
    """
    donor = make_test_user(db, "status_test_donor@test.com", "Meera Sen", UserRole.DONOR)
    token = create_access_token(subject=donor.id)
    headers = {"Authorization": f"Bearer {token}"}

    # Case 1: Donation is PENDING -> 0 badges
    pending_donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.A_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 1),
        hospital_name="City Hospital",
        status=DonationStatus.PENDING.value,
    )
    db.add(pending_donation)
    db.commit()

    res_pending = client.get("/api/donors/achievements", headers=headers)
    assert res_pending.status_code == 200
    assert res_pending.json()["total_verified_donations"] == 0
    assert len(res_pending.json()["earned_badges"]) == 0

    # Case 2: Admin verifies donation -> First Lifesaver unlocked
    pending_donation.status = DonationStatus.VERIFIED.value
    db.commit()

    res_verified = client.get("/api/donors/achievements", headers=headers)
    assert res_verified.json()["total_verified_donations"] == 1
    assert len(res_verified.json()["earned_badges"]) == 1
    assert res_verified.json()["highest_badge"]["id"] == "first_lifesaver"

    # Case 3: Second donation is REJECTED -> total remains 1, no Bronze Donor
    rejected_donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.A_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 15),
        hospital_name="City Hospital",
        status=DonationStatus.REJECTED.value,
    )
    db.add(rejected_donation)
    db.commit()

    res_with_rejected = client.get("/api/donors/achievements", headers=headers)
    assert res_with_rejected.json()["total_verified_donations"] == 1
    assert len(res_with_rejected.json()["earned_badges"]) == 1

    # Case 4: First donation is revoked/rejected -> count drops to 0
    pending_donation.status = DonationStatus.REJECTED.value
    db.commit()

    res_revoked = client.get("/api/donors/achievements", headers=headers)
    assert res_revoked.json()["total_verified_donations"] == 0
    assert len(res_revoked.json()["earned_badges"]) == 0
    assert res_revoked.json()["highest_badge"] is None


def test_duplicate_prevention_and_same_date_hospital_preservation(client, db):
    """
    Ensure duplicate donation entries for the same blood request count once,
    while legitimate distinct donations sharing the same date and hospital are preserved.
    """
    donor = make_test_user(db, "dup_donor@test.com", "Rohan Joshi", UserRole.DONOR)
    req_user = make_test_user(db, "dup_req_user@test.com", "Req User", UserRole.REQUESTER)
    token = create_access_token(subject=donor.id)
    headers = {"Authorization": f"Bearer {token}"}

    req = BloodRequest(
        requester_id=req_user.id,
        patient_name="Patient Dup",
        blood_group=BloodGroup.B_POSITIVE.value,
        units_needed=2,
        urgency="urgent",
        hospital_name="Fortis Hospital",
        city="Mumbai",
        contact_phone="+91 9999988888",
        required_date=date(2026, 10, 20),
        status=RequestStatus.FULFILLED.value,
    )
    db.add(req)
    db.commit()

    # Case A: Two verified records referencing the SAME blood request -> counted once
    rec_a1 = DonationRecord(
        donor_id=donor.id,
        request_id=req.id,
        blood_group=BloodGroup.B_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 20),
        hospital_name="Fortis Hospital",
        status=DonationStatus.VERIFIED.value,
    )
    rec_a2 = DonationRecord(
        donor_id=donor.id,
        request_id=req.id,  # Duplicate request_id
        blood_group=BloodGroup.B_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 20),
        hospital_name="Fortis Hospital",
        status=DonationStatus.VERIFIED.value,
    )
    db.add_all([rec_a1, rec_a2])
    db.commit()

    # Should count as exactly 1 donation, not 2
    res_dup = client.get("/api/donors/achievements", headers=headers)
    assert res_dup.status_code == 200
    assert res_dup.json()["total_verified_donations"] == 1
    assert len(res_dup.json()["earned_badges"]) == 1

    # Case B: Two legitimate distinct voluntary donations sharing the same date and hospital
    # (e.g. separate verified donation sessions/apheresis/whole blood) -> BOTH must be preserved
    rec_b1 = DonationRecord(
        donor_id=donor.id,
        request_id=None,
        blood_group=BloodGroup.B_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 25),
        hospital_name="Voluntary Camp A",
        status=DonationStatus.VERIFIED.value,
    )
    rec_b2 = DonationRecord(
        donor_id=donor.id,
        request_id=None,
        blood_group=BloodGroup.B_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 25),
        hospital_name="Voluntary Camp A",  # Legitimate second verified session on same date & hospital
        status=DonationStatus.VERIFIED.value,
    )
    db.add_all([rec_b1, rec_b2])
    db.commit()

    # Total should be 3 (1 from request + 2 legitimate distinct voluntary camp donations)
    res_b = client.get("/api/donors/achievements", headers=headers)
    assert res_b.json()["total_verified_donations"] == 3
    assert res_b.json()["highest_badge"]["id"] == "bronze_donor"


def test_ownership_and_role_security(client, db):
    """
    Ensure donors only see their own verified donation achievements.
    Requesters must be forbidden (403) from calling donor achievements.
    Unauthenticated users must receive 401.
    """
    donor_a = make_test_user(db, "owner_a@test.com", "Donor Alpha", UserRole.DONOR)
    donor_b = make_test_user(db, "owner_b@test.com", "Donor Beta", UserRole.DONOR)
    requester = make_test_user(db, "owner_req@test.com", "Requester Denied", UserRole.REQUESTER)

    # Donor A has 3 verified donations
    for i in range(3):
        db.add(
            DonationRecord(
                donor_id=donor_a.id,
                blood_group=BloodGroup.AB_POSITIVE.value,
                units_donated=1,
                donation_date=date(2026, 8, i + 1),
                hospital_name=f"Hospital Alpha {i}",
                status=DonationStatus.VERIFIED.value,
            )
        )
    # Donor B has 1 verified donation
    db.add(
        DonationRecord(
            donor_id=donor_b.id,
            blood_group=BloodGroup.O_NEGATIVE.value,
            units_donated=1,
            donation_date=date(2026, 8, 10),
            hospital_name="Hospital Beta",
            status=DonationStatus.VERIFIED.value,
        )
    )
    db.commit()

    tok_a = create_access_token(subject=donor_a.id)
    tok_b = create_access_token(subject=donor_b.id)
    tok_req = create_access_token(subject=requester.id)

    # Donor A: Bronze Donor (3 verified)
    res_a = client.get("/api/donors/achievements", headers={"Authorization": f"Bearer {tok_a}"})
    assert res_a.status_code == 200
    assert res_a.json()["total_verified_donations"] == 3
    assert res_a.json()["highest_badge"]["id"] == "bronze_donor"

    # Donor B: First Lifesaver (1 verified)
    res_b = client.get("/api/donors/achievements", headers={"Authorization": f"Bearer {tok_b}"})
    assert res_b.status_code == 200
    assert res_b.json()["total_verified_donations"] == 1
    assert res_b.json()["highest_badge"]["id"] == "first_lifesaver"

    # Requester: 403 Forbidden
    res_req = client.get("/api/donors/achievements", headers={"Authorization": f"Bearer {tok_req}"})
    assert res_req.status_code == 403

    # Unauthenticated: 401 Unauthorized
    res_anon = client.get("/api/donors/achievements")
    assert res_anon.status_code == 401

    # Also check /api/donations/achievements alias
    alias_res = client.get("/api/donations/achievements", headers={"Authorization": f"Bearer {tok_a}"})
    assert alias_res.status_code == 200
    assert alias_res.json()["total_verified_donations"] == 3


def test_accepted_response_without_verified_donation_does_not_count(client, db):
    """
    Ensure an accepted DonorResponse does not award badges unless an
    admin-verified DonationRecord has actually been created.
    """
    donor = make_test_user(db, "resp_only_donor@test.com", "Priya Verma", UserRole.DONOR)
    req_user = make_test_user(db, "resp_only_req@test.com", "Requester Hospital", UserRole.REQUESTER)
    token = create_access_token(subject=donor.id)
    headers = {"Authorization": f"Bearer {token}"}

    blood_req = BloodRequest(
        requester_id=req_user.id,
        patient_name="Patient Response Only",
        blood_group=BloodGroup.O_POSITIVE.value,
        units_needed=1,
        urgency="urgent",
        hospital_name="Apollo Hospital",
        city="Mumbai",
        contact_phone="+91 9988776655",
        required_date=date(2026, 11, 1),
        status=RequestStatus.OPEN.value,
    )
    db.add(blood_req)
    db.commit()

    # Donor response accepted by requester, but NO verified donation record
    resp = DonorResponse(
        request_id=blood_req.id,
        donor_id=donor.id,
        status=ResponseStatus.ACCEPTED.value,
    )
    db.add(resp)
    db.commit()

    res = client.get("/api/donors/achievements", headers=headers)
    assert res.status_code == 200
    assert res.json()["total_verified_donations"] == 0
    assert len(res.json()["earned_badges"]) == 0
    assert res.json()["highest_badge"] is None
