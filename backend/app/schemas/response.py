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

class DonorResponseModel(DonorResponseBase):
    id: int
    donor_id: int
    status: ResponseStatus
    responded_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
