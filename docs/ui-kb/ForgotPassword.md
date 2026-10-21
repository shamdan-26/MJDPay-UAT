# ForgotPassword - UI logic

Lets a Business user who forgot the password identify the account (company + mobile), choose a new password, confirm with an OTP and return to Login.
Locators: [ForgotPassword.generated.md](ForgotPassword.generated.md) (`ForgotPasswordPage`). The OTP modal uses `OtpPage` (see Shared.md).

| Item | Value | Source |
|---|---|---|
| Route step 1 | `/business/auth/forgot-password` | ForgotPassword/ForgotPasswordHelper.ts:9 |
| Route step 2 | URL contains `change-password` (`/business/auth/change-password`) | ForgotPasswordStep1.spec.ts:66; ForgotPasswordAPIFlow.spec.ts:21 |
| Route after success | Login (`/business/auth/login`) | ForgotPasswordHappyPath.spec.ts:34 |
| Who can see it | Anyone not signed in; reached from the Login link "Forgot Password?" | Login/functional/04-session/LoginNavigation.spec.ts (LG-101) |
| Page title | `EMI - Business` | ui/ForgotPasswordStep1Ui.spec.ts:23 |
| Default language | Arabic (AR button active on load) | ui/ForgotPasswordStep1Ui.spec.ts:51 |

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| Step 1 - identify account | `/business/auth/forgot-password` | Header: `logoImage`, `logoLink`, `enButton`, `arabicButton`, `themeToggle` | Top | Brand, language, theme |
| Step 1 | same | `backButton` | Top of card | Returns to Login |
| Step 1 | same | Eyebrow "Forgot password" / title "Welcome to MJD Pay" | Card heading | Titles (AR: " نسيت كلمة المرور " / " مرحباً بك في MJD Pay ") |
| Step 1 | same | `companyInput`, `mobileInput` (with flag and (+966)), `nextButton` | Card body | Identity form |
| Step 1 | same | `loginLink` | Card bottom | Back to Login |
| Step 2 - new password | `/business/auth/change-password` | Heading "Forgot Password", subtitle "Create A New Password, Follow Password Regulation", `backButton` | Card heading | Titles |
| Step 2 | same | `newPasswordInput`, `confirmPasswordInput`, 2 show toggles | Card body | Password form |
| Step 2 | same | Requirements list (6 items) | Under New Password, appears while typing | Live password policy |
| Step 2 | same | `resetPasswordButton` | Card bottom | Submit |
| OTP modal | same URL, `div.my-modal-container` | Heading "Enter OTP", instruction (mentions the Change Password Process), 6 boxes, timer, "Didn't Receive Code?", `resendButton`, `cancelButton`, `verifyButton` (labelled "Confirm"), `closeButton` (x) | Centre modal | Confirms the reset |

## Forms

### Step 1 - identify account

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Company number | `companyInput` | text, placeholder "Input here" / "أدخل هنا" | Yes | Alphanumeric (e.g. V7204, A2316); spaces-only keeps Next disabled; very long text does not crash the page | Server rejection shown as toast | Always |
| Mobile number | `mobileInput` | text with (+966) prefix, placeholder "أدخل هنا" | Yes | 9 digits starting with 5; short (4 digits) or leading 0 keeps Next disabled; letters and special characters ignored; spaces and dashes stripped | None on field | Always |
| Next | `nextButton` | button | - | Disabled when either field is empty or invalid; re-disabled when a field is cleared | - | Both fields valid |

Sources: functional/ForgotPasswordStep1.spec.ts; ui/ForgotPasswordStep1Ui.spec.ts; manual-test-cases/ForgotPassword.md (FP-10 to FP-27).

### Step 2 - new password

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| New Password | `newPasswordInput`, placeholder "Input Password" | password | Yes | At least 8 characters; lowercase; uppercase; numbers; special characters; no spaces. Leading/trailing space is not trimmed into validity; Arabic-only letters do not satisfy the case rules; a 256-char valid password does not crash | Requirement list under the field: "Your password must contain:", "At least 8 characters", "Should contain lowercase", "Should contain uppercase", "Should contain numbers", "Should contain special characters", "Should not contain spaces" | Always |
| Show New Password | `showNewPasswordToggle` | button | No | Switches type password / text | - | Always |
| Confirm Password | `confirmPasswordInput`, placeholder "Input Password" | password | Yes | Must equal New Password, case-sensitive | "New password and Confirm password are not matched" | Always |
| Show Confirm Password | `showConfirmPasswordToggle` | button | No | Switches type | - | Always |
| Reset Password | `resetPasswordButton` (also `saveButton` regex) | submit | - | Disabled until both fields filled, policy met and match; Enter key submits; correcting a mismatch re-enables it | - | New and Confirm valid and equal |

Sources: functional/ForgotPasswordStep2.spec.ts; functional/ForgotPasswordPasswordPolicy.spec.ts (FP-88 to FP-92); ui/ForgotPasswordStep2Ui.spec.ts.

### OTP modal

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| OTP code | `OtpPage.inputs` (6 boxes) | 6 single-digit inputs | Yes | Digits only; first box focused on open; focus moves forward on each digit | Error indicator after a wrong code, no technical text | Always |
| Confirm | `OtpPage.verifyButton` | button | - | Disabled until all 6 boxes are filled | - | 6 digits entered |
| Resend | `OtpPage.resendButton` ("Click to resend") | button | - | Disabled while the MM:SS countdown runs; after it ends, enabled and clears the boxes | - | Countdown finished |
| Cancel / close | `OtpPage.cancelButton`, `closeButton` | buttons | - | Closes the modal, stays on change-password with form intact, can re-submit | - | Always |

Sources: ui/ForgotPasswordOtpPage.spec.ts; functional/ForgotPasswordOtpFunctionality.spec.ts.

## Tables and lists

Not applicable. The module has no tables or lists.

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| `backButton` (step 1) | Step 1 | Goes to Login | Always | `/business/auth/login` |
| `backButton` (step 2) | Step 2 | Goes back to step 1 with Company and Mobile still filled | Always | Step 1 |
| `logoLink` | Step 1 | Leaves the page | Always | Away from forgot-password |
| `loginLink` | Step 1 | Link to Login | Always | Login |
| `nextButton` | Step 1 | Calls `POST /auth/passwords/forget`, then loads OTP settings | Both fields valid | Step 2 (change-password), step-1 fields hidden |
| `resetPasswordButton` | Step 2 | Submits new password; opens OTP modal (when OTP is enabled) | See form | OTP modal; if OTP disabled, straight to Login |
| `verifyButton` | OTP modal | Confirms the OTP | 6 digits entered | Login, with a success toast |
| `resendButton` | OTP modal | Sends a new code; the older code stops working | After countdown | Same modal |
| `cancelButton` / `closeButton` | OTP modal | Closes the modal | Always | Back to step 2 |
| `enButton` / `arabicButton` | Header | Language switch; `aria-pressed` shows active | Always | RTL/LTR; Arabic persists from step 1 to step 2 |
| `themeToggle` | Header | Light/dark; theme survives language switch | Always | Same page |

Sources: ui/ForgotPasswordStep1Ui.spec.ts; functional/ForgotPasswordStep2.spec.ts; ForgotPasswordOtpFunctionality.spec.ts; ui/ForgotPasswordLocalization.spec.ts (FP-103 to 105).

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| Step 1 valid identity | Moves to change-password; New and Confirm visible; Company and Mobile hidden | ForgotPasswordStep1.spec.ts:63-86 |
| Step 1 identity rejected (unknown company or mobile, blocked account) | Stays on step 1, values kept, error toast, no step 2, no OTP modal, heading still visible | ForgotPasswordStep1.spec.ts:188-225; ForgotPasswordAccountStates.spec.ts (FP-85, FP-86) |
| Step 1 server error (500) or network failure | Stays on step 1, no technical text, form usable, retry works | ForgotPasswordResilience.spec.ts (FP-93 to FP-95) |
| Direct visit to the change-password URL without step 1 | New Password form is not shown | manual-test-cases/ForgotPassword.md FP-37 |
| Password breaks any policy rule | Reset Password stays disabled | ForgotPasswordStep2.spec.ts:53-80 |
| Passwords differ (also by case) | Mismatch text shown, button disabled | ForgotPasswordStep2.spec.ts:48, 245 |
| OTP modal open, countdown running | Resend disabled | ForgotPasswordOtpPage.spec.ts:96 |
| Wrong OTP | Modal stays open, error indicator, no technical text; resubmit allowed | ForgotPasswordOtpFunctionality.spec.ts:58-91 |
| OTP already used, or replaced by a resend | Refused; modal stays | ForgotPasswordOtpLifecycle.spec.ts (FP-E2E-03, FP-97) |
| Repeated wrong OTP (test tries up to 6) | Recovery locks; the correct code no longer completes the reset | ForgotPasswordOtpLifecycle.spec.ts (FP-E2E-04) |
| Reset API fails (400/500) | Stays on the page (not Login), error toast, data kept, retry allowed | ForgotPasswordHappyPath.spec.ts:45; ForgotPasswordResilience.spec.ts (FP-96) |
| OTP disabled for FORGET_PASSWORD | No OTP modal; specs skip | ForgotPasswordHelper.ts `gotoOtpModal`, `mockOtpDisabled` |
| Arabic selected | RTL layout | ForgotPasswordLocalization.spec.ts (FP-103) |

## Business rules

| Rule | Detail | Source |
|---|---|---|
| Identity | Company number + mobile (+966 added by the app) | ForgotPasswordAPIFlow.spec.ts:20-37 |
| Policy | At least 8 chars, lower, upper, digit, special, no spaces (legacy baseline); admin-configurable policy, reuse ban for last 3 passwords | business-knowledge part2 lines 150-159 |
| OTP is mandatory on every password flow | Forgot password is OTP-gated | business-knowledge part2 line 152 |
| Anti-enumeration | Unknown company and unknown mobile give the same status and message; no stack/SQL text; rejection echoes no input and issues no credentials | manual ForgotPassword.md FP-39, FP-81, FP-85, FP-87, FP-102 |
| Blocked account | Cannot start a reset | ForgotPasswordAccountStates.spec.ts (FP-86) |
| After success | User lands on Login; sign-in works with the new password | ForgotPasswordPostReset.spec.ts (FP-E2E-01) |
| Dedicated test accounts | `VALID_COMPANY V7204 / VALID_MOBILE 599995846`; blocked `A3713 / 599834420` | ForgotPasswordHelper.ts:14-23 |
| Tests that change the password must put it back | Convention | ForgotPassword/README.md |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| Step 1 headings | EN "Forgot password", "Welcome to MJD Pay"; AR "نسيت كلمة المرور", "مرحباً بك في MJD Pay" | Step 1 card |
| Labels | AR "رقم الشركة", "رقم الجوال"; placeholder "أدخل هنا" | Step 1 |
| Step 2 heading | "Forgot Password"; "Create A New Password, Follow Password Regulation" | Step 2 |
| Typing in New Password | "Your password must contain:" + 6 requirement lines (see form) | Under New Password |
| Mismatch | "New password and Confirm password are not matched" | Under Confirm Password |
| Step 1 rejection | Error toast; text not asserted (only no technical words) | `toast-message` |
| OTP modal | "Enter OTP" / "أدخل رمز التحقق"; instruction mentioning "Change Password Process"; "Code ends in MM:SS"; "Didn't Receive Code?"; "Click to resend" / "انقر لإعادة الإرسال" | OTP modal |
| Wrong OTP | "Invalid OTP. Please try again." (EN); AR "رمز التحقق غير صحيح" | OTP modal |
| Success | Success toast, text not recorded | After redirect to Login |
| Reset fails | Error toast; mocked body "Unable to reset password" | Step 2 |

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| Next (step 1) | `POST /auth/passwords/forget` | Body `{companyNumber, mobileNumber:"+966..."}`. 200 valid; 400 missing field/empty body/no country code; 401 unknown company, unknown mobile or both (same status); GET refused; injection and wrong types return 4xx; JSON content-type |
| After step 1 | `GET /otp/otp-settings/q?operationCode=FORGET_PASSWORD` | 200; invalid op 400/404; missing param 400 |
| Reset Password / OTP Confirm | `/auth/passwords/*` (non-forget path) | Exact path not recorded; mocked as 400 in failure tests (`mockPasswordResetFailure`) |
| OTP value in tests | read via `getOtpFromDb` | Dev accepts fixed `918512` |

Sources: api/ForgotPasswordAPIFlow.spec.ts; security/ForgotPasswordApiSecurity.spec.ts; ForgotPasswordHelper.ts.

## Known gaps and product defects

| Item | Evidence |
|---|---|
| `FP-E2E-02` (old session refused after reset) is `fixme`: needs a token-protected endpoint and token field name | ForgotPassword/README.md |
| Two earlier unexplained skips are now `fixme` with a note | ForgotPassword/README.md |
| Reset by email / national ID and notification content are not in the UI (manual `FP-E2E-05`) | ForgotPassword/README.md |
| No testids for company/mobile/password fields or Next/Save buttons; role locators used | pageElements/ForgotPassword/ForgotPasswordPage.ts:51 note; QA-DATA-TESTID-HANDOFF.md |
| Helper BASE_URL default is `https://uat.majdpay.com` while Login uses dev; `abortUnmockedGatewayRequests` aborts only `gateway-uat.majdpay.com` | ForgotPasswordHelper.ts:7, 90 |
| Step order differs between documents: manual case and business rule say OTP before the new password; the specs drive password then OTP modal | manual ForgotPassword.md line 3 vs ForgotPasswordHelper.ts `gotoOtpModal` |
| Back button locator is `main button` first; fragile | ForgotPasswordPage.ts:34 |

## Open questions

| Question | Why open |
|---|---|
| Is the OTP shown before or after the new-password form in the real app? | Docs and specs disagree (see gaps) |
| Exact endpoint for the final reset submit and its error codes | Only a wildcard `/auth/passwords/**` is mocked |
| Exact success and error toast wording (EN/AR) | Specs assert presence only |
| OTP expiry length and the real attempt limit before lock | Test loops up to 6; business value not stated |
| Does the password-reuse ban (last 3) apply to this flow? | Business rule exists, no test |
| Why is the OTP disabled in some environments? | Specs skip when the modal does not appear |
