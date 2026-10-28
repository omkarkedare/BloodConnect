"""
Automated Test Suite for User Registration & Profile Name Validation.
Validates:
1. Registration schema and API accepting genuine English, Hindi, and Marathi names.
2. Registration rejecting numbers (ASCII and Devanagari), disallowed symbols,
   punctuation-only names, newlines, tabs, and invalid lengths.
3. Profile update schema and API correctly handling optional updates (None / omitted).
4. Profile update rejecting invalid names (digits, symbols, punctuation-only).
5. API bypass attempts returning HTTP 422 Unprocessable Entity.
"""

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database.database import Base, get_db
from app.main import app
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.utils.enums import UserRole
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
def registered_user(db):
    user = db.query(User).filter(User.email == "registered_donor@example.com").first()
    if not user:
        user = User(
            email="registered_donor@example.com",
            password_hash=get_password_hash("password123"),
            full_name="Existing Donor",
            phone="9876543210",
            role=UserRole.DONOR.value,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@pytest.fixture
def auth_headers(registered_user):
    token = create_access_token(subject=registered_user.id)
    return {"Authorization": f"Bearer {token}"}


# ─────────────────────────────────────────────────────────────────────────────
# SCHEMA TESTS: UserCreate & UserUpdate
# ─────────────────────────────────────────────────────────────────────────────

def test_user_create_schema_valid_multilingual_names():
    """Verify that genuine human names in English, Marathi, and Hindi are accepted."""
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
        "Jean-Luc O'Connor",
        "রবীন্দ্রনাথ ঠাকুর",
    ]
    for good_name in valid_names:
        u = UserCreate(
            email="valid_user@example.com",
            password="password123",
            full_name=good_name,
        )
        assert u.full_name == good_name.strip()


def test_user_create_schema_digits_rejected():
    """Verify that ASCII and Devanagari numerals are rejected in UserCreate."""
    bad_names = [
        "User123",
        "John2",
        "12345",
        "Amit123 Kumar",
        "गणेश१२३",
        "ओंकार४५६",
        "प्रशांत७८९",
    ]
    for bad_name in bad_names:
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="bad_user@example.com",
                password="password123",
                full_name=bad_name,
            )
        assert "Full name must not contain numeric digits" in str(exc_info.value)


def test_user_create_schema_symbols_and_punctuation_only_rejected():
    """Verify that special symbols and punctuation-only strings are rejected."""
    # Disallowed symbols
    symbols = ["John@#$", "User!", "Alice*Wonderland", "Patient_Name", "John+Doe"]
    for sym in symbols:
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(email="bad@example.com", password="password123", full_name=sym)
        assert "can only contain letters, spaces, hyphens, periods, and apostrophes" in str(exc_info.value)

    # Punctuation-only strings
    punct_only = ["-.-", "...", "---", "'-'", ". -"]
    for p in punct_only:
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(email="bad@example.com", password="password123", full_name=p)
        assert "Full name must contain at least one letter" in str(exc_info.value)


def test_user_create_schema_newlines_tabs_length_rejected():
    """Verify that newlines, tabs, and invalid lengths are rejected."""
    # Newlines / tabs
    for bad in ["John\nDoe", "John\rDoe", "John\tDoe", "ओंकार\nकेदारे"]:
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(email="bad@example.com", password="password123", full_name=bad)
        assert "Full name cannot contain newlines or tabs" in str(exc_info.value)

    # Too short (< 2 characters)
    with pytest.raises(ValidationError) as exc_info:
        UserCreate(email="bad@example.com", password="password123", full_name="A")
    assert "at least 2 characters" in str(exc_info.value)

    # Blank / whitespace only
    with pytest.raises(ValidationError) as exc_info:
        UserCreate(email="bad@example.com", password="password123", full_name="   ")
    assert "at least 2 characters" in str(exc_info.value)

    # Too long (> 150 characters)
    with pytest.raises(ValidationError) as exc_info:
        UserCreate(email="bad@example.com", password="password123", full_name="A" * 151)
    assert "cannot exceed 150 characters" in str(exc_info.value)


def test_user_update_schema_optional_handling():
    """Verify that UserUpdate correctly treats full_name as optional when None or omitted."""
    # 1. Omitted / None
    up1 = UserUpdate()
    assert up1.full_name is None

    up2 = UserUpdate(phone="9123456780")
    assert up2.full_name is None
    assert up2.phone == "9123456780"

    # 2. Valid update
    up3 = UserUpdate(full_name="  ओंकार केदारे  ")
    assert up3.full_name == "ओंकार केदारे"

    # 3. Invalid update rejected
    with pytest.raises(ValidationError) as exc_info:
        UserUpdate(full_name="User123")
    assert "Full name must not contain numeric digits" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        UserUpdate(full_name="-.-")
    assert "Full name must contain at least one letter" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        UserUpdate(full_name="   ")
    assert "at least 2 characters" in str(exc_info.value)


# ─────────────────────────────────────────────────────────────────────────────
# API ENDPOINT TESTS: /api/auth/register & /api/auth/me
# ─────────────────────────────────────────────────────────────────────────────

def test_api_register_valid_multilingual(client):
    """Verify via FastAPI TestClient that registration succeeds with English, Marathi, and Hindi names."""
    test_cases = [
        ("omkar_reg@example.com", "Omkar Kedare"),
        ("marathi_reg@example.com", "ओंकार केदारे"),
        ("hindi_reg@example.com", "गणेश कुटे"),
    ]
    for email, name in test_cases:
        resp = client.post(
            "/api/auth/register",
            json={
                "email": email,
                "password": "password123",
                "full_name": name,
                "phone": "9876543210",
            },
            params={"role": "donor"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == email
        assert data["full_name"] == name


def test_api_register_rejects_digits_and_symbols_bypass_attempts(client):
    """Verify API rejects registration attempts bypassing client-side validation."""
    bypass_payloads = [
        {"email": "bypass1@example.com", "password": "pass", "full_name": "User123"},
        {"email": "bypass2@example.com", "password": "pass", "full_name": "गणेश१२३"},
        {"email": "bypass3@example.com", "password": "pass", "full_name": "John@#$"},
        {"email": "bypass4@example.com", "password": "pass", "full_name": "-.-"},
        {"email": "bypass5@example.com", "password": "pass", "full_name": "John\nDoe"},
    ]
    for payload in bypass_payloads:
        resp = client.post("/api/auth/register", json=payload, params={"role": "donor"})
        assert resp.status_code == 422
        errors = resp.json()["detail"]
        assert len(errors) > 0


def test_api_update_profile_valid_and_optional(client, auth_headers):
    """Verify profile update succeeds with valid multilingual names and preserves existing on omission."""
    # 1. Update name to Marathi
    resp1 = client.put(
        "/api/auth/me",
        json={"full_name": "ओंकार केदारे"},
        headers=auth_headers,
    )
    assert resp1.status_code == 200
    assert resp1.json()["full_name"] == "ओंकार केदारे"

    # 2. Update phone only (full_name omitted) - name must remain unchanged!
    resp2 = client.put(
        "/api/auth/me",
        json={"phone": "9112233445"},
        headers=auth_headers,
    )
    assert resp2.status_code == 200
    assert resp2.json()["full_name"] == "ओंकार केदारे"
    assert resp2.json()["phone"] == "9112233445"

    # 3. Explicitly passing full_name: None (null in json) - name must remain unchanged and never become NULL!
    resp3 = client.put(
        "/api/auth/me",
        json={"full_name": None, "phone": "9998887776"},
        headers=auth_headers,
    )
    assert resp3.status_code == 200
    assert resp3.json()["full_name"] == "ओंकार केदारे"
    assert resp3.json()["phone"] == "9998887776"


def test_api_update_profile_rejects_invalid_bypass_attempts(client, auth_headers):
    """Verify profile update rejects invalid bypass attempts with HTTP 422."""
    bad_updates = ["Hacker123", "गणेश१२३", "Test@User", "-.-", "   ", "A\nB"]
    for bad_name in bad_updates:
        resp = client.put(
            "/api/auth/me",
            json={"full_name": bad_name},
            headers=auth_headers,
        )
        assert resp.status_code == 422
        assert len(resp.json()["detail"]) > 0
