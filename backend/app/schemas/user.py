from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator

from app.utils.enums import UserRole
from app.utils.validators import validate_human_name

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

    @field_validator('full_name')
    @classmethod
    def validate_user_full_name(cls, v: str) -> str:
        return validate_human_name(v, field_label='Full name', min_length=2, max_length=150, required=True)

class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None

    @field_validator('full_name')
    @classmethod
    def validate_update_full_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return validate_human_name(v, field_label='Full name', min_length=2, max_length=150, required=True)
