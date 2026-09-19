# BloodConnect - Session Log

## Project History & Development Phases

### Phase 1: Project Initialization & Backend Architecture
* Analyzed the initial `frontend/` and `backend/` directory structures.
* Configured the Python environment. Created `backend/conftest.py` and established a proper module hierarchy by recursively injecting `__init__.py` files across the `backend/app` subdirectories.
* Refactored hardcoded absolute test imports into fully qualified application imports to resolve `ModuleNotFoundError` issues and stabilize the Python path.

### Phase 2: Database & Schema Work
* Investigated early FastAPI application startup failures linked to missing dependencies.
* Upgraded the local virtual environment by explicitly pinning `passlib[bcrypt]`, `pymysql`, and `python-multipart` within `backend/requirements.txt`.
* Verified relational schema definition files and validated MySQL connectivity.

### Phase 3: Testing & Debugging
* Localized cascading test failures tied to missing mock implementations inside FastAPI dependency overrides (`get_db`).
* Refactored `backend/test_api.py` and `backend/test_req.py` by injecting transactional rollback patterns via SQLite in-memory mocking (`poolclass=StaticPool`), maintaining test isolation.
* Corrected JWT assertions bound to the authentication routers (`test_role.py`).

### Phase 4: API Routing & Frontend Integration
* Remapped disconnected endpoint files (`responses.py`, `donations.py`, `blood_requests.py`) systematically back into the main FastAPI instance router tree ensuring global REST visibility.
* Conducted static analysis of `frontend/src/services/` mapping Axios controllers to the backend. Corrected `baseURL` misalignments that were disrupting proxy resolutions.

### Phase 5: Registration, Login & Context
* Fixed a silent failure in the React `AuthContext.jsx` where registration payloads completed successfully via the API but state objects were discarded. Preserved `user` and `token` state objects uniformly during `register()` and `login()` lifecycle hooks.
* Diagnosed SQLAlchemy integrity exceptions during `DonorProfile` creation linked to strict `ENUM` definitions. Rewrote the `DonorProfileCreate` Pydantic schemas to safely validate explicit `BloodGroup` translations.
* Resolved strict frontend dependency omissions by injecting `lucide-react`, `axios`, and `react-router-dom` natively into `package.json`.

### Phase 6: Donor/Requester Workflows & UI Improvements
* Rebuilt `frontend/src/App.jsx` to enforce modern React Router v6 layouts.
* Created missing view components (`SearchDonors`, `DonorDetail`, `DonorRequestDetail`) to support the Donor Response loop and Donor data preview.
* Upgraded core components (`Card`, `Button`, `Input`, `Select`, `StatusBadge`) with refined spacing and styling to establish a modern healthcare-oriented design system.
* Replaced the static Home page with a responsive layout featuring distinct visual sections and a Blood Compatibility reference matrix.

### Phase 7: RBAC & Security Hardening
* Audited user access controls and identified privilege escalation vectors in the public registration schema. Removed `role` assignment from the public `UserCreate` payload.
* Refactored `auth.py` to accept roles via explicit query parameters while categorically blocking admin provisioning.
* Deployed strict HTTP 403 blocks across routes utilizing `get_current_donor_user` and `get_current_requester_user` dependency injection.

### Phase 8: Request Visibility & Expiration
* Overhauled the `GET /api/requests/` endpoint to enforce strict RBAC filtration, preventing cross-requester data leakage. Requesters are restricted to their own requests, while donors query `OPEN` requests that actively match their blood profile.
* Implemented lazy expiration logic natively inside request endpoints. Requests whose `expires_at` deadline passes dynamically transition from `OPEN` to `EXPIRED`.
* Hardened queries to mathematically exclude expired requests from donor discovery views and reject response attempts on expired requests.

### Phase 9: Contact Masking & Notifications
* Hardened the `GET /api/requests/{id}/responses` endpoint by intercepting Pydantic serialization. The backend naturally scrubs raw communication PII (Email, Phone) from all `DonorResponseModel` outputs unless the response holds an explicit `ACCEPTED` status.
* Constructed `NotificationsDropdown.jsx` to dynamically render user-isolated alerts for request creation, response tracking, and finalized donations.

### Phase 10: Finalization & Project Cleanup
* **Project Cleanup**: Safely removed generated directories (`frontend/node_modules/`, `backend/venv/`, `frontend/dist/`, `.DS_Store`) and temporary scratch testing files without deleting core configuration.
* **Dependency Recreation**: Restored frontend dependencies (`npm install`) safely post-cleanup.
* **bcrypt Compatibility Fix**: Explicitly pinned `bcrypt==4.0.1` in `backend/requirements.txt` to fix authentication crashes caused by Passlib 1.7.4 incompatibilities with newer bcrypt versions.
* **Profile Implementation**: Transformed `RequesterSettings.jsx` and `DonorProfile.jsx` frontend components from static stubs into interactive forms that fetch and update real backend user data. Implemented the corresponding `PUT /me` endpoint.
* **Donation Workflow Implementation**: Modified the `responses.py` router so that when a requester accepts a donor response, the parent blood request is upgraded to `FULFILLED` and a `DonationRecord` (initially in a `PENDING` state) is generated for the donor.
* **Duplicate Protection**: Added a database query check during donation record creation to guarantee idempotency and prevent duplicate records.
* **Donation History**: Wired up `DonorDonations.jsx` to dynamically fetch and display the donor's actual completed donations.
* **Test Suite Fixes**: Repaired a crashing pytest suite by wrapping raw module-level database insertions inside `test_fastapi_pending.py` within proper pytest fixture contexts.
* **Demo-Data Cleanup**: Investigated apparent UI placeholders (e.g., "New York"). Confirmed they were actual residual seed data in the `donor_profiles` and `blood_requests` tables. Executed targeted SQL updates to clear the fake locations while preserving the valid test accounts.
* **Final Manual Testing**: Verified the end-to-end workflow (Donor responds → Requester accepts donor → Request fulfilled → DonationRecord created in PENDING status).
* **Final Verification**: The project architecture, documentation, and source code are successfully verified.
