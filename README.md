# RentalFlow

RentalFlow is a full-stack rental management platform built to help hosts manage bookings, track revenue, and monitor upcoming rentals through a clean web interface and a modular backend API.

**Production app:** [www.rentalflow.club](https://www.rentalflow.club)  
**Production API:** [api.rentalflow.club](https://api.rentalflow.club)

---

## Overview

RentalFlow was built to centralize the day-to-day workflow of managing short-term rentals in one place. The application supports authentication, onboarding, dashboard insights, booking management, and API testing through Swagger.

It combines a **React + Vite frontend** with a **NestJS backend**, **PostgreSQL + Drizzle ORM** for persistence, and **Firebase Authentication** for login.

---

## What the App Does

RentalFlow allows a host to:

- sign in securely
- complete a first-time profile setup flow
- view yearly and monthly balance summaries
- see upcoming rentals
- create, update, cancel, and delete rentals
- manage bookings from a dedicated bookings page
- test backend endpoints independently through Swagger

---

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- React Router
- Tailwind CSS

### Backend
- NestJS
- TypeScript
- PostgreSQL
- Drizzle ORM
- Firebase Authentication
- Swagger / OpenAPI

### DevOps / Deployment
- Docker
- Docker Compose
- Nginx
- Railway

---

## Architecture

### Frontend
The frontend is organized around features and reusable hooks/components.

Main feature areas include:
- `auth`
- `complete-profile`
- `dashboard`
- `booking`

Reusable UI elements live in shared component folders, while data fetching and app state handling are driven through hooks.

### Backend
The backend follows a modular, layered structure designed to keep business logic isolated from framework and infrastructure concerns.

Main layers include:
- `core/app` → contracts and ports
- `core/domain` → business rules and use cases
- `infra` → adapters, persistence, dependency wiring
- `web` → controllers, DTOs, Swagger, and request handling

This structure supports cleaner separation of concerns and makes the app easier to maintain and extend.

---

## Key Features

- Firebase-backed authentication
- session-based auth using an HTTP-only cookie
- first-login onboarding / complete-profile flow
- dashboard with balance summaries and upcoming rentals
- booking management with create, edit, cancel, and delete flows
- protected backend routes
- Swagger documentation for API testing
- production deployment with custom domains

---

## Repository Structure

```bash
RentalFlow/
├── backend/
│   ├── drizzle/
│   ├── src/
│   │   ├── core/
│   │   ├── infra/
│   │   └── web/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   └── layout/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
└── README.md
```

---

## Production

The live application is available at:

- **Frontend:** [www.rentalflow.club](https://www.rentalflow.club)
- **Backend API:** [api.rentalflow.club](https://api.rentalflow.club)

Use the production frontend to demo the application in a browser, and use the production API domain for backend verification or API exploration if enabled in the deployed environment.

---

## Application Flow

### 1. Authentication
Users sign in from the frontend with email and password.

The backend:
- authenticates the user against Firebase
- issues an auth cookie
- exposes `/auth/me` so the frontend can restore session state

### 2. Onboarding
If the user has not completed registration yet, they are redirected to the profile completion page before they can use protected areas of the app.

### 3. Dashboard
After login, users reach the dashboard where they can:
- view yearly balance
- view monthly balance
- see upcoming rentals
- navigate into booking workflows

### 4. Bookings
The bookings page provides:
- month navigation
- current rentals view
- rental details
- edit, cancel, and delete workflows

---

## API Summary

### Health
- `GET /`

### Auth
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/complete-profile`

### Balance
- `GET /balance/yearly`
- `GET /balance/monthly`

### Rentals
- `GET /rental/find`
- `GET /rental/findall`
- `GET /rental/findnext`
- `POST /rental/add`
- `PATCH /rental/update`
- `PATCH /rental/cancel`
- `DELETE /rental/delete/:id`

### Users
- `GET /user/users`
- `GET /user/host`
- `DELETE /user/delete/:id`

### Swagger
Local Swagger is expected at:

```bash
http://localhost:3000/api
```

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/ViniciusBerger/RentalFlow.git
cd RentalFlow
```

### 2. Start PostgreSQL

The backend includes a `docker-compose.yml` for the database.

```bash
cd backend
docker compose up -d
cd ..
```

> By default, the compose file exposes PostgreSQL on port `5433`.

### 3. Configure backend environment variables

Create a `.env` file inside `backend/`.

Example:

```env
PORT=3000
FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5433
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password

DATABASE_URL=postgresql://your_db_user:your_db_password@localhost:5433/your_db_name

FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_API_KEY=your_firebase_web_api_key
```

Notes:
- `DATABASE_URL` is required by Drizzle and the database connection layer.
- `FRONTEND_URL` is used for CORS.
- `FIREBASE_PRIVATE_KEY` usually needs escaped newlines exactly as shown above.

### 4. Configure frontend environment variables

Create a `.env` file inside `frontend/`.

For local development:

```env
VITE_API_URL=http://localhost:3000
```

For a production-connected frontend build:

```env
VITE_API_URL=https://api.rentalflow.club
```

### 5. Install dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd ../frontend
npm install
```

### 6. Run database migrations

From the backend folder, run the Drizzle migration flow used in the project.

Typical commands:

```bash
cd backend
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 7. Start the development servers

#### Start backend
```bash
cd backend
npm run start:dev
```

#### Start frontend
Open a second terminal:

```bash
cd frontend
npm run dev
```

---

## Local URLs

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- Swagger Docs: `http://localhost:3000/api`

---

## How to Demo RentalFlow

This section is intended for interviews, portfolio walkthroughs, professor demos, or project presentations.

### Fastest Demo Option

Open the live app directly:

- **App:** [www.rentalflow.club](https://www.rentalflow.club)

If you also want to show the backend side, reference:

- **API:** [api.rentalflow.club](https://api.rentalflow.club)

### Recommended Demo Flow

#### 1. Start with the problem
Explain that RentalFlow helps a host manage short-term rentals in one place instead of tracking bookings, revenue, and upcoming stays manually.

#### 2. Show the live product
Open:

```bash
https://www.rentalflow.club
```

Show the landing or login experience.

#### 3. Explain the stack briefly
Mention that:
- the frontend is built with React + Vite
- the backend is built with NestJS
- PostgreSQL stores the data
- Firebase handles authentication
- Drizzle ORM manages persistence
- Railway is used for deployment

#### 4. Demonstrate login
Log in with a demo or test account.

Talk through:
- credential-based login
- backend authentication
- cookie/session restoration with `/auth/me`
- protected routes

#### 5. Demonstrate onboarding
If you are using a fresh account, show the complete-profile flow.

Explain that first-time users must complete onboarding before reaching protected app pages.

#### 6. Demonstrate the dashboard
On the dashboard, highlight:
- yearly balance
- monthly balance
- upcoming rentals
- navigation into booking workflows

#### 7. Demonstrate booking management
Navigate to the bookings page and show:
- month navigation
- current rental list or calendar-style organization
- opening rental details
- edit / cancel / delete workflow
- create rental workflow

#### 8. Demonstrate API awareness
If Swagger is enabled in the environment you are using, open the docs and show that the backend can be tested independently of the frontend.

Local example:

```bash
http://localhost:3000/api
```

#### 9. End with engineering talking points
Close by explaining that the project demonstrates:
- full-stack TypeScript development
- modular backend design
- auth/session handling
- real CRUD workflows
- Docker-based local setup
- deployment to production with a custom domain

---

## Demo Talking Points

These points work well during interviews or presentations:

- The backend is structured to separate domain logic from framework and infrastructure code.
- Authentication is handled with Firebase, but application sessions are still managed through backend-controlled cookies.
- The frontend uses reusable hooks and shared components to keep data loading and UI state manageable.
- The project covers both product development and production deployment concerns.
- The live domain makes it possible to demo a real deployed application instead of only showing local code.

---

## Docker Notes

### Backend container
The backend Dockerfile is designed to:
- build the NestJS app
- run the production server
- support deployment in a containerized environment

### Frontend container
The frontend Dockerfile is designed to:
- build the Vite app
- inject `VITE_API_URL` at build time
- serve the compiled frontend with Nginx

The frontend Nginx config also supports SPA routing with an `index.html` fallback.

---

## Useful Scripts

### Backend
```bash
npm run start:dev
npm run build
npm run start:prod
npm run test
npm run test:e2e
npm run test:cov
```

### Frontend
```bash
npm run dev
npm run build
npm run preview
npm run lint
```

---

## What This Project Demonstrates

RentalFlow demonstrates:

- full-stack TypeScript development
- frontend/backend integration
- PostgreSQL data persistence with Drizzle ORM
- auth and onboarding flows
- protected route handling
- containerized local development
- deployment-aware environment configuration
- real product demo readiness through a production domain

---

## Future Improvements

Possible next steps:

- seeded demo data for easier walkthroughs
- CI/CD pipeline automation
- stronger end-to-end testing
- role-based access expansion
- richer booking calendar visualization
- deployment guide for contributors

---

## Author

**Marcos Vinicius Berger Gilles**

GitHub: [ViniciusBerger](https://github.com/ViniciusBerger)
