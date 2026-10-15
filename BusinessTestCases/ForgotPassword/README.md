# Forgot Password tests

Flow: Step 1 (company + mobile) → optional OTP dialog → Step 2 (new password) → Login.

| Folder | What it holds | Backend |
|---|---|---|
| `ui/` | Static elements of Step 1, Step 2, the OTP dialog, and Arabic/RTL | Mocked |
| `functional/` | Step 1, Step 2, OTP, happy path, password-policy edges, resilience | Mostly mocked |
| `functional/ForgotPasswordAccountStates` | Unknown and blocked identities | Real |
| `functional/ForgotPasswordOtpLifecycle` | OTP replay, resend invalidation, lockout | Real + OTP from DB |
| `functional/ForgotPasswordPostReset` | Sign in after reset (resets the password back afterwards) | Real + OTP from DB |
| `api/` | Contract of `POST /auth/passwords/forget` and `GET /otp/otp-settings/q` | Real |
| `security/` | API method, injection, data-type, throttling, echo checks | Real (unknown identities only) |
| `non-functional/` | Accessibility (axe, needs `@axe-core/playwright`) and API performance budgets | Mocked / Real |

## Accounts
- `VALID_COMPANY` / `VALID_MOBILE` – dedicated forgot-password account (not shared with other suites).
- `BLOCKED_COMPANY` / `BLOCKED_MOBILE` – reserved for blocked-account negatives; never used on the happy path.
- Unknown identities (`Z####`, `511111111`) are used for load, security and enumeration checks so no real account is affected.

## Conventions
- Import `test`/`expect` from `../../fixtures`; use the `forgotPassword` and `otp` fixtures.
- Tag every describe with `@forgotpassword` plus a layer tag, and add a `testcase` annotation `FP-nn: title` so the exports link the test to its manual case in `docs/manual-test-cases/ForgotPassword.md`.
- Register an `abortUnmockedGatewayRequests` route first, then specific mocks.
- Real-backend specs that change the password must put it back (see `ForgotPasswordPostReset`).

## Known gaps
- `FP-E2E-02` (old session refused after reset) is a `fixme` stub: it needs a token-protected endpoint and the token field name.
- Two earlier unexplained skips are now `fixme` with a note to run them and record the reason.
- Reset by email / national ID and notification content are not in the UI and stay manual (`FP-E2E-05`).
