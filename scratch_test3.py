import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from pydantic import BaseModel
import enum

class RequestStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"

class TestModel(BaseModel):
    status: RequestStatus

t = TestModel(status=RequestStatus.OPEN)
print(t.model_dump_json())
