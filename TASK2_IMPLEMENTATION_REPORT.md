# RentalFlow Task 2: monthly insights and complete booking timeline

## Features

- **Bookings page:** all **active** bookings from the existing authenticated `/rental/findall` endpoint now appear in three groups:
  - **Upcoming:** check-in today or in the future; ascending check-in date, then ascending checkout.
  - **In progress:** check-in before today and checkout after today; nearest checkout first.
  - **Past:** checkout today or earlier; most recently finished first.
- **Calendar:** continues showing all active reservations overlapping the selected month, including historic bookings; dates compared as calendar days, avoiding timezone shifts.
- **Dashboard:** the next-three list now contains the three closest upcoming check-ins instead of arbitrary entries.
- **Monthly chart:** 12 current-year months, with **bookings / booked revenue / estimated profit** display toggles. Peaks and quiet months rank **only completed months**, based on number of bookings. Months with no bookings are represented as zero, and rankings do not claim a slow season unless at least one completed month has bookings.
- **Backend:** `/balance/monthly` now also returns `bookingCount` per check-in month, while continuing to provide existing `label`, `totalRevenue`, `totalProfit`. Fixed the current-year date upper bound, so next-year bookings cannot appear in the current-year report. `/rental/findnext` now scopes results by authenticated user.
- **Financial correction:** monthly balance card now selects the current month from the returned series, instead of blindly displaying the first month.

## Business rules preserved / decisions that require owner approval

- The existing `/rental/findall` endpoint returns only **active** reservations. Cancelled/inactive bookings remain excluded, as they were before this change.
- Existing accounting allocates the entire booking revenue and profit to its **check-in month**, and counts only active bookings. These are **booked values**, not cash received or revenue recognition based on stay nights.
- **Brazil's local calendar day** (`America/Sao_Paulo`) is used for the new client-side timeline; checkout today counts as past. The legacy `/rental/findnext` endpoint still uses PostgreSQL's `CURRENT_DATE` predicate.
- Peak and slow months are computed from current-year **completed calendar months**. The partial current month and future months are visible in the chart but not used to declare highs/lows.
- This task intentionally does not implement multiple-property data models, color-coded property calendar, payment status, or historical year selectors. Those require an explicit data model/business decision.

## Checks in this environment

- Frontend: **167/167** behavior/component tests passed; **5/5** UI smoke checks passed.
- Frontend coverage for measured source modules: **99.21% statements/lines, 95.22% branches, 98.36% functions**.
- Backend: **142/142** Jest unit tests, 25 suites passed.
- Backend measured domain/adapter coverage: **100% statements/lines/functions, 95.09% branches**.
- TypeScript and ESLint: frontend and backend pass.
- A temporary Linux testing-only resolver shim was needed to run Jest against Windows-packaged node_modules. The shim is **not** committed or packaged.
- Vite native production bundle was not verified locally because the supplied dependencies are platform-specific. GitHub Actions on a fresh Ubuntu runner is the authoritative build/CI check.
- Real PostgreSQL database integration/browser E2E remain outstanding. These changes are NOT automatically certified for production.

## CI

Added a separate `Task 2 booking timeline and monthly chart regression tests` step to `.github/workflows/ci.yml`. Existing test coverage gates, backend Jest tests, HTTP integration tests, smoke tests, lint, TypeScript and builds remain mandatory.
