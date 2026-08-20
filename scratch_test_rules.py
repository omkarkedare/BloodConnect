import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from datetime import date, timedelta
from app.schemas.blood_request import BloodRequestCreate
from app.utils.enums import BloodGroup, UrgencyLevel
from pydantic import ValidationError

print("--- Testing Date Validation ---")
try:
    req = BloodRequestCreate(
        patient_name="John Doe",
        blood_group=BloodGroup.A_POSITIVE,
        units_needed=2,
        urgency=UrgencyLevel.NORMAL,
        hospital_name="City Hospital",
        city="Testville",
        contact_phone="1234567890",
        required_date=date(2020, 1, 1)
    )
    print("FAIL: Accepted past date")
except ValidationError as e:
    print("PASS: Rejected past date", e.errors()[0]['msg'])

try:
    req = BloodRequestCreate(
        patient_name="John Doe",
        blood_group=BloodGroup.A_POSITIVE,
        units_needed=2,
        urgency=UrgencyLevel.NORMAL,
        hospital_name="City Hospital",
        city="Testville",
        contact_phone="1234567890",
        required_date=date.today() + timedelta(days=1)
    )
    print("PASS: Accepted future date")
except ValidationError as e:
    print("FAIL: Rejected future date", e)

print("\n--- Testing Blood Compatibility ---")
from app.routers.blood_requests import COMPATIBLE_DONORS

def check_compat(recipient, expected):
    actual = COMPATIBLE_DONORS.get(recipient, [])
    if set(actual) == set(expected):
        print(f"PASS: {recipient.value} <- {[a.value for a in actual]}")
    else:
        print(f"FAIL: {recipient.value} expected {expected}, got {actual}")

check_compat(BloodGroup.A_POSITIVE, [BloodGroup.A_POSITIVE, BloodGroup.A_NEGATIVE, BloodGroup.O_POSITIVE, BloodGroup.O_NEGATIVE])
check_compat(BloodGroup.O_NEGATIVE, [BloodGroup.O_NEGATIVE])
check_compat(BloodGroup.AB_POSITIVE, [BloodGroup.A_POSITIVE, BloodGroup.A_NEGATIVE, BloodGroup.B_POSITIVE, BloodGroup.B_NEGATIVE, BloodGroup.AB_POSITIVE, BloodGroup.AB_NEGATIVE, BloodGroup.O_POSITIVE, BloodGroup.O_NEGATIVE])
check_compat(BloodGroup.AB_NEGATIVE, [BloodGroup.A_NEGATIVE, BloodGroup.B_NEGATIVE, BloodGroup.AB_NEGATIVE, BloodGroup.O_NEGATIVE])
