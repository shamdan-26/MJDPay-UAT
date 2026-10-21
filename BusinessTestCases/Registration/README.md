# Registration test suite

Business-portal merchant sign-up: Mobile → OTP → Business Info → Financial → Verification → Nafath → Products → Contract → Confirmation.
Run from the repo root (dev only): `npm run test:dev -- BusinessTestCases/Registration/<path> --workers=1`.

## Layout (layer first, wizard step second)

| Folder | What lives here |
|---|---|
| `functional/01-entry … 08-confirmation/` | Behaviour per wizard step. `02-business-info/fields/` has one spec per field (profile type, CRN, National ID, email, Next-button logic). |
| `functional/journeys/` | Cross-step flows: E2E happy path, fixed-merchant auto-approve, resilience, **resume** (`ResumeFromInfo`, `ResumeStateTable`). |
| `ui/01-entry … 08-confirmation/` | Elements and layout (`*Page`, `*Shell`, `*Form`) and mocked screen states (`*States`) per step. `ui/shared/` = wizard chrome. |
| `non-functional/` | Accessibility (axe), performance budgets, visual regression. |
| `api/` | `RegistrationAPIFlow` (serial 22-endpoint chain, shares session state — keep whole), `RegistrationLookups`, `RegistrationSessionRefresh`. |
| `security/` | `RegistrationApiSecurity` (gateway: auth, validation, brute force, replay) and `RegistrationInputSecurity` (browser inputs). |
| `integration/` | Admin portal ↔ registration (account listing). The admin OTP-configuration check is shared: `../OtpAdminConfig/`. |
| `helpers/` | Shared code behind the `RegistrationHelper.ts` barrel — import from the barrel, not the files. |
| `drafts/` | Unverified extra test types (`*.draft.ts`, not run by the suite). See `drafts/README.md`. |

Page objects live in `BusinessTestCases/pageElements/Registration/`.

**Test-case catalog:** [`TEST-CATALOG.md`](TEST-CATALOG.md) lists every case grouped by type (functional, UI/UX, API, security, integration, accessibility, performance, visual) → wizard step → file. Regenerate after adding specs: `node ../../scripts/registration-catalog.mjs TEST-CATALOG.md` (from this folder).

## Tags
Every top-level describe carries `@registration` (nested describes inherit it), a layer tag (`@functional @ui @api @security @integration`) and, for step specs, a step tag:
`@entry @business-info @financial @verification @identity @products @contract @confirmation @journey`.
Extra: `@a11y @performance @visual`.

```
npm run test:dev -- BusinessTestCases/Registration --grep @financial   # one step, all layers
npm run test:dev -- BusinessTestCases/Registration/functional     # one layer
npm run test:dev -- BusinessTestCases/Registration --list         # test count without running
```

## Helpers (`helpers/`) — one file per concern, all re-exported by `RegistrationHelper.ts`
| File | Concern |
|---|---|
| `registrationConfig` | URLs, fixed Mailosaur email, shared valid IBAN/VAT/upload file |
| `registrationAssets` | Identity pools (citizen/resident/dedicated/mobile-reuse/UAT-OTP), worker partitioning, used-flag persistence |
| `registrationOtp` | Fixed OTP + `fillOTP` |
| `registrationSteps` | Real drivers up to Verification: `goToInfoStep`, `fillBusinessInfo`, `goToFinancialStep…`, `goToVerificationStep`, form fillers |
| `registrationLateSteps` | Real drivers for Products / Contract (NAFATH cycling lives here) |
| `registrationUi` | UI interaction helpers: PoS card/form, `selectRandomOption` |
| `registrationMocks` | Route stubs + `goTo*Mocked` drivers (no OTP, no pool identity) |
| `registrationApi` | Gateway base/headers, `postRegistration`, `openRegistrationSession` |
| `registrationDb` | SQL/Mongo reads |
| `infoStepForm` | Business-Info selectors/regexes + `gotoTab1`/`fillTab1*` used by the `02-business-info` specs |

Rule: import from the barrel. The one exception is API-only specs, which import `helpers/registrationApi` directly so they don't load UI code.

## Conventions
- Mock-driven specs (`goTo*Mocked`) need no OTP and burn no pool identity; prefer them for read-only checks.
- Specs that share one expensive wizard climb (`beforeAll`, serial) keep their order — do not split them
  (`RegistrationVerificationUploads`, `RegistrationAPIFlow`).
- Spec name = `Registration<Step><Topic>.spec.ts`; the folder already says the layer, so no `Functionality` suffix.
