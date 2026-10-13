# Registration test suite

Business-portal merchant sign-up: Mobile → OTP → Business Info → Financial → Verification → Nafath → Products → Contract → Confirmation.
Run from the repo root (dev only): `npm run test:dev -- BusinessTestCases/Registration/<path> --workers=1`.

## Layout (layer first, wizard step second)

| Folder | What lives here |
|---|---|
| `functional/01-entry … 08-confirmation/` | Behaviour per wizard step. `02-business-info/fields/` has one spec per field (profile type, CRN, National ID, email, Next-button logic). |
| `functional/journeys/` | Cross-step flows: E2E happy path, fixed-merchant auto-approve, resilience, **resume** (`ResumeFromInfo`, `ResumeStateTable`). |
| `ui/01-entry … 07-contract/` | Elements and layout (`*Page`, `*Shell`, `*Form`) and mocked screen states (`*States`) per step. `ui/shared/` = wizard chrome. |
| `non-functional/` | Accessibility (axe), performance budgets, visual regression. |
| `api/` | `RegistrationAPIFlow` (serial 22-endpoint chain, shares session state — keep whole), `RegistrationLookups`, `RegistrationSessionRefresh`. |
| `security/` | `RegistrationApiSecurity` (gateway: auth, validation, brute force, replay) and `RegistrationInputSecurity` (browser inputs). |
| `integration/` | Admin portal ↔ registration (account listing). The admin OTP-configuration check is shared: `../OtpAdminConfig/`. |
| `helpers/` | Shared code behind the `RegistrationHelper.ts` barrel — import from the barrel, not the files. |
| `drafts/` | Unverified extra test types (`*.draft.ts`, not run by the suite). See `drafts/README.md`. |

Page objects live in `BusinessTestCases/pageElements/Registration/`.

## Tags
Every describe carries `@registration`, a layer tag (`@functional @ui @api @security @integration`) and, for step specs, a step tag:
`@entry @business-info @financial @verification @identity @products @contract @confirmation @journey`.
Extra: `@a11y @performance @visual`.

```
npm run test:dev -- BusinessTestCases/Registration --grep @financial   # one step, all layers
npm run test:dev -- BusinessTestCases/Registration/functional     # one layer
npm run test:dev -- BusinessTestCases/Registration --list         # test count without running
```

## Helpers (`helpers/`)
`registrationConfig` (URLs, email) · `registrationAssets` (shared identity pools — see the pool notes before adding tests)
· `registrationOtp` · `registrationSteps` / `registrationLateSteps` (real wizard drivers `goTo*Step`) · `registrationMocks`
(OTP-bypass and resume-state mocks: `goTo*Mocked`, `mockProfileType`) · `registrationApi` (gateway base/headers) ·
`registrationDb` (SQL/Mongo reads) · `registrationUi` · `infoStepForm`.

## Conventions
- Mock-driven specs (`goTo*Mocked`) need no OTP and burn no pool identity; prefer them for read-only checks.
- Specs that share one expensive wizard climb (`beforeAll`, serial) keep their order — do not split them
  (`RegistrationVerificationUploads`, `RegistrationAPIFlow`).
- Spec name = `Registration<Step><Topic>.spec.ts`; the folder already says the layer, so no `Functionality` suffix.
