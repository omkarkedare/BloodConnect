# BloodConnect

BloodConnect is a comprehensive Blood Donor Management and Smart Emergency Matching System developed as a BCS TY Semester V college project. It bridges the critical gap between blood donors and recipients by streamlining the entire blood donation lifecycle—from raising an urgent request to intelligent compatibility matching, donor readiness verification, contact privacy protection, administrative verification, and real-time donation progress tracking.

---

## Problem Statement
Finding compatible blood donors during medical emergencies is often chaotic, delay-prone, and inefficient. Lack of centralized matching, unverified donation claims, privacy concerns, and geographic delays frequently compromise patient outcomes. BloodConnect solves these issues by automating medical compatibility matching, gating donor response capability, validating operational details, and providing transparent verification tracking.

## Objectives
* Provide a centralized platform for blood request coordination and donor discovery.
* Automate medically accurate blood group compatibility matching and proximity prioritization.
* Ensure donor readiness through profile completion gating prior to matching.
* Protect user privacy by masking contact information and medical notes.
* Provide an administrative verification portal to authenticate physical blood donations with reference numbers.
* Synchronize real-time donation progress for requesters across single- and multi-unit requests.
* Support multilingual genuine human names across English, Marathi, Hindi, and regional scripts.

---

## Key Features Implemented (Phases 1–7)

### 1. Smart Emergency Donor Finder
* **Medically Compatible Blood Matching**: Maps standard donation compatibility rules (e.g., O- universal donor, AB+ universal recipient, matching Rh factors).
* **Same-City Prioritization**: Prioritizes donors located in the same city as the hospital before extending to compatible regional donors.
* **90-Day Donation Cooldown & Availability**: Automatically excludes donors currently in medical cooldown (<90 days since last donation) or marked as unavailable.

### 2. Donor Profile Completion Gate & Readiness
* **Mandatory Profile Verification**: Evaluates donor eligibility (blood group, date of birth $\ge$ 18 years, weight $\ge$ 45kg, city, and availability).
* **Readiness API (`/api/donors/readiness`)**: Incomplete donor accounts are blocked from responding to emergency requests or appearing in matching pools until profile criteria are satisfied.

### 3. Requester Donation Status Synchronization
* **Progress States**: Computes dynamic display progress (`OPEN`, `MATCHED`, `PENDING`, `PARTIALLY_VERIFIED`, `VERIFIED`, `REJECTED`) without mutating historical MySQL request enums.
* **Multi-Unit Progress**: Transparently tracks verified vs. required units (e.g., `Partially Verified (1/2 Units)`).
* **Strict Privacy Protection**: Strips internal admin verification notes and donor medical conditions from requester-facing donation summaries.

### 4. Admin Verification & Rejection Module
* **Admin Verification Portal**: Allows authorized administrators to verify physical donations using official blood bank reference numbers, recorded units, and audit timestamps.
* **Rejection Workflow**: Enables admins to reject invalid donation claims with documented reasons, automatically notifying both donor and requester.
* **Audit Trail**: Logs admin verifier ID, verifier name, and audit notes securely.

### 5. Multilingual Name Validation & Null Safety
* **Unicode Category Validation**: Uses Python's `unicodedata` categories (`L*` letters, `M*` combining marks/matras) to natively support genuine human names across English, Marathi, Hindi (Devanagari), Bengali, Tamil, Telugu, Gujarati, and Punjabi.
* **Rejection of Invalid Formats**: Strictly rejects numeric digits (ASCII `0-9` and Devanagari `०-९`), disallowed symbols (`@`, `#`, `$`, `%`, etc.), punctuation-only inputs (`-.-`, `...`, `---`), newlines (`\n`, `\r`), and tabs (`\t`).
* **Null Safety & Optional Updates**: In profile updates (`PUT /api/auth/me`), omitting `full_name` or passing `null` retains the existing name safely. Database columns enforce `nullable=False` to prevent accidental NULL overwrites.

### 6. Mandatory Patient Operational Fields
* Form interfaces and API schemas strictly enforce required operational fields: Patient Name, Blood Group, Units Needed, Urgency Level, Hospital Name, City, Contact Phone, Required Date, and Expiration Timestamp.

---

## User Roles & Permissions

| Role | Access & Capabilities |
| :--- | :--- |
| **Requester** | Create blood requests, view Smart Finder matches, receive donor responses, accept/reject responses, track live multi-unit donation verification progress, update requester profile. |
| **Donor** | Complete and manage donor profile, toggle availability, browse matching open requests, respond to emergency requests, view personal donation history and verified records. |
| **Admin** | System-wide dashboard statistics, manage all users (activate/deactivate), view all requests and donors, inspect and verify/reject donation records with reference codes and audit logs. |

---

## Technology Stack

* **Frontend**: React 18, Vite, Tailwind CSS, Axios, React Router v6, Lucide React
* **Backend**: Python 3.9, FastAPI, Uvicorn, SQLAlchemy 2.x, Pydantic v2
* **Database**: MySQL 8.x, PyMySQL, Alembic migrations
* **Authentication**: Stateless JWT (`python-jose`), Passlib, `bcrypt==4.0.1`
* **Testing**: PyTest, FastAPI TestClient, SQLite in-memory (`StaticPool`)

---

## System Architecture

The application employs a decoupled client-server architecture with strict Role-Based Access Control (RBAC):

```
┌──────────────────────────────────────────────────────────────┐
│                    React Frontend (SPA)                      │
│   Tailwind CSS  •  React Router v6  •  Axios API Services    │
└──────────────────────────────┬───────────────────────────────┘
                               │ JSON REST API / Bearer JWT
┌──────────────────────────────▼───────────────────────────────┐
│                    FastAPI Backend Server                    │
│  Routers: auth, donors, blood_requests, responses, admin    │
│  Services: smart matching, donor readiness, progress sync    │
│  Validators: unicodedata human name validator                │
└──────────────────────────────┬───────────────────────────────┘
                               │ SQLAlchemy ORM
┌──────────────────────────────▼───────────────────────────────┐
│                    MySQL Relational Database                 │
│  users • donor_profiles • blood_requests • donor_responses   │
│  donation_records • notifications                            │
└──────────────────────────────────────────────────────────────┘
```

### Core Database Models
1. **`User`**: Account credentials, hashed password, role (`admin`, `donor`, `requester`), full name, phone, activation and verification status.
2. **`DonorProfile`**: One-to-one with User. Stores blood group, date of birth, gender, weight (kg), city, state, availability flag, and last donation date.
3. **`BloodRequest`**: Patient name, blood group, units needed, urgency, hospital name/address, city, contact phone, required date, expiration timestamp, status (`open`, `fulfilled`, `cancelled`, `expired`).
4. **`DonorResponse`**: Connects donor to a blood request with status (`pending`, `accepted`, `rejected`) and optional communication message.
5. **`DonationRecord`**: Logs completed donations with donor ID, request ID, blood group, units donated, donation date, reference number, verified by admin ID, and verification status (`pending`, `verified`, `rejected`).
6. **`Notification`**: In-app notifications for request matching, response updates, and verification/rejection notices.

---

## Main API Routes

| Endpoint | Method | Role | Description |
| :--- | :---: | :---: | :--- |
| `/api/auth/register` | `POST` | Public | Register new Donor or Requester with name validation |
| `/api/auth/login` | `POST` | Public | OAuth2 token login, returns JWT access token |
| `/api/auth/me` | `GET` | Authenticated | Retrieve current user profile |
| `/api/auth/me` | `PUT` | Authenticated | Update user profile with name validation & null safety |
| `/api/donors/readiness` | `GET` | Donor | Check donor profile completeness & response eligibility |
| `/api/donors/` | `POST` | Donor | Create donor profile (weight $\ge$ 45kg, age $\ge$ 18) |
| `/api/donors/me` | `GET` / `PUT` | Donor | Get or update donor profile & availability toggle |
| `/api/blood-requests/` | `POST` | Requester | Create blood request with mandatory operational fields |
| `/api/blood-requests/my-requests` | `GET` | Requester | List requester requests with donation progress sync |
| `/api/blood-requests/{id}` | `GET` | Requester | Request detail with safe donation summaries |
| `/api/blood-requests/{id}/matches`| `GET` | Requester | Smart Emergency Donor Finder matching results |
| `/api/responses/` | `POST` | Donor | Respond to open, compatible request (profile gated) |
| `/api/responses/{id}` | `PUT` | Requester | Accept/reject donor response; auto-creates pending donation |
| `/api/donations/my-donations` | `GET` | Donor | View personal donation history and verified records |
| `/api/admin/donations` | `GET` | Admin | List all donations with verification filters |
| `/api/admin/donations/{id}/verify`| `PUT` | Admin | Verify donation record with reference number |
| `/api/admin/donations/{id}/reject`| `PUT` | Admin | Reject donation record with documented reason |
| `/api/admin/stats` | `GET` | Admin | System dashboard metrics |
| `/api/notifications/` | `GET` | Authenticated | List user notifications |

---

## Local Setup Instructions

### Prerequisites
* Python 3.9+
* Node.js 18+ and npm
* MySQL Server 8.x

### 1. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Configure environment file `backend/.env`:
```ini
DATABASE_URL=mysql+pymysql://<user>:<password>@localhost:3306/blood_donor_db
SECRET_KEY=your-secure-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

Run database migrations and start server:
```bash
alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation (Swagger): `http://127.0.0.1:8000/docs`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Web Application: `http://localhost:5173`

---

## Automated Testing & Verification

The test suite runs against isolated in-memory SQLite databases to guarantee zero pollution of live MySQL data.

Run all test suites:
```bash
cd backend
pytest backend/test_smart_matching.py \
       backend/test_admin_donations_audit.py \
       backend/test_donor_gate_audit.py \
       backend/test_requester_donation_status_audit.py \
       backend/test_patient_validation_audit.py \
       backend/test_user_name_validation_audit.py -v
```

### Test Results Summary:
* **Total Automated Tests**: **65 passed** (100% pass rate)
  * `test_smart_matching.py`: 9 tests (Compatibility, city priority, cooldown)
  * `test_admin_donations_audit.py`: 11 tests (Admin verification, rejection, audit log)
  * `test_donor_gate_audit.py`: 10 tests (Readiness gate, incomplete profile blocks)
  * `test_requester_donation_status_audit.py`: 12 tests (Progress sync, multi-unit tracking)
  * `test_patient_validation_audit.py`: 14 tests (Patient mandatory fields & validation)
  * `test_user_name_validation_audit.py`: 9 tests (User registration, profile updates, null safety)
* **Frontend Production Build**: Vite build succeeds in ~170ms with zero errors.

---

## Git Checkpoint

* **Active Feature Branch**: `feature/smart-emergency-finder`
* **Latest Checkpoint Commit**: `ed6980c`
* **Commit Message**: `feat: mandatory patient fields, multilingual name validation, and null safety`
* **Remote Status**: Synchronized with `origin/feature/smart-emergency-finder`

---

## Completed vs. Pending Features

### Completed (Phases 1–7):
- [x] Secure JWT authentication & bcrypt password hashing
- [x] Role-Based Access Control (Admin, Donor, Requester)
- [x] Donor Profile Management & Availability Toggle
- [x] Donor Profile Completion Gate & Readiness API
- [x] Smart Emergency Donor Finder (Compatible Blood Matrix + Proximity + Cooldown)
- [x] Blood Request Creation with Mandatory Operational Fields
- [x] Lazy Expiration Management for Blood Requests
- [x] Privacy-First Contact Masking & Zero Data Leakage
- [x] Admin Donation Verification with Official Reference Numbers
- [x] Admin Donation Rejection with Audit Reason Tracking
- [x] Requester Real-Time Donation Progress Synchronization & Multi-Unit Progress
- [x] Centralized Multilingual Human Name Validation (English, Marathi, Hindi)
- [x] Profile Update Null-Safety Verification
- [x] Automated 65-Test Regression Suite in SQLite

### Project Roadmap (Phases 8–9):
- [ ] **Phase 8 (Donation Certificates) — Upcoming**: Automated issuance and download of verified digital blood donation appreciation certificates for donors once donations are authenticated by the admin.
- [ ] **Phase 9 (Blood Centre Integration) — Postponed**: Direct institutional integration with certified blood banks, camp coordination, and centralized blood inventory tracking (postponed for subsequent release).

### Known Limitations
* Notifications currently operate via in-app storage and polling rather than external SMS/push notification services.
* Location distance calculation relies on city matching rather than GPS coordinates.
