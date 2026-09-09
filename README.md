# BloodConnect - Blood Donor Management System

BloodConnect is a full-stack web application designed to connect blood donors with patients in need. It streamlines the process of requesting blood, finding eligible matching donors, managing responses, and finalizing donation records.

## Project Architecture Summary
- **Frontend**: React (Vite), Tailwind CSS v4, Axios, React Router.
- **Backend**: Python 3.9, FastAPI, SQLAlchemy (ORM), Alembic (Migrations), JWT for authentication.
- **Database**: MySQL 8+ (relational data storage).
- **Communication**: RESTful JSON API.

## Database Schema Summary
1. **users**: Core authentication (email, password_hash, role, status).
2. **donor_profiles**: Specific details for donors (blood_group, gender, weight, city, availability).
3. **blood_requests**: Patient requests (blood_group, urgency, units, hospital_name, status, expires_at).
4. **donor_responses**: Donor accept/reject responses to blood requests.
5. **donation_records**: Finalized and verified transaction of donated blood.
6. **notifications**: System alerts (response received, donation verified, etc.).

## API Endpoints Summary
- **Auth**: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- **Donors**: `/api/donors/` (Profile management, Search)
- **Requests**: `/api/blood-requests/` (Create, View, Update), `/api/blood-requests/{id}/matches` (Find eligible donors)
- **Responses**: `/api/responses/` (Accept, Reject, Withdraw)
- **Donations**: `/api/donations/` (Finalize and log donation)
- **Notifications**: `/api/notifications/` (List, Mark Read)
- **Admin**: `/api/admin/*` (Dashboard stats, User/Request/Donation management)

## Setup and Run Instructions

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- MySQL (Running locally or via Docker)

### Backend Setup
1. `cd backend`
2. `python3.9 -m venv venv`
3. `source venv/bin/activate` (or `venv\Scripts\activate` on Windows)
4. `pip install -r requirements.txt`
5. Create a `.env` file (see requirements below).
6. Apply migrations: `alembic upgrade head`
7. Start server: `uvicorn app.main:app --reload --port 8000`

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. Start development server: `npm run dev`
4. The application will be available at `http://localhost:5173`.

## Environment Variable Requirements
Create a `.env` file in the `backend/` directory:
```env
DATABASE_URL=mysql+pymysql://<user>:<password>@localhost:3306/<db_name>
SECRET_KEY=<your_jwt_secret_key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```
*(Do not commit actual secrets to version control. If your password contains `%`, encode it as `%%` for Alembic).*

## Testing / Verification Summary
- **E2E Workflows**: User registration, donor matching, RBC compatibility filtering, request creation, date validation, temporal request expiration, donor confirmation loops, and donation finalization tracking to automated request fulfillment are entirely implemented, connected to live FastAPI endpoints, and verified.
- **Security & RBAC**: Advanced RBAC enforced. Requesters are strictly isolated to their own requests, and raw donor PII (phone/email) is natively scrubbed by the backend from response payloads until explicit acceptance. Expired requests are securely shielded from donor interactions natively at the DB query level. JWT tokens guard protected endpoints, and specialized FastAPI dependencies strictly limit API paths to corresponding `donor`, `requester`, or `admin` roles enforcing HTTP 403 blocks for violations. Public Admin registration has been secured.
- **Frontend UI**: Integrated React routing, context-driven auth, and professional healthcare-themed Tailwind CSS v4 design system (refined spacing, shadows, modern layout, responsive components). `npm run build` succeeds cleanly.
- **Migrations**: Database schema successfully handles cascading relationships and rigorous data consistency checks.

## Known Limitations
- No geographical radius-based matching (relies on exact city text matching).
- No integration with external SMS or Email gateways for external notifications.
- Password reset and email verification flows are currently unhandled stubs.

## Future Enhancements
1. **Real-time Notifications**: Implement WebSockets for instant in-app alerts.
2. **Map Integration**: Visual map to see the proximity of hospitals and donors.
3. **Analytics Dashboard**: Graphical data visualization using Chart.js on the Admin Panel.
4. **OAuth Integration**: Allow login via Google/Facebook.

- **Real-Time Notification Workflows**: Built-in dropdown alerts for request routing, response tracking, and blood-bank/hospital location coordination.

## Security
- **Zero-Trust Relationships**: Database models actively scrub contact PII (Email, Phone) via strictly structured Pydantic return loops until absolute mutual consent (Accept Donor) is established.
- **Strict Multi-Role Isolation**: Horizontal Privilege Escalation explicitly mitigated at the backend router tier. Users physically cannot fetch parameterized records detached from their `user_id`.
