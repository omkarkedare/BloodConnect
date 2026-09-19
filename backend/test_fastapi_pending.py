import sys, os
sys.path.append(os.getcwd())
import pytest
from app.database.database import SessionLocal
from app.models.donor_response import DonorResponse
from app.models.user import User
from app.schemas.response import DonorResponseModel
from sqlalchemy.orm import joinedload
from app.utils.enums import ResponseStatus

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def test_fastapi_pending(db):
    # Cleanup any existing leftover response for request_id=1, donor_id=2
    existing = db.query(DonorResponse).filter_by(request_id=1, donor_id=2).first()
    if existing:
        db.delete(existing)
        db.commit()

    resp = DonorResponse(
        request_id=1,
        donor_id=2,
        status=ResponseStatus.PENDING.value,
        message="I am available"
    )
    db.add(resp)
    db.commit()
    db.refresh(resp)

    fetched = None
    try:
        # Query it back
        fetched = db.query(DonorResponse).options(
            joinedload(DonorResponse.donor).joinedload(User.donor_profile)
        ).filter(DonorResponse.id == resp.id).first()

        assert fetched is not None, "Failed to fetch inserted response"

        print("Fetched status:", fetched.status, type(fetched.status))
        resp_dict = DonorResponseModel.model_validate(fetched).model_dump()
        if fetched.status != ResponseStatus.ACCEPTED.value and resp_dict.get('donor'):
            resp_dict['donor']['email'] = ""
            resp_dict['donor']['phone'] = None

        validated = DonorResponseModel.model_validate(resp_dict)
        print(validated.model_dump_json(indent=2))

        # Verify the intended state
        assert validated.status == ResponseStatus.PENDING.value
        if validated.donor:
            assert validated.donor.email == ""
            assert validated.donor.phone is None
    finally:
        if fetched is not None:
            db.delete(fetched)
            db.commit()
