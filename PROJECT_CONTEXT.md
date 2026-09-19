# BloodConnect - Project Context

## Project Overview
* **Project Name**: BloodConnect
* **Description**: A comprehensive blood donor and request management system.
* **Context**: BCS 5th-semester college project.

## Technology Stack
The project leverages a modern, decoupled full-stack architecture:
* **Frontend**: React, Vite, Tailwind CSS, Axios, React Router, Lucide React
* **Backend**: Python 3.9, FastAPI, Uvicorn, SQLAlchemy, Pydantic, Alembic
* **Database**: MySQL, PyMySQL
* **Authentication**: JWT authentication, Passlib, `bcrypt==4.0.1`

## Architecture
The application is structured into clearly delineated layers to separate client-side rendering from server-side business logic and data persistence:
* **`frontend/`**: Contains the React single-page application. Handles user interfaces, client-side routing, form validation, and API interactions.
* **`backend/`**: Contains the FastAPI REST API. Manages routing, business logic, dependency injection (e.g., authentication), and database sessions.
* **`database/`**: Defines the MySQL relational schema via SQLAlchemy ORM models.
* **Alembic Migrations**: Manages incremental database schema changes and version control.
* **REST API Communication**: The frontend communicates with the backend exclusively via standard HTTP REST methods (GET, POST, PUT, DELETE) exchanging JSON payloads.
* **Authentication/RBAC Structure**: Employs stateless JWTs. The backend secures endpoints using FastAPI dependency injection to enforce Role-Based Access Control (RBAC), ensuring users can only access data and perform actions permitted by their specific role.

## Implemented Features
The following features are actively implemented and functioning in the codebase:
* **Registration/login**: Secure user onboarding and authentication token generation.
* **JWT authentication**: Stateless session management for API security.
* **Admin/Donor/Requester roles**: Distinct user account types with specialized capabilities.
* **RBAC (Role-Based Access Control)**: Strict backend enforcement of permissions based on the active JWT role.
* **Donor profiles**: Detailed medical and physical data for users registering as donors.
* **Donor availability**: Real-time toggle allowing donors to mark themselves as available or unavailable for matching.
* **Blood requests**: Creation of urgent requisitions including location, required blood group, and deadlines.
* **Blood-group compatibility matching**: Backend logic ensuring requests are only visible to donors with medically compatible blood groups.
* **Request expiration**: Automated lazy-evaluation transitioning requests from `OPEN` to `EXPIRED` once their deadline passes.
* **Donor responses**: Donors can actively respond to compatible requests, moving into a `PENDING` response state.
* **Accept/reject workflow**: Requesters can review inbound donor responses and explicitly accept or reject them.
* **Contact-information masking**: Zero-trust architecture where donor email and phone numbers are stripped from the API payload unless the requester explicitly accepts their response.
* **Request fulfillment**: Automatic transitioning of a blood request status to `FULFILLED` upon successful donor acceptance.
* **Donation records**: The creation of an immutable record logging the successful match.
* **Donation history**: A dedicated view for donors to see their historical donation records.
* **Duplicate donation protection/idempotency**: Database constraints and logic preventing the creation of multiple duplicate donation records for the same donor-request pair.
* **Notifications**: In-app alerting system for events such as request creation, response acceptance, and matches.
* **Admin dashboard**: Global system statistics overview.
* **Admin user/request management**: Tables providing global visibility of all users, donors, and requests.
* **Requester profile/settings**: Dedicated forms for requesters to update their base user details.
* **Donor profile editing**: Dedicated forms for donors to update their medical profiles and availability.
* **Security/ownership checks**: Backend validation ensuring requesters can only modify their own requests and responses.
* **Frontend/backend validation**: Synchronized Pydantic models (backend) and React form constraints (frontend) to prevent bad data entry.
* **Automated testing**: Pytest suite verifying core backend logic, database operations, and authentication.
* **Healthcare-style UI**: A clean, professional, and responsive Tailwind CSS design.
