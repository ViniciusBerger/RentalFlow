# Task 4.6c — CPF and CNPJ landlord identity

## Compatibility
- Existing sealed profiles without documentType continue as CPF individuals with existing CPF/RG fields. No migration, encryption-key change or production flag is needed.
- New accounts may choose individual CPF (with RG), or corporate landlord CNPJ (with legal company name and an authorized representative's name, CPF and role).
- Brazilian alphanumeric CNPJ has been in production since July 2026. Backend validates numeric and A–Z identifiers of fourteen positions with final two modulo-11 numeric check digits per Receita Federal ASCII-48 algorithm. This does NOT verify active registry or signer authority.
- Changing landlord type discards inactive identity form fields in newly saved encrypted profiles. Finalized archives are immutable.
- Identifying data remains encrypted in tenant-owned profile. Readiness only returns missing field names.

## Documents
- Existing individual templates using locador.nome / locador.cpf / locador.rg continue unchanged.
- Neutral/corporate placeholders: locador.documento, locador.cnpj, locador.razao_social, locador.representante, locador.representante_cpf, locador.representante_cargo.
- A corporate profile with a template still referencing locador.cpf remains incomplete and cannot be finalized. Owner must approve appropriate company wording; software never rewrites legal text.
- Finalized PDF identifies correct CPF/CNPJ and the corporate representative and role. All documents remain UNSIGNED.
- An identity number and listed representative do not authorize automatic electronic signing.

## Release checks
1. Full GitHub frontend/backend CI and coverage.
2. Legacy CPF profile, numeric CNPJ, alphanumeric CNPJ sample 00.000.000/E08G-12, invalid documents, type changes and schema validation.
3. Check corporate templates, no leaked data in audit, private PDF, bilingual interface, and readiness warnings.
4. Legal/LGPD review and explicit signer verification before any future signature automation.
