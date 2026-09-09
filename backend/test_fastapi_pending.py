import sys, os
sys.path.append(os.getcwd())
from app.database.database import SessionLocal
from app.models.donor_response import DonorResponse
from app.models.user import User
from app.schemas.response import DonorResponseModel
from sqlalchemy.orm import joinedload
from app.utils.enums import ResponseStatus

db = SessionLocal()
resp = DonorResponse(
    request_id=1,
    donor_id=2,
    status=ResponseStatus.PENDING.value,
    message="I am available"
)
db.add(resp)
db.commit()
db.refresh(resp)

# Query it back
fetched = db.query(DonorResponse).options(
    joinedload(DonorResponse.donor).joinedload(User.donor_profile)
).filter(DonorResponse.id == resp.id).first()

print("Fetched status:", fetched.status, type(fetched.status))
resp_dict = DonorResponseModel.model_validate(fetched).model_dump()
if fetched.status != ResponseStatus.ACCEPTED.value and resp_dict.get('donor'):
    resp_dict['donor']['email'] = ""
    resp_dict['donor']['phone'] = None

validated = DonorResponseModel.model_validate(resp_dict)
print(validated.model_dump_json(indent=2))

db.delete(fetched)
db.commit()
