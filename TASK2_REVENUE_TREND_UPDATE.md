# Task 2 follow-up: revenue trend chart

## UI change

- Replace the previous bar-only primary visualization with a smooth, green, marker-based revenue line and subtle area fill.
- Display **bookings as pale background bars** using a separately labelled right count axis; revenue uses a BRL left axis. No mixing numerical units.
- Real monthly data from the existing authenticated `/balance/monthly` API. No demo/mock values or new DB changes.
- Start on **booked revenue**; let the user switch the line to profit or booking count. Count mode hides the redundant bars.
- Show localized month labels, keyboard/mouse month-point tooltips, and existing busy/quiet month analysis. Mobile chart supports horizontal scrolling.
- Year selector intentionally labels the **current calendar year** rather than falsely promising last 12 rolling months: the backend currently only returns the current year.
- Currency continues to mean *booked rental value assigned to the check-in month*, not cash collected, matching the previously implemented backend rule.

## Testing and CI

- Frontend behavioral tests: **174/174 passed**.
- Frontend measured-source coverage: **99.00% statements/lines, 95.91% branches, 97.51% functions**. These are aggregate gates over selected source modules, not per-file guarantees.
- New geometry and UI interaction tests include zero months, negative profits, empty data, separate axes, real currency formatting, mouse/keyboard focus, and the three metric modes.
- TypeScript and ESLint: passed.
- CI retains the explicit Task 2 chart test step, 95% aggregate coverage thresholds, smoke checks, and production build.
- Backend, booking timeline, and existing accounting queries are unchanged in this follow-up.
- Hosted CI and real-browser chart QA still required before merging.
