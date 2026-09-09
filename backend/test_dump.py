import sys, os
sys.path.append(os.getcwd())
from app.database.database import SessionLocal
from app.models.donor_response import DonorResponse
from app.schemas.response import DonorResponseModel

db = SessionLocal()
resp = db.query(DonorResponse).first()
if resp:
    resp_dict = DonorResponseModel.model_validate(resp).model_dump()
    print("Status type:", type(resp_dict['status']))
    print("Status value:", resp_dict['status'])
