# Registration drafts — extra testing types (unverified)

Everything in this folder is a **draft**: written, reviewed by reading only, never run, never type-checked.
`*.draft.ts` files are **not** picked up by `npx playwright test` (only `*.spec.ts` / `*.test.ts` are), so they do not
change test counts or CI. Each file starts with a banner listing prerequisites and assumptions.

## Index

| # | Type | Draft | Prerequisites | Risk / safety |
|---|---|---|---|---|
| 1 | API fuzzing | `api-fuzzing/RegistrationApiFuzz.draft.ts` | `npm i -D fast-check`; OTP only for the profile-type property | sends many requests (cap `NUM_RUNS`); dev only |
| 2 | API contract | `contract/RegistrationApiContract.draft.ts` | captured fixtures in `data/registrationFixtures/` | read-only |
| 3 | Load / soak | `load/registration-load.k6.js` | k6 binary | **sends real OTPs** — dev only, backend sign-off, low VUs first |
| 4 | Config matrix | `config-matrix/RegistrationConfigMatrix.draft.ts` | none (mocked) | the config-endpoint URL patterns in `registrationUi.ts` are guesses |
| 5 | Email content | `notifications/RegistrationEmailContent.draft.ts` | Mailosaur configured **and** dev mail relay delivering | blocked until email delivery works |
| 6 | Idempotency / partial failure | `idempotency/RegistrationPartialFailure.draft.ts` | A: none; B: OTP + SQL/Mongo access | B consumes a pool identity |
| 7 | Release resume | `release-resume/RegistrationReleaseResume.draft.ts` | fixtures per release in `data/registrationFixtures/resume/<tag>/` | needs fixture capture |
| 8 | Web security posture | `web-security/RegistrationSecurityHeaders.draft.ts`, `zap-baseline.md` | Docker for ZAP | passive scan only; dev only |
| 9 | JWT tampering | `web-security/RegistrationJwtTampering.draft.ts` | structural cases none; claim cases need OTP | — |
| 10 | Privacy / PII | `privacy/RegistrationPiiExposure.draft.ts` | none (mocked) | storage-key names unknown, whole stores scanned |
| 11 | Supply chain / secrets | `supply-chain/README.md` | npm, Docker (gitleaks) | **`.env.dev` holds real credentials — rotate** |
| 12 | Real devices | `real-devices/devices.md`, `RegistrationMobileDevices.draft.ts` | WebKit install; BrowserStack for real devices | — |
| 13 | Hostile browser | `hostile-browser/RegistrationHostileBrowser.draft.ts` | Playwright ≥ 1.45 (`page.clock`) | CDP throttling is Chromium/Edge only |
| 14 | Localization | `localization/RegistrationLocalization.draft.ts` | none (mocked) | expected numeral handling is a product decision |
| 15 | Process | `process/` charters, usability + screen-reader checklist, flaky tracking, smoke tier, `RegistrationSmoke.draft.ts` | — | — |

## How to promote a draft
1. Read its banner; install the listed prerequisites; capture the listed fixtures.
2. Rename `X.draft.ts` → `X.spec.ts` and move it to the folder named in its banner (`security/`, `functional/...`, `ui/shared/`…);
   fix the relative imports (one or two `../` less).
3. Run it once with `npm run test:dev -- <path> --workers=1`, correct guessed selectors/status codes, then commit.
4. Delete the draft header and update the Excel/doc mappings if the spec carries manual-case ids.

## Related
- `docs/manual-test-cases/Registration-Backlog-Draft.md` — draft cases for the areas needing live backend or fixtures.
- Mock helpers these drafts rely on: `Registration/helpers/registrationMocks.ts`, `registrationApi.ts`.
