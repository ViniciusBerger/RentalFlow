# RentalFlow Brazilian Portuguese localization — Phase 1

## Included
- Brazilian Portuguese (`pt-BR`) is the application default. English remains selectable from sign-in, profile completion and the workspace header. The selection is saved per browser when localStorage permits; the HTML `lang` attribute follows the selected locale.
- All existing **implemented** pages are localized: sign-in, complete profile, dashboard, booking calendar/list, booking creation/edit/details/delete, navigation, buttons, empty/loading/error states.
- Dates and weekday/month names are localized without shifting date-only reservations across time zones; backend year/month labels are shown as readable months. Financial values remain Brazilian reais (BRL), regardless of interface language.
- Common backend error responses have Portuguese explanations; unknown technical errors are not shown verbatim to the client in pt-BR.
- No schema, migration, backend API, pricing or booking mutation was modified. Graphs and multi-property management are deferred to Phases 2 and 3.

## Automated tests and CI
- `frontend/tests/localization.test.cjs` checks translations, vocabulary parity, supported locales, persisted selection, date/currency formatting, error localization, and SSR of translated pages/forms.
- Existing test dispatcher now supports React context, and two tests directly invoking hook-based components were corrected to render through the dispatcher.
- The workflow `.github/workflows/ci.yml` now has an explicit localization regression check before running the existing frontend 95% coverage gate. Backend CI remains unchanged.
- Local `npm run lint`, `npm run typecheck`, `npm test`, and `npm run test:cov` were exercised. The Vite bundle is blocked here by the missing Linux Rollup native package from the supplied Windows dependencies, and should be verified on a clean GitHub Actions runner.

## Verification limitations
- Coverage thresholds are aggregate over imported/exercised modules, not a per-file guarantee and not browser E2E verification.
- Local testing uses the original Windows dependency archive and cannot prove real PostgreSQL, production Firebase or deployment readiness.
- Do not merge until the new PR's GitHub Actions workflow passes.
