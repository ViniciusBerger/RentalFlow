# RentalFlow

A rental-management application with a React/TypeScript frontend, NestJS API, and PostgreSQL database using Drizzle ORM. The interface defaults to Brazilian Portuguese and also supports English.

## Features

- Properties (`Imóveis`), each with a customizable color and icon stored in PostgreSQL
- All-property or per-property calendars, booking lists, and revenue/profit insights
- Account-scoped API operations: users can only access their own properties and bookings
- A shared frontend data store and background refresh after booking changes
- Automatic **Imóvel principal** assignment for existing accounts and reservations during Task 3 migration

## Development

Use Node.js 22 and PostgreSQL. Install dependencies separately in `backend/` and `frontend/` using `npm ci`. Configure the backend database and authentication environment variables; use `frontend/.env.development` or a local override to set `VITE_API_URL`.

In separate terminals:

```sh
cd backend && npm run start:dev
cd frontend && npm run dev
```

**Do not commit local `.env` files or production credentials.** Development-only login must remain disabled in production.

## Database migration (Task 3)

The migration `backend/drizzle/0003_properties_and_scoped_bookings.sql` must run **before deploying the Task 3 API/frontend**. Back up the production database first.

The migration creates a default **Imóvel principal** property for every existing account and associates all of its existing reservations with that property. Existing bookings are preserved. PostgreSQL also enforces account/property consistency and prohibits overlapping active bookings for the same property, while allowing bookings at different properties to overlap.

**Preflight for existing active booking overlaps:** Because legacy bookings all become attached to one default property, any overlapping active bookings for the same account must be resolved with the business owner before migration. This query finds conflicts without modifying data:

```sql
SELECT a.user_id, a.id AS booking_a, b.id AS booking_b,
       a.start_date AS a_checkin, a.end_date AS a_checkout,
       b.start_date AS b_checkin, b.end_date AS b_checkout
FROM rentals a
JOIN rentals b ON a.user_id = b.user_id AND a.id < b.id
WHERE a.is_active AND b.is_active
  AND a.start_date < b.end_date AND b.start_date < a.end_date;
```

After a backup and preflight, apply migrations with the usual Drizzle deployment process:

```sh
cd backend
npx drizzle-kit migrate
```

The CI workflow runs `npm run test:db` against a **disposable PostgreSQL service**, verifying backfill, tenant isolation, different-property overlap, checkout boundaries, and rejection of same-property overlaps. Never point the fixture test at production.

## Verification and release

GitHub Actions: `.github/workflows/ci.yml` (backend/frontend tests, builds, ESLint, TypeScript, selected-module 95% aggregate coverage gates, and PostgreSQL migration tests). Local equivalents are available in `scripts/ci-local.ps1` for Windows.

Tests and coverage gates do not replace staging checks. Before production, verify migration with a real backup/staging database, account isolation, booking creation and editing, property archive rules, and desktop/mobile interactions.
