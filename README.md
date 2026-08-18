# 🩸 Blood Donor Management System

A full-stack web application that connects blood donors with recipients and hospitals, streamlining the blood donation process through an intuitive digital platform.

> **Project Type:** BCS / Computer Science — 5th Semester Field Project  
> **Status:** 🟡 Phase 2 — Project Setup (Foundation)

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React.js 18, Vite, Tailwind CSS, React Router v6, Axios, Lucide React |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, SQLAlchemy, Pydantic, Alembic |
| **Database** | MySQL 8.0 |
| **Auth** | JWT (JSON Web Tokens) — *coming in Phase 4* |

---

## Project Structure

```
blood-donor-management-system/
├── frontend/          # React.js application
├── backend/           # FastAPI application
├── docs/              # Project documentation
├── .gitignore
└── README.md
```

---

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **MySQL** 8.0+

---

## Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

### Run Frontend
```bash
npm run dev
```

The React app will start at **http://localhost:5173**

---

## Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate    # macOS/Linux
# venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

Update the `.env` with your MySQL credentials.

### Run Backend
```bash
uvicorn app.main:app --reload --port 8000
```

The FastAPI server will start at **http://localhost:8000**

---

## MySQL Setup

1. Install MySQL 8.0+ and start the server
2. Create the database:
   ```sql
   CREATE DATABASE blood_donor_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Update `backend/.env` with your database credentials:
   ```
   DATABASE_URL=mysql+pymysql://root:yourpassword@localhost:3306/blood_donor_db
   ```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql+pymysql://root:password@localhost:3306/blood_donor_db` |
| `SECRET_KEY` | JWT signing key | `your-secret-key-here` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry in minutes | `1440` |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:5173` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:8000/api` |

---

## API Documentation

Once the backend is running:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **Health Check:** http://localhost:8000/api/health

---

## Current Status

- [x] Phase 1 — System Planning & Architecture
- [x] Phase 2 — Project Setup & Foundation
- [ ] Phase 3 — Database Models & Migrations
- [ ] Phase 4 — Authentication (JWT)
- [ ] Phase 5 — Donor Module
- [ ] Phase 6 — Blood Request Module
- [ ] Phase 7 — Matching System
- [ ] Phase 8 — Admin Module
- [ ] Phase 9 — UI/UX Polish
- [ ] Phase 10 — Testing
- [ ] Phase 11 — Documentation & Deployment

---

## License

This project is developed for academic purposes as part of a BCS/CS 5th-semester field project.
