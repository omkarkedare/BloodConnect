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
- [x] Phase 3 — SQLAlchemy Models (6 models, verified)
- [ ] Phase 4 — Authentication (JWT login/register, Pydantic schemas)
- [ ] Phase 5 — Donor Management
- [ ] Phase 6 — Blood Requests
- [ ] Phase 7 — Matching & Responses
- [ ] Phase 8 — Admin Panel
- [ ] Phase 9 — Notifications & Polishing

## Next Step
**Phase 4 — Authentication**: Create Alembic migrations to generate tables, then implement JWT auth endpoints (register, login, /auth/me), Pydantic schemas, and password hashing.
