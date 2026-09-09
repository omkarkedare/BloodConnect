import sys, os
sys.path.append(os.getcwd())
from app.database.database import SessionLocal
from app.models.donor_response import DonorResponse
from app.models.user import User
from sqlalchemy.orm import joinedload
from app.schemas.response import DonorResponseModel
from app.utils.enums import ResponseStatus
import json

db = SessionLocal()
responses = db.query(DonorResponse).options(
    joinedload(DonorResponse.donor).joinedload(User.donor_profile)
).all()

print(f"Total responses in DB: {len(responses)}")

result = []
for resp in responses:
    resp_model = DonorResponseModel.model_validate(resp)
    if resp.status != ResponseStatus.ACCEPTED.value and resp_model.donor:
        resp_model.donor.email = ""
        resp_model.donor.phone = None
    result.append(resp_model)

for r in result:
    print(r.model_dump_json(indent=2))

