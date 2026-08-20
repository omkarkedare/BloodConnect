import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from datetime import datetime
from app.schemas.user import UserResponse
from app.utils.enums import UserRole

class MockUser:
    id = 1
    email = "test@example.com"
    full_name = "Test"
    phone = "123"
    role = "donor"  # This is how it's stored in the DB (as string)
    is_active = True
    is_verified = True
    created_at = datetime.now()

try:
    user = MockUser()
    resp = UserResponse.model_validate(user)
    print("UserResponse OK:", resp.role)
except Exception as e:
    import traceback
    traceback.print_exc()
