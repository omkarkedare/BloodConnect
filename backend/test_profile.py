import sys, os
sys.path.append(os.getcwd())
from app.database.database import SessionLocal
from app.models.donor_profile import DonorProfile

db = SessionLocal()
profiles = db.query(DonorProfile).all()
for p in profiles:
    print(f"User ID: {p.user_id}, Blood Group: {p.blood_group}")
