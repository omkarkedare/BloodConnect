"""
Automated Test Suite for Phase 8: Donation Appreciation Certificate.
Validates:
1. Secure certificate API accessible for VERIFIED donations only.
2. Authorization: Only owning donor and admin can access certificates.
3. Other donors and requesters are forbidden (HTTP 403).
4. Pending and rejected donations cannot be issued certificates (HTTP 400).
5. Stable, deterministic, unique certificate ID generation without database migrations.
6. Multilingual donor names (English, Marathi, Hindi) supported seamlessly.
7. Unauthenticated callers rejected (HTTP 401).
8. Non-existent donations return HTTP 404.
"""

from datetime import date, datetime, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.donation_record import DonationRecord
from app.utils.enums import BloodGroup, DonationStatus, UserRole
from app.core.security import create_access_token, get_password_hash
from app.routers.donations import generate_certificate_id, extract_verification_details


# ─────────────────────────────────────────────────────────────────────────────
# In-Memory SQLite Setup for Isolated Testing (Zero Live MySQL Pollution)
# ─────────────────────────────────────────────────────────────────────────────

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


@pytest.fixture
def db(db_engine):
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = TestingSession()
    yield session
    session.rollback()
    session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.pop(get_db, None)


def get_or_create_user(db, email, full_name, role):
    u = db.query(User).filter(User.email == email).first()
    if not u:
        u = User(
            email=email,
            password_hash=get_password_hash("pass"),
            full_name=full_name,
            role=role,
            is_active=True,
            is_verified=True,
        )
        db.add(u)
        db.commit()
        db.refresh(u)
    return u


@pytest.fixture
def test_users(db):
    admin = get_or_create_user(db, "admin_cert@example.com", "Dr. System Admin", UserRole.ADMIN.value)
    donor1 = get_or_create_user(db, "donor1_cert@example.com", "Omkar Kedare", UserRole.DONOR.value)
    donor2 = get_or_create_user(db, "donor2_cert@example.com", "ओंकार केदारे", UserRole.DONOR.value)
    donor_other = get_or_create_user(db, "donor_other_cert@example.com", "Other Donor", UserRole.DONOR.value)
    requester = get_or_create_user(db, "req_cert@example.com", "Requester User", UserRole.REQUESTER.value)

    return {
        "admin": admin,
        "donor1": donor1,
        "donor2": donor2,
        "donor_other": donor_other,
        "requester": requester,
    }


def auth_headers(user):
    token = create_access_token(subject=user.id)
    return {"Authorization": f"Bearer {token}"}


# ─────────────────────────────────────────────────────────────────────────────
# TESTS
# ─────────────────────────────────────────────────────────────────────────────

def test_certificate_access_by_owning_donor_success(client, db, test_users):
    """Owning donor can view/download appreciation certificate for a verified donation."""
    donor = test_users["donor1"]
    admin = test_users["admin"]

    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_POSITIVE,
        units_donated=1,
        donation_date=date(2026, 10, 27),
        hospital_name="Lilavati Hospital, Mumbai",
        notes=f"[Verified on 2026-10-28 16:38:07 UTC by Admin #{admin.id} ({admin.full_name}) | Ref: BB-MUM-112233]",
        verified_by=admin.id,
        status=DonationStatus.VERIFIED.value,
    )
    db.add(donation)
    db.commit()

    resp = client.get(f"/api/donations/{donation.id}/certificate", headers=auth_headers(donor))
    assert resp.status_code == 200
    data = resp.json()
    assert data["donation_id"] == donation.id
    assert data["donor_id"] == donor.id
    assert data["donor_name"] == "Omkar Kedare"
    assert data["blood_group"] == "O+"
    assert data["units_donated"] == 1
    assert data["donation_date"] == "2026-10-27"
    assert data["hospital_name"] == "Lilavati Hospital, Mumbai"
    assert data["verification_reference"] == "BB-MUM-112233"
    assert data["verifier_name"] == "Dr. System Admin"
    assert data["verified_at"] == "2026-10-28 16:38:07 UTC"
    assert data["certificate_id"].startswith("BC-CERT-20261027-")
    assert len(data["certificate_id"]) > 20


def test_certificate_access_by_admin_success(client, db, test_users):
    """Admin can view/download certificate for any verified donation."""
    donor = test_users["donor1"]
    admin = test_users["admin"]

    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.A_POSITIVE,
        units_donated=2,
        donation_date=date(2026, 10, 25),
        hospital_name="Apollo Hospital, Pune",
        notes="[Verified on 2026-10-26 10:00:00 UTC by Admin #1 (Admin) | Ref: APOLLO-001]",
        verified_by=admin.id,
        status=DonationStatus.VERIFIED.value,
    )
    db.add(donation)
    db.commit()

    resp = client.get(f"/api/donations/{donation.id}/certificate", headers=auth_headers(admin))
    assert resp.status_code == 200
    assert resp.json()["verification_reference"] == "APOLLO-001"


def test_certificate_access_by_other_donor_forbidden(client, db, test_users):
    """A donor cannot access another donor's donation certificate."""
    donor = test_users["donor1"]
    other_donor = test_users["donor_other"]

    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.B_POSITIVE,
        units_donated=1,
        donation_date=date.today(),
        status=DonationStatus.VERIFIED.value,
    )
    db.add(donation)
    db.commit()

    resp = client.get(f"/api/donations/{donation.id}/certificate", headers=auth_headers(other_donor))
    assert resp.status_code == 403
    assert "not authorized" in resp.json()["detail"].lower()


def test_certificate_access_by_requester_forbidden(client, db, test_users):
    """A requester cannot access any donor's donation certificate."""
    donor = test_users["donor1"]
    requester = test_users["requester"]

    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_NEGATIVE,
        units_donated=1,
        donation_date=date.today(),
        status=DonationStatus.VERIFIED.value,
    )
    db.add(donation)
    db.commit()

    resp = client.get(f"/api/donations/{donation.id}/certificate", headers=auth_headers(requester))
    assert resp.status_code == 403
    assert "not authorized" in resp.json()["detail"].lower()


def test_certificate_pending_donation_rejected(client, db, test_users):
    """Pending donations cannot have certificates issued (HTTP 400)."""
    donor = test_users["donor1"]

    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_POSITIVE,
        units_donated=1,
        donation_date=date.today(),
        status=DonationStatus.PENDING.value,
    )
    db.add(donation)
    db.commit()

    resp = client.get(f"/api/donations/{donation.id}/certificate", headers=auth_headers(donor))
    assert resp.status_code == 400
    assert "verified" in resp.json()["detail"].lower()


def test_certificate_rejected_donation_rejected(client, db, test_users):
    """Rejected donations cannot have certificates issued (HTTP 400)."""
    donor = test_users["donor1"]

    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_POSITIVE,
        units_donated=1,
        donation_date=date.today(),
        status=DonationStatus.REJECTED.value,
    )
    db.add(donation)
    db.commit()

    resp = client.get(f"/api/donations/{donation.id}/certificate", headers=auth_headers(donor))
    assert resp.status_code == 400
    assert "verified" in resp.json()["detail"].lower()


def test_certificate_multilingual_donor_names(client, db, test_users):
    """Multilingual donor names in Marathi/Hindi are preserved accurately in certificate."""
    marathi_donor = test_users["donor2"]

    donation = DonationRecord(
        donor_id=marathi_donor.id,
        blood_group=BloodGroup.AB_POSITIVE,
        units_donated=1,
        donation_date=date(2026, 10, 28),
        hospital_name="ससून रुग्णालय, पुणे",
        status=DonationStatus.VERIFIED.value,
    )
    db.add(donation)
    db.commit()

    resp = client.get(f"/api/donations/{donation.id}/certificate", headers=auth_headers(marathi_donor))
    assert resp.status_code == 200
    assert resp.json()["donor_name"] == "ओंकार केदारे"
    assert resp.json()["hospital_name"] == "ससून रुग्णालय, पुणे"


def test_certificate_deterministic_id_and_uniqueness():
    """Verify that certificate ID is deterministic for same inputs and unique for different donations."""
    id1 = generate_certificate_id(10, 5, "2026-10-30")
    id2 = generate_certificate_id(10, 5, "2026-10-30")
    id3 = generate_certificate_id(11, 5, "2026-10-30")
    id4 = generate_certificate_id(10, 6, "2026-10-30")

    assert id1 == id2, "Same donation must yield identical certificate ID"
    assert id1 != id3, "Different donation ID must yield distinct certificate ID"
    assert id1 != id4, "Different donor ID must yield distinct certificate ID"
    assert id1.startswith("BC-CERT-20261030-00010-")


def test_certificate_unauthenticated_rejected(client, db, test_users):
    """Unauthenticated calls return HTTP 401."""
    resp = client.get("/api/donations/1/certificate")
    assert resp.status_code == 401


def test_certificate_nonexistent_returns_404(client, test_users):
    """Non-existent donation ID returns HTTP 404."""
    resp = client.get("/api/donations/999999/certificate", headers=auth_headers(test_users["admin"]))
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()
