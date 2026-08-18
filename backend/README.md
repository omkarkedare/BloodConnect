# Blood Donor Management System — Backend

FastAPI backend server for the Blood Donor Management System.

## Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Configuration

Copy `.env.example` to `.env` and update values:
```bash
cp .env.example .env
```

## Run Development Server

```bash
uvicorn app.main:app --reload --port 8000
```

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health Check: http://localhost:8000/api/health
