# PR 4.2 — Contract Questionnaire: Release Gate

This PR enables an account-owned questionnaire, 16 editable original-contract clauses + Annex I, immutable publication, and property occupancy/rule configuration. It does **not** generate booking contracts, collect guest documents, finalize contracts or generate PDFs.

## Deployment preflight (manual, not CI)
1. Confirm production migration tracking and a verified restorable PostgreSQL backup.
2. Apply `0004_contract_foundations` and `0005_contract_security_guards` in order using the established Railway migration procedure. Validate all contract tables/triggers and existing booking counts. Do not run disposable CI scripts against production.
3. In Railway backend secret configuration, provision strong random encryption keys: `CONTRACT_DATA_KEYS` as a JSON object of version-to-base64 32-byte keys, and `CONTRACT_ACTIVE_KEY_VERSION` as the active version. Test key rotation/recovery; never commit secrets or include them in frontend Vite variables.
4. Keep `CONTRACT_DOCUMENT_DOWNLOADS_ENABLED` off and booking auto-contract generation off. Verify that `CSRF_TOKEN_ENFORCEMENT=true` works with authenticated browser requests once both services are live.
5. On staging, explicitly opt in with `CONTRACT_QUESTIONNAIRE_ENABLED=true` (backend) and `VITE_CONTRACT_QUESTIONNAIRE_ENABLED=true` (frontend build). Both are off by default.
6. Test two real isolated staging accounts: each sees only its own profile, templates, versions and property settings. Verify encryption at rest (no CPF/RG/address/PIX plaintext), sanitized logs, cross-account 404/403, CSRF rejection, and no-store responses.
7. Enter the client's **verbatim** approved 16-clause seasonal agreement and house rules into the editable draft. This source was not available in full in the planning files; the scaffold headings are editorial and never represent original approved wording.
8. Verify incomplete landlord details / invalid CPF / missing PIX or bank fields / unknown placeholder / missing 16th clause or annex all block publication; published versions are immutable and revisions create new versions.
9. Enable production only when legal wording has been supplied and reviewed, staging checks pass, and backup/secret/retention policy is approved.

## Constraints
- All landlord personally identifying information and bank details are stored in an account-associated encrypted column. Published template snapshots contain policy and payment defaults, **not** the decrypted landlord identity.
- Template and property house rules are plain-text JSON, NOT appropriate for CPF, RG, private addresses or bank identifiers. Use allowed placeholders.
- Property rental address is read from the existing Properties record and is shown as a requirement for later contract finalization, not silently overwritten.
- Frontend previews are **draft text only**, not final legal documents. Template publication does not prove an e-signature or legal validity.
- All booking and guest-data endpoints remain unchanged. Existing production bookings are not modified.
