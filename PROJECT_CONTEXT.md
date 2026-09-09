# Blood Donor Management System — Project Context

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React.js + Vite + Tailwind CSS v4 + React Router + Axios + Lucide React |
| Backend | FastAPI + Uvicorn + SQLAlchemy 2.0 + Pydantic v2 + Alembic |
| Database | MySQL 8.0 (via PyMySQL driver) |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Runtime | Python 3.9.6, Node.js (latest LTS) |

## Project Root
```
blood donor system/
├── frontend/              # React SPA (Vite)
├── backend/               # FastAPI API server
├── database/              # schema.sql DDL
├── docs/                  # Documentation
├── .gitignore
└── README.md
```

## Backend Architecture
```
backend/
├── app/
│   ├── core/              # config.py, security.py
│   ├── database/          # database.py (engine, Base, get_db)
│   ├── models/            # SQLAlchemy ORM models (6 models)
│   ├── schemas/           # Pydantic schemas (Phase 4)
│   ├── routers/           # API route handlers
│   ├── services/          # Business logic (Phase 4+)
│   └── utils/             # enums.py, pagination.py
├── alembic/               # Migration scripts
├── alembic.ini
├── requirements.txt
└── .env
```

## Database Models (Phase 3 — Complete)
| Model | Table | Key Relationships |
|-------|-------|-------------------|
| User | `users` | → DonorProfile (1:1), → BloodRequests, → DonorResponses, → DonationRecords, → Notifications |
| DonorProfile | `donor_profiles` | → User (FK user_id, unique) |
| BloodRequest | `blood_requests` | → User/requester (FK), → DonorResponses, → DonationRecords |
| DonorResponse | `donor_responses` | → BloodRequest (FK), → User/donor (FK), unique(request_id, donor_id) |
| DonationRecord | `donation_records` | → User/donor (FK), → BloodRequest (FK, optional), → User/verifier (FK, optional) |
| Notification | `notifications` | → User (FK) |

## Environment Configuration
- **Backend `.env`**: DATABASE_URL, SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES, CORS_ORIGINS
- **Frontend `.env`**: VITE_API_BASE_URL

## Completed Phases
- [x] Phase 1 — System Planning & Architecture
- [x] Phase 2 — Project Setup (full-stack foundation)
- [x] Phase 3 — SQLAlchemy Models & Alembic Migrations
- [x] Phase 4 — Authentication (JWT login/register, schemas)
- [x] Phase 5 — Donor Management (Profiles, availability)
- [x] Phase 6 — Blood Requests (Creation, management)
- [x] Phase 7 — Matching & Responses (Donor matching, acceptance flow)
- [x] Phase 8 — Admin Panel (Dashboard stats, user management)
- [x] Phase 9 — Notifications (Automated alerts for key lifecycle events)
- [x] Phase 10 — Frontend Integration (API mapping, Dashboard API connections)
- [x] Phase 11 — E2E Testing & Refinement (Verification of UI flows, P2P matching UI)
- [x] Phase 12 — Final Documentation, RBAC Hardening, & Project Handover
- [x] Phase 13 — Complete Donation Workflow & Business Rules (Final Fulfillment Loop)
- [x] Phase 14 — Professional UI/UX Polish (Healthcare theme, refined layouts, responsive design)

## Current Focus
**Project Completed & Handed Over**
The BloodConnect application is now functionally complete. The backend provides fully-typed REST API endpoints secured with JWT and strict RBAC dependencies. The frontend React application securely connects to these APIs and fully implements the peer-to-peer donor matching lifecycle, date validation, standard RBC compatibility filtering, and closed-loop donation fulfillment tracking.

**Verification summary:**
- MySQL database connection: VERIFIED
- Alembic migrations: VERIFIED (All schema constraints applied)
- FastAPI server: VERIFIED (Healthy, RBAC secured, tested)
- Frontend build (`npm run build`): VERIFIED (Passes with 0 warnings)
- End-to-End Donor to Fulfillment lifecycle completely verified. Project is functionally complete and in final deployment state.

### Phase 16 & 17 — Advanced Interactions & Location UI
- **Notification System**: Added real-time user-isolated popovers for Donor/Requester workflow statuses.
- **Blood Location Clarity**: Refined requester request creation forms and globally standardized the "Blood Needed At" label across all request detail and card interfaces using the natively decoupled `hospital_name` and `city` payloads.

### Phase 18 — Security Auditing & Release Finalization
- **Authorization Constraints**: Enforced strict `current_user.id` URL barriers on parameterized GET requests to prevent horizontal privilege escalation between users of the same role.
- **Production Build**: Full frontend compiler verified. E2E simulated workflows passed with zero network/console error signatures.

### Phase 19 — Blood Request Expiration
- **Temporal Enforcement**: Successfully integrated a database-driven request expiration lifecycle via an `expires_at` timestamp.
- **Lazy State Transition**: Deployed a scalable lazy expiration mechanic bypassing heavy crons, dynamically transitioning stale `OPEN` blood requests to `EXPIRED` upon traversal.
- **Secure Filtering**: Barred expired entities strictly from donor discovery (`GET /api/requests/`) and fundamentally blocked late responses (`POST /api/responses/`).
- **UI Tracking**: Reconfigured requester dashboards to isolate expired requests into collapsible partitions and embedded "Blood Needed By" locators throughout detail interfaces.
