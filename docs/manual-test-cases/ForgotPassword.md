# Manual Test Cases — Forgot Password

Context: the Forgot Password flow lets a user re-identify themselves with their **Company number** and **Mobile number** (Step 1), verify an **OTP** sent for the change-password operation, then set a **new password** with confirmation (Step 2), landing back on the Login page on success.

This flow already has full Playwright automation in this repo. Most of it (Step 1 identity check, Step 2 password reset, and the OTP resend/verify cycle) is exercised against **mocked backend responses** — `mockOtpDisabled`, `mockForgetPasswordSuccess`, `mockForgetPasswordFailure`, and `mockAllPasswordsSuccess` stub `**/otp/otp-settings/**` and `**/auth/passwords/**` so the UI behavior can be verified deterministically without depending on a live backend or a real OTP delivery. A small number of tests (the OTP happy-path in `functional/ForgotPasswordOtpFunctionality.spec.ts`) instead call the real Step 1 API and fetch the live OTP from MongoDB, because mocking Step 1 with an empty `{}` response leaves the backend without a session/token to trigger a real OTP. The manual cases below are written the same way: most can be executed against a test/mocked environment, and are flagged where they specifically depend on a live OTP or live backend responses.

Priority key: **P1** = blocks the release / core happy path, **P2** = important secondary behavior, **P3** = edge case / polish.

---

## A. Step 1 — Identify Account: Page Elements & Layout

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| FP-01 | Page loads at the Forgot Password URL | From Login, click "Forgot password" | URL is `/business/auth/forgot-password`; page title is "EMI - Business" | P1 |
| FP-02 | Branding, language switcher, and theme toggle are visible | Load the Forgot Password page | MJD Pay logo, EN button (active by default), Arabic button, and theme-toggle button are all visible | P2 |
| FP-03 | Back button returns to Login | Click the back button | User is navigated to the Login page | P1 |
| FP-04 | Logo click navigates away | Click the MJD Pay logo | User is no longer on the Forgot Password URL | P3 |
| FP-05 | Eyebrow and heading text shown | Load the page | "Forgot password" eyebrow and "Welcome to MJD Pay" heading are visible | P3 |
| FP-06 | Company number field displayed correctly | Load the page | Company number label and input are visible and enabled, with "Input here" placeholder | P1 |
| FP-07 | Mobile number field displayed correctly | Load the page | Mobile number label, Saudi flag icon, "(+966)" prefix, and input are visible/enabled, with "Input here" placeholder | P1 |
| FP-08 | Next button disabled with empty fields | Load the page without entering anything | Next button is visible but disabled | P1 |

## B. Step 1 — Happy Path

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| FP-09 | Language toggle works both directions | Click Arabic, confirm it activates (RTL), then click EN | Arabic button becomes active on click; clicking EN afterward reactivates English | P3 |
| FP-10 | Company field accepts and retains valid input | Type a valid company number (e.g. `A2316`) | Field displays and retains the typed value | P2 |
| FP-11 | Mobile field accepts a valid 9-digit number | Type a valid mobile number (e.g. `500021788`) | Field displays and retains the typed value | P2 |
| FP-12 | Next enables once both fields are valid | Fill Company and Mobile with valid values | Next button becomes enabled | P1 |
| FP-13 | Valid submission proceeds to Step 2 | Submit valid Company + Mobile | User is navigated to the change-password step (URL contains `change-password`) | P1 |
| FP-14 | Step 2 fields appear, Step 1 fields hidden | Continue from FP-13 | New Password and Confirm Password fields become visible; Company and Mobile inputs are no longer visible | P1 |

## C. Step 1 — Mobile Number Format Validation

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| FP-15 | Too-short mobile number blocked | Enter a company number, then a mobile shorter than 9 digits (e.g. `5123`) | Next button stays disabled | P2 |
| FP-16 | Leading-zero mobile number blocked | Enter a mobile number with a leading zero (e.g. `0500021788`) | Next button stays disabled | P2 |
| FP-17 | Alphabetic characters rejected | Type letters into the Mobile field | Field remains empty / rejects the letters | P2 |
| FP-18 | Special characters rejected | Type symbols (e.g. `!@#`) into the Mobile field | Field remains empty / rejects the symbols | P2 |
| FP-19 | Valid 9-digit mobile starting with 5 enables Next | Enter a valid mobile alongside a valid company | Next button becomes enabled | P1 |

## D. Step 1 — Negative Scenarios

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| FP-20 | Next disabled unless both fields are filled | Try: both empty / only Company filled / only Mobile filled | Next button stays disabled in every case | P1 |
| FP-21 | Next disables again after clearing a field | Fill both fields, confirm Next is enabled, then clear either one | Next button becomes disabled again | P2 |
| FP-22 | Invalid credentials keep the user on Step 1 | Submit an unrecognized Company + Mobile combination | User remains on the Forgot Password page (does not advance) | P1 |
| FP-23 | Toast error shown for invalid credentials | Same as FP-22 | An error toast/snackbar notification appears | P1 |
| FP-24 | Field values preserved after a failed submission | Submit invalid credentials | Both the Company number and Mobile number values remain in their fields after the error | P2 |
| FP-25 | No progression to Step 2 or OTP on rejection | Submit invalid credentials | New Password field and OTP dialog are not shown | P1 |
| FP-26 | Page context remains visible after failure | Submit invalid credentials | "Welcome to MJD Pay" heading and "Forgot password" eyebrow remain visible | P3 |

## E. Step 1 — Edge Cases

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| FP-27 | Whitespace-only company number blocked | Enter only spaces in Company number, a valid Mobile number | Next button stays disabled | P2 |
| FP-28 | Formatting characters stripped from Mobile field | Paste/type a mobile number with dashes and spaces (e.g. `500-318-143`) | The stored value has no dashes or spaces | P2 |
| FP-29 | Extremely long company number doesn't break the page | Enter a 200-character company number | Page remains functional (Next button still visible); user stays on the Forgot Password URL | P3 |
| FP-30 | Extremely long mobile number doesn't break the page | Enter a 50-digit mobile number | User stays on the Forgot Password URL without a crash | P3 |
| FP-31 | Theme persists through a language switch | Toggle dark theme, then switch language to Arabic | Dark theme remains applied after the language change | P3 |
| FP-32 | Double-click on Next doesn't double-submit | Fill valid Company/Mobile, rapidly double-click Next | Only one identity-check request is sent | P2 |
| FP-33 | Loading indicator shown while request is in flight | Submit valid Company/Mobile against a slow network | A loading spinner appears on/near the Next button until the response returns | P3 |

## F. Step 1 — Security

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| FP-34 | Script payload does not execute | Enter `<script>alert(1)</script>` in Company number and/or Mobile number, submit | No JavaScript alert/dialog fires; input is treated as plain text | P1 |
| FP-35 | SQL-injection-style input handled safely | Enter `' OR '1'='1` as Company number, submit | Treated as an invalid credential; user stays on the page without a crash | P1 |
| FP-36 | Error detail doesn't leak internals | Submit invalid credentials | The error toast does not contain stack traces, SQL, database, or internal server error text | P1 |
| FP-37 | Change-password step not reachable by direct URL | Navigate directly to the change-password URL without completing Step 1 | The New Password form is not shown | P1 |
| FP-38 | Credentials sent in request body, not URL | Submit valid Company/Mobile and inspect the network request | Request is a POST; the URL does not contain the company number or mobile number | P1 |
| FP-39 | Generic error avoids user enumeration | Submit a wrong Company with a valid Mobile, and separately a valid Company with a wrong Mobile | Neither error message states specifically whether the company number or the mobile number was invalid | P2 |

## G. OTP Verification — Popup Elements

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| FP-40 | OTP modal opens with heading and instructions | Reach the OTP step after submitting Step 2 | Modal dialog appears with an "Enter OTP" heading and instruction text mentioning the Change Password Process | P1 |
| FP-41 | Six empty OTP boxes, first one focused | Open the OTP modal | Exactly 6 digit-input boxes are shown, all empty, and the first is focused automatically | P1 |
| FP-42 | Countdown timer displayed | Open the OTP modal | A countdown timer is visible in `MM:SS` format | P2 |
| FP-43 | Resend option shown but disabled during countdown | Open the OTP modal | "Didn't Receive Code?" text and a "Click to resend" button are visible; resend is disabled while the countdown is active | P2 |
| FP-44 | Cancel/Confirm/Close controls present | Open the OTP modal | Cancel button and Close (×) button are enabled; Confirm button is visible but disabled while OTP is empty | P1 |

## H. OTP Verification — Functional Flow

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| FP-45 | Confirm stays disabled until all digits entered | Fill only some of the 6 OTP boxes | Confirm button remains disabled | P1 |
| FP-46 | Non-numeric OTP characters rejected | Type a letter into an OTP box | The box does not accept the letter (remains empty) | P2 |
| FP-47 | Auto-advance between OTP boxes | Type a digit in the first OTP box | Focus automatically moves to the next box | P2 |
| FP-48 | Wrong OTP is rejected | Fill all 6 boxes with an incorrect code, click Confirm | Modal remains open and an error indicator is shown | P1 |
| FP-49 | Correct OTP resets the password (live OTP required) | Fill all 6 boxes with the OTP actually sent for this change-password request, click Confirm | Password reset succeeds, user is redirected to Login, and a success toast is shown | P1 |
| FP-50 | Resend clears inputs once countdown expires | Wait for the countdown to reach zero, click "Click to resend" | Resend button becomes enabled once the timer expires; previously entered OTP digits are cleared | P2 |
| FP-51 | Cancel returns to Step 2 without losing the form | Click Cancel on the OTP modal | Modal closes, user returns to the change-password page, and the Reset Password button is visible/enabled again for a retry | P2 |

## I. Step 2 — New Password: Page Elements & Layout

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| FP-52 | Branding and controls carried over to Step 2 | Reach Step 2 | MJD Pay logo, EN/Arabic buttons, and theme toggle are all still visible | P3 |
| FP-53 | Step 2 heading, back button, and subtitle shown | Reach Step 2 | "Forgot Password" heading, a back button, and the subtitle "Create A New Password, Follow Password Regulation" are visible | P2 |
| FP-54 | New Password field displayed correctly | Reach Step 2 | New Password label/input are visible, masked by default (`type="password"`), with "Input Password" placeholder and a show-password eye icon | P1 |
| FP-55 | Confirm Password field displayed correctly | Reach Step 2 | Confirm Password label/input are visible, masked by default, with "Input Password" placeholder and a show-password eye icon | P1 |
| FP-56 | Reset Password button disabled when empty | Reach Step 2 without entering a password | Reset Password button is visible but disabled | P1 |

## J. Step 2 — Password Validation Rules

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| FP-57 | Password rules checklist appears while typing | Start typing in New Password | A "Your password must contain:" checklist appears listing: at least 8 characters, lowercase, uppercase, numbers, special characters, and no spaces | P1 |
| FP-58 | Mismatch message shown | Enter different values in New Password and Confirm Password | "New password and Confirm password are not matched" message is displayed | P1 |
| FP-59 | Submit disabled when a password rule is unmet | In turn, try a password missing: uppercase / lowercase / a number / a special character / a length under 8 / containing spaces | Reset Password button stays disabled for each unmet rule | P1 |
| FP-60 | Submit re-enables after correcting a mismatch | Enter mismatched passwords, confirm button is disabled, then correct Confirm Password to match | Reset Password button becomes enabled | P2 |
| FP-61 | Submit disables after clearing either password field | Fill both fields validly (button enabled), then clear New Password, and separately clear Confirm Password | Reset Password button becomes disabled again in both cases | P2 |

## K. Step 2 — Back Navigation

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| FP-62 | Back button returns to Step 1 | From Step 2, click the back button | Company and Mobile inputs reappear, New Password field is hidden, and the Next button is shown again | P2 |

## L. Step 2 — Show/Hide Password & Field Interactions

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| FP-63 | Show/hide toggle for New Password | Fill New Password, click its eye icon to reveal, then click again to hide | Field switches to plain text on reveal and back to masked on hide | P2 |
| FP-64 | Show/hide toggle for Confirm Password | Fill Confirm Password, click its eye icon to reveal, then click again to hide | Field switches to plain text on reveal and back to masked on hide | P2 |
| FP-65 | Submit disabled with only one password field filled | Fill only New Password, and separately only Confirm Password | Reset Password button stays disabled in both cases | P2 |
| FP-66 | Submit enabled with valid matching passwords | Fill both fields with the same valid password | Reset Password button becomes enabled | P1 |

## M. Step 2 — Edge Cases

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| FP-67 | Case-sensitive password comparison | Enter passwords that differ only by letter case (e.g. `Aa#1234567` vs `aA#1234567`) | Treated as a mismatch; mismatch message shown and submit disabled | P2 |
| FP-68 | Long but valid password accepted | Enter a long password that still satisfies all rules, matching in both fields | Reset Password button becomes enabled | P3 |
| FP-69 | Enter key submits a valid form | Fill both password fields validly, press Enter in Confirm Password | Form submits and the user proceeds toward Login | P3 |
| FP-70 | Loading state and duplicate-submit prevention | Submit a valid password reset against a slow network, observe button and repeat clicks | A loading spinner is shown on submit, and only one reset request is sent even under repeated interaction | P2 |

## N. Step 2 — Security

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| FP-71 | New password sent in request body, not URL | Submit a valid password reset and inspect the network request | Request is a POST; the URL does not contain the plaintext password | P1 |
| FP-72 | Script payload does not execute | Enter `<script>alert(1)</script>` as both New Password and Confirm Password | No JavaScript alert/dialog fires | P1 |

## O. End-to-End Happy Path & Failure Handling

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| FP-73 | Full flow completes and redirects to Login | Complete Step 1 with valid credentials, Step 2 with a valid matching password (OTP step passes/disabled) | User is redirected to the Login page | P1 |
| FP-74 | Mismatched passwords never reach Login | Enter mismatched passwords at Step 2 | Reset Password stays disabled; user is never redirected to Login | P1 |
| FP-75 | Backend failure on reset is surfaced clearly | Submit a valid password reset while the reset API returns a server error | User stays on the current page (not redirected to Login) and an error toast is shown | P1 |

## P. API-Level Validation (Backend Contract)

Context: these checks validate the two endpoints the Forgot Password UI calls under the hood — useful for API/exploratory testing with a tool such as Postman, independent of the UI.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| FP-76 | Identity check succeeds for valid data | `POST /auth/passwords/forget` with a valid `companyNumber` and `mobileNumber` (E.164 format, e.g. `+9665...`) | Returns HTTP 200 with a JSON content-type response | P1 |
| FP-77 | Missing fields rejected | Call the same endpoint with `companyNumber` missing, then with `mobileNumber` missing, then with an empty body | Returns HTTP 400 in all three cases | P1 |
| FP-78 | Unrecognized identity rejected | Call the endpoint with an unknown company, then an unknown mobile, then both unknown | Returns HTTP 401 in all three cases | P1 |
| FP-79 | Mobile without country code rejected or unauthorized | Call the endpoint with a mobile number missing its `+966` country code | Returns HTTP 400 or 401 | P2 |
| FP-80 | Error responses don't leak internals | Call the endpoint with invalid credentials | Response body contains no stack traces, SQL, or database-error text | P1 |
| FP-81 | Consistent error status prevents enumeration | Call the endpoint with a wrong company (valid mobile), then a valid company (wrong mobile) | Both calls return the same HTTP status code | P2 |
| FP-82 | Endpoint only accepts POST | Call `GET /auth/passwords/forget` | Does not return HTTP 200 | P2 |
| FP-83 | OTP settings endpoint returns a valid config | `GET /otp/otp-settings/q?operationCode=FORGET_PASSWORD` | Returns HTTP 200 with `length` (positive number), `validityInSeconds` (positive number), `canResendOtpAfterInSeconds` (non-negative number), and `enabled` (boolean) | P2 |
| FP-84 | Unknown/omitted operation code rejected | Call the OTP settings endpoint with an invalid `operationCode`, and again with the parameter omitted entirely | Returns HTTP 400 or 404 for an unknown code, and HTTP 400 when the parameter is omitted | P2 |

---

## Automated coverage note

This manual test suite mirrors the existing Playwright automation for the Forgot Password feature. The corresponding automated specs are:

- `BusinessTestCases/forgot-password/ForgotPasswordHelper.ts` — shared navigation/route-mocking helpers (`mockOtpDisabled`, `mockForgetPasswordSuccess`, `mockForgetPasswordFailure`, `mockAllPasswordsSuccess`, `gotoForgotPassword`, `gotoOtpModal`) used across the specs below
- `BusinessTestCases/forgot-password/ui/ForgotPassword.spec.ts` — Step 1 page elements & layout (sections A)
- `BusinessTestCases/forgot-password/ui/ForgotPasswordStep2.spec.ts` — Step 2 page elements & layout (section I)
- `BusinessTestCases/forgot-password/ui/ForgotPasswordOtpPage.spec.ts` — OTP modal UI elements (section G)
- `BusinessTestCases/forgot-password/functional/ForgotPasswordStep1.spec.ts` — Step 1 happy path, mobile validation, negative scenarios, edge cases, security (sections B–F)
- `BusinessTestCases/forgot-password/functional/ForgotPasswordStep2.spec.ts` — Step 2 password validation, back navigation, interactions, edge cases, security (sections J–N)
- `BusinessTestCases/forgot-password/functional/ForgotPasswordOtpFunctionality.spec.ts` — OTP verification functional flow, including the live-OTP happy path via MongoDB lookup (section H)
- `BusinessTestCases/forgot-password/functional/ForgotPasswordHappyPath.spec.ts` — full end-to-end flow and mocked failure handling (section O)
- `BusinessTestCases/forgot-password/api/ForgotPasswordAPIFlow.spec.ts` — API-level contract checks for `POST /auth/passwords/forget` and `GET /otp/otp-settings/q` (section P)
- `BusinessTestCases/pageElements/ForgotPasswordPage.ts` / `BusinessTestCases/pageElements/OtpPage.ts` — page objects backing all of the above
