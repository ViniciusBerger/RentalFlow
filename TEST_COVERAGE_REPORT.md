> Historical testing report; see `CI_VALIDATION_REPORT.md` for the latest CI checks and lint results.

# RentalFlow — expanded test and coverage report

**Baseline:** `RentalFlow_Tests_Fixed.zip`. **Scope:** current implemented NestJS/React application and development-only auth. Tests do not cover unimplemented proposal-only features such as property CRUD, guest messaging, and payment management.

## Final executed results

| Check | Result |
|---|---|
| Backend Jest unit tests | **142 / 142 passed**, 25 suites |
| Backend HTTP e2e/integration tests | **4 / 4 passed**, 2 suites (stubbed persistence, no real PostgreSQL) |
| Backend dev-auth smoke | **4 / 4 passed** |
| Frontend Node behavioral, SSR, hook, and service tests | **125 / 125 passed** |
| Frontend UI smoke | **5 / 5 passed** |
| Backend TypeScript (including tests) | **Passed** |
| Backend NestJS build | **Passed** |
| Frontend TypeScript | **Passed** |
| Frontend Vite production bundle on this Linux runner | **Blocked:** Windows-supplied `node_modules` lack the Linux Rollup native binding (`@rollup/rollup-linux-x64-gnu`). Run `npm ci` and `npm run build` on your Windows computer. |
| Frontend ESLint | **Not passing:** 64 preexisting lint errors, primarily `no-explicit-any`; not resolved by adding coverage. |
| Real PostgreSQL integration | **Not executed:** database credentials/server unavailable in this runner. |
| Browser E2E (real DOM, responsive layouts) | **Not executed**. React SSR and unit-level callback tests are not a substitute. |

## Coverage (actual measurements)

### Backend business logic: core/domain and infra/adapters

| Metric | Measured |
|---|---:|
| Statements | **100.00%** (228/228) |
| Branches | **95.09%** (97/102) |
| Functions | **100.00%** (62/62) |
| Lines | **100.00%** (200/200) |

Backend Jest enforces all four aggregate metrics >= 95% through its `coverageThreshold`. The scope includes `src/core/domain/**/*.ts` and `src/infra/adapters/**/*.ts` but skips interfaces, barrel files, specs, generated output, controllers, Nest modules, app bootstrap, and configuration. Some skipped controllers and auth HTTP routes have tests, but they do not affect this coverage gate. **Do not interpret these metrics as coverage of the entire backend.**

### Frontend: exercised application source modules

| Metric | Measured |
|---|---:|
| Lines | **98.67%** |
| Branches | **95.58%** |
| Functions | **97.95%** |
| Statements | Not reported by Node's built-in coverage tool |

Frontend `npm run test:cov` enforces >=95% each for aggregate lines, branches, and functions. Measurement only covers application source modules **executed by the Node tests**, using `--test-coverage-include="src/**/*.{ts,tsx}"`. Unexecuted modules are not included in the denominator. Some individual files are below 95%, notably the profile onboarding component's branch coverage and some mutation hooks. **This is not 95% of every frontend file or the whole project.**

Frontend tests use React server-side markup rendering, direct callback tests with a minimal synchronous test dispatcher, mocked fetch responses and stubbed navigation. These checks verify actual behavioral paths but are not browser/DOM or real database integration tests. Node.js **22 or newer** is recommended for the built-in coverage command.

## New behavioral scenarios

- Development login session (successful, bad credentials, missing session, expired/forged session, production Firebase isolation), HTTP login and `/auth/me`.
- Production-appropriate auth hook navigation, pending registration/onboarding, profile updates, logout, rejected requests, and error resets.
- Booking create/edit/delete APIs, failed HTTP calls, duplicate/error state, mutation refresh behavior and confirmation; failed updates are not reported as success.
- Deletion only closes the confirmation after a positive backend result, and stays open on failure or exception.
- Calendar date normalization, overlap/month boundaries, row rendering, month navigation, and no-op edits.
- Finance summaries, host-profile loading, errors and recovery, dashboard and navigation variants, booking forms, and loading/error/empty states.
- Service guards, profile lookup/creation, rental/finance controller delegation, exception filters, and domain profit/date behavior.

## Source-level issues repaired while testing

- Prevented false success for rental update/delete and modal saves; kept failed edit/delete dialogs open.
- Prevented the data loader from staying indefinitely in loading state after refresh failure.
- Removed auth-domain console logs of submitted email and password presence, and removed frontend profile debug logging.
- Improved update-booking HTTP error messaging and corrected the deletion error from "user" to "rental".
- Retained production Firebase authentication and kept test credentials restricted to development configuration.

## Known risks and what this gate does not establish

- No real PostgreSQL database was available for testing migrations or host-level access control; e2e tests use mocks for persistence. Before production, test isolation between hosts for booking lookups, modifications, cancellation and deletion.
- This is a **coverage gate on selected business layers and executed frontend modules**, not whole-repository coverage, 95% per-file coverage, or proof of correctness.
- Vite build and lint must be resolved and rerun in the user's actual environment. Browser-based flows, responsive layouts, and keyboard accessibility still need verification.
- Advanced features from the earlier design mockups remain **proposed, not implemented**, and thus cannot have passing functionality tests.

## Run on Windows (keep your existing `.env` secrets)

Use Node.js 22 or newer and install each application's dependencies on Windows rather than copying preinstalled `node_modules` from another OS.

```powershell
cd backend
npm ci
npm run test:cov
npm run test:e2e
npm run build

cd ..\frontend
npm ci
npm run test:cov
npm test
node --test ui-redesign.test.mjs
npm run build
npm run lint
```

The testing-only temporary Node resolver compatibility shim used on this Linux runner was **not included** in this project ZIP; Windows `npm ci` should install appropriate native modules. Original `.git` and secret `.env` files are not included.
