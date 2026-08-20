import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.user import User
from app.core.security import verify_password
from app.schemas.user import UserCreate
from app.routers.auth import register

# We can't hit DB due to sandbox, but we can verify imports and schema validation.
try:
    # Validate schema
    user_in = UserCreate(email="test@test.com", full_name="Test User", password="password123")
    print("Schema OK:", user_in.email)
except Exception as e:
    print("Schema Error:", e)

