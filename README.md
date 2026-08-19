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
3. **blood_requests**: Patient requests (blood_group, urgency, units, hospital_name, status).
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
- **E2E Workflows**: User registration, donor matching, blood request creation, and donor response loops are fully implemented and passing.
- **Security**: JWT tokens effectively guard protected endpoints and correctly distinguish User, Donor, and Admin roles.
- **Frontend**: API services accurately map to the backend architecture. `npm run build` succeeds cleanly.
- **Migrations**: Database schema handles cascading relationships, explicit typing, and strict CHECK constraints correctly across 6 core tables.

## Known Limitations
- No geographical radius-based matching (relies on exact city text matching).
- No integration with external SMS or Email gateways for external notifications.
- Password reset and email verification flows are currently unhandled stubs.

## Future Enhancements
1. **Real-time Notifications**: Implement WebSockets for instant in-app alerts.
2. **Map Integration**: Visual map to see the proximity of hospitals and donors.
3. **Analytics Dashboard**: Graphical data visualization using Chart.js on the Admin Panel.
4. **OAuth Integration**: Allow login via Google/Facebook.
