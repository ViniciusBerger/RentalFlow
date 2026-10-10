# Local development sign-in

Development credentials: **test@test.com** / **test123**.

1. In `backend/`, copy settings from `.env.development.example` into `.env` (Nest ConfigModule reads `.env`). Set `DATABASE_URL` to a **separate development PostgreSQL database**, not a production Railway database. Apply existing Drizzle migrations first.
2. In `frontend/`, `.env.development` points Vite at `http://localhost:3000`.
3. Run backend with `NODE_ENV=development` and `ENABLE_DEV_LOGIN=true`; `npm install && npm run start:dev` from `backend/`.
4. Run `npm install && npm run dev` from `frontend/`, open http://localhost:5173 and sign in with the above credentials.

The backend creates a local host account on first sign-in using the normal user repository. Rental and finance endpoints use the existing database and will initially be empty until you add rentals. The development session uses a signed HttpOnly, SameSite=Lax cookie with a one-hour expiry. The guard accepts this cookie ONLY if `NODE_ENV=development` AND `ENABLE_DEV_LOGIN=true`, and a secret of at least 32 characters is configured. In production, Firebase sign-in is unchanged and the development session cookie is ignored.

**Important**: This does not enable the additional mockup features (property management, payment tracking, guest messaging, chart history); those need database/API work and your approval. Do not expose or deploy local development credentials, `.env` or dev database.
