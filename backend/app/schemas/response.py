from typing import Optional
from datetime import datetime
from pydantic import BaseModel

from app.utils.enums import ResponseStatus

class DonorResponseBase(BaseModel):
    request_id: int
    message: Optional[str] = None

class DonorResponseCreate(DonorResponseBase):
    pass

class DonorResponseUpdate(BaseModel):
    status: ResponseStatus
    message: Optional[str] = None

class DonorResponseDonorProfileModel(BaseModel):
    blood_group: str
    city: str
    is_available: bool

    class Config:
        from_attributes = True

class DonorResponseUserModel(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    donor_profile: Optional[DonorResponseDonorProfileModel] = None

    class Config:
        from_attributes = True

class DonorResponseModel(DonorResponseBase):
    id: int
    donor_id: int
    status: ResponseStatus
    responded_at: datetime
    updated_at: datetime
    donor: Optional[DonorResponseUserModel] = None

    class Config:
        from_attributes = True
