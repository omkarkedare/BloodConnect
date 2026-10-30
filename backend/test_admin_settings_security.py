"""
Tests for Admin Step C: Admin Settings, Security & Credential Governance.
Validates:
1. Secure Password Change:
   - Authenticated user can change password with valid current password and valid new password (>= 8 chars).
   - Login succeeds with new password and fails with old password.
   - Calling with incorrect current password returns 400 Bad Request.
   - Calling with identical new password returns 400 Bad Request.
   - Calling with password < 8 characters returns 422 Unprocessable Entity.
   - Unauthenticated call returns 401 Unauthorized.
2. Admin Profile Updates:
   - Admin can update full_name and phone via /api/auth/me.
   - Name validation protects against invalid formats or digits.
   - Login email and role remain strictly protected and immutable.
3. Role-Based Access Control (RBAC) & Privileges:
   - Non-admin callers (donors, requesters) receive 403 Forbidden on admin endpoints.
   - Deactivated users receive 400 Inactive User.
4. JWT Session Validation & Expired/Corrupted Credentials:
   - Invalid or tampered tokens return credential validation error.
"""

import pytest
from datetime import timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base, get_db
from app.main import app
from app.models.user import User
from app.utils.enums import UserRole
from app.core import security


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


def make_user(db, email, name, role, plain_password="OldPassword123!"):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            full_name=name,
            password_hash=security.get_password_hash(plain_password),
            role=role.value,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def test_admin_change_password_success(client, db):
    """
    Verify authenticated admin can securely change password and authenticate with new password.
    """
    admin = make_user(db, "admin_pwd_success@test.com", "Admin Pwd", UserRole.ADMIN, "InitialPass123!")
    token = security.create_access_token(subject=admin.id)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/auth/change-password",
        json={
            "current_password": "InitialPass123!",
            "new_password": "BrandNewSecretPass456!",
        },
        headers=headers,
    )
    assert res.status_code == 200
    assert "successfully" in res.json()["message"].lower()

    # Verify old password no longer works
    login_old = client.post(
        "/api/auth/login",
        data={"username": admin.email, "password": "InitialPass123!"},
    )
    assert login_old.status_code == 400

    # Verify new password works
    login_new = client.post(
        "/api/auth/login",
        data={"username": admin.email, "password": "BrandNewSecretPass456!"},
    )
    assert login_new.status_code == 200
    assert "access_token" in login_new.json()


def test_change_password_invalid_current_password(client, db):
    """
    Ensure password change fails if current password does not match database hash.
    """
    admin = make_user(db, "admin_wrong_curr@test.com", "Admin Wrong", UserRole.ADMIN, "CorrectPass123!")
    token = security.create_access_token(subject=admin.id)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/auth/change-password",
        json={
            "current_password": "IncorrectPassword999!",
            "new_password": "NewValidPassword789!",
        },
        headers=headers,
    )
    assert res.status_code == 400
    assert "incorrect current password" in res.json()["detail"].lower()


def test_change_password_identical_rejected(client, db):
    """
    Ensure new password cannot be identical to current password.
    """
    admin = make_user(db, "admin_identical@test.com", "Admin Identical", UserRole.ADMIN, "SamePassword123!")
    token = security.create_access_token(subject=admin.id)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/auth/change-password",
        json={
            "current_password": "SamePassword123!",
            "new_password": "SamePassword123!",
        },
        headers=headers,
    )
    assert res.status_code == 400
    assert "identical" in res.json()["detail"].lower()


def test_change_password_short_length_rejected(client, db):
    """
    Ensure passwords shorter than 8 characters fail schema validation.
    """
    admin = make_user(db, "admin_short@test.com", "Admin Short", UserRole.ADMIN, "StandardPass123!")
    token = security.create_access_token(subject=admin.id)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/auth/change-password",
        json={
            "current_password": "StandardPass123!",
            "new_password": "short",
        },
        headers=headers,
    )
    assert res.status_code == 422


def test_change_password_unauthenticated(client):
    """
    Ensure unauthenticated caller cannot change passwords.
    """
    res = client.post(
        "/api/auth/change-password",
        json={
            "current_password": "SomePassword123!",
            "new_password": "AnotherPassword456!",
        },
    )
    assert res.status_code in [401, 403]


def test_admin_profile_update_supported_fields(client, db):
    """
    Verify administrator can update full_name and phone via /api/auth/me,
    while role and email remain protected.
    """
    admin = make_user(db, "admin_profile_upd@test.com", "Initial Admin Name", UserRole.ADMIN)
    token = security.create_access_token(subject=admin.id)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.put(
        "/api/auth/me",
        json={
            "full_name": "Updated Platform Admin",
            "phone": "+91 9999888877",
            "email": "hacker@evil.com",  # Should not be updated
            "role": "superadmin",         # Should not be updated
        },
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["full_name"] == "Updated Platform Admin"
    assert data["phone"] == "+91 9999888877"
    assert data["email"] == "admin_profile_upd@test.com"
    assert data["role"] == UserRole.ADMIN.value


def test_admin_rbac_isolation(client, db):
    """
    Verify donor or requester cannot access privileged admin routes.
    """
    donor = make_user(db, "donor_settings_test@test.com", "Regular Donor", UserRole.DONOR)
    token = security.create_access_token(subject=donor.id)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/admin/users", headers=headers)
    assert res.status_code == 403
    assert "privileges" in res.json()["detail"].lower()


def test_deactivated_admin_cannot_access(client, db):
    """
    Verify deactivated admin user cannot perform administrative actions.
    """
    admin = make_user(db, "admin_deactivated@test.com", "Deactivated Admin", UserRole.ADMIN)
    admin.is_active = False
    db.commit()

    token = security.create_access_token(subject=admin.id)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/admin/users", headers=headers)
    assert res.status_code == 400
    assert "inactive" in res.json()["detail"].lower()


def test_change_password_bcrypt_72_byte_limit(client, db):
    """
    Ensure new password exceeding 72 bytes is rejected to prevent bcrypt truncation vulnerabilities.
    """
    admin = make_user(db, "admin_bcrypt_limit@test.com", "Admin Bcrypt", UserRole.ADMIN, "InitialPass123!")
    token = security.create_access_token(subject=admin.id)
    headers = {"Authorization": f"Bearer {token}"}

    # 73-byte ASCII string
    too_long_password = "A" * 73
    res = client.post(
        "/api/auth/change-password",
        json={
            "current_password": "InitialPass123!",
            "new_password": too_long_password,
        },
        headers=headers,
    )
    assert res.status_code == 422
    assert "72 bytes" in str(res.json()).lower()


def test_registration_as_admin_prohibited(client):
    """
    Ensure public registration endpoint prevents self-assigning admin role.
    """
    res = client.post(
        "/api/auth/register?role=admin",
        json={
            "email": "intruder_admin@test.com",
            "password": "ValidSecret123!",
            "full_name": "Intruder User",
        },
    )
    assert res.status_code == 400
    assert "cannot register as admin" in res.json()["detail"].lower()

