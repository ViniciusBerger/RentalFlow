# PR 4.4 — Private Contracts Workspace and Draft Review

## Scope and permission boundary
This phase adds a contracts workspace with server-scoped list/filter/detail, drafts-only guest and
installment updates, tenant-private HTML/plain-text and PDF previews, and revision history.
The source is a published version of the account's own contractual clauses. It does not create
legal wording, alter a booking price, mark an installment received, finalize a revision, or
publish/share a PDF.

## Feature gates (all off by default)
- Backend: `CONTRACT_WORKSPACE_ENABLED=true`
- Frontend: `VITE_CONTRACT_WORKSPACE_ENABLED=true`
- Task 4.2 template configuration and Task 4.3 booking contract creation remain separately gated.

Only activate in staging after prior migrations, encryption keys and CSRF settings are verified.
The workspace itself introduces no new migration. No production flags or secrets are modified
as part of the PR.

## Authorization and data processing
- All list/detail/edit/preview endpoints require verified HttpOnly session authentication and
  onboarding guard. Account UID originates exclusively from the server session.
- Listing intentionally shows at most 100 recent owner-account contracts. Search/status/property
  filters act within this bounded list.
- Guest CPF/RG/contact fields and contract source metadata remain AES-256-GCM encrypted at rest.
  PDF preview is generated on demand, never archived or transmitted to a public provider.
- GET responses use no-store headers; PDF is served privately with no-store and a large
  visible RASCUNHO warning. Client downloads are local blob URLs only.
- HTML rendering uses React text nodes, never dangerouslySetInnerHTML. The same server
  placeholder renderer produces HTML preview and transient draft PDF content.
- Only PATCH /contracts/workspace/:id/draft mutates, via account-locked DB transaction.
  Edits carry an editToken calculated from encrypted guest data, revision and payment rows.
  On stale token, reload rather than overwriting another session's work.
- DTO allowlists prevent setting userId, booking total, owner, revision status, receivedCents,
  paidAt, finalizedAt, stored PDF data, or template versions.
- Installments (1–12) must sum EXACTLY to unchanged server-recorded total; at most one deposit,
  no conflicting date/event, accepted payment methods enforced. Existing received payments block
  schedule rewrites. Audits include action/owner/contract ID but no raw guest details.

## Release checks
1. Confirm frontend and backend CI lint, typecheck, Jest/UI tests, 95% coverage threshold,
   Node integration tests, and disposable PostgreSQL migration/tenant protection suite pass.
2. In staging create two accounts, book a reservation in each, and verify that cross-account
   ID guessing yields 404 on detail, edit and preview with no leaked metadata.
3. Test token replay, simultaneous edits, invalid CPF strings in incomplete draft (draft stays
   incomplete), invalid due date, partial payments, received payments, installment sum mismatch,
   negative totals and unapproved extra keys. Confirm no partial DB writes.
4. Inspect PDF as an unsigned, visibly provisional preview. Verify WinAnsi/Latin text fidelity,
   pagination, no HTML execution, no public URL, response headers, and local blob URL expiry.
   Non-WinAnsi symbols are currently rendered as '?' in this provisional PDF; this is
   NOT suitable as the official signed/archived version. Task 4.5 needs a Unicode-capable
   production PDF renderer before finalized documents can be generated.
5. Confirm published template text and property/landlord/guest placeholders are validated on
   the backend. Incomplete drafts show [PENDENTE] rather than fabricated data.
6. Approve LGPD handling, retention/incident procedures, secure backups and feature activation.

## Explicit deferrals
- PR 4.5: finalization, cryptographic archive, archival PDF, versioning, immutable records.
- PR 4.6: contract-aware booking amendments/cancellations and regression controls.
- The 0007 mutation guard remains active for linked bookings; the workspace does NOT
  expose ordinary booking price/date/cancellation updates.
- No guest-facing distribution links, e-signature flow or automatic outbound document sending.
