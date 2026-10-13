# PR 4.5 — Secure finalization and unsigned archives

## Scope
A verified owner can request a server-prepared review token for a complete, published contract and explicitly confirm finalization. The backend reloads canonical account-owned booking, property, guest, landlord, clauses and installments inside the finalization transaction; it does **not** accept price, terms, identity or owner values in the finalize DTO. A token becomes invalid when reviewed source data changes. Draft saving and finalizing use the same account/contract advisory transaction lock.

The sealed final revision contains:
- A canonical encrypted UTF-8 snapshot of party identities, rental/property facts, pricing basis, installment terms, published template/version and fully resolved clauses.
- A separately encrypted finalized PDF generated with an embedded Noto Sans font, visible reservation facts, clauses, revision identity and finalization timestamp.
- AES-256-GCM authenticated encryption bound to account UID and revision ID, plus SHA-256 integrity digests; neither snapshot nor PDF is stored in plaintext.
- An append-only audit event without customer identity or document contents.

**Finalized does not mean signed.** The PDF and UI explicitly say this is an unsigned archive. No e-signature or proof of consent is created. The approved published clauses are supplied by the account; RentalFlow does not invent legal text.

## Default-off feature flags
- Backend: `CONTRACT_WORKSPACE_ENABLED=true` and `CONTRACT_FINALIZATION_ENABLED=true` to enable review/finalize routes.
- Backend: `CONTRACT_DOCUMENT_DOWNLOADS_ENABLED=true` to enable private download of finalized revisions.
- Frontend: `VITE_CONTRACT_WORKSPACE_ENABLED=true` and `VITE_CONTRACT_FINALIZATION_ENABLED=true` to display finalization actions.
- Previously defined Task 4.2 and 4.3 flags remain independent.
- Keep all flags OFF in production until the release gate is approved. No production secrets or flags are changed by this PR.

## Deployment and security
1. Apply additive migration `0008_finalized_contract_terms_guard.sql` **before** enabling finalization. It also fixes an old revision trigger that previously discarded allowed DRAFT → FINALIZED updates by returning OLD.
2. Store `CONTRACT_DATA_KEYS` and `CONTRACT_ACTIVE_KEY_VERSION` in server-managed secrets; retain old keys while older encrypted revisions exist. Verify backup restore and key rotation in staging.
3. Use the authenticated HttpOnly session, onboarding guard, global CSRF/origin checks, owner-filtered DB queries and DTO allowlisting. The backend controls all contract amounts, payment schedules, identity validation and template selection.
4. The database rejects modifications/deletion of finalized revisions, guest identity records and agreed installment terms, including through old endpoints. Received payment updates are permitted without rewriting the agreement.
5. Only authorized account owners can download archived PDFs through `GET /contracts/:contractId/revisions/:revisionId/pdf`; no public link, unsigned publication, guest-facing send or external PDF conversion is introduced. Responses are `private, no-store` with `nosniff`.
6. The frontend shows a separate server validation step and confirmation dialog; refreshing after finalization displays the stored clauses/pricing, not a re-render from changed profile settings.

## Automated gates
- Backend: lint, TypeScript, Jest and 95% configured domain/adapters coverage, e2e, Nest build.
- Disposable PostgreSQL: migrations 0000–0008; draft-to-finalized persistence, finalized row immutability, tenant foreign keys, finalized identity and installment guards, and continued receipt bookkeeping.
- Frontend: lint, TypeScript, localization/UI tests, 95% source coverage and production build.
- PDF tests: A4 final PDF creation with accented Portuguese and incomplete-clause rejection.

## Manual staging release gate (must pass before enabling production)
- Two separate accounts: cross-account contract ID guessing is 404 on review/finalize/detail/download; no metadata or PDF leakage.
- Concurrent draft edit vs review/finalize; stale/replayed token and repeated finalize fail; no partial DB writes or dual final revisions.
- Missing/wrong CPF, owner profile, published template, check-in/out time, invalid guest occupancy, unapproved payment method, mismatched totals/extra-guest charges, date/event conflict, received installments and unapproved request keys.
- PDF visually reviewed with real approved clauses, multi-page pagination, Portuguese accents and special characters. Reject glyph-loss, truncation, malformed PDFs, oversized files and log leaks. The bundled font subset is designed for Latin scripts; expand and verify supported scripts before authoring multilingual non-Latin contracts.
- Confirm encryption/key-rotation/backup recovery, private cache headers, incident procedures, retention/deletion requirements and LGPD review with the business owner.
- Verify compatibility with the 0007 linked-booking amendment guard; Task 4.6 still owns contract-aware booking modifications and cancellations.

**Never merge solely because CI passes.** Manual staging/privacy review and explicit product approval are required before activation.
