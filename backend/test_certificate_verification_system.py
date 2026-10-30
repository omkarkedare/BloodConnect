"""
Security and Privacy Hardening Tests for BloodConnect Certificate Verification System (Phase 8.4).
Strictly isolated using SQLite in-memory database (Zero Live MySQL Pollution).
"""
import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.donation_record import DonationRecord
from app.utils.enums import BloodGroup, DonationStatus, UserRole
from app.core.security import create_access_token
from app.core.config import settings
from app.core.rate_limiter import certificate_rate_limiter
from app.routers.donations import generate_certificate_id, mask_donor_name


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
    certificate_rate_limiter.reset()
    yield TestClient(app)
    app.dependency_overrides.pop(get_db, None)
    certificate_rate_limiter.reset()


def get_or_create_user(db, email, full_name, role):
    u = db.query(User).filter(User.email == email).first()
    if not u:
        u = User(
            email=email,
            password_hash="hashed_test_password",
            full_name=full_name,
            role=role.value if hasattr(role, "value") else str(role),
            is_active=True,
        )
        db.add(u)
        db.commit()
        db.refresh(u)
    return u


def test_public_verification_data_minimization_unauthenticated(client, db):
    """
    Public unauthenticated viewers must receive minimized data:
    Masked donor name, no hospital facility details, no internal verification timestamps.
    """
    donor = get_or_create_user(db, "min_donor@test.com", "John Alexander Doe", UserRole.DONOR)
    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 28),
        hospital_name="City Life Care Hospital",
        status=DonationStatus.VERIFIED.value,
        notes="Verified on 2026-10-28 15:30:00 UTC [Ref: BC-VER-20261028-1]",
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    cert_id = generate_certificate_id(donation.id, donation.donor_id, str(donation.donation_date))

    # 1. Unauthenticated public request
    response = client.get(f"/api/donations/verify/{cert_id}")
    assert response.status_code == 200
    data = response.json()

    assert data["is_valid"] is True
    assert data["certificate_id"] == cert_id
    assert data["status"] == "verified"
    assert data["is_authenticated_view"] is False

    # Privacy Protection: Donor name is masked by default
    assert data["donor_name_masked"] == "J*** A*** D***"
    assert data["donor_name"] == "J*** A*** D***"

    # Privacy Protection: Medical facility records and audit references withheld
    assert data["hospital_name"] is None
    assert data["verification_reference"] is None
    assert data["verified_at"] is None

    # Vital verification fields remain present
    assert data["blood_group"] == BloodGroup.O_POSITIVE.value
    assert data["units_donated"] == 1
    assert data["donation_date"] == "2026-10-28"
    assert "BloodConnect" in data["issuer"]


def test_public_verification_authenticated_donor_access(client, db):
    """
    Authenticated owning donors receive full, unmasked certificate details.
    """
    donor = get_or_create_user(db, "owner_donor@test.com", "John Alexander Doe", UserRole.DONOR)
    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 28),
        hospital_name="City Life Care Hospital",
        status=DonationStatus.VERIFIED.value,
        notes="Verified on 2026-10-28 15:30:00 UTC [Ref: BC-VER-20261028-1]",
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    cert_id = generate_certificate_id(donation.id, donation.donor_id, str(donation.donation_date))
    token = create_access_token(subject=donor.id)

    # Authenticated as certificate owner
    response = client.get(
        f"/api/donations/verify/{cert_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["is_valid"] is True
    assert data["is_authenticated_view"] is True
    assert data["donor_name"] == "John Alexander Doe"
    assert data["hospital_name"] == "City Life Care Hospital"
    assert data["verification_reference"] == "BC-VER-20261028-1"
    assert data["verified_at"] == "2026-10-28 15:30:00 UTC"


def test_public_verification_authenticated_admin_access(client, db):
    """
    Authenticated platform administrators receive full, unmasked certificate details.
    """
    donor = get_or_create_user(db, "donor_for_admin@test.com", "Jane Doe", UserRole.DONOR)
    admin = get_or_create_user(db, "admin_verifier@test.com", "System Admin", UserRole.ADMIN)

    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.A_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 28),
        hospital_name="Apex Care Center",
        status=DonationStatus.VERIFIED.value,
        notes="Verified on 2026-10-28 12:00:00 UTC [Ref: BC-VER-ADMIN]",
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    cert_id = generate_certificate_id(donation.id, donation.donor_id, str(donation.donation_date))
    admin_token = create_access_token(subject=admin.id)

    response = client.get(
        f"/api/donations/verify/{cert_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["is_valid"] is True
    assert data["is_authenticated_view"] is True
    assert data["donor_name"] == "Jane Doe"
    assert data["hospital_name"] == "Apex Care Center"


def test_public_verification_name_match_confirmation(client, db):
    """
    Verifiers holding physical/digital certificates can provide the printed name
    to verify an exact match without exposing the name to scrape bots.
    """
    donor = get_or_create_user(db, "match_donor@test.com", "Sarah Jane Connor", UserRole.DONOR)
    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.B_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 28),
        status=DonationStatus.VERIFIED.value,
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    cert_id = generate_certificate_id(donation.id, donation.donor_id, str(donation.donation_date))

    # Case A: Correct name provided -> match confirmed
    res_match = client.get(f"/api/donations/verify/{cert_id}?name=Sarah Jane Connor")
    assert res_match.status_code == 200
    data_match = res_match.json()
    assert data_match["name_verified"] is True
    assert data_match["donor_name"] == "Sarah Jane Connor"
    assert "successfully verified" in data_match["message"].lower()

    # Case B: Incorrect name provided -> mismatch flagged, real name remains masked
    res_mismatch = client.get(f"/api/donations/verify/{cert_id}?name=John Smith")
    assert res_mismatch.status_code == 200
    data_mismatch = res_mismatch.json()
    assert data_mismatch["name_verified"] is False
    assert data_mismatch["donor_name"] == "S*** J*** C***"
    assert "does not match" in data_mismatch["message"].lower()


def test_public_verification_multilingual_name_masking(client, db):
    """
    Ensure privacy masking and name verification work for Marathi and Hindi names.
    """
    # Marathi
    marathi_donor = get_or_create_user(db, "marathi_mask_donor@test.com", "ओंकार केदारे", UserRole.DONOR)
    donation_m = DonationRecord(
        donor_id=marathi_donor.id,
        blood_group=BloodGroup.B_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 28),
        status=DonationStatus.VERIFIED.value,
    )
    db.add(donation_m)
    db.commit()
    db.refresh(donation_m)

    cert_id_m = generate_certificate_id(donation_m.id, donation_m.donor_id, str(donation_m.donation_date))
    res_m = client.get(f"/api/donations/verify/{cert_id_m}")
    assert res_m.status_code == 200
    assert res_m.json()["is_valid"] is True
    assert res_m.json()["donor_name_masked"] == "ओ*** क***"

    # Marathi Name Match Confirmation
    res_m_match = client.get(f"/api/donations/verify/{cert_id_m}?name=ओंकार केदारे")
    assert res_m_match.status_code == 200
    assert res_m_match.json()["name_verified"] is True
    assert res_m_match.json()["donor_name"] == "ओंकार केदारे"

    # Hindi
    hindi_donor = get_or_create_user(db, "hindi_mask_donor@test.com", "राहुल शर्मा", UserRole.DONOR)
    donation_h = DonationRecord(
        donor_id=hindi_donor.id,
        blood_group=BloodGroup.AB_POSITIVE.value,
        units_donated=2,
        donation_date=date(2026, 10, 28),
        status=DonationStatus.VERIFIED.value,
    )
    db.add(donation_h)
    db.commit()
    db.refresh(donation_h)

    cert_id_h = generate_certificate_id(donation_h.id, donation_h.donor_id, str(donation_h.donation_date))
    res_h = client.get(f"/api/donations/verify/{cert_id_h}")
    assert res_h.status_code == 200
    assert res_h.json()["donor_name_masked"] == "र*** श***"


def test_public_verification_rate_limiting(client, db):
    """
    Ensure rate limiting protects verification endpoints against brute-force/enumeration.
    """
    donor = get_or_create_user(db, "rate_limit_donor@test.com", "Rate Limit Donor", UserRole.DONOR)
    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 28),
        status=DonationStatus.VERIFIED.value,
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    cert_id = generate_certificate_id(donation.id, donation.donor_id, str(donation.donation_date))

    # Temporarily lower rate limiter limit to 5 for test
    certificate_rate_limiter.reset()
    original_limit = certificate_rate_limiter.requests_per_minute
    certificate_rate_limiter.requests_per_minute = 5

    try:
        # First 5 calls must succeed
        for _ in range(5):
            res = client.get(f"/api/donations/verify/{cert_id}")
            assert res.status_code == 200

        # 6th call must be blocked with HTTP 429
        res_blocked = client.get(f"/api/donations/verify/{cert_id}")
        assert res_blocked.status_code == 429
        assert "Retry-After" in res_blocked.headers
        assert "Too many verification requests" in res_blocked.json()["detail"]

        # Alias route must also be subject to the rate limit
        res_alias_blocked = client.get(f"/api/donations/certificates/verify/{cert_id}")
        assert res_alias_blocked.status_code == 429
    finally:
        certificate_rate_limiter.requests_per_minute = original_limit
        certificate_rate_limiter.reset()


def test_public_verification_secret_key_rotation_support(client, db):
    """
    Ensure certificates signed under historical secret keys remain valid
    when past keys are configured in PREVIOUS_SECRET_KEYS.
    """
    donor = get_or_create_user(db, "rotation_donor@test.com", "Rotation Donor", UserRole.DONOR)
    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 28),
        status=DonationStatus.VERIFIED.value,
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    historical_secret = "legacy-secret-key-2025"
    old_cert_id = generate_certificate_id(
        donation.id, donation.donor_id, str(donation.donation_date), secret_key=historical_secret
    )

    # Without historical key configured: fails
    res_before = client.get(f"/api/donations/verify/{old_cert_id}")
    assert res_before.status_code == 200
    assert res_before.json()["is_valid"] is False

    # Configure historical key in settings.PREVIOUS_SECRET_KEYS
    orig_prev = settings.PREVIOUS_SECRET_KEYS
    settings.PREVIOUS_SECRET_KEYS = historical_secret

    try:
        res_after = client.get(f"/api/donations/verify/{old_cert_id}")
        assert res_after.status_code == 200
        assert res_after.json()["is_valid"] is True
    finally:
        settings.PREVIOUS_SECRET_KEYS = orig_prev


def test_public_verification_oversized_and_malformed_inputs(client, db):
    """
    Ensure oversized inputs (>64 chars) and malformed strings are rejected safely.
    """
    oversized = "BC-CERT-20261028-00001-" + "A" * 100
    res_oversized = client.get(f"/api/donations/verify/{oversized}")
    assert res_oversized.status_code == 200
    assert res_oversized.json()["is_valid"] is False
    assert res_oversized.json()["message"] == "Certificate not found or could not be verified."

    malformed_samples = [
        "INVALID",
        "BC-CERT-123",
        "BC-CERT-20261028-00001",
        "BC-CERT-20261028-00001-SHORT",
        "BC-CERT-XXXXXXXX-00001-12345678",
        "RANDOM-STRING-HERE",
    ]
    for sample in malformed_samples:
        res = client.get(f"/api/donations/verify/{sample}")
        assert res.status_code == 200
        assert res.json()["is_valid"] is False
        assert res.json()["message"] == "Certificate not found or could not be verified."


def test_public_verification_uniform_rejection_no_status_leak(client, db):
    """
    Nonexistent, pending, and rejected donation records must produce IDENTICAL
    rejection responses so attackers cannot enumerate or infer database states.
    """
    donor = get_or_create_user(db, "uniform_donor@test.com", "Uniform Test Donor", UserRole.DONOR)

    # 1. Nonexistent donation ID
    fake_cert = "BC-CERT-20261028-99999-ABCDEF12"
    res_nonexistent = client.get(f"/api/donations/verify/{fake_cert}")
    assert res_nonexistent.status_code == 200
    payload_nonexistent = res_nonexistent.json()

    # 2. Pending donation
    donation_pending = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.A_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 28),
        status=DonationStatus.PENDING.value,
    )
    db.add(donation_pending)
    db.commit()
    db.refresh(donation_pending)
    cert_pending = generate_certificate_id(donation_pending.id, donation_pending.donor_id, str(donation_pending.donation_date))

    res_pending = client.get(f"/api/donations/verify/{cert_pending}")
    assert res_pending.status_code == 200
    payload_pending = res_pending.json()

    # 3. Rejected donation
    donation_rejected = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.B_NEGATIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 28),
        status=DonationStatus.REJECTED.value,
        notes="Rejected: Donor did not meet minimum weight requirement",
    )
    db.add(donation_rejected)
    db.commit()
    db.refresh(donation_rejected)
    cert_rejected = generate_certificate_id(donation_rejected.id, donation_rejected.donor_id, str(donation_rejected.donation_date))

    res_rejected = client.get(f"/api/donations/verify/{cert_rejected}")
    assert res_rejected.status_code == 200
    payload_rejected = res_rejected.json()

    # All three must share the exact same failure structure and message
    expected_failure_msg = "Certificate not found or could not be verified."
    assert payload_nonexistent["message"] == expected_failure_msg
    assert payload_pending["message"] == expected_failure_msg
    assert payload_rejected["message"] == expected_failure_msg

    assert payload_nonexistent["is_valid"] is False
    assert payload_pending["is_valid"] is False
    assert payload_rejected["is_valid"] is False

    assert payload_pending["status"] is None
    assert payload_rejected["status"] is None
    assert "minimum weight" not in str(payload_rejected)


def test_public_verification_privacy_audit_no_sensitive_leaks(client, db):
    """
    Ensure responses strictly avoid leaking any private database IDs or sensitive columns.
    """
    donor = get_or_create_user(db, "audit_leak_donor@test.com", "Leak Audit Donor", UserRole.DONOR)
    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 28),
        hospital_name="Confidential Medical Clinic",
        status=DonationStatus.VERIFIED.value,
        notes="Medical Notes: Hemoglobin check normal. Ref: BC-REF-SECRET",
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    cert_id = generate_certificate_id(donation.id, donation.donor_id, str(donation.donation_date))
    res = client.get(f"/api/donations/verify/{cert_id}")
    assert res.status_code == 200

    raw_keys = set(res.json().keys())
    forbidden_keys = {
        "donor_id",
        "donation_id",
        "donor_email",
        "donor_phone",
        "contact_number",
        "notes",
        "internal_notes",
        "rejection_reason",
        "verified_by",
        "request_id",
    }
    assert forbidden_keys.isdisjoint(raw_keys)
    assert "Hemoglobin" not in res.text
    assert "BC-REF-SECRET" not in res.text
    assert "Confidential Medical Clinic" not in res.text  # Withheld in unauthenticated public view


def test_public_verification_expired_and_invalid_tokens_fallback(client, db):
    """
    Ensure expired, malformed, or invalid JWTs safely fall back to the unauthenticated
    masked view and never leak private details or raise internal server errors.
    """
    donor = get_or_create_user(db, "jwt_fallback_donor@test.com", "JWT Fallback Donor", UserRole.DONOR)
    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 28),
        hospital_name="Private Metro Hospital",
        status=DonationStatus.VERIFIED.value,
        notes="Verified on 2026-10-28 10:00:00 UTC [Ref: BC-VER-JWT]",
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    cert_id = generate_certificate_id(donation.id, donation.donor_id, str(donation.donation_date))

    # 1. Expired token (issued in the past)
    expired_token = create_access_token(subject=donor.id, expires_delta=timedelta(minutes=-30))
    res_exp = client.get(
        f"/api/donations/verify/{cert_id}",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert res_exp.status_code == 200
    data_exp = res_exp.json()
    assert data_exp["is_valid"] is True
    assert data_exp["is_authenticated_view"] is False
    assert data_exp["hospital_name"] is None
    assert data_exp["verification_reference"] is None
    assert data_exp["donor_name"] == "J*** F*** D***"

    # 2. Corrupted / Malformed token string
    res_mal = client.get(
        f"/api/donations/verify/{cert_id}",
        headers={"Authorization": "Bearer malformed.invalid.token"},
    )
    assert res_mal.status_code == 200
    assert res_mal.json()["is_authenticated_view"] is False
    assert res_mal.json()["hospital_name"] is None

    # 3. Token signed with wrong secret key
    from jose import jwt
    foreign_token = jwt.encode({"sub": str(donor.id)}, "wrong-secret-key", algorithm="HS256")
    res_for = client.get(
        f"/api/donations/verify/{cert_id}",
        headers={"Authorization": f"Bearer {foreign_token}"},
    )
    assert res_for.status_code == 200
    assert res_for.json()["is_authenticated_view"] is False


def test_public_and_private_certificate_role_authorization(client, db):
    """
    Ensure unauthorized roles (non-owner donors, requesters) receive masked public view
    on /verify, and are completely blocked (HTTP 403) from /api/donations/{id}/certificate.
    """
    owner = get_or_create_user(db, "cert_owner_auth@test.com", "Actual Owner", UserRole.DONOR)
    other_donor = get_or_create_user(db, "other_donor_auth@test.com", "Other Donor", UserRole.DONOR)
    requester = get_or_create_user(db, "requester_cert_auth@test.com", "Requester User", UserRole.REQUESTER)
    admin = get_or_create_user(db, "admin_cert_auth@test.com", "Admin User", UserRole.ADMIN)

    donation = DonationRecord(
        donor_id=owner.id,
        blood_group=BloodGroup.A_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 28),
        hospital_name="St. Jude Hospital",
        status=DonationStatus.VERIFIED.value,
        notes="Verified on 2026-10-28 14:00:00 UTC [Ref: BC-VER-STJUDE]",
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    cert_id = generate_certificate_id(donation.id, donation.donor_id, str(donation.donation_date))

    other_token = create_access_token(subject=other_donor.id)
    req_token = create_access_token(subject=requester.id)
    owner_token = create_access_token(subject=owner.id)
    admin_token = create_access_token(subject=admin.id)

    # 1. Verification endpoint: Other donor receives masked public view
    res_other = client.get(
        f"/api/donations/verify/{cert_id}",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert res_other.status_code == 200
    assert res_other.json()["is_authenticated_view"] is False
    assert res_other.json()["hospital_name"] is None

    # 2. Verification endpoint: Requester receives masked public view
    res_req = client.get(
        f"/api/donations/verify/{cert_id}",
        headers={"Authorization": f"Bearer {req_token}"},
    )
    assert res_req.status_code == 200
    assert res_req.json()["is_authenticated_view"] is False
    assert res_req.json()["hospital_name"] is None

    # 3. Private certificate endpoint /api/donations/{id}/certificate:
    # - Missing token -> 401
    assert client.get(f"/api/donations/{donation.id}/certificate").status_code == 401

    # - Other donor -> 403 Forbidden
    res_priv_other = client.get(
        f"/api/donations/{donation.id}/certificate",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert res_priv_other.status_code == 403

    # - Requester -> 403 Forbidden
    res_priv_req = client.get(
        f"/api/donations/{donation.id}/certificate",
        headers={"Authorization": f"Bearer {req_token}"},
    )
    assert res_priv_req.status_code == 403

    # - Owner donor -> 200 OK
    res_priv_owner = client.get(
        f"/api/donations/{donation.id}/certificate",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert res_priv_owner.status_code == 200
    assert res_priv_owner.json()["certificate_id"] == cert_id

    # - Admin -> 200 OK
    res_priv_admin = client.get(
        f"/api/donations/{donation.id}/certificate",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_priv_admin.status_code == 200
    assert res_priv_admin.json()["certificate_id"] == cert_id


def test_rate_limiter_spoofed_forwarded_for_defense(client, db):
    """
    Ensure the rate limiter cannot be bypassed by sending arbitrary rotating X-Forwarded-For headers.
    """
    donor = get_or_create_user(db, "spoof_donor@test.com", "Spoof Test Donor", UserRole.DONOR)
    donation = DonationRecord(
        donor_id=donor.id,
        blood_group=BloodGroup.O_POSITIVE.value,
        units_donated=1,
        donation_date=date(2026, 10, 28),
        status=DonationStatus.VERIFIED.value,
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    cert_id = generate_certificate_id(donation.id, donation.donor_id, str(donation.donation_date))

    certificate_rate_limiter.reset()
    orig_limit = certificate_rate_limiter.requests_per_minute
    certificate_rate_limiter.requests_per_minute = 3

    try:
        # First 3 requests with same client IP
        for _ in range(3):
            res = client.get(f"/api/donations/verify/{cert_id}")
            assert res.status_code == 200

        # 4th request must be blocked even if attacker appends spoofed headers
        res_blocked = client.get(f"/api/donations/verify/{cert_id}")
        assert res_blocked.status_code == 429
    finally:
        certificate_rate_limiter.requests_per_minute = orig_limit
        certificate_rate_limiter.reset()
