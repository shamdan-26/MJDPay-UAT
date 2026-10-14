# Login test suite

Business-portal sign-in: Form → Credentials → Validation card → OTP → Dashboard / Logout.
Run from the repo root (dev only): `npm run test:dev -- BusinessTestCases/Login/<path>`.

## Layout (layer first, login stage second — same convention as `Registration/`)

| Folder | What lives here |
|---|---|
| `functional/01-form/` | Button enable/disable matrix, mobile-field rules, password show/hide. |
| `functional/02-credentials/` | `LoginInvalidCredentials` (wrong company / mobile / password), `LoginAccountStatus` (not registered, locked, deactivated, AML), `LoginEdgeCases` (whitespace, 500, retry, field retention). |
| `functional/03-otp/` | `LoginOtp` (dialog, verify button, resend, cancel, wrong/correct OTP), `LoginValidationCard` (per-step checkmarks/spinner, no-card on failure). |
| `functional/04-session/` | `LoginHappyPath` (dashboard landing + logout), `LoginNavigation` (links, theme, already-authenticated redirect). |
| `ui/` | Static layout: `LoginPage` (elements, i18n, theme), `LoginValidationPopup` (card text). |
| `api/signin/` | Gateway endpoints 1-4 + full flow: `ip-address`, `devices/uuid`, `auth/signin`, `auth/verify/otp`. |
| `api/document-expiry/` | EMI-5836 / EMI-5969 NAFATH & WATHIQ expiry (409). Most cases are env-gated or `skip(true)` pending. |
| `non-functional/` | Performance (UI + API budgets), accessibility (axe, keyboard), visual regression. |
| `integration/` | Login ⇄ Admin Portal status changes. |
| `security/` | `LoginSecurity` — enumeration, XSS, POST-only, error leakage, **lockout (destructive, keep last)**. |
| `helpers/loginApi.ts` | Shared API headers + `signIn()`. UI/functional specs must not import it. |
| `LoginHelper.ts` | Accounts, OTP helpers, `gotoLogin`. Imported by ~25 other modules — keep the path stable. |

The admin OTP-configuration check (Login ⇄ Admin) lives in `../OtpAdminConfig/`.

## Tags
Every describe carries `@login`, a layer tag (`@functional @ui @api @security @integration`) and, for non-functional, `@performance @a11y @visual` and, for functional specs, a stage tag:
`@form @credentials @otp @session`.

```
npm run test:dev -- BusinessTestCases/Login --grep @otp          # one stage
npm run test:dev -- BusinessTestCases/Login --grep @security     # one layer
npm run test:dev -- BusinessTestCases/Login --list               # count without running
```

## Categories (business capability — the folders stay layer-first)
Coverage is read by capability; the full table with specs, manual sections and status is in `docs/test-plans/Login-Test-Plan.md` §5, and the duplicated-scenario owners are in the same section.
1. Login page and form · 2. Authentication (credentials) · 3. OTP and device verification · 4. Session and token lifecycle · 5. First login and password lifecycle · 6. Account status and lockout · 7. Security · 8. API contract · 9. Localization · 10. Non-functional.
New in `functional/`: `04-session/LoginTokenLifecycle.spec.ts` (498 sign-out, refresh-token TTL, OTP on every sign-in), `05-first-login/` and `06-pending/LoginPendingCases.spec.ts` (skipped placeholders, each with its blocker in the annotations). Direct `/auth/signin` calls used to get HTTP 412 on dev: the gateway validates `device-finger-print` (must match the `user-agent` and a registered device). `helpers/loginApi.ts` now builds it via `support/deviceFingerprint.ts` and `signIn()` works; the `api/signin` and `LoginApiSecurity` specs have not been re-run since the fix.

## Accounts (read before adding tests)
- `LOGIN_*` — happy-path account. Successful-login tests only. Never wrong-password / lockout.
- `NEGATIVE_*` — wrong-password / invalid-credential tests. Not locked out by the suite any more.
- `LOCKOUT_*` — used only by the lockout test; it really locks it; `afterAll` unlocks it via Admin Portal → Accounts → Business → details → Users tab (needs `ADMIN_*` env vars, already in `.env.dev`).
- `LOCKED_*`, `DEACTIVATED_*`, `AML_*`, `*_EXPIRED_*` — env-provisioned; dependent tests skip when unset.
- `firstLoginAccounts` (`data/testAccounts.json`) — registration-created accounts still on the default password `Aa#123456` (`FIRST_LOGIN_DEFAULT_PASSWORD`). Sign-in returns 200 and the OTP; after OTP `918512` the app forces `/business/auth/reset-password`. Used by `functional/05-first-login/`: `FirstLoginUi.spec.ts` (accounts 0–4, one per worker for the form cases, never consumes one), `FirstLoginEndToEnd.spec.ts` (opt-in `FIRST_LOGIN_E2E=1`, consumes the account at `FIRST_LOGIN_E2E_INDEX`, default last, and sets the password to `Aa#1234567`), and `FirstLoginProbe.spec.ts` (opt-in `FIRST_LOGIN_PROBE=1`, re-checks which accounts are still first-time). A direct `signIn()` API call gets an empty 412 on dev for every user, so these specs sign in through the browser.

## Known weaknesses (not yet fixed)
1. ~~Lockout vs parallel files~~ — fixed: lockout now uses the dedicated `LOCKOUT_*` account and skips when it is unset.
2. ~~Vacuous security assertions~~ — fixed: they now capture the real `/auth/signin` response.
3. **Duplicates**: "login form displays / button disabled on load" appear in `ui/LoginPage`, `01-form` and `LoginHappyPath`;
   steps 1-3 text of the validation card is in `ui/LoginValidationPopup` and again in `LoginValidationCard`.
4. `LoginHappyPath` repeats a full login per dashboard widget (5 logins for 5 element checks) — one login + several assertions is enough.
5. Two permanent `test.skip` (whitespace-only password, redirect-when-OTP-disabled) — decide: fix or delete.

## Coverage added (second pass)
| Type | Files |
|---|---|
| Functional | `01-form/LoginFormKeyboard`, `02-credentials/LoginErrorHandling` (mocked 4xx/5xx/network/double-click/hostile input), `02-credentials/LoginAccountStates` (env-gated + registration-created accounts sign in), `03-otp/LoginOtpEdgeCases`, `04-session/LoginSessionLifecycle` |
| API | `api/signin/LoginApiContract` (shapes/types/JWT), `api/signin/LoginApiLocalization` (en_uk / ar_sa, stable codes) |
| Security | `security/LoginApiSecurity` (injection, type confusion, malformed bodies, headers, CORS, JWT tamper/alg=none, repeated attempts), `security/LoginSessionSecurity` (URL/console/storage/cookie leaks, tampered token) |
| Performance | `non-functional/LoginPerformance` (LCP, CLS, long tasks, weight, slow 3G, toast latency), `non-functional/LoginApiPerformance` (latency p95, concurrency, degradation, timing-leak guard) |
| Accessibility / Visual | `non-functional/LoginAccessibility` (axe + keyboard + zoom), `non-functional/LoginVisualRegression` (EN/AR × light/dark × desktop/phone) |
| UI | `ui/LoginResponsive`, `ui/LoginLocalization` (RTL, persistence, dark scheme) |
| Integration | `integration/LoginAdminStatusIntegration` (admin deactivate/activate → login), `02-credentials/LoginAccountStates` (registration-created accounts) |
| Helpers | `helpers/loginMocks` (gateway mocks), `helpers/loginSession` (`loginToDashboard`, `loginToOtpDialog`) |

### Env vars used by the new specs (all optional; the dependent tests skip when unset)
`LOCKOUT_*` (lockout) · `PENDING_*`, `REJECTED_*`, `EXPIRED_PW_*` (account states) · `INTEGRATION_COMPANY/MOBILE` (admin status integration) ·
`ADMIN_*` (already in `.env.dev`).
Install `@axe-core/playwright` (dev dependency) to enable the axe scans; run the visual spec once with `--update-snapshots`.

## Still open (needs product input or provisioning)
Idle-timeout redirect (needs the configured timeout), deep-link return-to-page (marked `fixme` until product confirms), single- vs multi-session
policy (recorded as an annotation, not asserted), API rate-limiting thresholds (observed and annotated), password-expiry accounts.
