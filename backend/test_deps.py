import sys, os
sys.path.append(os.getcwd())
from app.database.database import SessionLocal
from app.models.user import User
from app.utils.enums import UserRole

db = SessionLocal()
user = db.query(User).filter(User.role == UserRole.REQUESTER.value).first()

if user:
    print("User role type:", type(user.role))
    print("user.role == UserRole.REQUESTER.value ?", user.role == UserRole.REQUESTER.value)
