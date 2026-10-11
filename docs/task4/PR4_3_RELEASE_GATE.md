# PR 4.3 — Booking-linked contract draft release gate

## Scope
When explicitly enabled, POST /rental/add atomically writes one owned reservation, linked contract,
DRAFT revision, encrypted guest identity (if supplied), installment schedule (unpaid by default),
an encrypted pricing/override provenance snapshot, audit record and idempotency outcome.
The backend alone computes extra guest rates from property occupancy policy and applies approved
waiver/adjustment reasons. Legacy API response fields are retained.

It does NOT finalize/sign contracts, prove payment, produce PDFs, send documents, or enable
multi-party/tenant sharing. These require later Task 4.4/4.5 approval. DRAFT metadata is not a
final contract snapshot.

## Flags (both OFF by default)
- Railway backend: CONTRACT_BOOKING_DRAFTS_ENABLED=true.
- Frontend build: VITE_CONTRACT_BOOKING_DRAFTS_ENABLED=true.

Enable only together on staging after successful migrations/keys. Never turn only the
backend flag on while old clients are still creating bookings: the backend will correctly reject
old create payloads when switched on because it must never bypass draft creation.
The normal booking path is preserved with the backend flag OFF.
The questionnaire flags may additionally be required to let admins edit property rules.

## Preflight and security sign-off
1. Back up and VERIFY production PostgreSQL restore; confirm actual migration history.
   Apply 0004, 0005, 0006, then 0007. The 0007 database trigger blocks all legacy updates
   to material rental terms (including cancel/delete) when a contract exists, even in DRAFT.
   Contract-linked bookings must be amended only by a later audited contract-aware operation.
2. Provision CONTRACT_DATA_KEYS and CONTRACT_ACTIVE_KEY_VERSION as documented for PR 4.2,
   exclusively on Railway backend. Do not put keys in Git, frontend, logs or CI artifacts.
   Never overwrite/rotate keys without a documented replay/reencryption plan.
3. Run CI: frontend/backend lint, typecheck, coverage gates >=95%, Node/HTTP unit tests,
   and disposable PostgreSQL migrations/tenant/immutability tests. Never point fixture DB
   scripts at production.
4. In staging with two distinct sessions/accounts, verify property owner isolation;
   unauthorized property IDs yield 404 and no inserts; owner-configured maximum
   occupancy is enforced; surcharges are per person per night, rounded in integer cents.
5. Check WAIVED and ADJUSTED require an owner-session, a reason, valid amounts, and audit
   metadata. The client cannot submit confirmed payment/receipt: receivedCents starts at 0.
   Check installments sum EXACTLY to the backend-calculated booking amount. Review POST /rental/quote totals and confirm changing prices are rejected on POST /rental/add.
6. Verify malformed guest fields, invalid ISO dates, nested unknown keys, old/duplicate
   request keys, pricing mismatch, and simultaneous retries fail safely. Same-key replay
   must return the same rental/contract without duplicates. A unique key cannot be reused
   for a different payload. An account cannot read or edit another account's draft.
7. Verify encryption at rest: no CPF, RG, guest address/contact, override justification,
   financial metadata or keys in plaintext guest/revision fields or logs. Verify GCM
   tamper detection and AAD cross-account swapping rejection.
8. Test browser trusted-Origin, CSRF_TOKEN_ENFORCEMENT, disabled feature path,
   mobile/desktop bilingual booking UI and property questionnaire access.
9. Have the controller/owner approve LGPD basis, retention, deletion response, restricted
   operator access, and incident procedures before collection of production guest data.
10. Do not enable CONTRACT_DOCUMENT_DOWNLOADS_ENABLED, PDF generation or contract
    finalization just because Task 4.3 creates drafts.

## Known intentionally incomplete behavior
- No contract-aware editing/cancellation endpoint yet: 0007 protects data integrity by
  rejecting legacy term changes for linked contracts until Task 4.4 implements a controlled
  amendment workflow. This may be a product limitation during staged testing.
- No full multi-installment editing UI yet. The API can validate 1–12 installments, while
  the current form starts a single unpaid installment for the calculated total.
- The booking form shows base price; the server returns final total and charged extra guest
  fees. A pre-submit, backend-calculated quote now shows the base, calculated surcharge, charged surcharge, and total. Saving requires the reviewed `confirmedTotalCents`; the transaction recalculates and rejects stale prices.
- Draft guest data may remain incomplete and requires validated data and reviewed published
  legal text before future finalization. Template clauses are never invented.
- The 24h idempotency expiry timestamp is not an automatic key-reuse rule; the unique
  record remains to prevent duplication. A key rotation can invalidate a replay fingerprint
  until reconciled; preserve old keys and avoid rotations during active requests.
