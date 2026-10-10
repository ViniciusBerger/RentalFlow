# RentalFlow UI refresh

The frontend includes a first-pass redesign based on the approved concept images:
- Shared workspace header and sidebar with mobile navigation
- Financial summary cards using actual yearly/monthly income and profit data (BRL)
- Dashboard hero and upcoming bookings list
- Calendar styling and month-switch controls
- Updated booking form and detail-dialog containers
- Refreshed login and profile screen styling

**No new backend behavior** has been introduced. The concept images included fictional properties, search, charts, and payment workflows that do not exist in the supplied source. Those were intentionally not presented as functional components.

## Install & verify

From `frontend`:

```bash
npm ci
npm run build
npm run lint
node --test ui-redesign.test.mjs
npm run dev
```

For backend verification, use the scripts already in `backend/package.json`.

## Copy to existing Git checkout

Copy the ZIP's `RentalFlow/frontend` directory into your existing `frontend` directory, retaining your own `.git` and `.env` files. The ZIP also contains the unchanged backend and project files for completeness. Do not copy stale `node_modules` or `dist` folders.

## Verification performed in sandbox

The source-level smoke tests passed. The Vite/TypeScript build could not be completed because the environment could not install npm dependencies and `vite/client`/`@types/node` were unavailable. Run the above checks on your machine prior to deployment. The redesign has not been browser-tested or production-validated.
