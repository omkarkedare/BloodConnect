from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_active_user
from app.database.database import get_db
from app.models.user import User
from app.models.blood_request import BloodRequest
from app.schemas.blood_request import BloodRequestCreate, BloodRequestUpdate, BloodRequestResponse
from app.utils.enums import BloodGroup, UrgencyLevel, RequestStatus

router = APIRouter()

@router.post("/", response_model=BloodRequestResponse)
def create_blood_request(
    *,
    db: Session = Depends(get_db),
    request_in: BloodRequestCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Create a new blood request."""
    if request_in.units_needed < 1:
        raise HTTPException(status_code=400, detail="Units needed must be at least 1.")

    db_request = BloodRequest(
        requester_id=current_user.id,
        patient_name=request_in.patient_name,
        blood_group=request_in.blood_group.value,
        units_needed=request_in.units_needed,
        urgency=request_in.urgency.value,
        hospital_name=request_in.hospital_name,
        hospital_address=request_in.hospital_address,
        city=request_in.city,
        contact_phone=request_in.contact_phone,
        required_date=request_in.required_date,
        description=request_in.description,
        status=RequestStatus.OPEN.value,
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request

@router.get("/", response_model=List[BloodRequestResponse])
def search_blood_requests(
    *,
    db: Session = Depends(get_db),
    blood_group: Optional[BloodGroup] = None,
    city: Optional[str] = None,
    urgency: Optional[UrgencyLevel] = None,
    status: Optional[RequestStatus] = None,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Search and filter blood requests."""
    query = db.query(BloodRequest)
    
    if blood_group:
        query = query.filter(BloodRequest.blood_group == blood_group.value)
    if city:
        query = query.filter(BloodRequest.city.ilike(f"%{city}%"))
    if urgency:
        query = query.filter(BloodRequest.urgency == urgency.value)
    if status:
        query = query.filter(BloodRequest.status == status.value)
        
    return query.all()

@router.get("/{request_id}", response_model=BloodRequestResponse)
def get_blood_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get a specific blood request by ID."""
    blood_req = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not blood_req:
        raise HTTPException(status_code=404, detail="Blood request not found.")
    return blood_req

@router.put("/{request_id}", response_model=BloodRequestResponse)
def update_blood_request(
    request_id: int,
    *,
    db: Session = Depends(get_db),
    request_in: BloodRequestUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Update a blood request. Only the requester can modify it."""
    blood_req = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not blood_req:
        raise HTTPException(status_code=404, detail="Blood request not found.")
    
    if blood_req.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions to modify this request.")

    if request_in.units_needed is not None and request_in.units_needed < 1:
        raise HTTPException(status_code=400, detail="Units needed must be at least 1.")

    update_data = request_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(blood_req, field):
            if hasattr(value, "value"):
                setattr(blood_req, field, value.value)
            else:
                setattr(blood_req, field, value)
                
    db.add(blood_req)
    
    # Check if status is updated to fulfilled or cancelled
    if request_in.status is not None and request_in.status.value != blood_req.status:
        if request_in.status.value in [RequestStatus.FULFILLED.value, RequestStatus.CANCELLED.value]:
            from app.models.donor_response import DonorResponse
            from app.models.notification import Notification
            from app.utils.enums import NotificationType, ResponseStatus
            
            accepted_responses = db.query(DonorResponse).filter(
                DonorResponse.request_id == blood_req.id,
                DonorResponse.status == ResponseStatus.ACCEPTED.value
            ).all()
            
            for resp in accepted_responses:
                notif = Notification(
                    user_id=resp.donor_id,
                    type=NotificationType.SYSTEM_ALERT.value,
                    title="Request Update",
                    message=f"The blood request you accepted for {blood_req.patient_name} has been {request_in.status.value}.",
                    link=f"/requests/{blood_req.id}"
                )
                db.add(notif)
                
    db.commit()
    db.refresh(blood_req)
    return blood_req

from app.models.donor_profile import DonorProfile
from app.schemas.donor import DonorProfileResponse

@router.get("/{request_id}/matches", response_model=List[DonorProfileResponse])
def get_eligible_matches(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Find eligible available donors for this request's blood group."""
    blood_req = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not blood_req:
        raise HTTPException(status_code=404, detail="Blood request not found.")
    
    donors = db.query(DonorProfile).filter(
        DonorProfile.blood_group == blood_req.blood_group,
        DonorProfile.is_available == True,
        DonorProfile.user_id != current_user.id
    ).all()
    return donors

from app.models.donor_response import DonorResponse
from app.schemas.response import DonorResponseModel

@router.get("/{request_id}/responses", response_model=List[DonorResponseModel])
def get_request_responses(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """View all responses for a blood request (only requester)."""
    blood_req = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not blood_req:
        raise HTTPException(status_code=404, detail="Blood request not found.")
    
    if blood_req.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions to view responses.")
        
    responses = db.query(DonorResponse).filter(DonorResponse.request_id == request_id).all()
    return responses
