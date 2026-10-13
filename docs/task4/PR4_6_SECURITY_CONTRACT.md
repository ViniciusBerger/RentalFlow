# Task 4.6: amendment and cancellation contract

Confirmed business requirements:
- Amendments may change dates, guests, property, price and installments; not legal party identity.
- Booking changes only after explicit landlord review and confirmation.
- Cancellation applies the landlord's agreed cancellation policy; automatically refund through a verified transaction provider, not through browser-chosen payment instructions.
- Preserve original contract, full revision/audit history, and release reserved dates only after approval.

Current implementation constraints discovered on main:
- Migration 0007 blocks direct updates/cancellations of ANY linked booking.
- Migration 0008 freezes guest identity and contractual installments when there is a finalized revision.
- Existing rental cancellation is a soft cancel, but the linked-contract trigger correctly rejects it.
- Installments have payment method and paid amount, but **no processor charge ID, refund capability, transfer destination, or payment-provider webhook** in RentalFlow.
- The questionnaire holds cancellationDays but has no percentage/retention rule for a late cancellation. General breach/damage penalties must not be reused as cancellation penalties.

Safety requirements:
1. Never let old booking edit/delete/cancel routes bypass existing database guards.
2. New proposal must be reviewed against authoritative backend price/occupancy/availability and last-version token under tenant lock. Keep existing reservation unchanged before confirmation.
3. An accepted amendment appends a new unsigned revision/addendum; never rewrite a finalized/signed PDF, and require fresh signature if prior document was signed.
4. All cancellation transitions, availability changes, financial entries, and audit events must be atomic in database; money transfers must use verified gateway IDs and independently idempotent, replay-safe refunds with reconciliation/retry/failed states. Never assert refund success before actual provider settlement.
5. Automatic refunds are NOT available from existing schema. Until a payment integration exists, fail closed for recorded funds. Do not mark a paid booking cancelled/released while refund outcome is unverified; use an explicit pending-refund workflow.
6. For cancellation outside the stated free-cancellation days, do not silently choose a penalty or refund percentage that is not written in the contract; require an explicit approved cancellation policy term.
7. All actions require server-side session UID, owner filtering, csrf on mutation, no sensitive DTO keys and tenant-isolation/concurrent-request tests.

Current branch provides the first validated financial/contract change domain rules and tests. The transactional workflow, provider-side refund execution and UI are outstanding. The pull request must remain draft until these have been implemented and all CI gates are green. No production flags changed.
