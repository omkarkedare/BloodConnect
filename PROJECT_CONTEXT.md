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
- [x] Phase 10 — Initial Frontend Integration (API mapping, Axios auth)
- [x] Phase 11 — E2E Testing & Refinement (Verification of UI flows)
- [x] Phase 12 — Final Documentation & Project Handover

## Current Focus
**Project Completed & Handed Over**
The BloodConnect application is now functionally complete. The backend is robustly providing fully-typed REST API endpoints secured with JWT, and the frontend connects to these effectively. See `README.md` for the handover documentation, schema summary, and instructions for scaling the application.

**Verification summary:**

- MySQL database connection: VERIFIED (connected to `blood_donor_db`).
- Alembic migration: `e285040fd87d` applied to the database.
- Expected tables: all present (`users`, `blood_requests`, `donor_profiles`, `donor_responses`, `donation_records`, `notifications`, `alembic_version`).
- Foreign keys, indexes, and check constraints: VERIFIED (all expected FKs, indexes, and checks present).
- FastAPI server: started under `uvicorn app.main:app --reload --port 8000` and inspected.
- `/api/health`: tested and returned `database: connected`.
- Database connection: confirmed by `test_db_connection()` and by `/api/health` response.


Proceeding next: **Phase 4 — Authentication** (remaining). After Phase 3 validation, Phase 4 will implement Pydantic schemas and auth endpoints.
