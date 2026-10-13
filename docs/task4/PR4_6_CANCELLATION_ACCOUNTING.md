# Task 4.6a — Contract-linked cancellation and reporting

## Explicitly confirmed behavior
- Cancellation removes the booking from active dashboard revenue/profit, monthly and yearly financial analytics, property financial analytics and active booking counts in the **original check-in month**.
- Cancellation is blocked at or after the saved property's check-in time, evaluated in the existing Brazil/São Paulo civil timezone. Missing check-in settings fail closed, and the rule is rechecked inside confirmation transaction.
- Finalized booking amendments take effect only after the landlord explicitly confirms (no guest signature gate on the booking state). This is not equivalent to a signed amended legal document.
- No actual money is handled by RentalFlow: recorded receipts remain as historical facts, and cancellation does not issue refunds or transfer funds.
- The original contract, finalized versions, payment schedule, receipts and identity records are never rewritten or hard-deleted.
- Prior user decision: any material amendment to a finalized contract requires warning, explicit creation of an amendment and preservation of the original. This PR does not invent an amendment activation, guest approval, fee penalty or refund rule.

## API and safety
- Existing contract workspace plus new default-OFF backend gate `CONTRACT_CANCELLATIONS_ENABLED=true`, frontend `VITE_CONTRACT_CANCELLATIONS_ENABLED=true`.
- GET `/contracts/workspace/:id/cancellation-review` computes HMAC token bound to session UID, booking dates, guest name, property, costs, financial amounts, revision and recorded payments; returns only numeric amounts, dates, revision/status and review token.
- POST `/contracts/workspace/:id/cancel` requires `{reviewToken,confirm:true}`, session auth, onboarding and global CSRF/origin guard. Server reloads owner-scoped booking, obtains account/contract advisory lock and row locks, rechecks HMAC, writes immutable cancellation record and sets `rentals.is_active=false` in one transaction. Idempotency is fail-closed: repeated cancellation returns conflict, no double accounting.
- Database migration 0009 tightens previous contract booking guard (including profit), and allows ONLY active→inactive while a matching immutable authorization record with SAME PostgreSQL transaction ID, tenant, contract and exact original amounts exists.
- Existing legacy update/delete/cancel endpoints remain unable to mutate protected contract booking facts.
- `contract_cancellations` records no guest identity, message bodies or bank/payment secrets; audit logs only actor, target and action.
- Contract workspace retains the original revision status and immutable archive while separately displaying `cancelled` and preventing cancelled drafts from being edited/finalized.
- Transaction succeeds before refreshing the shared dashboard store. The backend existing active-only balance and rental queries exclude the booking; property analytics defensively skip inactive bookings.

## Operations
1. Apply 0009 migration before enabling backend flag. Never enable on an outdated database.
2. Run GitHub CI, especially disposable PostgreSQL migration/cancellation tests, tenant leak tests, stale token/recorded receipt tests and React cancellation review/confirmation tests.
3. Stage a booking with a finalized PDF and partially received installment; confirm it remains downloadable, audit rows append, active totals drop once, and a new booking can use released dates after cancellation.
4. Independently confirm accounting of contractual cancellation penalties, paid deposits, refunds and who must approve a post-finalization amendment before implementing those business transitions. No automatic money movement or unapproved price adjustment.

## Unconfirmed amendment business rules
Supported fields: dates, guest count, property, base price/extra guest surcharge and an explicitly entered installment plan. No legal party-identity changes, no booked-receipt reconciliation, no automatic penalties/refunds and no post-check-in retrospective amendment. Those require separate approved business rules. Existing mutation guards stay ON until explicitly decided.