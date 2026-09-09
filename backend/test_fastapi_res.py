import sys, os
sys.path.append(os.getcwd())
from app.database.database import SessionLocal
from app.models.donor_response import DonorResponse
from app.models.user import User
from app.schemas.response import DonorResponseModel
from sqlalchemy.orm import joinedload
from app.utils.enums import ResponseStatus
import json

db = SessionLocal()
responses = db.query(DonorResponse).options(
    joinedload(DonorResponse.donor).joinedload(User.donor_profile)
).filter(DonorResponse.request_id == 1).all()

result = []
for resp in responses:
    resp_dict = DonorResponseModel.model_validate(resp).model_dump()
    # Let's see what resp.status is!
    print("resp.status in loop:", resp.status, type(resp.status))
    if resp.status != ResponseStatus.ACCEPTED.value and resp_dict.get('donor'):
        resp_dict['donor']['email'] = ""
        resp_dict['donor']['phone'] = None
    result.append(resp_dict)

try:
    validated = [DonorResponseModel.model_validate(item) for item in result]
    print("\nValidated by FastAPI:")
    for v in validated:
        print(v.model_dump_json(indent=2))
except Exception as e:
    print("Error:", e)
