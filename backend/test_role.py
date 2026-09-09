import sys, os
sys.path.append(os.getcwd())
from app.database.database import SessionLocal
from app.models.user import User
from app.utils.enums import UserRole
db = SessionLocal()
requester = db.query(User).filter(User.role == 'requester').first()
print(f'User: {requester.email}, Role Type: {type(requester.role)}, Role Value: {requester.role}')
if requester.role == 'requester':
    print('Match against string requester works!')
if requester.role == UserRole.REQUESTER:
    print('Match against UserRole.REQUESTER works!')
if requester.role == UserRole.REQUESTER.value:
    print('Match against UserRole.REQUESTER.value works!')
