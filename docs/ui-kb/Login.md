# Login - UI logic

Business-portal sign-in: company number + mobile + password, "Just a moment..." validation card, OTP step, then Home. Also covers the forced first-login "Reset password" screen and the pending/blocked account cases.
Locators: [Login.generated.md](Login.generated.md) (FirstLoginPasswordPage). The main `LoginPage` lives in `BusinessTestCases/pageElements/Shared/LoginPage.ts` and is catalogued in [Shared.generated.md](Shared.generated.md).

| Item | Value | Source |
|---|---|---|
| Route (login) | `/business/auth/login` (BASE_URL `https://dev-emi.dg-cash.app`) | Login/LoginHelper.ts:6 |
| Route (forced reset) | `/business/auth/reset-password` | pageElements/Login/FirstLoginPasswordPage.ts; Login/helpers/firstLogin.ts |
| Route (after login) | `/business/main/home` | Login/ui/LoginValidationPopup.spec.ts |
| Page title | `EMI - Business` | Login/ui/LoginPage.spec.ts (LG-02) |
| Who can see it | Anyone not signed in. A signed-in user is redirected away from the login URL | Login/functional/04-session/LoginNavigation.spec.ts (LG-104) |
| Roles | Business users only (company + mobile). Admin portal has its own login (see Shared.md) | Login/README.md; business-knowledge part1 line 43 |
| Default language | Arabic on dev/UAT (AR button `aria-pressed=true` on load) | Login/ui/LoginPage.spec.ts (LG-PAGE-03) |

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| Login form | `/business/auth/login` | `formBox` (`#login-form-box`) | Centre card | Holds the whole form |
| Login form | same | `formEyebrow`, `formTitle` | Top of card | EN: "Login" / "Welcome to MJD Pay" |
| Login form | same | `taglineText` | Under title | Marketing line ("Seamless transactions... get started") |
| Login form | same | `logoImage`, `logoLink` | Top of page | MJD Pay logo; link goes to the public landing page |
| Login form | same | `enButton`, `arabicButton`, `themeToggle` | Header / auth layout | Language and theme switch |
| Login form | same | `companyInput`, `mobileInput` (+ `countryCode`, `countryFlag`), `passwordInput` | Card body | Credentials |
| Login form | same | `loginButton`, `forgotPasswordLink`, `newToMjdText` + `signUpLink` | Card bottom | Submit and navigation |
| Validation card ("Just a moment...") | same (overlay) | Card with 3 steps | Centre overlay after submit | Shows sign-in progress |
| OTP step ("Enter OTP") | same (full-screen dialog) | `OtpPage` heading, digit boxes (6 per LG-OTPX-01 title; count not asserted), countdown, Verify, Cancel, Resend | Centre | Second factor (see Shared.md for the OTP widget) |
| Forced reset password | `/business/auth/reset-password` | `currentInput`, `newInput`, `confirmInput`, 3 toggles, `submitButton`, `policyError`, `mismatchError` | Centre form | Default-password user must set a new password |
| Home | `/business/main/home` | Dashboard | Whole page | Landing after login (see Homepage.md) |

## Forms

### Login form (`LoginPage`)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Company number | `companyInput` | text, placeholder "Eg. Z9246" / "مثال: Z9246" | Yes | Whitespace-only keeps button disabled; spaces around the value are trimmed before sending | None on field; server error as toast | Always |
| Company clear (x) | `companyClearButton` | button | No | Shown when the field has a value; empties the field | - | Field has a value |
| Mobile number | `mobileInput` (testid `login-username`) | text with fixed prefix `(+966)` and flag | Yes | 9 digits, must start with 5, no leading 0; more than 9 digits are cut to 9; letters and special characters are ignored | None on field; button stays disabled | Always |
| Mobile clear (x) | `mobileClearButton` | button | No | Clears the field | - | Field has a value |
| Password | `passwordInput` (testid `login-password`) | password | Yes | Masked by default; value not exposed in the DOM as plain text | Server error as toast | Always |
| Show password | `showPasswordToggle` (testid `login-password-toggle-visibility`) | button | No | Toggles `type` password / text | - | Always |
| Log In | `loginButton` (testid `login-submit`; dev fallback `#btn_login`) | submit | - | Disabled until all 3 fields valid; Enter in the password field submits; Enter with an empty field does not | - | Company, mobile (valid) and password all filled |

Sources: Login/functional/01-form/LoginFormValidation.spec.ts (LG-32 to LG-53); LoginFormKeyboard.spec.ts (LG-KBD-01 to 08); LoginEdgeCases.spec.ts (LG-43); pageElements/Shared/LoginPage.ts; QA-DATA-TESTID-HANDOFF.md section 4.1.

### Forced reset-password form (`FirstLoginPasswordPage`)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Current password | `currentInput` (testid `reset-password-current`) | password | Yes | Must be the current (default) password; wrong value rejected by the server | Toast (text not asserted) | Always |
| New password | `newInput` (`reset-password-new`) | password | Yes | 8 to 20 characters, lowercase, uppercase, digit, special character. 8 and 20 characters are accepted; 7 and 21 are not | Checklist icons on the page; `policyError` (`#error_content-newPassword`) is empty for some rules, so the disabled submit is the reliable signal | Always |
| Confirm password | `confirmInput` (`reset-password-confirm`) | password | Yes | Must equal the new password, case-sensitive | `mismatchError` (`#error_passwordsNotMatch`) visible; clears when it matches | Always |
| Show/hide (x3) | `currentToggle`, `newToggle`, `confirmToggle` | buttons | No | Each toggles only its own field | - | Always |
| Reset password | `submitButton` (`reset-password-submit-btn`) | submit | - | Disabled until all three fields pass the policy and match | - | All 3 filled, policy ok, confirmation equal |

Sources: Login/functional/05-first-login/FirstLoginUi.spec.ts (LG-FIRST-03 to 16); pageElements/Login/FirstLoginPasswordPage.ts.

## Tables and lists

Not applicable. The Login module has no tables or lists.

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| `loginButton` | Login form | Submits company + mobile + password | All three fields valid | Validation card, then OTP dialog |
| `forgotPasswordLink` | Login form | Opens Forgot Password | Always | URL contains `forgot-password` (see ForgotPassword.md) |
| `signUpLink` ("Sign Up" / "إنشاء حساب") | Login form | Opens Registration | Always | Leaves the login URL (target not asserted) |
| `logoLink` | Login form | Goes to `/business/` which redirects | Always | `/business/landing` |
| `enButton` / `arabicButton` | Login form | Switches language; `aria-pressed` shows the active one; `html dir` becomes `ltr` / `rtl` | Always | Page re-renders; choice persists after reload |
| `themeToggle` | Login form | Switches light/dark; body class changes; persists after reload | Always | Same page |
| OTP `verifyButton` | OTP dialog | Verifies the code (also auto-submits on last digit) | All digits filled | Home, or reset-password screen for a default-password user |
| OTP `cancelButton` | OTP dialog | Closes the dialog | Always | Back to the login form |
| OTP `resendButton` | OTP dialog | Sends a new code and clears the boxes | After the countdown ends | Dialog stays, timer restarts |
| `submitButton` (reset) | Reset screen | Sets the new password | See reset form | Forced logout, back to login (EMI-200) |
| Language switch on reset screen | Reset screen | Warns that the page reloads and typed input is lost; "keep editing" keeps input, "change" reloads with empty form | Always | Stays on `/business/auth/reset-password` |

Sources: Login/functional/04-session/LoginNavigation.spec.ts; 03-otp/LoginOtp.spec.ts (LG-64 to LG-75); FirstLoginUi.spec.ts (LG-FIRST-19, 21); ui/LoginLocalization.spec.ts.

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| Page just loaded, fields empty | `loginButton` disabled | LoginPage.spec.ts LG-29; LoginFormValidation.spec.ts LG-32 |
| Any field cleared after filling | `loginButton` disabled again | LoginFormValidation.spec.ts LG-40 to 42 |
| Mobile invalid (short, leading 0, not starting with 5) | `loginButton` disabled | LoginFormValidation.spec.ts LG-44 to 48 |
| Submit clicked | "Just a moment..." card with 3 steps: "Verifying your credentials", "Preparing this device", "Securing your session"; step 3 shows a spinner while running; completed steps show a checkmark | ui/LoginValidationPopup.spec.ts; LoginValidationCard.spec.ts |
| Wrong credentials | No validation card, error toast, stays on login URL, form values kept, re-submit allowed | LoginInvalidCredentials.spec.ts LG-87 to 91; LoginEdgeCases.spec.ts LG-94, 95 |
| Locked, deactivated, AML, unregistered account | Error toast only, OTP dialog never shown | LoginAccountStatus.spec.ts LG-92, 97 to 100 |
| Server 500 / network failure / non-JSON body | Error toast, page stays usable, no stuck loading, only one request on double click | LoginErrorHandling.spec.ts LG-ERR-01 to 08 |
| Credentials ok | OTP dialog (`otpRequired: true` in the sign-in response) on every web sign-in, even right after a previous one | LoginTokenLifecycle.spec.ts LG-TOK-03 |
| OTP boxes empty or partly filled | Verify disabled | LoginOtp.spec.ts LG-65, 66 |
| OTP countdown running | Resend disabled; timer starts above 0 and at most 5 minutes | LoginOtp.spec.ts LG-70; LoginOtpEdgeCases.spec.ts LG-OTPX-07, 08 |
| Wrong OTP | Dialog stays open, boxes cleared, up to 3 times | LoginOtpEdgeCases.spec.ts LG-OTPX-05 |
| 3rd wrong OTP | Redirected back to the login form (dev behaviour) | LoginOtpEdgeCases.spec.ts LG-OTPX-06 |
| Same OTP used twice / OTP expired | Dialog stays open with an error | LoginOtpEdgeCases.spec.ts LG-OTPX-03, 04 |
| Refresh while on the OTP dialog | User must not end up half signed in | LoginOtpEdgeCases.spec.ts LG-OTPX-09 |
| Default-password user passes OTP | Redirected to `/business/auth/reset-password`; `/business/main/home` is not reachable until the password is changed | FirstLoginUi.spec.ts LG-FIRST-01, 02 |
| Already signed in and opens login URL | Redirected away; Log In button not shown | LoginNavigation.spec.ts LG-104, LG-NAV-01 |
| Not signed in opens a protected URL | Redirected to login | LoginSessionLifecycle.spec.ts LG-SESS-04, 05 |
| Any API call answers HTTP 498 | User sent to login with a session toast; protected URLs stay closed | LoginTokenLifecycle.spec.ts LG-TOK-01 |
| Arabic selected | `html dir=rtl lang=ar`; digits stay left-to-right in mobile field | LoginLocalization.spec.ts LG-L10N-01, 06 |
| Narrow / phone viewport | No horizontal scroll, controls inside the viewport, touch targets at least 32 px high | LoginResponsive.spec.ts LG-RESP-01 to 05 |

## Business rules

| Rule | Detail | Source |
|---|---|---|
| Business login identity | Company number + mobile (+966) + password | business-knowledge part1 line 43 |
| Web login always needs OTP | No trusted-device mode, no biometric (EMI-4625) | business-knowledge part1; Login-Test-Plan.md section 3 |
| Fixed dev OTP | `918512` accepted for every account; `11111111` is the invalid code | test-plans/Login-Test-Plan.md section 6; LoginHelper.ts |
| Lockout | 3 consecutive failures lock the account; 3 temporary locks deactivate it. Duration and unlock mechanism are not specified | business-knowledge part1; Login-Test-Plan.md section 3 |
| Generic errors | Account status, AML, unknown company vs mobile must not leak details (no stack, SQL, AML or compliance words) | LoginAccountStatus.spec.ts LG-93, 100; Login-Test-Plan.md |
| First login | Default password `Aa#123456` forces the reset screen after OTP, before anything else (EMI-2191) | Login/README.md; FirstLoginUi.spec.ts |
| Password policy | 8 to 20 chars, lower, upper, digit, special; last 3 passwords cannot be reused (not yet tested) | FirstLoginUi.spec.ts; business-knowledge part2 lines 150-159 |
| Password change | Forces an immediate logout (EMI-200) | Login-Test-Plan.md section 3 |
| Tokens | Refresh token lives exactly 60 s longer than the access token; invalid token returns 498 and the client signs out (EMI-2042/2043) | LoginTokenLifecycle.spec.ts LG-TOK-01, 02 |
| Document expiry | NAFATH expiry blocks the user, WATHIQ expiry blocks the profile; sign-in returns 409 with `NAFATH_DATA_EXPIRED` / `WATHIQ_DATA_EXPIRED` (EMI-5836, EMI-5969) | api/document-expiry/LoginNafathWathiqExpiry.spec.ts |
| Single active session | A new device sign-in ends other sessions (SAMA CSF 3.1) | business-knowledge part1; pending LG-160 |
| Audit | Login, OTP, logout logged and kept 10 years | Login-Test-Plan.md section 3 |
| Admin OTP lock | The LOGIN operation is locked on in the admin OTP configuration | Login-Test-Plan.md section 1 (`OtpAdminConfig`) |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| Page heading | EN "Login" (eyebrow), "Welcome to MJD Pay" (title). AR text not recorded | `formEyebrow`, `formTitle` |
| Mobile prefix | "(+966)" | `countryCode` |
| Submit | "Just a moment..." / "preparing a secure session for this device" / the 3 step labels (EN only recorded) | Validation card |
| OTP dialog | Heading "Enter OTP" / "أدخل رمز التحقق"; text "A code has been sent to you" / "تم إرسال رمز التحقق"; "Code ends in MM:SS"; "Click to resend" / "انقر لإعادة الإرسال" | OTP dialog (`OtpPage`) |
| Wrong OTP | "Invalid OTP. Please try again." (EN); AR "رمز التحقق غير صحيح" | OTP dialog |
| Any sign-in failure | Error toast; exact wording not asserted (only "not technical") | Toast (`toast-message`) |
| HTTP 498 | EN "Session expired. Please log in again." (business rule text); test only matches /session|الجلسة|جلسة/ | Toast on login page |
| Confirmation differs | Text not recorded; element `#error_passwordsNotMatch` | Reset form |
| Language switch on reset screen | AR "تغيير اللغة سيعيد تحميل الصفحة، لذا ستفقد ما أدخلته في هذه الصفحة. هل تريد المتابعة؟" with buttons "متابعة التعديل" / "تغيير" | Confirmation modal (`switch-language-submit-btn`, `switch-language-cancel-btn`) |
| Wrong current password / default reused | Server rejection shown as toast; text not recorded | Reset screen |

Sources: ui/LoginPage.spec.ts; ui/LoginValidationPopup.spec.ts; pageElements/Shared/OtpPage.ts; FirstLoginUi.spec.ts; LoginTokenLifecycle.spec.ts; QA-DATA-TESTID-HANDOFF.md section 4.2.

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| Page load (validation card step 2) | `GET /devices/ip-address` | Gateway `https://gateway-dev-emi.dg-cash.app`; Login/api/signin/LoginApiFullFlow.spec.ts |
| Device registration | `POST /devices/uuid` | Returns `uuid`; idempotent; body has ipAddress, platform web, deviceId, applicationId, model (helpers/loginApi.ts) |
| Log In | `POST /auth/signin` | Body `username=+966<mobile>`, `password`, `tenantNumber`. Needs a valid `device-finger-print` header or the gateway returns an empty HTTP 412 (support/deviceFingerprint.ts). Response has `accessToken{token, expirationDuration, tenantNumber, userId, profileId, username}`, `refreshToken`, `otpRequired` |
| Verify OTP | `POST /auth/verify/otp` | Auto-submits on last digit; api/signin/LoginApiVerifyOtp.spec.ts |
| Status results | 200 ok, 404 unknown mobile, 403 wrong password, 423 locked (merchant2 E9306), 409 NAFATH/WATHIQ expired | Login-Test-Plan.md sections 4, 6; document-expiry spec |
| Reset password submit | endpoint not recorded in the repo | See Open questions |
| Localised errors | headers `Accept-Language` / `locale` = `en_uk` or `ar_sa` | api/signin/LoginApiLocalization.spec.ts |
| Admin status change | Admin Portal deactivate / activate account, then sign-in rejected / allowed | integration/LoginAdminStatusIntegration.spec.ts LG-INT-01 to 04 |

## Known gaps and product defects

| Item | Evidence |
|---|---|
| Company field, Sign Up link, Forgot link, language, theme have no testids; company field uses a role locator | pageElements/Shared/LoginPage.ts comments; QA-DATA-TESTID-HANDOFF.md section 4.1 |
| Reset-password testids (`reset-password-*`) are used by code but missing from the handoff doc | Login-Test-Plan.md section 2; Login.generated.md |
| RTL: +966 prefix/flag position does not match expectation (skipped) | ui/LoginLocalization.spec.ts LG-L10N-05 |
| OS dark colour scheme not honoured on first load (skipped) | LoginLocalization.spec.ts LG-L10N-09 |
| App does not return to the originally requested page after login (fixme) | LoginSessionLifecycle.spec.ts LG-SESS-06 |
| Whitespace-only password keeps button disabled: business decision pending (skipped) | LoginEdgeCases.spec.ts LG-EDGE-01 |
| Redirect when OTP disabled cannot occur (EMI-4625); case likely obsolete (skipped) | LoginValidationCard.spec.ts LG-62 |
| Many account-state tests skip because `LOCKED_*`, `DEACTIVATED_*`, `AML_*`, `LOCKOUT_*`, `EXPIRED_PW_*`, `PENDING_*`, `REJECTED_*`, `NAFATH/WATHIQ_EXPIRED_*` are not provisioned | Login-Test-Plan.md sections 6, 9 |
| 14 pending placeholders (LG-154, 155, 160 to 170, 137) with blockers | Login/functional/06-pending/LoginPendingCases.spec.ts |
| First-login accounts are finite (17) and a consumed one cannot be reset from the suite | Login-Test-Plan.md section 10 risk 4 |
| Duplicate checks across several files; LoginHappyPath repeats a login per widget | Login/README.md Known weaknesses |
| Direct `/auth/signin` API specs not re-run since the 412 fix | Login-Test-Plan.md section 10 risk 9 |
| Pos/Registration helpers still send the fake fingerprint value | Login-Test-Plan.md section 10 risk 9 |
| Visual tests for the OTP screen and dark theme skipped | Login-Test-Plan.md section 9 |

## Open questions

| Question | Why open |
|---|---|
| Lockout duration and unlock mechanism | Not specified (business-knowledge part1) |
| Idle-session timeout value | Not defined (pending LG-161) |
| Is whitespace allowed in the password? | LG-EDGE-01 skipped |
| Login OTP length: 6 digits (LG-OTPX-01 wording) or 8 (`invalidOtp` is 8 digits)? | Count of boxes is not asserted |
| Which message appears when the new password equals the default? | Form may block it or the server rejects it; test records either (LG-FIRST-18) |
| Exact toast wording for each failure (wrong password, locked, deactivated, AML) in EN/AR | Specs assert only "a toast, no technical words" |
| Endpoint called by the Reset password submit | Not in any spec or doc read |
| Pending-account and rejected-account screens: what does the user see? | `PENDING_*`, `REJECTED_*` accounts not provisioned; no pending/pending-approval screen is described in the repo (LoginAccountStates only checks sign-in outcome) |
| Precedence when NAFATH and WATHIQ are both expired | LG-137 pending |
| Where "Sign Up" leads (URL) | Test only asserts it leaves the login URL |
| Single- vs multi-session policy actually enforced | LG-SESS-08 only records the outcome |
