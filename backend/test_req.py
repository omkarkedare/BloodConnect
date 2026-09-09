import sys, os
sys.path.append(os.getcwd())
from app.database.database import SessionLocal
from app.models.blood_request import BloodRequest
from app.schemas.blood_request import BloodRequestResponse
import json

db = SessionLocal()
req = db.query(BloodRequest).first()
if req:
    model = BloodRequestResponse.model_validate(req)
    print(model.model_dump_json(indent=2))
