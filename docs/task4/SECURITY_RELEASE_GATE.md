# Task 4 security release gate — batch PR

This PR creates shared enforcement utilities and mitigates pre-existing risks. **It does not claim that future contract endpoints are secure before they exist and are reviewed.**

## Current design guarantees
- Contract PII is never intentionally stored in plaintext by the sealed-data helpers. AES-256-GCM uses unique nonces, per-record authenticated associated data containing owner/resource/kind, SHA-256 integrity checking and explicit key versions.
- The private PDF reader scopes the SQL query by authenticated account, contract ID, revision ID and finalized state **before** decrypting; encrypted bytes are returned only as attachment with no-store headers.
- Contract documents endpoint is OFF by default and requires `CONTRACT_DOCUMENT_DOWNLOADS_ENABLED=true`, which must not be set until real PDFs, encryption keys, migration history and access tests are verified.
- The pricing/CPF/installment validators run on the server. Future contract creation and finalization MUST call these functions; do not trust frontend calculations or status indicators.
- Database migration 0005 denies silent changes to finalized rental terms through legacy APIs and makes audit events append-only.
- Session-bound CSRF tokens are generated from the HttpOnly cookie and must accompany all authenticated writes. Trusted-Origin/Fetch-Metadata rules remain in place.
- Per-process request limiting guards mutations, sign-in and PDF retrieval; this is not a replacement for distributed limits at the reverse proxy/WAF.

## Required production configuration / operational controls (manual; cannot be verified by CI)
1. Take and VERIFY a restorable PostgreSQL backup, review Drizzle migration history and apply **0004 and 0005 in order** on production before enabling contract code. Never run CI fixtures against production.
2. Provision `CONTRACT_DATA_KEYS` as a JSON object mapping key versions to independently generated 32-byte base64 secrets; provision `CONTRACT_ACTIVE_KEY_VERSION` as an existing version. Keep secrets in the Railway secret manager and **outside** Git, logs, database and backups. Keep prior keys while their ciphertext exists; rehearse rotation/restoration.
3. Verify provider-managed disk, Postgres backup, TLS and secret-store encryption; limit DB credentials and operator access. Do not assume encryption at rest or backup retention from this PR.
4. Set `CONTRACT_DOCUMENT_DOWNLOADS_ENABLED` only after reviewing the PDF generation/storage integration. No public bucket or public document URL.
5. Because frontend and backend deploy independently, use a two-step CSRF rollout: merge with `CSRF_TOKEN_ENFORCEMENT` **unset/false** (the existing Origin protection remains mandatory), wait for BOTH Railway services to succeed, verify login and writes, then set `CSRF_TOKEN_ENFORCEMENT=true` in backend environment and redeploy. Do not leave it disabled as the final security state. During the temporary rollout, the new frontend only falls back to Origin-only protection if the old API responds 404 to the CSRF endpoint; it never falls back on 401/403 or server errors.
6. Set upstream edge/WAF rate limits for all public auth and document endpoints (in-process limits are per replica). Verify frontend/backend origins in production and rollback behavior.
7. Approve LGPD data minimization, access, corrections, retention schedule, lawful processing basis, incident response and encrypted backup deletion policy with the controller/owner. Avoid indefinite storage without an adopted policy.
8. Do an authenticated smoke test: login, logout, profile, add/update/cancel/delete booking, property CRUD, CSRF rejection, two-account access isolation and document 404 behavior.
9. Keep contract creation/finalization feature disabled until the full flow enforces: owner-scoped SQL, finalization field validation, approved template, price/waiver validation and audit, cent-exact installments, secure text-only clause rendering, idempotency, immutable snapshots/PDF, controlled amendment transaction and signed-off tests.

## Known limitations
- Current records in `rentals` contain non-sensitive guest first/last names in plaintext from the older feature; this batch does not rewrite historical records.
- `contract_templates` and settings may contain text; never include CPF, RG, street-address or banking secrets inside clauses or policy JSON. Those go into AES-sealed columns.
- A full application-level automated deletion/retention workflow is intentionally not enabled while legal retention requirements are undecided.
- SHA-256 detects accidental/plaintext inconsistency but **does not replace** GCM authentication. Both are checked.
- Database administrators and encryption key custodians are privileged; tenant-scoped application queries and constraints do not protect against full DB administrator + key compromise.
