# Test Plan — Login

| | |
|---|---|
| **Module** | Business Portal Login (company + mobile + password, validation card, OTP, first-login password change, session and token) |
| **Environment** | Dev only (`ENV=dev`) |
| **Manual suite** | `docs/manual-test-cases/Login.md` — 170 cases (P1 71 / P2 71 / P3 28), LG-01 to LG-170 |
| **Automated suite** | `BusinessTestCases/Login/` — about 40 specs, ~330 `test(` blocks (counted by grep; data loops multiply at runtime; conditional and env-gated skips included) |
| **Status** | Updated 2026-10-14 (first-login, token lifecycle, categories and pending cases added; earlier draft was stale) |

## 1. Purpose & scope

Verify that a business user can authenticate securely and that every failure path is safe, generic and recoverable.

**In scope**
- Login page UI/layout and localization controls (EN/AR, theme).
- Form validation and Log In button state (mobile: 9 digits, starts with 5, no leading 0).
- "Just a moment..." validation card and OTP dialog.
- Happy path to dashboard, logout, already-authenticated redirect.
- Invalid credentials and account states (locked, deactivated, AML, unregistered, pending, rejected).
- **First login**: default password `Aa#123456` forces the reset screen after the OTP (EMI-2191).
- **Session and token lifecycle**: HTTP 498 handling, refresh-token lifetime, OTP on every web sign-in, single active session.
- Navigation (Forgot Password, Sign Up, logo, theme).
- Security: anti-enumeration, XSS, POST-only sign-in, no stack traces, lockout, token tampering.
- API contract: `GET /devices/ip-address`, `POST /devices/uuid`, `POST /auth/signin`, `POST /auth/verify/otp`.
- NAFATH / WATHIQ data-expiry blocking and renewal (EMI-5836, EMI-5969).
- Non-functional: accessibility, performance, visual regression.
- Admin check that the LOGIN OTP operation is locked on (shared `OtpAdminConfig/OtpAdminConfig.spec.ts`, `--grep @login`).

**Out of scope**: the Forgot Password flow itself (own module), Registration flows, admin-portal login UI beyond the OTP-config check, mobile-app device trust (manual only, section P).

## 2. References

- `docs/manual-test-cases/Login.md` (also `ALL-TEST-CASES.md`), `WRITING-TEST-CASES.md`
- `docs/business-knowledge/EMI-Business-Rules-part1-core-modules.md` (login, lines 33–47), `part2` (passwords, lines 150–159), part 5 (session management)
- `docs/QA-DATA-TESTID-HANDOFF.md` §4.1 (`login-username`, `login-password`, `login-password-toggle-visibility`, `login-submit`). The reset-password screen testids (`reset-password-current`, `-new`, `-confirm`, `-submit-btn`) are used by the specs but not yet documented there.
- Jira: EMI-5836, EMI-5969, EMI-2191, EMI-2042/2043, EMI-4625, EMI-200 (EMI-5964, EMI-6024, EMI-6050 are cited by the earlier draft only)

## 3. Business rules under test

| Rule | Source | Automated by |
|---|---|---|
| Web login always requires OTP; no trusted-device mode, no biometric | Business rules part 1 (EMI-4625) | `LoginTokenLifecycle` LG-TOK-03 |
| Business login = company number + mobile (+966) + password | Business rules part 1 | Form, credentials and API specs |
| Single-device policy: login on a new device force-logs-out other sessions (SAMA CSF 3.1) | Business rules part 1 | **Not yet** — pending LG-160 (`LG-SESS-08` only records the outcome) |
| 3 consecutive failures → temporary lock; 3 temporary locks → deactivation | Business rules part 1 | Only the 3-failure lock (LG-105, gated); escalation pending LG-163 |
| Error messages for account status / AML / unknown company vs mobile must be generic | Business rules, section I | `security/*` |
| Login, OTP and logout events audited, retained 10 years | Business rules part 1 | **Not yet** — pending LG-166 |
| NAFATH expiry deactivates the **user**; WATHIQ expiry deactivates the **profile** | EMI-5836 clarification (2026-07-16) | `api/document-expiry` (gated; TTL cases pending) |
| First login: default password forces a reset screen before anything else; policy 8–20 characters, lowercase, uppercase, digit, special | EMI-2191, EMI-125/124 | `05-first-login/*` (LG-FIRST-01 to 21) |
| A password change forces an immediate logout | EMI-200 | `FirstLoginEndToEnd` (LG-FIRST-20) |
| Refresh token lives exactly 1 minute longer than the access token | EMI-2042 | `LoginTokenLifecycle` LG-TOK-02 |
| An invalid token returns HTTP 498 and the client signs out with "Session expired. Please log in again." | EMI-2042/2043 | `LoginTokenLifecycle` LG-TOK-01 |
| Last 3 passwords cannot be reused; password policy is admin-configurable | EMI-2191 | **Not yet** — pending LG-154 |

**Unspecified — need business confirmation:** lockout duration and unlock mechanism, session/idle timeout, whitespace handling in the login password, OTP expiry/attempt/resend limits, which message the app shows when the new password equals the default.

## 4. Test strategy

Folders are organised **layer first** (so existing tooling and the ~25 modules importing `Login/LoginHelper.ts` keep working). Coverage is reported **by business capability** (§5).

| Lane | Folder | Purpose |
|---|---|---|
| UI | `Login/ui` | Elements, layout, validation card, localization, responsive |
| Functional | `Login/functional/01-form … 06-pending` | Behaviour through the browser, by login stage: form, credentials, OTP, session, first login, pending |
| Shared | `OtpAdminConfig/` | Admin-portal OTP configuration lock |
| API | `Login/api/signin`, `Login/api/document-expiry` | Contract, negative and security checks without the UI |
| Security | `Login/security` | UI security, API security, session security |
| Integration | `Login/integration` | Admin deactivate/reactivate against sign-in |
| Non-functional | `Login/non-functional` | Accessibility, performance (UI and API), visual regression |
| Manual | `Login.md` | Cases not automatable or not yet automated |

**Sign-in from specs:** a direct API call to `/auth/signin` used to get an empty **HTTP 412** from the dev gateway for every user. Cause found 2026-10-14: the gateway validates the `device-finger-print` header — a structured value (device uuid, User-Agent, registered device id, the web app's constant id, a SHA-256 digest) that must agree with the request's `user-agent` header and name a device registered through `POST /devices/uuid`. `Login/helpers/loginApi.ts` now builds it (`support/deviceFingerprint.ts`), registers the device if the gateway says `DEVICE_DOES_NOT_EXIST`, and `signIn()` / `commonHeaders()` work again (happy account 200, unknown mobile 404, wrong password 403). The `api/signin` and `LoginApiSecurity` specs have **not been re-run since the fix** — run them once to confirm (§10 risk 9). Specs that need a browser session still sign in through the page.

**Priority policy:** P1 — every build / before release; P2 — regression cycle; P3 — cosmetic, opportunistic.
**Tagging:** specs carry `@login` + lane tag and `feature`/`layer` annotations; first-login specs add `@first-login`, pending cases `@pending`. There is no `@smoke` or priority tag yet (see §11).

## 5. Coverage by business capability

| # | Category | What it answers | Specs | Manual sections | Status |
|---|---|---|---|---|---|
| 1 | Login page and form | Is the screen right and does the form validate? | `ui/LoginPage`, `ui/LoginValidationPopup`, `01-form/*`, `ui/LoginResponsive` | A, B, C (card UI) | Automated |
| 2 | Authentication (credentials) | Right credentials in, wrong ones out, clear errors | `02-credentials/LoginInvalidCredentials`, `LoginEdgeCases`, `LoginErrorHandling` | F | Automated (LG-EDGE-01 skipped, open question) |
| 3 | OTP and device verification | The second factor and the validation card | `03-otp/*`, `OtpAdminConfig/` | C, D | Partial — group skips if the OTP dialog is absent in 30 s; LG-62 skipped, likely obsolete |
| 4 | Session and token lifecycle | Stay in, get out, token rules, redirects | `04-session/*` (HappyPath, Navigation, SessionLifecycle, **TokenLifecycle**), `Homepage/HomepageSession`, `HomepageLogout` | E, H, M | Automated; single-session, idle timeout and 401/refresh pending |
| 5 | First login and password lifecycle | Default password, forced change, policy | `05-first-login/*`, `LoginAccountStates` (expired password), `ForgotPassword/` | L | Automated (E2E case opt-in, consumes an account); password history/expiry pending |
| 6 | Account status and lockout | Locked, deactivated, AML, pending, rejected, NAFATH/WATHIQ expiry | `02-credentials/LoginAccountStatus`, `LoginAccountStates`, `api/document-expiry/*`, `integration/*`, lockout in `security/LoginSecurity` | G, K, N | Blocked — accounts not provisioned; escalation pending |
| 7 | Security | Enumeration, injection, headers, token tampering, no leaks | `security/*` | I | Automated; API half to be re-run after the 412 fix |
| 8 | API contract | Gateway endpoints behave as specified | `api/signin/*` | J | To be re-run after the 412 fix (never effectively ran before) |
| 9 | Localization | Arabic/English, RTL, persistence | `ui/LoginLocalization`, `api/signin/LoginApiLocalization` | — | Partial (LG-L10N-05 and -09 skipped) |
| 10 | Non-functional | Accessibility, performance, visual | `non-functional/*` | — | Automated; OTP screen and dark theme visual cases skipped |

Manual sections L–P (LG-147 to LG-170) were added with this update; the full automation-id ↔ manual-id table is the "Automated coverage note" at the end of `Login.md`.

Manual total: 71 + 71 + 28 = 170.

### Canonical owner per duplicated scenario
The same check exists in several files. Until they are consolidated, a failure in the check is triaged in the **owner** file; the others are secondary.

| Scenario | Owner | Also asserted in |
|---|---|---|
| Log In button disabled on load | `01-form/LoginFormValidation` (LG-32) | `ui/LoginPage` (LG-29), `LoginHappyPath` (LG-76/77) |
| Validation-card step texts | `ui/LoginValidationPopup` | `03-otp/LoginValidationCard` |
| Wrong credentials stay on the login page | `02-credentials/LoginInvalidCredentials` (LG-87 to LG-91) | `LoginEdgeCases` (LG-EDGE-02, LG-95), `LoginErrorHandling` |
| No stack trace in error responses | `security/LoginApiSecurity` | `security/LoginSecurity` (LG-110), `api/signin/LoginApiSignIn` (LG-145) |
| Same message for unknown tenant and unknown user | `security/LoginApiSecurity` (LG-APISEC-15) | `security/LoginSecurity` (LG-106), `LoginApiSignIn` (API-S2) |
| POST-only sign-in | `security/LoginApiSecurity` (LG-126) | `security/LoginSecurity` (LG-109), `LoginApiSignIn` |
| No credentials in the URL | `security/LoginSessionSecurity` | `security/LoginSecurity`, `Homepage/HomepageSecurity` |
| Localised auth errors | `api/signin/LoginApiLocalization` | `api/document-expiry` NW-14 to 16 |
| Session persists after refresh; logout ends it | `04-session/LoginSessionLifecycle` | `LoginHappyPath` (LG-86), `Homepage/HomepageSession`, `HomepageLogout` |

Id hygiene: `LG-90` belongs to `LoginInvalidCredentials` only; the edge case that had reused it is now `LG-EDGE-02`.

## 6. Environments & test data

- **Environment:** dev. `.env.dev`: `BASE_URL` and `ADMIN_BASE_URL` = `https://dev-emi.dg-cash.app`. The gateway default is now `https://gateway-dev-emi.dg-cash.app` in every spec helper (the previous default host does not resolve).
- **OTP:** the fixed code `918512` is accepted for every account on every environment; the e-mail inbox path is no longer used. `11111111` is the invalid code. See `data/testAccounts.json`. (A wrong-OTP test must never use `918512`.)
- **Accounts:** merchant, merchant2, biller, `loginAccounts.happy/blocked` in `data/testAccounts.json`; overridable via env vars in `LoginHelper.ts`.
- **First-login accounts:** `firstLoginAccounts` (17 registration-created accounts still on the default password `Aa#123456`, found by `FirstLoginProbe.spec.ts` on 2026-10-14). `FirstLoginUi` uses indexes 0–2 (one per worker) and 3–4 (rejected-change cases) and never consumes one. `FirstLoginEndToEnd` consumes the account at `FIRST_LOGIN_E2E_INDEX` (default last) and sets its password to `Aa#1234567`, which then joins the normal pool. Re-run the probe to refresh the list.
- **Env vars required for full coverage**

| Group | Variables | Currently in `.env.dev` |
|---|---|---|
| Base accounts | `DEV_COMPANY`, `DEV_MOBILE`, `DEV_PASSWORD`, `DEV_SETUP_*` | Yes |
| Admin | `ADMIN_BASE_URL`, `ADMIN_MOBILE`, `ADMIN_PASSWORD`, `ADMIN_OTP_CODE` | Yes |
| Locked / deactivated / AML | `LOCKED_*`, `DEACTIVATED_*`, `AML_*` | **No** |
| Lockout | `LOCKOUT_*` | **No** |
| Expired password / pending / rejected | `EXPIRED_PW_*`, `PENDING_*`, `REJECTED_*` | **No** |
| NAFATH / WATHIQ | `NAFATH_EXPIRED_*`, `WATHIQ_EXPIRED_*` | **No** |
| Admin integration | `INTEGRATION_COMPANY`, `INTEGRATION_MOBILE` | **No** |
| Opt-in runs | `FIRST_LOGIN_PROBE=1`, `FIRST_LOGIN_E2E=1`, `FIRST_LOGIN_E2E_INDEX` | n/a (set per run) |

- Quote any `.env` value containing `#` (dotenv treats unquoted `#` as a comment).
- Known account problem: `merchant2` (E9306) returns HTTP 423 (locked) on sign-in; unlock it before running the Homepage account-2 specs.

## 7. Execution

```
cross-env ENV=dev npx playwright test BusinessTestCases/Login/
cross-env ENV=dev npx playwright test BusinessTestCases/Login/functional/05-first-login
cross-env ENV=dev npx playwright test BusinessTestCases/OtpAdminConfig --grep @login
```

PowerShell sets variables first: `$env:FIRST_LOGIN_PROBE = "1"; npm run test:dev -- Login/functional/05-first-login`.

- Config: Edge (headed), 3 workers locally, 60 s test timeout, `fullyParallel: true`, global setup logs in with `DEV_SETUP_*` to create `session.json`.
- Two sign-ins on one account at the same time interfere (single-device policy), so specs must not share an account across workers; the first-login form cases pick an account per worker.
- Run serially / isolated: lockout (`LoginSecurity`), admin config (`OtpAdminConfig`).
- No `test:login` npm script exists (see §11).

## 8. Entry & exit criteria

**Entry**
- Dev environment and admin portal reachable at the URLs above.
- `session.json` generated by global setup; test accounts active and unlocked.
- For account-state / NAFATH / WATHIQ runs: the env-var accounts are provisioned.

**Exit**
- 100% of P1 cases pass (automated or manual).
- No open Sev-1/Sev-2 defects against Login.
- Every skip is justified in §9; unexplained skips count as failures.
- Manual-only cases executed and recorded.

## 9. Known skips & blocked items

| Item | Reason | Unblock |
|---|---|---|
| `LG-EDGE-01` whitespace-only password keeps button disabled (`LoginEdgeCases.spec.ts`) | Skipped; reason now recorded in the spec: login-form handling of whitespace is an open business question | Business decision, then fix or delete |
| `LG-62` redirect when OTP is disabled (`LoginValidationCard.spec.ts`) | Skipped; web login always needs OTP (EMI-4625), so the path cannot occur | Confirm and retire the case and manual LG-62 |
| `LG-L10N-05`, `LG-L10N-09` | Hard skips for known product gaps (RTL prefix position, OS dark scheme) | Product fix |
| `LG-SESS-06` | `test.fixme`: app does not carry the requested page through login | Product decision |
| NW-01/01a/01b, NW-02/02a/02b, NW-14/15/16 | Need `NAFATH_EXPIRED_*` / `WATHIQ_EXPIRED_*` accounts | Provision accounts |
| NW-04 … NW-13 (10 tests) | Need Redis TTL seeding access; renewal endpoint paths unconfirmed in Emi Profile Service Swagger | Obtain access, confirm endpoints |
| `LoginOtp.spec.ts`, `LoginOtpEdgeCases.spec.ts` | Skip when the OTP dialog does not appear | Check the OTP admin config |
| `api/signin` `LG-127` to `LG-129`, `LG-CON-*` | Skip when sign-in returns no `accessToken` — they skipped on every run while the 412 lasted | Re-run now that sign-in returns 200 |
| Locked / deactivated / AML / lockout / expired password / pending / rejected | Env vars not provisioned | Provision accounts |
| `FirstLoginEndToEnd` LG-FIRST-20 | Opt-in; consumes one first-login account | Set `FIRST_LOGIN_E2E=1` and the next index |
| `06-pending/LoginPendingCases` (14 placeholders) | Each carries its blocker in the annotations: LG-154, 155, 160 to 170, 137 | See the `unblock` annotation of each |
| Visual: OTP screen, dark theme, one known mismatch | Skipped in `LoginVisualRegression` | Re-baseline |

## 10. Risks & mitigations

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | Lockout test locks the shared merchant account; with parallel workers, other specs can hit a locked account; unlock is manual | False failures across suites | Use a dedicated `LOCKOUT_*` account; run lockout serially; document the unlock procedure |
| 2 | Unprovisioned env vars make specs skip silently | Green run hides missing coverage | Report skip counts per run; make provisioning an entry criterion |
| 3 | Concurrent sign-ins on one account (single-device policy) | Flaky OTP/session failures | One account per worker; dedicated accounts for session tests |
| 4 | First-login accounts are finite (17) and a consumed one cannot be reset from the suite | E2E case becomes single-use per account | Track the E2E index; test the admin staff reset once to see whether it restores first-login state |
| 5 | `LoginSecurity`, `LoginApiSecurity` and `api/signin` assert duplicates of the same checks | Triage noise | Owner table in §5; consolidate later |
| 6 | No `@smoke` / priority tags | P1 set cannot be selected via `--grep` | Tag by priority (§11) |
| 7 | Sparse LG-id annotations on older specs | Manual↔automation traceability gap | Annotate every test with its LG id; the cross-reference in `Login.md` covers the new ones |
| 8 | Business rules unspecified (lockout duration, idle timeout, whitespace password, OTP limits) | Cannot write reliable expected results | Raise with business (§12) |
| 9 | Direct `/auth/signin` calls got an empty HTTP 412 from dev for every user (root cause: invalid `device-finger-print`, fixed 2026-10-14) | The `api/signin` folder and the API half of `LoginApiSecurity` had never really run; skip guards hid it | Re-run the API specs once and review what they now assert. The fingerprint format is a gateway implementation detail: if dev changes it (new web-app id, new check), `support/deviceFingerprint.ts` is the single place to update. Other modules that sign in directly (`PosTransactions`, `WalletSnapshot`) still send the old fake value |
| 10 | Arabic/RTL checks are partial | AR defects missed | Extend `LoginLocalization` |

## 11. Recommended additions

1. ~~Investigate the 412~~ — done 2026-10-14. Re-run `Login/api` and `Login/security` once and triage whatever now fails; then extend the other modules' direct sign-in the same way.
2. Dedicated, isolated lockout account and documented unlock steps.
3. Provision `LOCKED_*`, `DEACTIVATED_*`, `AML_*`, `LOCKOUT_*`, `EXPIRED_PW_*`, `NAFATH_EXPIRED_*`, `WATHIQ_EXPIRED_*` accounts in dev.
4. Add `@smoke` and `@p1/@p2/@p3` tags plus `LG-nn` annotations to every Login test; add a `test:login` npm script.
5. Unblock the pending cases (§9) as the answers arrive: single-session force-logout, lockout escalation, password history and expiry, 401 and refresh behaviour, audit log, SMS alerts.
6. Ask the front-end team for testids on the reset-password screen (document them in the handoff) and on the password-rule checklist rows, so a test can tell which rule failed.
7. Consolidate the duplicated scenarios (§5) once ownership is agreed.
8. Optional: a `@cat-*` tag per describe so `--grep` can run one capability.

## 12. Open questions for the business

1. Lockout duration and how a locked account is unlocked (self-service vs admin).
2. Session / idle timeout value.
3. Whitespace handling in the login password (needed for LG-EDGE-01) and the final password policy.
4. OTP expiry, wrong-attempt limit and resend limit.
5. Precedence when both NAFATH and WATHIQ are expired (LG-137).
6. When the new password equals the default at the first-login reset: is it blocked by the form or by the server, and with which message? (LG-152 / LG-FIRST-18 records the outcome.)
7. Should the web login really have no OTP-disabled mode? If yes, retire LG-62.
8. Does the admin "reset password" put a user back in first-login state? (decides whether the E2E first-login case can be repeated.)
