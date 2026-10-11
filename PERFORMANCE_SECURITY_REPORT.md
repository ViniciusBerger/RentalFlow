# RentalFlow — performance and booking access hardening

## Changes
- Shared authenticated-session data store: dashboard, bookings, and app shell subscribe to a single snapshot. Initial API loads are deduplicated, and the same data survives page navigation.
- Bookings now refresh in the background without resetting the fullscreen `isLoading` state. After creation, update, or deletion, balances and bookings refresh concurrently; the user profile is not refetched.
- Annual/monthly balance requests run in parallel.
- Refresh failures preserve previously loaded records and display a retryable nonblocking banner. Authentication errors from first load remain fatal.
- Logging in or out resets cached data and prevents any late response from a previous user session from populating the next session.
- Booking queries by date, overlap checks, updates, cancellations, and deletions now scope at the database query level to the authenticated user ID. Other-user IDs match zero rows and do not change data.
- Client edit fields are allowlisted. An ordinary edit cannot reassign the user or cancel by sending arbitrary fields. The legacy submitted profit is ignored; PostgreSQL recomputes `profit = revenue - fee` atomically when the amounts change.

## Tests (local)
- Frontend: 180/180 behavioral tests pass, including 6 new data-store tests. ESLint and TypeScript pass.
- Backend: 158/158 unit tests pass, including 16 new ownership and validation tests. ESLint and TypeScript pass.
- Measured aggregate frontend exercised-source coverage: 98.98% statements, 95.69% branches, 97.30% functions.
- Measured aggregate backend domain/adapter coverage: 100% statements/functions/lines, 95.79% branches.
- CI already runs both test suites with their existing 95% gates and requires lint, TypeScript, production builds, HTTP tests and smoke tests; no CI weakening was needed.

## Verification limits
- Backend Jest was run with a **temporary, external** JavaScript module-resolution shim because the supplied dependencies contain Windows-native artifacts. The shim is not packaged or committed. Clean GitHub Actions runs normally.
- A fresh Linux frontend Vite bundle and live PostgreSQL/browser E2E were not verified in this environment. Review hosted CI, then test against a staging PostgreSQL database before merging to production.
- Coverage is aggregate for the selected executable layers, not 95% in every file.
