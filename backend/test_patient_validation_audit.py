"""
Automated Test Suite for Phase 6: Patient Information & Validation.
Validates:
1. Patient name digit rejection (no numeric digits permitted).
2. Genuine name acceptance (letters, spaces, periods, hyphens, apostrophes).
3. Whitespace trimming and length boundaries (2 to 150 characters).
4. Mandatory operational fields (hospital, city, phone).
5. Update schema validation.
6. Backward compatibility with all existing records.
7. API HTTP 422 rejection and error reporting via TestClient.
"""

import re
import pytest
from datetime import date, datetime, timedelta, timezone
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.blood_request import BloodRequest
from app.schemas.blood_request import (
    BloodRequestBase,
    BloodRequestCreate,
    BloodRequestUpdate,
    BloodRequestResponse,
)
from app.utils.enums import BloodGroup, UrgencyLevel, UserRole
from app.core.security import create_access_token, get_password_hash


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


@pytest.fixture
def requester_user(db):
    user = db.query(User).filter(User.email == "patient_audit_req@example.com").first()
    if not user:
        user = User(
            email="patient_audit_req@example.com",
            password_hash=get_password_hash("password123"),
            full_name="Requester Audit User",
            phone="9876543210",
            role=UserRole.REQUESTER.value,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@pytest.fixture
def auth_headers(requester_user):
    token = create_access_token(subject=requester_user.id)
    return {"Authorization": f"Bearer {token}"}


# ─────────────────────────────────────────────────────────────────────────────
# TESTS
# ─────────────────────────────────────────────────────────────────────────────

def test_patient_name_with_digits_rejected():
    """Verify that patient names containing numeric digits (English or Devanagari) are rejected."""
    future_exp = datetime.now(timezone.utc) + timedelta(days=2)
    invalid_names = [
        "Patient 1",
        "John2",
        "Room 402",
        "12345",
        "Patient123",
        "Amit123 Kumar",
        "P01",
        "गणेश१२३",
        "ओंकार४५६",
        "रुग्ण१",
    ]
    for bad_name in invalid_names:
        with pytest.raises(ValidationError) as exc_info:
            BloodRequestCreate(
                patient_name=bad_name,
                blood_group=BloodGroup.A_POSITIVE,
                units_needed=1,
                hospital_name="City Hospital",
                city="Mumbai",
                contact_phone="9876543210",
                required_date=date.today(),
                expires_at=future_exp,
            )
        assert "Patient name must not contain numeric digits" in str(exc_info.value)


def test_patient_name_valid_genuine_names_accepted():
    """Verify that genuine human names in English, Marathi, and Hindi are accepted."""
    future_exp = datetime.now(timezone.utc) + timedelta(days=2)
    valid_names = [
        "Omkar Kedare",
        "ओंकार केदारे",
        "गणेश कुटे",
        "बाळकृष्ण पाटील",
        "ज्ञानेश्वर सावंत",
        "डॉ. नरेंद्र दाभोलकर",
        "John Doe",
        "Dr. A. P. J. Abdul Kalam",
        "Mary-Jane Watson",
        "O'Connor",
        "namohar thale",
        "Abhishek gavande",
        "St. John",
    ]
    for good_name in valid_names:
        req = BloodRequestCreate(
            patient_name=good_name,
            blood_group=BloodGroup.O_POSITIVE,
            units_needed=2,
            hospital_name="Apollo Hospital",
            city="Pune",
            contact_phone="9123456780",
            required_date=date.today(),
            expires_at=future_exp,
        )
        assert req.patient_name == good_name.strip()


def test_patient_name_length_and_whitespace_constraints():
    """Verify whitespace trimming and boundary conditions."""
    future_exp = datetime.now(timezone.utc) + timedelta(days=2)

    # 1. Whitespace trimming
    req = BloodRequestCreate(
        patient_name="   Rajesh Sharma   ",
        blood_group=BloodGroup.B_POSITIVE,
        units_needed=1,
        hospital_name="Lilavati Hospital",
        city="Mumbai",
        contact_phone="9876543210",
        required_date=date.today(),
        expires_at=future_exp,
    )
    assert req.patient_name == "Rajesh Sharma"

    # 2. Too short (< 2 characters)
    with pytest.raises(ValidationError) as exc_info:
        BloodRequestCreate(
            patient_name="A",
            blood_group=BloodGroup.B_POSITIVE,
            units_needed=1,
            hospital_name="Lilavati Hospital",
            city="Mumbai",
            contact_phone="9876543210",
            required_date=date.today(),
            expires_at=future_exp,
        )
    assert "at least 2 characters" in str(exc_info.value)

    # 3. Empty or whitespace only
    with pytest.raises(ValidationError) as exc_info:
        BloodRequestCreate(
            patient_name="   ",
            blood_group=BloodGroup.B_POSITIVE,
            units_needed=1,
            hospital_name="Lilavati Hospital",
            city="Mumbai",
            contact_phone="9876543210",
            required_date=date.today(),
            expires_at=future_exp,
        )
    assert "at least 2 characters" in str(exc_info.value)

    # 4. Excessively long (> 150 characters)
    with pytest.raises(ValidationError) as exc_info:
        BloodRequestCreate(
            patient_name="A" * 151,
            blood_group=BloodGroup.B_POSITIVE,
            units_needed=1,
            hospital_name="Lilavati Hospital",
            city="Mumbai",
            contact_phone="9876543210",
            required_date=date.today(),
            expires_at=future_exp,
        )
    assert "cannot exceed 150 characters" in str(exc_info.value)


def test_newlines_and_tabs_rejected():
    """Verify that newlines (\n, \r) and tabs (\t) in patient names are strictly rejected."""
    future_exp = datetime.now(timezone.utc) + timedelta(days=2)
    bad_whitespace_names = [
        "John\nDoe",
        "John\rDoe",
        "John\tDoe",
        "ओंकार\nकेदारे",
        "गणेश\tकुटे",
        "Mary\nJane",
    ]
    for bad_name in bad_whitespace_names:
        with pytest.raises(ValidationError) as exc_info:
            BloodRequestCreate(
                patient_name=bad_name,
                blood_group=BloodGroup.A_POSITIVE,
                units_needed=1,
                hospital_name="City Hospital",
                city="Mumbai",
                contact_phone="9876543210",
                required_date=date.today(),
                expires_at=future_exp,
            )
        assert "Patient name cannot contain newlines or tabs" in str(exc_info.value)


def test_multi_language_names_accepted():
    """Verify that names across diverse Indian and global scripts are accepted without digits or symbols."""
    future_exp = datetime.now(timezone.utc) + timedelta(days=2)
    multilang_names = [
        "রবীন্দ্রনাথ ঠাকুর",       # Bengali
        "முத்துவேல் கருணாநிதி",      # Tamil
        "రవీంద్రనాథ్ ఠాగూర్",     # Telugu
        "ગાંધીજી",                # Gujarati
        "ਗੁਰੂ ਨਾਨਕ",              # Punjabi
    ]
    for good_name in multilang_names:
        req = BloodRequestCreate(
            patient_name=good_name,
            blood_group=BloodGroup.A_POSITIVE,
            units_needed=1,
            hospital_name="City Hospital",
            city="Kolkata",
            contact_phone="9876543210",
            required_date=date.today(),
            expires_at=future_exp,
        )
        assert req.patient_name == good_name.strip()


def test_special_symbols_rejected():
    """Verify that disallowed special characters like @, #, $, %, etc. are rejected."""
    future_exp = datetime.now(timezone.utc) + timedelta(days=2)
    bad_symbols = ["John@#$", "John@Doe", "Patient#A", "Bob$Smith", "Alice*Wonderland", "Test!", "गणेश@कुटे", "Patient_Name", "John+Doe"]
    for sym_name in bad_symbols:
        with pytest.raises(ValidationError) as exc_info:
            BloodRequestCreate(
                patient_name=sym_name,
                blood_group=BloodGroup.AB_POSITIVE,
                units_needed=1,
                hospital_name="MGM Hospital",
                city="Aurangabad",
                contact_phone="9876543210",
                required_date=date.today(),
                expires_at=future_exp,
            )
        assert "can only contain letters, spaces, hyphens, periods, and apostrophes" in str(exc_info.value)


def test_mandatory_operational_fields_enforcement():
    """Verify hospital name, city, and contact phone operational validation on creation."""
    future_exp = datetime.now(timezone.utc) + timedelta(days=2)

    # 1. Invalid hospital name (< 2 chars or whitespace)
    with pytest.raises(ValidationError) as exc_info:
        BloodRequestCreate(
            patient_name="Valid Name",
            blood_group=BloodGroup.A_POSITIVE,
            units_needed=1,
            hospital_name=" ",
            city="Mumbai",
            contact_phone="9876543210",
            required_date=date.today(),
            expires_at=future_exp,
        )
    assert "Hospital / medical location name must be at least 2 characters" in str(exc_info.value)

    # 2. Invalid city name (< 2 chars or whitespace)
    with pytest.raises(ValidationError) as exc_info:
        BloodRequestCreate(
            patient_name="Valid Name",
            blood_group=BloodGroup.A_POSITIVE,
            units_needed=1,
            hospital_name="City Hospital",
            city="X",
            contact_phone="9876543210",
            required_date=date.today(),
            expires_at=future_exp,
        )
    assert "City name must be at least 2 characters" in str(exc_info.value)

    # 3. Invalid contact phone (< 7 digits)
    with pytest.raises(ValidationError) as exc_info:
        BloodRequestCreate(
            patient_name="Valid Name",
            blood_group=BloodGroup.A_POSITIVE,
            units_needed=1,
            hospital_name="City Hospital",
            city="Mumbai",
            contact_phone="12345",
            required_date=date.today(),
            expires_at=future_exp,
        )
    assert "at least 7 digits" in str(exc_info.value)


def test_blood_request_update_name_validation():
    """Verify that updating a blood request also rejects numeric digits."""
    # Bad update with digits
    with pytest.raises(ValidationError) as exc_info:
        BloodRequestUpdate(patient_name="Patient 99")
    assert "Patient name must not contain numeric digits" in str(exc_info.value)

    # Good update
    update = BloodRequestUpdate(patient_name="Jane Doe")
    assert update.patient_name == "Jane Doe"

    # None update (preserve existing)
    update_none = BloodRequestUpdate(patient_name=None)
    assert update_none.patient_name is None


def test_backward_compatibility_historical_records():
    """Verify that historical patient names from database are valid and serializable."""
    historical_names = [
        "John Doe",
        "namohar thale ",
        "avinash ghanghav",
        "vaibhav kale",
        "abhishek kedare",
        "avi ghanghav",
        "Expired Response Test",
        "shubhAM",
        "Jane",
        "harshad kedare",
        "omkar patil",
        "rushi",
        "kalpana kale",
        "mayuri khandagle",
        "Abhishek gavande",
    ]
    for hist_name in historical_names:
        req = BloodRequestBase(
            patient_name=hist_name,
            blood_group=BloodGroup.O_POSITIVE,
            units_needed=1,
            hospital_name="Historic Hospital",
            city="Mumbai",
            contact_phone="9876543210",
            required_date=date.today(),
        )
        assert req.patient_name == hist_name


def test_api_create_blood_request_endpoint_digit_rejection(client, auth_headers):
    """Verify via FastAPI TestClient that API returns HTTP 422 with clear message when name contains digits."""
    future_iso = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    bad_payload = {
        "patient_name": "Patient 101",
        "blood_group": "A+",
        "units_needed": 1,
        "urgency": "normal",
        "hospital_name": "City Hospital",
        "city": "Mumbai",
        "contact_phone": "9876543210",
        "required_date": date.today().isoformat(),
        "expires_at": future_iso,
    }

    resp = client.post("/api/blood-requests/", json=bad_payload, headers=auth_headers)
    assert resp.status_code == 422
    err_detail = resp.json()["detail"]
    assert any("Patient name must not contain numeric digits" in str(err) for err in err_detail)


def test_api_create_blood_request_endpoint_success(client, auth_headers):
    """Verify via FastAPI TestClient that API accepts valid blood request with genuine name."""
    future_iso = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    good_payload = {
        "patient_name": "Sunita Patil",
        "blood_group": "O+",
        "units_needed": 2,
        "urgency": "urgent",
        "hospital_name": "KEM Hospital",
        "city": "Mumbai",
        "contact_phone": "9876543210",
        "required_date": date.today().isoformat(),
        "expires_at": future_iso,
        "description": "Please help for planned cardiac surgery.",
    }

    resp = client.post("/api/blood-requests/", json=good_payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["patient_name"] == "Sunita Patil"
    assert data["blood_group"] == "O+"
    assert data["display_status"] == "OPEN"


def test_api_create_blood_request_endpoint_hindi_marathi_success(client, auth_headers):
    """Verify via FastAPI TestClient that Marathi and Hindi names are successfully accepted."""
    future_iso = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()

    # 1. ओंकार केदारे
    payload_marathi_1 = {
        "patient_name": "ओंकार केदारे",
        "blood_group": "B+",
        "units_needed": 1,
        "urgency": "normal",
        "hospital_name": "MGM Hospital",
        "city": "Chhatrapati Sambhajinagar",
        "contact_phone": "9876543210",
        "required_date": date.today().isoformat(),
        "expires_at": future_iso,
    }
    resp1 = client.post("/api/blood-requests/", json=payload_marathi_1, headers=auth_headers)
    assert resp1.status_code == 200
    assert resp1.json()["patient_name"] == "ओंकार केदारे"

    # 2. गणेश कुटे
    payload_marathi_2 = {
        "patient_name": "गणेश कुटे",
        "blood_group": "A+",
        "units_needed": 1,
        "urgency": "urgent",
        "hospital_name": "City Care Hospital",
        "city": "Pune",
        "contact_phone": "9876543210",
        "required_date": date.today().isoformat(),
        "expires_at": future_iso,
    }
    resp2 = client.post("/api/blood-requests/", json=payload_marathi_2, headers=auth_headers)
    assert resp2.status_code == 200
    assert resp2.json()["patient_name"] == "गणेश कुटे"


def test_api_create_blood_request_endpoint_devanagari_digit_rejection(client, auth_headers):
    """Verify via FastAPI TestClient that Devanagari numerals are rejected."""
    future_iso = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    bad_payload = {
        "patient_name": "गणेश१२३",
        "blood_group": "O+",
        "units_needed": 1,
        "urgency": "normal",
        "hospital_name": "MGM Hospital",
        "city": "Mumbai",
        "contact_phone": "9876543210",
        "required_date": date.today().isoformat(),
        "expires_at": future_iso,
    }
    resp = client.post("/api/blood-requests/", json=bad_payload, headers=auth_headers)
    assert resp.status_code == 422
    err_detail = resp.json()["detail"]
    assert any("Patient name must not contain numeric digits" in str(err) for err in err_detail)


def test_api_create_blood_request_endpoint_newline_rejection(client, auth_headers):
    """Verify via FastAPI TestClient that newlines and tabs are rejected."""
    future_iso = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    newline_payload = {
        "patient_name": "John\nDoe",
        "blood_group": "O+",
        "units_needed": 1,
        "urgency": "normal",
        "hospital_name": "MGM Hospital",
        "city": "Mumbai",
        "contact_phone": "9876543210",
        "required_date": date.today().isoformat(),
        "expires_at": future_iso,
    }
    resp = client.post("/api/blood-requests/", json=newline_payload, headers=auth_headers)
    assert resp.status_code == 422
    err_detail = resp.json()["detail"]
    assert any("Patient name cannot contain newlines or tabs" in str(err) for err in err_detail)
