# BloodConnect

BloodConnect is a comprehensive Blood Donor Management System developed as a BCS 5th-semester college project. It bridges the gap between blood donors and recipients by streamlining the donation lifecycle—from raising an urgent request to finding a medically compatible match, facilitating secure communication, and logging the final donation.

## Problem Statement
Finding compatible blood donors in emergency situations is often a chaotic and time-consuming process. The lack of a centralized, real-time matching system results in delayed transfusions and compromises patient safety.

## Objectives
* Provide a centralized platform for creating blood requests and discovering donors.
* Implement medically accurate blood group compatibility matching.
* Protect user privacy by revealing contact information only upon mutual acceptance.
* Track the complete donation lifecycle, including request expiration and fulfillment.

## Main Features
* Secure user registration and JWT-based login.
* Role-based dashboards for Requesters, Donors, and Admins.
* Real-time blood group compatibility matching.
* Expiration tracking for time-sensitive blood requests.
* Secure donor response and acceptance workflow.
* Contact information masking prior to mutual acceptance.
* Automated donation record generation.
* In-app notifications for critical events.

## User Roles
* **Requester**: Can create blood requests, search for compatible donors, review inbound donor responses, and accept a donor to fulfill the request.
* **Donor**: Can manage their medical profile and availability, browse compatible open blood requests, and respond to requests.
* **Admin**: Has global visibility to monitor and manage all users, donors, requests, and system statistics.

## Technology Stack
* **Frontend**: React, Vite, Tailwind CSS, Axios, React Router, Lucide React
* **Backend**: Python 3.9, FastAPI, Uvicorn, SQLAlchemy, Pydantic, Alembic
* **Database**: MySQL, PyMySQL
* **Authentication**: JWT, Passlib, `bcrypt==4.0.1`

## Architecture Overview
The application utilizes a decoupled client-server architecture. The frontend is a React Single Page Application (SPA) that communicates asynchronously with the FastAPI backend via a RESTful API. The backend handles business logic, enforces Role-Based Access Control (RBAC) via JWT dependencies, and interacts with the MySQL database using the SQLAlchemy ORM.

### Folder Structure
* `frontend/`: Contains the React application, including UI components, pages, context providers, and API service files.
* `backend/`: Contains the FastAPI application, divided into routers (`app/routers`), database models (`app/models`), and data validation schemas (`app/schemas`).
* `database/`: Contains the base SQL schema definitions.

### Database Tables
* `users`: Stores core account credentials, roles, and authentication data.
* `donor_profiles`: Stores extended donor information (blood group, city, availability).
* `blood_requests`: Stores requests created by requesters (patient details, urgency, deadlines).
* `donor_responses`: Links donors to specific requests tracking response status (`PENDING`, `ACCEPTED`, `REJECTED`).
* `donation_records`: Logs successfully matched donations.
* `notifications`: Stores system alerts for users.

## Main Workflows

### Donation Workflow
1. Requester accepts a pending donor response.
2. The `BloodRequest` status automatically updates to `FULFILLED`.
3. A `DonationRecord` is idempotently created for the donor.
4. The newly created donation record defaults to the `PENDING` state, awaiting future administrative or medical verification.

### Request Expiration Workflow
Blood requests require an explicit deadline (`expires_at`). The system utilizes lazy evaluation: whenever requests are queried or accessed, the backend compares the deadline against the current time. If the deadline has passed, the request dynamically transitions from `OPEN` to `EXPIRED`, automatically hiding it from active donor discovery pools.

## Security Features
* **Role-Based Access Control (RBAC)**: Endpoints strictly validate the JWT to ensure users can only perform actions permitted by their role (e.g., only Requesters can create requests).
* **Resource Ownership Checks**: Users can only modify data they own (e.g., a Requester cannot accept a donor on behalf of another Requester's request).
* **Contact Masking**: The backend natively scrubs raw communication PII (Email, Phone) from payload responses unless the bipartite state explicitly holds an `ACCEPTED` status.
* **Password Hashing**: Passwords are cryptographically hashed using Passlib and `bcrypt==4.0.1` prior to database insertion.

## Local Setup Instructions

### Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Database & Migration Instructions
1. Ensure MySQL is running locally.
2. Create a database for the project.
3. Copy `backend/.env.example` to `backend/.env` and update the `DATABASE_URL` with your MySQL credentials.
4. Run migrations to initialize the schema:
```bash
alembic upgrade head
```
5. Start the backend server:
```bash
uvicorn app.main:app --reload
```
The Swagger UI API documentation will be accessible at: `http://localhost:8000/docs`

### Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
The React application will be accessible at: `http://localhost:5173`

## Testing Instructions
Backend tests are written using `pytest`. They verify core REST API logic, database integrity, and authentication workflows.
Ensure the virtual environment is activated, then run:
```bash
cd backend
pytest -v
```

## Known Limitations/Future Improvements
* System notifications rely on in-app polling; external integrations (like email or SMS alerts) are not yet implemented.
* Location matching is currently derived via exact city string matching rather than geospatial radius searching.
* The transition of a `DonationRecord` from `PENDING` to `VERIFIED` currently requires manual administrative intervention.
