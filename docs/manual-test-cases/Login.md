# Manual Test Cases — Login

Context: the Login feature is the Business-portal sign-in flow at `/business/auth/login` (EMI/wallet web app). A user enters a Company Number, Mobile Number, and Password; on submit, a 3-step "Just a moment..." validation card runs (Verifying your credentials → Preparing this device → Securing your session), after which the user either lands on the Dashboard directly or is prompted for a one-time password (OTP), depending on whether OTP is enabled for the account/environment. Underneath the UI, sign-in is backed by a pre-auth device-registration chain (`GET /devices/ip-address` → `POST /devices/uuid`) followed by `POST /auth/signin` and, when applicable, `POST /auth/verify/otp`.

Priority key: **P1** = blocks the release / core happy path, **P2** = important secondary behavior, **P3** = edge case / polish.

---

## A. Page elements & layout

Context: static content and controls present on first load of the login page, before any interaction.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| LG-01 | Login URL loads | Navigate to `/business/auth/login` | Page loads at the login URL | P1 |
| LG-02 | Page title correct | Load the login page | Browser tab title is "EMI - Business" | P3 |
| LG-03 | Login form container visible | Load the login page | The login form box is visible | P1 |
| LG-04 | "Login" eyebrow text | Load the login page | An eyebrow label reading "Login" is shown above the form | P3 |
| LG-05 | Welcome heading | Load the login page | Heading reads "Welcome to MJD Pay" | P3 |
| LG-06 | Tagline text visible | Load the login page | A tagline/description sentence is visible below the heading | P3 |
| LG-07 | MJD Pay logo visible | Load the login page | The MJD Pay logo image is visible | P2 |
| LG-08 | Logo is a clickable link | Load the login page | The logo is wrapped in a clickable link | P3 |
| LG-09 | EN language button visible and active by default | Load the login page | "EN" button is visible and marked active (pressed) | P2 |
| LG-10 | Arabic language button visible, inactive by default | Load the login page | "العربية" button is visible and not marked active | P2 |
| LG-11 | Switching to Arabic activates it | Click the "العربية" button | Arabic button becomes active | P2 |
| LG-12 | Switching back to EN | With Arabic active, click "EN" | EN button becomes active again | P2 |
| LG-13 | Theme toggle visible | Load the login page | A "Switch theme" button is visible | P3 |
| LG-14 | Theme toggle changes appearance | Click the theme toggle | Page's visual theme (light/dark) changes | P3 |
| LG-15 | Company Number label visible | Load the login page | "Company" field label is visible | P3 |
| LG-16 | Company Number input enabled | Load the login page | Company number input is visible and enabled | P1 |
| LG-17 | Company Number placeholder | Load the login page | Input shows placeholder text "Eg. 153165659" | P3 |
| LG-18 | Company Number clear button appears when filled | Type a value into Company Number | A clear ("x") button appears on the field | P3 |
| LG-19 | Company Number clear button empties the field | Fill Company Number, click its clear button | Field value is cleared | P3 |
| LG-20 | Mobile Number label visible | Load the login page | "Mobile" field label is visible | P3 |
| LG-21 | Country flag shown | Load the login page | A country flag icon is shown next to the mobile field | P3 |
| LG-22 | Country code shown | Load the login page | Country code "(+966)" is displayed next to the mobile field | P2 |
| LG-23 | Mobile Number input enabled | Load the login page | Mobile input is visible and enabled | P1 |
| LG-24 | Password label visible | Load the login page | "Password" field label is visible | P3 |
| LG-25 | Password masked by default | Load the login page | Password input type is masked (`password`) | P1 |
| LG-26 | Show-password toggle visible | Load the login page | A show/hide password toggle button is visible | P2 |
| LG-27 | Forgot Password link visible | Load the login page | "Forgot Password?" link is visible | P2 |
| LG-28 | Log In button visible | Load the login page | "Log In" button is visible | P1 |
| LG-29 | Log In button disabled on load | Load the login page with all fields empty | "Log In" button is disabled | P1 |
| LG-30 | "New to MJD PAY?" text visible | Load the login page | Prompt text "New to MJD PAY?" is visible | P3 |
| LG-31 | Sign Up link visible | Load the login page | "Sign Up" link is visible | P2 |

---

## B. Form validation & button state

Context: the "Log In" button's enabled/disabled state and field-level input constraints.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| LG-32 | Disabled with all fields empty | Load the login page, submit nothing | "Log In" button is disabled | P1 |
| LG-33 | Disabled with only Company filled | Fill Company Number only | Button remains disabled | P2 |
| LG-34 | Disabled with only Mobile filled | Fill Mobile Number only | Button remains disabled | P2 |
| LG-35 | Disabled with only Password filled | Fill Password only | Button remains disabled | P2 |
| LG-36 | Disabled with Company + Mobile, no Password | Fill Company and Mobile, leave Password empty | Button remains disabled | P2 |
| LG-37 | Disabled with Company + Password, no Mobile | Fill Company and Password, leave Mobile empty | Button remains disabled | P2 |
| LG-38 | Disabled with Mobile + Password, no Company | Fill Mobile and Password, leave Company empty | Button remains disabled | P2 |
| LG-39 | Enabled when all three fields filled | Fill Company, Mobile, and Password with valid-looking values | Button becomes enabled | P1 |
| LG-40 | Disabled again after clearing Company | Fill all fields, then clear Company Number | Button becomes disabled again | P2 |
| LG-41 | Disabled again after clearing Mobile | Fill all fields, then clear Mobile Number | Button becomes disabled again | P2 |
| LG-42 | Disabled again after clearing Password | Fill all fields, then clear Password | Button becomes disabled again | P2 |
| LG-43 | Whitespace-only Company keeps button disabled | Enter only spaces into Company Number, fill Mobile and Password validly | Button remains disabled | P3 |
| LG-44 | Mobile too short (4 digits) | Fill Company/Password validly, enter a 4-digit mobile | Button remains disabled | P2 |
| LG-45 | Mobile one digit short (8 digits) | Enter an 8-digit mobile number | Button remains disabled | P2 |
| LG-46 | Mobile with leading zero rejected | Enter a mobile number with a leading `0` (10 digits total) | Button remains disabled | P2 |
| LG-47 | Mobile field truncates beyond 9 digits | Type a 10-digit mobile number | Field value is trimmed down to the first 9 digits | P2 |
| LG-48 | Mobile not starting with 5 rejected | Enter a valid-length mobile number starting with a digit other than 5 | Button remains disabled | P2 |
| LG-49 | Mobile field rejects letters | Type alphabetic characters into the Mobile field | Field stays empty / characters are not accepted | P2 |
| LG-50 | Mobile field rejects special characters | Type symbols (e.g. `!@#`) into the Mobile field | Field stays empty / characters are not accepted | P2 |
| LG-51 | Valid 9-digit mobile starting with 5 enables button | Enter a valid 9-digit mobile starting with 5, with other fields valid | Button becomes enabled | P1 |
| LG-52 | Show-password toggle reveals text | Enter a password, click the show-password toggle | Password field switches from masked to plain text | P2 |
| LG-53 | Show-password toggle re-masks on second click | With password revealed, click the toggle again | Password field re-masks | P2 |

---

## C. Validation card ("Just a moment...")

Context: after submitting valid-looking credentials, a modal card appears showing a 3-step progress sequence before OTP or dashboard redirect.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| LG-54 | "Just a moment..." heading appears on submit | Fill valid credentials and submit | A "Just a moment..." card appears | P1 |
| LG-55 | Subtitle text shown | Submit valid credentials | Card shows subtitle "We're preparing a secure session for this device." | P3 |
| LG-56 | All three step labels shown | Submit valid credentials | Card lists "Verifying your credentials", "Preparing this device", and "Securing your session" | P2 |
| LG-57 | Step 1 marked complete with checkmark | Submit valid credentials, observe the card | "Verifying your credentials" shows a checkmark/success indicator once done | P3 |
| LG-58 | Step 2 marked complete with checkmark | Submit valid credentials, observe the card | "Preparing this device" shows a checkmark/success indicator once done | P3 |
| LG-59 | Step 3 shows a spinner while in progress | Submit valid credentials, observe the card | "Securing your session" shows a spinner/loading indicator while active | P3 |
| LG-60 | Card dismisses after all steps complete | Submit valid credentials, wait | The "Just a moment..." card disappears once all 3 steps finish | P1 |
| LG-61 | Card does NOT appear on wrong password | Submit with a wrong password | "Just a moment..." card never appears | P1 |
| LG-62 | Redirect to dashboard when OTP is disabled | Submit valid credentials in an environment/account where OTP is disabled | After the card dismisses, the OTP dialog does not appear and the user is redirected to a non-login URL | P1 |
| LG-63 | OTP dialog appears when OTP is enabled | Submit valid credentials in an environment/account where OTP is enabled | After the card dismisses, an "Enter OTP" dialog appears with heading, instructions, input(s), Verify and Cancel buttons | P1 |

---

## D. OTP verification

Context: when OTP is enabled for the account, a one-time password dialog appears after the validation card. OTP digits arrive via SMS (in dev environments the OTP is always `00000000`).

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| LG-64 | OTP dialog displays after valid login | Submit valid credentials (OTP enabled) | OTP dialog with heading "Enter OTP" is shown | P1 |
| LG-65 | Verify button disabled when OTP empty | Open the OTP dialog, leave inputs empty | "Verify" button is disabled | P1 |
| LG-66 | Verify button disabled when OTP partially filled | Fill only some of the OTP digit inputs | "Verify" button remains disabled | P2 |
| LG-67 | Verify button enabled once all OTP digits filled | Fill every OTP digit input | "Verify" button becomes enabled | P1 |
| LG-68 | OTP input rejects non-numeric characters | Type a letter into an OTP digit input | Input does not accept the character; value stays empty | P2 |
| LG-69 | Focus auto-advances between OTP digits | Type a digit into the first OTP input | Focus automatically moves to the next input | P2 |
| LG-70 | Resend button disabled during countdown | Open the OTP dialog | "Click to resend" is disabled while a countdown timer is visible and running | P2 |
| LG-71 | Resend enabled after countdown expires and clears inputs | Wait for the countdown to reach zero, click Resend | Resend button becomes enabled; clicking it clears any entered OTP digits | P2 |
| LG-72 | Cancel closes the OTP dialog | Click "Cancel" on the OTP dialog | OTP dialog closes | P1 |
| LG-73 | Cancel returns to the login form | Click "Cancel" on the OTP dialog | User is returned to the login form with the "Log In" button visible | P1 |
| LG-74 | Wrong OTP keeps user on the OTP dialog | Enter an incorrect OTP (e.g. `11111111`), click Verify | Dialog remains open (does not redirect); an error is expected to surface | P1 |
| LG-75 | Correct OTP logs the user in | Enter the correct OTP (retrieved via SMS or, in dev, `00000000`), click Verify | User is redirected away from the login page to the dashboard | P1 |

---

## E. Happy path — successful login end to end

Context: full journey from empty login form through dashboard landing and logout, using a known-valid Company/Mobile/Password combination.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| LG-76 | Login form present on load | Load the login page | Company, Mobile, Password inputs and a disabled "Log In" button are all visible | P1 |
| LG-77 | Button enables once all fields are filled | Fill Company, Mobile, Password with valid values | "Log In" button becomes enabled | P1 |
| LG-78 | Validation card dismisses on valid login | Submit valid credentials | "Just a moment..." card disappears within a reasonable time | P1 |
| LG-79 | Redirect away from login on valid login | Submit valid credentials, complete OTP if prompted | Browser URL is no longer the login/auth URL | P1 |
| LG-80 | Dashboard sidebar logo and brand shown | Complete login | Sidebar shows the app logo and brand name | P2 |
| LG-81 | Dashboard sidebar navigation shown | Complete login | Sidebar shows Home, Transactions, and Payments navigation links | P2 |
| LG-82 | Header profile & notification icons shown | Complete login | Header shows a profile menu trigger and a notifications icon | P2 |
| LG-83 | Wallet balance widget shown | Complete login | Dashboard shows a wallet balance (SAR) widget | P2 |
| LG-84 | Last transactions widget shown | Complete login | Dashboard shows a "last transactions" section/container | P2 |
| LG-85 | Last login timestamp shown | Complete login | Dashboard shows the last-login timestamp text | P3 |
| LG-86 | Logout returns to login page | Complete login, then log out via the profile menu | User is returned to the login page URL | P1 |

---

## F. Invalid credentials

Context: submitting mismatched or unregistered credentials must fail safely, without redirecting or leaking details.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| LG-87 | Wrong password keeps user on login page | Submit a valid Company/Mobile with a wrong password | User remains on the login page URL | P1 |
| LG-88 | Wrong company number keeps user on login page | Submit an invalid Company Number with a valid Mobile/Password | User remains on the login page URL | P1 |
| LG-89 | Wrong mobile number keeps user on login page | Submit a valid Company/Password with an unregistered Mobile | User remains on the login page URL | P1 |
| LG-90 | All three fields wrong keeps user on login page | Submit an invalid Company, Mobile, and Password together | User remains on the login page URL | P1 |
| LG-91 | Error toast shown on wrong credentials | Submit any invalid credential combination | An error toast/snackbar appears | P1 |
| LG-92 | Unregistered mobile shows a generic error | Submit a valid Company/Password with a mobile number that isn't registered | An error toast appears | P1 |
| LG-93 | Not-registered error has no technical detail | Trigger the not-registered error (LG-92) | Toast detail text contains no stack trace, SQL, exception, or internal-system wording | P2 |
| LG-94 | Re-submitting after a failed attempt is allowed | Submit wrong credentials, observe the error, then resubmit | "Log In" button remains visible and enabled for another attempt | P2 |
| LG-95 | Field values preserved after a failed attempt | Submit wrong password, observe the error toast | Company and Mobile fields retain their previously entered values | P2 |
| LG-96 | Server 500 handled gracefully | Trigger a server error (500) on the sign-in call | An error toast is shown and the user remains on the login page (no crash, no blank screen) | P2 |

---

## G. Account status errors (locked / deactivated / AML)

Context: accounts in a restricted state must reject login with a generic message and must never proceed to the OTP step.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| LG-97 | Locked account rejected without OTP | Submit valid credentials for a locked account | An error toast is shown; the "Enter OTP" dialog never appears | P1 |
| LG-98 | Deactivated account rejected without OTP | Submit valid credentials for a deactivated account | An error toast is shown; the "Enter OTP" dialog never appears | P1 |
| LG-99 | AML-blocked account shows a generic rejection | Submit valid credentials for an AML-restricted account | A generic error toast is shown; the "Enter OTP" dialog never appears | P1 |
| LG-100 | AML/compliance detail not exposed | Trigger the AML rejection (LG-99) | Toast text contains no "AML", "compliance", "sanction", "blacklist", "suspicious", "investigation", or technical/internal wording | P1 |

---

## H. Navigation & links

Context: links and controls on the login page that route elsewhere or affect page-level state.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| LG-101 | Forgot Password link navigates correctly | Click "Forgot Password?" | Browser navigates to a forgot-password URL | P1 |
| LG-102 | Sign Up link navigates away from login | Click "Sign Up" | Browser navigates away from the login URL (to registration) | P1 |
| LG-103 | Logo link navigates to a valid page | Click the MJD Pay logo | Browser navigates to a valid page on the majdpay.com domain | P3 |
| LG-104 | Already-authenticated user is redirected away from login | With an active session, navigate directly to the login URL | User is redirected away from the login page (not shown the login form again) — verify current behavior, as this path is currently unconfirmed/disabled in automation | P2 |

---

## I. Security-relevant behavior

Context: cases guarding against enumeration, brute force, injection, and information disclosure.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| LG-105 | Account locks after repeated failed attempts | Submit a wrong password for the same account 3 times in a row, then submit the correct password | The account is locked out; even the correct password now shows an error toast and no OTP dialog | P1 |
| LG-106 | Wrong company vs. wrong mobile give identical response | Submit (a) a wrong company with a valid mobile/password, then (b) a valid company with a wrong mobile/password | Both attempts produce the same generic error behavior — no signal reveals which field was wrong (anti-enumeration) | P1 |
| LG-107 | Script injection in Company field is inert | Type `<script>alert(1)</script>` into the Company Number field, fill remaining fields, submit | No JavaScript dialog/alert fires; the raw script tag never renders as page content | P1 |
| LG-108 | Script injection in Password field is inert | Type `<script>alert(1)</script>` into the Password field | No JavaScript dialog/alert fires | P1 |
| LG-109 | Login request uses POST, not URL parameters | Submit valid credentials while inspecting network traffic | The sign-in request is a POST; neither the username/company nor password appear anywhere in the request URL | P1 |
| LG-110 | Failed-login error has no internal details | Submit clearly invalid credentials (bad company, bad mobile, bad password) | Any error message shown contains no stack trace, SQL, database, or internal exception text | P1 |

---

## J. API contract (sign-in chain)

Context: the login UI is backed by three API calls in sequence — device IP lookup, device UUID registration, and sign-in (with optional OTP verification). These are useful for manual API-level exploration (e.g. via Postman) alongside UI testing.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| LG-111 | GET /devices/ip-address succeeds | Call `GET /devices/ip-address` with standard headers | Returns 200 with JSON content-type and an `ipAddress` string field | P2 |
| LG-112 | POST /devices/uuid succeeds | Call `POST /devices/uuid` with a valid device payload (deviceId, platform, manufacturer, etc.) | Returns 200 with a `uuid` field in standard UUID format | P2 |
| LG-113 | POST /devices/uuid rejects empty body | Call `POST /devices/uuid` with an empty body | Returns 400/422 | P3 |
| LG-114 | POST /devices/uuid rejects missing deviceId | Call `POST /devices/uuid` omitting `deviceId` | Returns 400/422 | P3 |
| LG-115 | POST /auth/signin succeeds with valid credentials | Call `POST /auth/signin` with valid `username` (+966-prefixed mobile), `password`, `tenantNumber` | Returns 200 with an `accessToken` object containing `token`, `expirationDuration`, `profileId`, `username`, `userId`, `tenantNumber` | P1 |
| LG-116 | accessToken.tenantNumber matches submitted tenant | Inspect the sign-in response from LG-115 | `accessToken.tenantNumber` equals the submitted `tenantNumber` | P2 |
| LG-117 | accessToken.expirationDuration is a positive number | Inspect the sign-in response from LG-115 | `expirationDuration` is a positive numeric value | P3 |
| LG-118 | POST /auth/signin rejects empty body | Call `POST /auth/signin` with an empty body | Returns 400/422 | P2 |
| LG-119 | POST /auth/signin rejects missing username | Call `POST /auth/signin` omitting `username` | Returns 400/422 | P2 |
| LG-120 | POST /auth/signin rejects missing password | Call `POST /auth/signin` omitting `password` | Returns 400/422 | P2 |
| LG-121 | POST /auth/signin rejects missing tenantNumber | Call `POST /auth/signin` omitting `tenantNumber` | Returns 400/422 | P2 |
| LG-122 | POST /auth/signin returns 401 on wrong password | Call `POST /auth/signin` with a valid username/tenant and wrong password | Returns 401 | P1 |
| LG-123 | POST /auth/signin returns 401 on unrecognised tenant | Call `POST /auth/signin` with an unrecognised `tenantNumber` | Returns 401 | P1 |
| LG-124 | POST /auth/signin returns 401 on unrecognised username | Call `POST /auth/signin` with an unrecognised mobile/username | Returns 401 | P1 |
| LG-125 | POST /auth/signin rejects mobile without country code | Call `POST /auth/signin` with `username` missing the `+966` prefix | Returns 400 or 401 | P2 |
| LG-126 | GET /auth/signin is not a valid method | Call `GET /auth/signin` | Does not return 200 (method not allowed / not found) | P2 |
| LG-127 | POST /auth/verify/otp succeeds with correct OTP | After a valid sign-in, call `POST /auth/verify/otp` with the correct OTP and bearer token | Returns 200/201 | P1 |
| LG-128 | POST /auth/verify/otp rejects incorrect OTP | Call `POST /auth/verify/otp` with a wrong OTP and valid bearer token | Returns 401 | P1 |
| LG-129 | POST /auth/verify/otp rejects missing OTP field | Call `POST /auth/verify/otp` with an empty body and valid bearer token | Returns 400/422 | P2 |
| LG-130 | POST /auth/verify/otp rejects missing auth header | Call `POST /auth/verify/otp` with a valid OTP but no Authorization header | Returns 401 | P2 |
| LG-131 | Full pre-auth + sign-in chain succeeds end to end | Call IP lookup → device UUID registration → sign-in in sequence with valid data | Each step returns success and the final sign-in response contains a non-empty `accessToken.token` | P1 |

---

## Automated coverage note

This manual test suite mirrors the existing Playwright automation for the Login feature. The corresponding automated specs are:

- `BusinessTestCases/login/ui/LoginPage.spec.ts` — page elements & layout (Section A)
- `BusinessTestCases/login/functional/LoginFormValidation.spec.ts` — button state & field validation (Section B)
- `BusinessTestCases/login/ui/LoginValidationPopup.spec.ts` — validation card UI (Section C)
- `BusinessTestCases/login/functional/LoginOtpFlow.spec.ts` — validation card negative/detail cases and OTP verification (Sections C & D)
- `BusinessTestCases/login/functional/LoginHappyPath.spec.ts` — end-to-end successful login and dashboard landing (Section E)
- `BusinessTestCases/login/functional/LoginInvalidCredentials.spec.ts` — invalid credentials, account status errors, and edge cases (Sections F & G)
- `BusinessTestCases/login/functional/LoginNavigation.spec.ts` — navigation links and already-authenticated redirect (Section H)
- `BusinessTestCases/login/functional/LoginSecurity.spec.ts` — lockout, enumeration, XSS, POST-only, and error-detail checks (Section I)
- `BusinessTestCases/login/api/LoginAPIFlow.spec.ts` — device/sign-in/OTP API contract (Section J)

Supporting helpers referenced by these specs: `BusinessTestCases/login/LoginHelper.ts` (test data, OTP retrieval via MongoDB, login helpers) and `BusinessTestCases/pageElements/LoginPage.ts` (the page object for all locators and actions used above).
