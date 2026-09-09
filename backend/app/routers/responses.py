from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_active_user, get_current_donor_user
from app.database.database import get_db
from app.models.user import User
from app.models.blood_request import BloodRequest
from app.models.donor_response import DonorResponse
from app.schemas.response import DonorResponseCreate, DonorResponseUpdate, DonorResponseModel
from app.models.notification import Notification
from app.utils.enums import ResponseStatus, NotificationType

router = APIRouter()

@router.get("/me", response_model=list[DonorResponseModel])
def get_my_responses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_donor_user),
) -> Any:
    """Get all responses for the current donor."""
    return db.query(DonorResponse).filter(DonorResponse.donor_id == current_user.id).all()

@router.post("/", response_model=DonorResponseModel)
def create_response(
    *,
    db: Session = Depends(get_db),
    response_in: DonorResponseCreate,
    current_user: User = Depends(get_current_donor_user),
) -> Any:
    """Donor creates a response to a blood request."""
    blood_req = db.query(BloodRequest).filter(BloodRequest.id == response_in.request_id).first()
    if not blood_req:
        raise HTTPException(status_code=404, detail="Blood request not found.")

    # Lazy expiration check
    from datetime import datetime, timezone
    now_utc = datetime.utcnow()
    if (blood_req.status == "open"
        and blood_req.expires_at is not None
        and blood_req.expires_at <= now_utc):
        blood_req.status = "expired"
        db.commit()
        db.refresh(blood_req)

    # Reject if request is not open
    if blood_req.status != "open":
        raise HTTPException(status_code=400, detail=f"Cannot respond to a {blood_req.status} request.")
        
    if blood_req.requester_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot respond to your own request.")

    existing_response = db.query(DonorResponse).filter(
        DonorResponse.request_id == response_in.request_id,
        DonorResponse.donor_id == current_user.id
    ).first()
    if existing_response:
        raise HTTPException(status_code=400, detail="You have already responded to this request.")

    db_response = DonorResponse(
        request_id=response_in.request_id,
        donor_id=current_user.id,
        status=ResponseStatus.PENDING.value,
        message=response_in.message,
    )
    db.add(db_response)
    
    # Create notification for requester
    notification = Notification(
        user_id=blood_req.requester_id,
        type=NotificationType.RESPONSE_RECEIVED.value,
        title="New Donor Response",
        message=f"A donor has responded to your blood request for {blood_req.blood_group} blood.",
        link=f"/requester/requests/{blood_req.id}"
    )
    db.add(notification)
    
    db.commit()
    db.refresh(db_response)
    return db_response

@router.put("/{response_id}", response_model=DonorResponseModel)
def update_response(
    response_id: int,
    *,
    db: Session = Depends(get_db),
    response_in: DonorResponseUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Accept, reject, or withdraw a response."""
    db_resp = db.query(DonorResponse).filter(DonorResponse.id == response_id).first()
    if not db_resp:
        raise HTTPException(status_code=404, detail="Response not found.")

    blood_req = db.query(BloodRequest).filter(BloodRequest.id == db_resp.request_id).first()
    
    if current_user.id not in [db_resp.donor_id, blood_req.requester_id]:
        raise HTTPException(status_code=403, detail="Not permitted to update this response.")

    db_resp.status = response_in.status.value
    if response_in.message is not None:
        db_resp.message = response_in.message

    db.add(db_resp)
    
    # Notify donor if requester accepted/rejected
    if current_user.id == blood_req.requester_id and response_in.status in [ResponseStatus.ACCEPTED, ResponseStatus.REJECTED]:
        notif_type = NotificationType.RESPONSE_ACCEPTED if response_in.status == ResponseStatus.ACCEPTED else NotificationType.RESPONSE_REJECTED
        notification = Notification(
            user_id=db_resp.donor_id,
            type=notif_type.value,
            title=f"Response {response_in.status.value.capitalize()}",
            message=f"Your response to the blood request for {blood_req.patient_name} has been {response_in.status.value}.",
            link=f"/donor/requests/{blood_req.id}"
        )
        db.add(notification)

    db.commit()
    db.refresh(db_resp)
    return db_resp
