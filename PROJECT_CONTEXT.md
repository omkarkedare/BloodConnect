# BloodConnect - Project Context

## Project Overview
* **Project Name**: BloodConnect
* **Description**: A comprehensive blood donor management and smart emergency matching system.
* **Context**: BCS TY Semester V College Project.
* **Active Branch**: `feature/smart-emergency-finder`
* **Latest Checkpoint**: `ed6980c` (`feat: mandatory patient fields, multilingual name validation, and null safety`)

---

## Technology Stack
The project leverages a modern, decoupled full-stack architecture:
* **Frontend**: React 18, Vite, Tailwind CSS, Axios, React Router v6, Lucide React
* **Backend**: Python 3.9, FastAPI, Uvicorn, SQLAlchemy 2.x, Pydantic v2, Alembic
* **Database**: MySQL 8.x, PyMySQL
* **Authentication**: Stateless JWT (`python-jose`), Passlib, `bcrypt==4.0.1`
* **Testing**: PyTest, FastAPI TestClient, SQLite in-memory (`poolclass=StaticPool`)

---

## Architecture
The application is structured into clearly separated layers:
* **`frontend/`**: Single Page Application (SPA). Manages UI components, route protection, interactive state, client-side validation, and Axios services.
* **`backend/app/`**:
  * **`routers/`**: Endpoint routing (`auth.py`, `donors.py`, `blood_requests.py`, `responses.py`, `donations.py`, `admin.py`, `notifications.py`, `health.py`).
  * **`models/`**: SQLAlchemy declarative models (`User`, `DonorProfile`, `BloodRequest`, `DonorResponse`, `DonationRecord`, `Notification`).
  * **`schemas/`**: Pydantic v2 schemas enforcing request/response validation contracts.
  * **`services/`**: Business logic engines:
    * `donor_matching.py`: Smart Emergency Donor Finder compatibility and ranking algorithm.
    * `donor_profile.py`: Profile completion gating and response readiness validation.
    * `blood_request.py`: Requester-facing display status and donation progress computation.
  * **`utils/`**: Shared validators (`validators.py:validate_human_name`), enums (`enums.py`), pagination.
* **`database/`**: Relational database schema definitions and Alembic migrations.

---

## Implemented Features (Phases 1–7)

1. **Authentication & Role-Based Access Control (RBAC)**:
   * Secure registration and login issuing stateless JWT access tokens.
   * Distinct user roles: `admin`, `donor`, `requester`.
   * Endpoint protection via FastAPI dependency injection (`get_current_admin_user`, `get_current_donor_user`, `get_current_requester_user`).
   * Password hashing using Passlib with `bcrypt==4.0.1`.

2. **Smart Emergency Donor Finder**:
   * Medically accurate compatibility mapping (O- universal donor, AB+ universal recipient, Rh factor compatibility).
   * Same-city prioritization before regional matches.
   * 90-day cooldown enforcement (excludes donors who donated in the last 90 days).
   * Real-time availability filter (`is_available = True`).

3. **Donor Profile Completion Gate & Readiness**:
   * Evaluates donor profile completeness (blood group, age $\ge$ 18, weight $\ge$ 45kg, city, availability).
   * Readiness API (`/api/donors/readiness`) blocks incomplete profiles from responding to emergency requests.

4. **Requester Real-Time Donation Progress Synchronization**:
   * Reusable progress engine computing requester display statuses: `OPEN`, `MATCHED`, `PENDING`, `PARTIALLY_VERIFIED`, `VERIFIED`, `REJECTED`.
   * Supports multi-unit requests (e.g. `Partially Verified (1/2 Units)`).
   * Preserves historical MySQL request enum values (`open`, `fulfilled`, `cancelled`, `expired`).
   * Privacy scrubbing: Removes internal admin audit notes and donor medical conditions from requester summaries.

5. **Admin Verification & Rejection Module**:
   * Admin portal for reviewing, authenticating, or rejecting donation records.
   * Verification with official blood bank reference numbers and audit notes.
   * Documented rejection workflow with required rejection reasons.
   * Auto-generated system notifications for donors and requesters.

6. **Centralized Multilingual Human Name Validation & Null Safety**:
   * Python standard `unicodedata` category validation (`L*` letters, `M*` combining marks/matras) in `backend/app/utils/validators.py`.
   * Accepts genuine names across English, Marathi, Hindi (Devanagari), Bengali, Tamil, Telugu, Gujarati, and Punjabi.
   * Strictly rejects ASCII and Devanagari numbers (`0-9`, `०-९`), symbols (`@`, `#`, `$`, `%`, etc.), punctuation-only strings (`-.-`, `...`, `---`), newlines (`\n`, `\r`), and tabs (`\t`).
   * Null safety: In `PUT /api/auth/me`, omitting `full_name` or passing `null` retains the existing name safely. Database columns enforce `nullable=False`.
   * Mirrored client-side validation in `frontend/src/utils/validators.js`.

7. **Mandatory Patient Operational Information**:
   * Explicit mandatory indicators (`*`) and frontend/backend validation on: Patient Name, Blood Group, Units Needed, Urgency, Hospital Name, City, Contact Phone, Required Date, and Expiration Timestamp.

8. **Automated Regression Testing (65 Tests Passed)**:
   * 100% isolated in-memory SQLite test suites ensuring zero pollution or modification of live MySQL data.

---

## Project Roadmap (Phases 8–9)
* **Phase 8 (Donation Certificates) — Upcoming**: Automated issuance and download of official digital certificates of appreciation for verified blood donations, accessible from the donor dashboard.
* **Phase 9 (Blood Centre Integration) — Postponed**: Institutional integration with certified blood centers, camp drives, and centralized blood stock registries (postponed for subsequent release).

---

## Known Limitations
* Notifications are delivered via database-backed in-app alerts and polling rather than WebSocket streams or SMS gateways.
* Matching proximity uses city-level matching rather than real-time GPS coordinate calculations.
