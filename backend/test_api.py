import sys, os
sys.path.append(os.getcwd())
from app.database.database import SessionLocal
from app.models.donor_response import DonorResponse
from app.models.user import User
from app.schemas.response import DonorResponseModel
from sqlalchemy.orm import joinedload
import json

db = SessionLocal()
resps = db.query(DonorResponse).options(joinedload(DonorResponse.donor).joinedload(User.donor_profile)).all()
print("Total responses:", len(resps))
if resps:
    model = DonorResponseModel.model_validate(resps[0])
    print(model.model_dump_json(indent=2))
