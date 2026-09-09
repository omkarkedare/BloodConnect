from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_active_user, get_current_requester_user
from app.database.database import get_db
from app.models.user import User
from app.models.blood_request import BloodRequest
from app.schemas.blood_request import BloodRequestCreate, BloodRequestUpdate, BloodRequestResponse
from app.utils.enums import BloodGroup, UrgencyLevel, RequestStatus, UserRole

COMPATIBLE_DONORS = {
    BloodGroup.A_POSITIVE: [BloodGroup.A_POSITIVE, BloodGroup.A_NEGATIVE, BloodGroup.O_POSITIVE, BloodGroup.O_NEGATIVE],
    BloodGroup.A_NEGATIVE: [BloodGroup.A_NEGATIVE, BloodGroup.O_NEGATIVE],
    BloodGroup.B_POSITIVE: [BloodGroup.B_POSITIVE, BloodGroup.B_NEGATIVE, BloodGroup.O_POSITIVE, BloodGroup.O_NEGATIVE],
    BloodGroup.B_NEGATIVE: [BloodGroup.B_NEGATIVE, BloodGroup.O_NEGATIVE],
    BloodGroup.AB_POSITIVE: [BloodGroup.A_POSITIVE, BloodGroup.A_NEGATIVE, BloodGroup.B_POSITIVE, BloodGroup.B_NEGATIVE, BloodGroup.AB_POSITIVE, BloodGroup.AB_NEGATIVE, BloodGroup.O_POSITIVE, BloodGroup.O_NEGATIVE],
    BloodGroup.AB_NEGATIVE: [BloodGroup.A_NEGATIVE, BloodGroup.B_NEGATIVE, BloodGroup.AB_NEGATIVE, BloodGroup.O_NEGATIVE],
    BloodGroup.O_POSITIVE: [BloodGroup.O_POSITIVE, BloodGroup.O_NEGATIVE],
    BloodGroup.O_NEGATIVE: [BloodGroup.O_NEGATIVE],
}

router = APIRouter()

@router.post("/", response_model=BloodRequestResponse)
def create_blood_request(
    *,
    db: Session = Depends(get_db),
    request_in: BloodRequestCreate,
    current_user: User = Depends(get_current_requester_user),
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
        expires_at=request_in.expires_at,
        status=RequestStatus.OPEN.value,
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)

    # Notify eligible donors
    recipient_group = BloodGroup(db_request.blood_group)
    compatible_groups = [g.value for g in COMPATIBLE_DONORS.get(recipient_group, [recipient_group])]
    
    from app.models.donor_profile import DonorProfile
    from app.models.notification import Notification
    from app.utils.enums import NotificationType

    eligible_donors = db.query(DonorProfile).filter(
        DonorProfile.blood_group.in_(compatible_groups),
        DonorProfile.is_available == True,
        DonorProfile.user_id != current_user.id
    ).all()

    for donor_profile in eligible_donors:
        notif = Notification(
            user_id=donor_profile.user_id,
            type=NotificationType.REQUEST_CREATED.value,
            title="New Blood Request Match",
            message=f"A new blood request for {db_request.blood_group} blood matches your profile in {db_request.city}.",
            link=f"/donor/requests/{db_request.id}"
        )
        db.add(notif)
    if eligible_donors:
        db.commit()

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
    from datetime import datetime
    now = datetime.utcnow()

    # Lazy expiration: mark any OPEN requests whose expires_at has passed
    stale = db.query(BloodRequest).filter(
        BloodRequest.status == RequestStatus.OPEN.value,
        BloodRequest.expires_at != None,
        BloodRequest.expires_at <= now,
    ).all()
    for req in stale:
        req.status = RequestStatus.EXPIRED.value
    if stale:
        db.commit()

    query = db.query(BloodRequest)
    
    if current_user.role == UserRole.REQUESTER or current_user.role == UserRole.REQUESTER.value or current_user.role == "requester":
        query = query.filter(BloodRequest.requester_id == current_user.id)
    elif current_user.role == UserRole.DONOR or current_user.role == UserRole.DONOR.value or current_user.role == "donor":
        # Donor should see only open AND non-expired requests
        query = query.filter(BloodRequest.status == RequestStatus.OPEN.value)
        query = query.filter(
            (BloodRequest.expires_at == None) | (BloodRequest.expires_at > now)
        )
        # Apply standard compatibility rules
        if current_user.donor_profile:
            donor_bg = BloodGroup(current_user.donor_profile.blood_group)
            # Find which recipient groups the donor can donate TO
            recipient_groups = []
            for group, compatible_donors in COMPATIBLE_DONORS.items():
                if donor_bg in compatible_donors:
                    recipient_groups.append(group.value)
            
            if recipient_groups:
                query = query.filter(BloodRequest.blood_group.in_(recipient_groups))
            else:
                # If for some reason none match, return none
                query = query.filter(False)

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
    
    # Lazy expiration check
    from datetime import datetime
    if (blood_req.status == RequestStatus.OPEN.value 
        and blood_req.expires_at is not None 
        and blood_req.expires_at <= datetime.utcnow()):
        blood_req.status = RequestStatus.EXPIRED.value
        db.commit()
        db.refresh(blood_req)
        
    from app.utils.enums import UserRole
    role_val = current_user.role.value if hasattr(current_user.role, 'value') else current_user.role
    if role_val == UserRole.REQUESTER.value or role_val == "requester":
        if blood_req.requester_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions to view this request.")
            
    return blood_req

@router.put("/{request_id}", response_model=BloodRequestResponse)
def update_blood_request(
    request_id: int,
    *,
    db: Session = Depends(get_db),
    request_in: BloodRequestUpdate,
    current_user: User = Depends(get_current_requester_user),
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
                    link=f"/donor/requests/{blood_req.id}"
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
    current_user: User = Depends(get_current_requester_user),
) -> Any:
    """Find eligible available donors for this request's blood group using compatibility rules."""
    blood_req = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not blood_req:
        raise HTTPException(status_code=404, detail="Blood request not found.")
    
    # Recipient is the blood_req.blood_group
    # Retrieve the list of compatible donor groups
    recipient_group = BloodGroup(blood_req.blood_group)
    compatible_groups = [g.value for g in COMPATIBLE_DONORS.get(recipient_group, [recipient_group])]
    
    donors = db.query(DonorProfile).filter(
        DonorProfile.blood_group.in_(compatible_groups),
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
    current_user: User = Depends(get_current_requester_user),
) -> Any:
    """View all responses for a blood request (only requester)."""
    from app.utils.enums import ResponseStatus
    
    blood_req = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not blood_req:
        raise HTTPException(status_code=404, detail="Blood request not found.")
    
    if blood_req.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions to view responses.")
        
    from sqlalchemy.orm import joinedload
    responses = db.query(DonorResponse).options(
        joinedload(DonorResponse.donor).joinedload(User.donor_profile)
    ).filter(DonorResponse.request_id == request_id).all()
    
    # Scrub contact details if not accepted
    result = []
    for resp in responses:
        resp_model = DonorResponseModel.model_validate(resp)
        if resp.status != ResponseStatus.ACCEPTED.value and resp_model.donor:
            resp_model.donor.email = ""
            resp_model.donor.phone = None
        result.append(resp_model)
        
    return result
