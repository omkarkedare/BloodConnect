from typing import Optional
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator
from app.utils.validators import validate_human_name


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    role: Optional[str] = None

    @field_validator('full_name')
    @classmethod
    def validate_register_full_name(cls, v: str) -> str:
        return validate_human_name(v, field_label='Full name', min_length=2, max_length=150, required=True)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator('current_password')
    @classmethod
    def validate_current_password(cls, v: str) -> str:
        if not v:
            raise ValueError('Current password is required.')
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Current password exceeds 72-byte cryptographic hashing limit.')
        return v

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if not v or len(v.strip()) < 8:
            raise ValueError('New password must be at least 8 characters long.')
        if len(v.encode('utf-8')) > 72:
            raise ValueError('New password cannot exceed 72 bytes due to bcrypt hashing limits.')
        return v


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
