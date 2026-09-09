import sys, os
sys.path.append(os.getcwd())
from app.database.database import SessionLocal
from app.models.donor_response import DonorResponse

db = SessionLocal()
resp = db.query(DonorResponse).first()
if resp:
    print("resp.status type:", type(resp.status))
    print("resp.status value:", resp.status)
