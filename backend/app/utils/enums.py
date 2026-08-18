import enum


class UserRole(str, enum.Enum):
    DONOR = "donor"
    REQUESTER = "requester"
    ADMIN = "admin"


class BloodGroup(str, enum.Enum):
    A_POSITIVE = "A+"
    A_NEGATIVE = "A-"
    B_POSITIVE = "B+"
    B_NEGATIVE = "B-"
    AB_POSITIVE = "AB+"
    AB_NEGATIVE = "AB-"
    O_POSITIVE = "O+"
    O_NEGATIVE = "O-"


class RequestStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class UrgencyLevel(str, enum.Enum):
    NORMAL = "normal"
    URGENT = "urgent"
    CRITICAL = "critical"


class ResponseStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class DonationStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class NotificationType(str, enum.Enum):
    REQUEST_CREATED = "request_created"
    RESPONSE_RECEIVED = "response_received"
    RESPONSE_ACCEPTED = "response_accepted"
    RESPONSE_REJECTED = "response_rejected"
    DONATION_VERIFIED = "donation_verified"
    ACCOUNT_VERIFIED = "account_verified"
    SYSTEM = "system"

