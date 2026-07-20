# Automation Registry

This file serves as our central, living registry for all automated test suites and individual test cases currently written in the project.

<!-- AUTOMATION_REGISTRY_START -->

## 1. Authentication (Login)
**File Reference:**
`BusinessTestCases/Login/api/LoginAPIFlow.spec.ts`
`BusinessTestCases/Login/functional/LoginFormValidation.spec.ts`
`BusinessTestCases/Login/functional/LoginInvalidCredentials.spec.ts`
`BusinessTestCases/Login/functional/LoginOtpFlow.spec.ts`
`BusinessTestCases/Login/functional/LoginHappyPath.spec.ts`
`BusinessTestCases/Login/functional/LoginNavigation.spec.ts`
`BusinessTestCases/Login/functional/LoginSecurity.spec.ts`
`BusinessTestCases/Login/ui/LoginPage.spec.ts`
`BusinessTestCases/Login/ui/LoginValidationPopup.spec.ts`

### `Login/api/LoginAPIFlow.spec.ts`
*(3-step pre-auth + sign-in chain: GET /devices/ip-address → POST /devices/uuid → POST /auth/signin → POST /auth/verify/otp)*

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| API-01: should return 200 | Positive | Asserts `GET /devices/ip-address` returns HTTP 200. |
| API-01a: response should contain an ipAddress field | Positive | Asserts the response body has a non-empty string `ipAddress` field. |
| API-01b: response should use JSON content-type | Positive | Asserts the `content-type` header matches `application/json`. |
| API-02: should return 200 with a UUID | Positive | Asserts `POST /devices/uuid` returns 200 with a body containing a `uuid` property. |
| API-02a: uuid should be a non-empty string in UUID format | Positive | Asserts `uuid` matches the standard UUID regex format. |
| API-02b: response should use JSON content-type | Positive | Asserts the content-type header is JSON. |
| API-N1: should return 400 when body is empty | Negative | Asserts an empty request body is rejected with 400/422. |
| API-N2: should return 400 when deviceId is missing | Negative | Asserts a missing `deviceId` field is rejected with 400/422. |
| API-03: should return 200 with valid credentials | Positive | Asserts sign-in with a valid username/password/tenant returns 200. |
| API-03a: response body should contain an accessToken object | Positive | Asserts `accessToken` carries `token`, `expirationDuration`, `profileId`, `username`, `userId`, and `tenantNumber`. |
| API-03b: accessToken.token should be a non-empty string | Positive | Asserts the token field is a non-empty string. |
| API-03c: accessToken.tenantNumber should match the submitted tenant | Positive | Asserts the returned `tenantNumber` equals the submitted value. |
| API-03d: accessToken.expirationDuration should be a positive number | Positive | Asserts `expirationDuration` is numeric and greater than 0. |
| API-03e: response should use JSON content-type | Positive | Asserts the content-type header is JSON. |
| API-N3: should return 400 when body is empty | Negative | Asserts an empty sign-in body is rejected with 400/422. |
| API-N4: should return 400 when username is missing | Negative | Asserts a missing `username` is rejected with 400/422. |
| API-N5: should return 400 when password is missing | Negative | Asserts a missing `password` is rejected with 400/422. |
| API-N6: should return 400 when tenantNumber is missing | Negative | Asserts a missing `tenantNumber` is rejected with 400/422. |
| API-N7: should return 401 with a wrong password | Negative | Asserts a wrong password returns 401. |
| API-N8: should return 401 with an unrecognised tenant number | Negative | Asserts an unknown `tenantNumber` returns 401. |
| API-N9: should return 401 with an unrecognised username | Negative | Asserts an unregistered username returns 401. |
| API-N10: should return 400 or 401 when mobile is sent without +966 country code | Negative | Asserts a mobile number missing the country code is rejected with 400/401. |
| API-S1: error response should not expose stack traces or database details | Negative | Asserts the error response body for wrong credentials doesn't match stack/exception/sql/ORA-/JDBC patterns. |
| API-S2: error status should be identical whether tenant or username is wrong (prevents enumeration) | Negative | Asserts a wrong-tenant attempt and a wrong-username attempt return the same HTTP status. |
| API-S3: GET to /auth/signin must not return 200 — credentials must not appear in URLs | Negative | Asserts a `GET` on the sign-in endpoint does not return 200. |
| API-04: should return 200 with valid OTP (dev env — OTP is 00000000) | Positive | Asserts OTP verification with the correct OTP and a bearer token returns 200/201 (skipped if sign-in produced no access token). |
| API-N11: should return 401 with an incorrect OTP | Negative | Asserts an incorrect OTP returns 401. |
| API-N12: should return 400 when OTP field is missing | Negative | Asserts a missing `otp` field returns 400/422. |
| API-N13: should return 401 when Authorization header is missing | Negative | Asserts a missing `Authorization` header returns 401. |
| API-FLOW-01: should complete the full pre-auth and sign-in chain successfully | Positive | Chains IP lookup → device UUID registration → sign-in, asserting each step succeeds and the final access token is non-empty. |

### `Login/functional/LoginFormValidation.spec.ts`

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| should be disabled when all fields are empty | Negative | Asserts the Log In button is disabled with an empty form. |
| should be disabled when only company number is filled | Negative | Asserts the Log In button stays disabled with only company number filled. |
| should be disabled when only mobile number is filled | Negative | Asserts the Log In button stays disabled with only mobile filled. |
| should be disabled when only password is filled | Negative | Asserts the Log In button stays disabled with only password filled. |
| should be disabled when company and mobile are filled but not password | Negative | Asserts the button stays disabled missing only the password. |
| should be disabled when company and password are filled but not mobile | Negative | Asserts the button stays disabled missing only the mobile number. |
| should be disabled when mobile and password are filled but not company | Negative | Asserts the button stays disabled missing only the company number. |
| should be enabled when all three fields are filled | Positive | Asserts the Log In button becomes enabled once all three fields are filled. |
| should be disabled again after clearing the company number field | Negative | Asserts the button re-disables after clearing company number post-fill. |
| should be disabled again after clearing the mobile number field | Negative | Asserts the button re-disables after clearing mobile number post-fill. |
| should be disabled again after clearing the password field | Negative | Asserts the button re-disables after clearing password post-fill. |
| should keep Log In button disabled when mobile is too short (4 digits) | Negative | Asserts the button stays disabled for a 4-digit mobile number. |
| should keep Log In button disabled when mobile is 8 digits (one short of minimum) | Negative | Asserts the button stays disabled for an 8-digit mobile number. |
| should keep Log In button disabled when mobile has a leading zero | Negative | Asserts the button stays disabled for a mobile number starting with 0. |
| should trim the mobile field to 9 digits when more than 9 are entered | Negative | Asserts entering 10 digits results in the field holding only the first 9. |
| should keep Log In button disabled when mobile does not start with 5 | Negative | Asserts the button stays disabled when the mobile number doesn't start with 5. |
| should not accept alphabetic characters in the mobile field | Negative | Asserts typed alphabetic characters leave the mobile field empty. |
| should not accept special characters in the mobile field | Negative | Asserts typed special characters leave the mobile field empty. |
| should enable the Log In button with a valid 9-digit mobile starting with 5 | Positive | Asserts the button is enabled for a valid 9-digit mobile number starting with 5. |
| should reveal password text when the show password toggle is clicked | Positive | Asserts the password input's `type` changes from `password` to `text` on toggle click. |
| should re-mask password when the toggle is clicked a second time | Positive | Asserts a second toggle click reverts the input's `type` back to `password`. |

### `Login/functional/LoginInvalidCredentials.spec.ts`

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| should stay on the login page with a wrong password | Negative | Asserts the URL remains the login URL after submitting a wrong password. |
| should stay on the login page with a wrong company number | Negative | Asserts the URL remains the login URL after submitting a wrong company number. |
| should stay on the login page with a wrong mobile number | Negative | Asserts the URL remains the login URL after submitting a wrong mobile number. |
| should stay on the login page when all three credentials are wrong | Negative | Asserts the URL remains the login URL when company, mobile, and password are all wrong. |
| should display an error toast after submitting wrong credentials | Negative | Asserts an error toast is displayed via `assertToast`. |
| should display an error when credentials are not registered | Negative | Asserts a toast error appears for an unregistered/randomly generated mobile number. |
| should not expose technical details in the not-registered error message | Negative | Asserts the toast detail text doesn't match stack/exception/sql/database/internal patterns. |
| should display an error and not show OTP for a locked account | Negative | Asserts a toast error appears and the OTP heading stays hidden after submit. *(Uses the standard `VALID_*` credentials rather than a dedicated locked-account fixture — no distinct locked test account exists in this environment.)* |
| should display an error and not show OTP for a deactivated account | Negative | Same pattern as above — asserts toast + hidden OTP heading, again using `VALID_*` credentials rather than a dedicated deactivated account. |
| should display a generic rejection for an AML-blocked account | Negative | Same pattern — asserts toast + hidden OTP heading, using `VALID_*` credentials rather than a dedicated AML-blocked account. |
| should not expose AML or compliance details in the error message | Negative | Asserts the toast detail text doesn't match aml/compliance/sanction/blacklist/suspicious/investigation or stack/sql/database/internal patterns. |
| should keep Log In button disabled when company number contains only whitespace | Negative | Asserts the button stays disabled when the company field holds only spaces. |
| *(skipped)* should keep Log In button disabled when password contains only whitespace | Negative | `test.skip`'d in code; intended to assert the button stays disabled when the password field holds only spaces. |
| should stay on the login page when correct company is paired with wrong mobile and wrong password | Negative | Asserts the URL stays on the login page for a correct company with wrong mobile/password. |
| should display an error toast and remain on the login page when the server returns a 500 | Negative | Mocks `/auth/signin` to return HTTP 500 and asserts a toast appears while the URL stays on the login page. |
| should allow re-submitting the form immediately after a failed login attempt | Negative | Asserts the Log In button remains visible and enabled for an immediate retry after a failed attempt. |
| should preserve field values after a failed login attempt | Negative | Asserts the company and mobile fields retain their entered values after a failed submit. |

### `Login/functional/LoginOtpFlow.spec.ts`
*(the whole "OTP Flow" describe block is skipped when the OTP dialog doesn't appear — i.e. when Login OTP is disabled in the environment)*

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| should display the OTP dialog after submitting valid credentials | Positive | Asserts the OTP heading is visible after a valid submit. |
| should have Verify button disabled when OTP inputs are empty | Negative | Asserts the Verify button is disabled with all OTP boxes empty. |
| should keep Verify button disabled when OTP inputs are partially filled | Negative | Asserts the Verify button stays disabled with only 2 of the OTP boxes filled. |
| should enable Verify button when all OTP inputs are filled | Positive | Asserts the Verify button becomes enabled once every OTP box is filled. |
| should not accept non-numeric characters in OTP inputs | Negative | Asserts typing a letter into an OTP box leaves it empty. |
| should auto-advance focus to the next input when a digit is entered | Positive | Asserts focus moves to the next OTP box after a digit is entered into the first. |
| should have Click to resend button disabled while the countdown is active | Negative | Asserts the resend button is disabled and the countdown timer is visible. |
| should enable resend button after countdown expires and clear inputs on click | Positive | Waits out the countdown, asserts the resend button becomes enabled, and clicking it clears the OTP inputs. |
| should close the OTP popup when Cancel is clicked | Positive | Asserts the OTP heading is no longer visible after clicking Cancel. |
| should return to the login form when Cancel is clicked | Positive | Asserts the "Log In" button is visible again after cancelling the OTP dialog. |
| should remain on the OTP popup after submitting a wrong OTP | Negative | Asserts the OTP heading stays visible after submitting an incorrect OTP. |
| should log in successfully and redirect when the correct OTP is entered | Positive | Fetches the real OTP from MongoDB and asserts the page navigates away from `/auth/login` after verification. |
| should NOT display the validation card when login fails with wrong password | Negative | Asserts the "Just a moment..." validation card never appears after a failed login. |
| should mark step 1 "Verifying your credentials" as complete with a checkmark | Positive | Asserts a checkmark/success icon appears next to step 1 of the validation card. |
| should mark step 2 "Preparing this device" as complete with a checkmark | Positive | Asserts a checkmark/success icon appears next to step 2 of the validation card. |
| should show a spinner on step 3 "Securing your session" while it is in progress | Positive | Asserts a spinner/loader icon appears next to step 3 while it's in progress. |
| should redirect to dashboard after the validation card dismisses (when OTP is disabled) | Positive | Asserts the validation card disappears and the page navigates away from the login URL, skipped if the OTP dialog appears instead. |

### `Login/functional/LoginHappyPath.spec.ts`

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| should display the login form on page load | Positive | Asserts company/mobile/password inputs and the Log In button are visible, with the button disabled. |
| should enable the Log In button once all fields are filled | Positive | Asserts the button becomes enabled once all fields hold valid values. |
| should dismiss the validation card after all steps complete | Positive | Asserts the "Just a moment..." card disappears after the full submit. |
| should redirect away from the login page after submitting valid credentials | Positive | Asserts the URL no longer matches `/auth/login` after a successful login (handling OTP if it appears). |
| should display the sidebar logo and brand name on the dashboard | Positive | Asserts the dashboard logo and brand name render post-login. |
| should display the sidebar navigation links on the dashboard | Positive | Asserts the nav container plus Home/Transactions/Payments links are visible. |
| should display the header profile and notifications icons on the dashboard | Positive | Asserts the profile trigger and notifications icon are visible. |
| should display the wallet balance widget on the dashboard | Positive | Asserts the wallet balance (SAR) widget is visible. |
| should display the last transactions widget on the dashboard | Positive | Asserts the last-transactions container is visible. |
| should display the last login timestamp on the dashboard | Positive | Asserts the last-login text is visible. |
| should log out successfully and return to the login page | Positive | Asserts the URL matches `/auth/login` again after clicking logout. |

### `Login/functional/LoginNavigation.spec.ts`

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| should navigate to the Forgot Password page when the link is clicked | Positive | Asserts the URL matches `/forgot-password` after clicking the link. |
| should navigate to the Sign Up page when the link is clicked | Positive | Asserts the URL changes away from the login page after clicking Sign Up. |
| should navigate to a valid page when the logo link is clicked | Positive | Asserts the URL matches `majdpay.com` after clicking the logo link. |
| should change the theme when the toggle is clicked | Positive | Asserts the `<body>` element's class attribute changes after the theme toggle is clicked. |
| *(skipped)* should redirect away from the login page when already logged in | Positive | `test.skip`'d in code; uses a pre-authenticated storage state and would assert navigating to the login URL redirects away. |
| *(skipped)* should not display the Log In button when already logged in | Positive | `test.skip`'d in code; would assert the Log In button is hidden for an already-authenticated session. |

### `Login/functional/LoginSecurity.spec.ts`

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| should lock the account after 3 consecutive failed login attempts | Negative | Performs 3 failed attempts then asserts a toast and no OTP heading on a 4th attempt with the correct password; skipped unless `LOCKOUT_COMPANY`/`LOCKOUT_MOBILE` env vars are set. |
| should return the same error response for a wrong company number and a wrong mobile number (prevents user enumeration) | Negative | Asserts both a wrong-company attempt and a wrong-mobile attempt show a toast and stay on the login URL. |
| should not execute a script payload entered in the company number field (XSS) | Negative | Asserts a `<script>` payload typed into the company field doesn't render in the page or trigger a JS dialog. |
| should not execute a script payload entered in the password field (XSS) | Negative | Asserts a `<script>` payload typed into the password field doesn't trigger a JS dialog. |
| should send the login request via POST — credentials must not appear in the URL | Negative | Captures the `/auth/signin` request and asserts the method is `POST` and the URL doesn't contain the password or company number. |
| should not expose stack traces or database details in failed login error responses | Negative | Asserts the toast detail text (if shown) doesn't match stack/exception/sql/database/ORA-/JDBC patterns. |

### `Login/ui/LoginPage.spec.ts`

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| should open the login URL | Positive | Asserts the page URL equals the login URL. |
| should have the correct page title | Positive | Asserts the page title equals "EMI - Business". |
| should display the login form container | Positive | Asserts the form container is visible. |
| should display the Login eyebrow text | Positive | Asserts the eyebrow text equals "Login". |
| should display the Welcome heading | Positive | Asserts the heading text equals " Welcome to MJD Pay". |
| should display the tagline description | Positive | Asserts the tagline text is visible. |
| should display the MJD Pay logo image | Positive | Asserts the logo image is visible. |
| should display the MJD Pay logo as a clickable link | Positive | Asserts the logo link is visible. |
| should display the EN language button | Positive | Asserts the EN language button is visible. |
| should not have EN as the active language by default | Positive | Asserts `aria-pressed` on the EN button is not `true` by default (Arabic is the default). |
| should display the Arabic language button | Positive | Asserts the Arabic language button is visible. |
| should have Arabic as the active language by default | Positive | Asserts `aria-pressed="true"` on the Arabic button by default. |
| should activate the Arabic button when clicked | Positive | Asserts `aria-pressed="true"` on the Arabic button after clicking it. |
| should switch back to EN when EN button is clicked after Arabic | Positive | Asserts `aria-pressed="true"` on the EN button after switching to Arabic then back. |
| should display the theme toggle button | Positive | Asserts the theme toggle button is visible. |
| should display the Company Number label | Positive | Asserts the Company Number label is visible. |
| should display the Company number input as visible and enabled | Positive | Asserts the company input is visible and enabled. |
| should display the Company number input with the correct placeholder | Positive | Asserts the placeholder attribute equals "Eg. 153165659". |
| should display the clear button on the Company Number field when filled | Positive | Asserts the clear button appears once the company field has a value. |
| should clear the Company Number field when the clear button is clicked | Positive | Asserts the company field value is empty after clicking its clear button. |
| should display the Mobile Number label | Positive | Asserts the Mobile Number label is visible. |
| should display the country flag in the mobile number field | Positive | Asserts the country flag icon is visible. |
| should display the country code (+966) | Positive | Asserts the country code text contains "(+966)". |
| should display the Mobile number input as visible and enabled | Positive | Asserts the mobile input is visible and enabled. |
| should display the Password label | Positive | Asserts the Password label is visible. |
| should display the Password input masked by default | Positive | Asserts the password input's `type` attribute is `password` by default. |
| should display the Show password toggle button | Positive | Asserts the show-password toggle is visible. |
| should display the Forgot Password link | Positive | Asserts the Forgot Password link is visible. |
| should display the Log In button | Positive | Asserts the Log In button is visible. |
| should have the Log In button disabled on page load | Negative | Asserts the Log In button is disabled on initial page load. |
| should display the "New to MJD PAY?" text | Positive | Asserts the "New to MJD PAY?" text is visible. |
| should display the Sign Up link | Positive | Asserts the Sign Up link is visible. |

### `Login/ui/LoginValidationPopup.spec.ts`

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| should show the "Just a moment..." heading | Positive | Asserts the validation-card heading is visible after submit. |
| should show the popup subtitle text | Positive | Asserts the subtitle "We're preparing a secure session for this device." is visible. |
| should display all three validation steps | Positive | Asserts all three step labels (Verifying your credentials / Preparing this device / Securing your session) are visible. |
| should show step 1 "Verifying your credentials" | Positive | Asserts the step-1 label is visible. |
| should show step 2 "Preparing this device" | Positive | Asserts the step-2 label is visible. |
| should show step 3 "Securing your session" | Positive | Asserts the step-3 label is visible. |
| should show the OTP dialog after the validation card completes (when OTP is enabled) | Positive | Asserts the OTP heading, instruction text, first input, Verify button, and Cancel button are all visible once the card dismisses; skipped when OTP is disabled in the environment. |

## 2. Wallet-to-Wallet (W2W) Transfer
**File Reference:** `BusinessTestCases/W2WTransfer/functional/W2WTransferFunctionality.spec.ts`
*(Data-driven via `data/w2wTransferData.json` — test titles are built at runtime from each data row's `testName` plus an `amountType`/`crnType`/`amountValidation` suffix)*

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| W2W_Transfer_Valid_Whole_Amount_Updates_Balances \| Amount Type: Whole Number | Positive | Logs in as both merchant and biller, transfers a whole-number amount, and asserts the merchant's balance decreases and the biller's balance increases by that amount. |
| W2W_Transfer_Valid_Decimal_Amount_Updates_Balances \| Amount Type: Decimal Amount | Positive | Same merchant/biller balance-delta assertion for a decimal amount (50.50). |
| W2W_Transfer_Transaction_Appears_In_Transaction_Table | Positive | Completes a transfer, navigates to Transactions, and asserts the newest transaction resolves to a `SUCCESS` status (polling while it reads `pending`). |
| W2W_Transfer_InvalidCRN_NonExistent \| CRN Type: Non-Existent CRN | Negative | Asserts a "No recipient found" toast for a CRN that doesn't exist. |
| W2W_Transfer_InvalidCRN_IsSame_For_Sender_And_Receiver \| CRN Type: Self-Transfer CRN | Negative | Asserts the same "No recipient found" toast when the receiver CRN equals the sender's own CRN. |
| W2W_Transfer_InvalidCRN_Empty \| Validation Type: Empty CRN | Negative | Asserts the Check Recipient button stays disabled with an empty CRN field. |
| W2W_CRN_Validation_LessThan_10_Digits \| Validation Type: Less than 10 digits | Negative | Asserts the Check Recipient button stays disabled for a 9-digit CRN. |
| W2W_CRN_Validation_Valid_10_to_15_Digits \| Validation Type: Valid 10 to 15 digits | Positive | Asserts the Check Recipient button is enabled for a CRN in the valid 10–15 digit range. |
| W2W_CRN_Validation_HardLimit_16_Digits \| Validation Type: Exceeding 15 digits Hard Limit | Negative | Asserts a 16-digit CRN is truncated to 15 digits in the input (button ends up enabled at that truncated length). |
| W2W_CRN_Validation_Rejects_Alphabetic \| Validation Type: Alphabetic characters | Negative | Asserts alphabetic input leaves the CRN field empty and the button disabled. |
| W2W_CRN_Validation_Rejects_SpecialChars \| Validation Type: Special characters | Negative | Asserts special-character input leaves the field empty and the button disabled. |
| W2W_CRN_Validation_Rejects_Spaces \| Validation Type: Spaces in CRN | Negative | Asserts spaces are stripped from the CRN input (leaving a sub-10-digit value) and the button stays disabled. |
| W2W_AmountValidation_Negative_Amount \| Validation Type: Negative Amount | Negative | Asserts the leading negative sign is stripped from the amount input (resulting value "100") and Proceed ends up enabled. |
| W2W_AmountValidation_Zero_Amount \| Validation Type: Zero Amount | Negative | Asserts a zero amount clears the field and keeps Proceed disabled. |
| W2W_AmountValidation_Alphabetical_Characters \| Validation Type: Alphabetical Characters | Negative | Asserts alphabetic input clears the field and keeps Proceed disabled. |
| W2W_AmountValidation_Special_Characters \| Validation Type: Special Characters | Negative | Asserts special-character input clears the field and keeps Proceed disabled. |
| W2W_AmountValidation_Valid_Float_2_Decimals \| Validation Type: Valid Float 2 Decimals | Positive | Asserts a 2-decimal amount (10.55) is accepted as-is and Proceed is enabled. |
| W2W_AmountValidation_Valid_Float_1_Decimal \| Validation Type: Valid Float 1 Decimal | Positive | Asserts a 1-decimal amount (10.5) is accepted as-is and Proceed is enabled. |
| W2W_AmountValidation_Invalid_Float_3_Decimals \| Validation Type: Invalid Float 3 Decimals | Negative | Asserts a 3-decimal amount (10.555) is truncated to 2 decimals (10.55), with Proceed enabled at that truncated value. |
| W2W_AmountValidation_Clipboard_Paste \| Validation Type: Copy and Paste Amount Actions | Positive | Asserts a pasted valid amount (via clipboard + Ctrl/Cmd+V) is accepted and Proceed is enabled. |
| W2W_Transfer_Insufficient_Fund | Negative | Attempts a transfer for (current balance + 100) and asserts an insufficient-fund toast is displayed. |

## 3. Bank Transfer
**File Reference:**
`BusinessTestCases/BankTransfer/functional/BankTransferCommission.spec.ts`
`BusinessTestCases/BankTransfer/functional/BankTransferEdgeCases.spec.ts`
`BusinessTestCases/BankTransfer/functional/BankTransferHappyPath.spec.ts`
`BusinessTestCases/BankTransfer/functional/BankTransferNegative.spec.ts`
`BusinessTestCases/BankTransfer/functional/BankTransferOtpRequirement.spec.ts`
`BusinessTestCases/BankTransfer/functional/BankTransferSession.spec.ts`
`BusinessTestCases/BankTransfer/functional/BankTransferTransactionLimits.spec.ts`
`BusinessTestCases/BankTransfer/functional/BankTransferWalletLimits.spec.ts`
`BusinessTestCases/BankTransfer/ui/BankTransferAmountPage.spec.ts`
`BusinessTestCases/BankTransfer/ui/BankTransferConfirmationPage.spec.ts`
`BusinessTestCases/BankTransfer/ui/BankTransferOtpPage.spec.ts`
`BusinessTestCases/BankTransfer/ui/BankTransferLocalization.spec.ts`

### `BankTransfer/functional/BankTransferHappyPath.spec.ts`

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| should complete a standard transfer with a custom amount and debit the exact amount | Positive | Completes a 10.00 cashout through OTP, asserts the success modal, and asserts the wallet balance drops by exactly 10.00. |
| should complete a transfer using a randomly selected predefined amount | Positive | Same full flow using a randomly chosen preset chip; asserts the balance decreases by that preset amount. |
| should accept a valid amount with 2 decimal places and debit it correctly | Positive | Completes the flow with 15.75 and asserts the exact debit. |
| should accept a valid amount with 1 decimal place and debit it correctly | Positive | Completes the flow with 20.5 and asserts the exact debit. |
| should accept a pasted valid amount and enable Proceed | Positive | Asserts a pasted "50.00" populates the amount field and Proceed becomes enabled. |
| should reflect the entered amount and compute commission/VAT/total correctly on the Confirmation summary | Positive | Asserts the summary's Transaction Type/Bank/IBAN match source data, Original Amount equals the entered value, VAT ≈ commission × 15%, and Total ≈ Original − commission − VAT. |
| should auto-submit on a correct OTP, show a success confirmation, and debit the entered amount | Positive | Completes the flow with the fixed `VALID_OTP` and asserts the balance is debited by the entered amount. |

### `BankTransfer/functional/BankTransferNegative.spec.ts`

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| should reject a negative amount and keep Proceed disabled | Negative | Asserts a negative amount is not accepted and Proceed stays disabled. |
| should reject zero as a transfer amount | Negative | Asserts a zero amount is not accepted and Proceed stays disabled. |
| should reject alphabetic characters and special symbols in the amount field | Negative | Asserts alphabetic/special-character input is not accepted and Proceed stays disabled. |
| should reject or truncate an amount with 3 decimal places | Negative | Asserts a 3-decimal amount is rejected or truncated. |
| should reject a pasted invalid amount and keep Proceed disabled | Negative | Asserts pasting "abc" leaves the amount field empty and Proceed disabled. |
| should show the insufficient-funds toast and block the transfer when the amount exceeds the balance | Negative | Enters (balance + 10) and asserts an "insufficient funds" toast appears. |
| *(skipped)* should fail the transaction when an incorrect OTP is submitted | Negative | `test.skip`'d ("ported as-is from the legacy `BankTransferTests.spec.ts` data set, execute: false"); intended to assert a wrong OTP produces a failed transaction record. |

### `BankTransfer/functional/BankTransferEdgeCases.spec.ts`

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| should override the selected preset amount when the field is edited afterward | Positive | Selects a preset chip, edits the amount field afterward, and asserts the manually entered value ("123") wins. |
| should fill up to 4 decimal places and lock manual entry when "Use full balance" is toggled on | Positive | Asserts the amount field becomes `readonly` and is auto-filled with the current wallet balance (up to 4 decimal places). |

### `BankTransfer/functional/BankTransferSession.spec.ts`

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| should discard the transfer and leave the balance unchanged when the page is refreshed mid-flow | Negative | Reloads the page mid-flow and asserts the wallet balance is unchanged. |
| should return to the Amount step and leave the balance unchanged when Cancel is clicked on the Confirmation summary | Negative | Asserts clicking Cancel on the summary returns to the Amount step and the balance is unchanged. |
| should return home and leave the balance unchanged when Cancel is clicked at the OTP step | Negative | Asserts cancelling at the OTP step returns to the home page with the balance unchanged. |
| should carry the same masked IBAN and total from Confirmation through to the OTP step | Positive | Asserts the IBAN and total shown on the OTP recap match the values shown on the Confirmation summary. |

### `BankTransfer/functional/BankTransferCommission.spec.ts`
*(TC-2388–2397; every test is `test.skip`'d pending an Admin Portal "Commission Management" automation helper — EMI-180 — kept in the suite 1:1 with the source test-case export so coverage isn't silently dropped)*

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| TC-2388 — deducts a fixed commission on a standard transfer | Positive | *(Skipped, EMI-180.)* Intended to assert an admin-configured fixed commission is reflected in the Confirmation summary and wallet deltas. |
| TC-2389 — deducts the fixed commission when the transfer equals the minimum value | Positive | *(Skipped, EMI-180.)* |
| TC-2390 — deducts the fixed commission when the transfer equals the maximum value | Positive | *(Skipped, EMI-180.)* |
| TC-2391 — does not deduct the fixed commission below the configured minimum value | Negative | *(Skipped, EMI-180.)* |
| TC-2392 — does not deduct the fixed commission above the configured maximum value | Negative | *(Skipped, EMI-180.)* |
| TC-2393 — deducts a percentage commission on a standard transfer | Positive | *(Skipped, EMI-180.)* Same as TC-2388 but for an admin-configured percentage commission. |
| TC-2394 — deducts the percentage commission when the transfer equals the minimum value | Positive | *(Skipped, EMI-180.)* |
| TC-2395 — deducts the percentage commission when the transfer equals the maximum value | Positive | *(Skipped, EMI-180.)* |
| TC-2396 — does not deduct the percentage commission below the configured minimum value | Negative | *(Skipped, EMI-180.)* |
| TC-2397 — does not deduct the percentage commission above the configured maximum value | Negative | *(Skipped, EMI-180.)* |

### `BankTransfer/functional/BankTransferOtpRequirement.spec.ts`
*(TC-2402–2403; `test.skip`'d pending an Admin Portal "Configuration Settings → Transaction OTP toggle" automation helper — EMI-180)*

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| TC-2402 — prompts for OTP when the admin has activated the transaction OTP requirement | Positive | *(Skipped, EMI-180.)* Intended to assert the OTP modal appears and gates the transfer when the admin OTP toggle is on. |
| TC-2403 — skips OTP when the admin has deactivated the transaction OTP requirement | Positive | *(Skipped, EMI-180.)* Intended to assert the transfer processes immediately with no OTP modal when the toggle is off. |

### `BankTransfer/functional/BankTransferTransactionLimits.spec.ts`
*(TC-2370–2387; `test.skip`'d pending an Admin Portal "Manage Limits → Transaction" automation helper — EMI-180)*

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| TC-2370 — allows transfers within the hourly amount limit | Positive | *(Skipped, EMI-180.)* |
| TC-2371 — rejects a transfer below the configured hourly amount limit | Negative | *(Skipped, EMI-180.)* |
| TC-2372 — blocks a transfer that exceeds the hourly amount limit | Negative | *(Skipped, EMI-180.)* |
| TC-2373 — allows transfers within the daily amount limit | Positive | *(Skipped, EMI-180.)* |
| TC-2374 — blocks a transfer that exceeds the daily amount limit | Negative | *(Skipped, EMI-180.)* |
| TC-2375 — allows transfers within the monthly amount limit | Positive | *(Skipped, EMI-180.)* |
| TC-2376 — blocks a transfer that exceeds the monthly amount limit | Negative | *(Skipped, EMI-180.)* |
| TC-2377 — allows transfers within the yearly amount limit | Positive | *(Skipped, EMI-180.)* |
| TC-2378 — blocks a transfer that exceeds the yearly amount limit | Negative | *(Skipped, EMI-180.)* |
| TC-2379 — allows transfers within the hourly transaction-count limit | Positive | *(Skipped, EMI-180.)* |
| TC-2380 — rejects a transfer below the configured hourly count limit | Negative | *(Skipped, EMI-180.)* |
| TC-2381 — blocks a transfer once the hourly transaction-count limit is exceeded | Negative | *(Skipped, EMI-180.)* |
| TC-2382 — allows transfers within the daily transaction-count limit | Positive | *(Skipped, EMI-180.)* |
| TC-2383 — blocks a transfer once the daily transaction-count limit is exceeded | Negative | *(Skipped, EMI-180.)* |
| TC-2384 — allows transfers within the monthly transaction-count limit | Positive | *(Skipped, EMI-180.)* |
| TC-2385 — blocks a transfer once the monthly transaction-count limit is exceeded | Negative | *(Skipped, EMI-180.)* |
| TC-2386 — allows transfers within the yearly transaction-count limit | Positive | *(Skipped, EMI-180.)* |
| TC-2387 — blocks a transfer once the yearly transaction-count limit is exceeded | Negative | *(Skipped, EMI-180.)* |

### `BankTransfer/functional/BankTransferWalletLimits.spec.ts`
*(TC-2362–2369, TC-2398–2401; `test.skip`'d pending an Admin Portal "Manage Limits → Wallet Balance" automation helper — EMI-180)*

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| TC-2362 — allows a transfer within the admin-configured wallet limit | Positive | *(Skipped, EMI-180.)* |
| TC-2363 — blocks a transfer that exceeds the admin-configured wallet limit | Negative | *(Skipped, EMI-180.)* |
| TC-2364 — allows a transfer within the wallet limit (second configured risk level) | Positive | *(Skipped, EMI-180.)* |
| TC-2365 — blocks a transfer exceeding the wallet limit (second configured risk level) | Negative | *(Skipped, EMI-180.)* |
| TC-2366 — allows a transfer within the wallet limit (third configured risk level) | Positive | *(Skipped, EMI-180.)* |
| TC-2367 — blocks a transfer exceeding the wallet limit (third configured risk level) | Negative | *(Skipped, EMI-180.)* |
| TC-2368 — allows a transfer within the wallet limit (fourth configured risk level) | Positive | *(Skipped, EMI-180.)* |
| TC-2369 — blocks a transfer exceeding the wallet limit (fourth configured risk level) | Negative | *(Skipped, EMI-180.)* |
| TC-2398 — allows a transfer within the wallet limit (repeat scenario) | Positive | *(Skipped, EMI-180.)* |
| TC-2399 — blocks a transfer exceeding the wallet limit (repeat scenario) | Negative | *(Skipped, EMI-180.)* |
| TC-2400 — allows a transfer within the wallet limit (repeat scenario) | Positive | *(Skipped, EMI-180.)* |
| TC-2401 — blocks a transfer exceeding the wallet limit (repeat scenario) | Negative | *(Skipped, EMI-180.)* |

### `BankTransfer/ui/BankTransferAmountPage.spec.ts`

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| should display the "Cashout" page title and its description | Positive | Asserts the page title reads "Cashout" and the subtitle matches "send funds to a saudi iban". |
| should display the Current Balance label and a numeric balance amount | Positive | Asserts the balance label and a numeric balance value are visible. |
| should display the wallet code next to the balance | Positive | Asserts the wallet-code text is visible next to the balance. |
| should display the Topup, QR, and wallet settings buttons on the balance card | Positive | Asserts the Topup, QR, and settings buttons are visible on the balance card. |
| should display the IBAN label alongside a masked IBAN, the bank name, and a verified checkmark | Positive | Asserts the IBAN value matches the masked format `SA##**####`, the bank name is non-empty, and a verified checkmark is visible. |
| should display the step-2 "Amount" section header and its description | Positive | Asserts the step badge reads "2", the section title reads "Amount", and the description matches "enter the amount to transfer". |
| should display the "Set Amount You Want Transfer" label and the currency icon in the input | Positive | Asserts the amount-field label and currency icon are visible. |
| should display the "0.00" placeholder in the amount input | Positive | Asserts the amount input's placeholder attribute equals "0.00". |
| should display the "Use full balance" toggle with its label | Positive | Asserts the toggle and its label are visible. |
| should keep Proceed disabled while the amount field is empty | Negative | Asserts Proceed is disabled while the amount field is empty. |
| should display the "Or select amount" label and all 5 preset amount chips | Positive | Asserts exactly 5 preset chips are rendered with the text 500/1000/2000/5000/10000. |
| should display the Proceed button with its label and arrow icon | Positive | Asserts the Proceed button is visible with its text and an arrow icon. |

### `BankTransfer/ui/BankTransferConfirmationPage.spec.ts`

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| should display the Transaction Type, Bank, and IBAN rows | Positive | Asserts the Transaction Type, Bank, and IBAN summary rows are non-empty. |
| should display the Original Amount, commission, VAT, and Total rows | Positive | Asserts the Original Amount, commission, VAT, and Total summary values all parse as numbers (not NaN). |
| should display the Confirmation heading and subtitle | Positive | Asserts the page title reads "Confirmation" and the subtitle matches "send funds to a saudi iban". |

### `BankTransfer/ui/BankTransferOtpPage.spec.ts`

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| should display six OTP input boxes and a running countdown | Positive | Asserts exactly 6 OTP boxes render and the countdown value decreases over a 2-second wait. |
| should display the Confirmation heading, subtitle, resend link, and Verify button | Positive | Asserts the heading reads "Confirmation", the subtitle matches "a code has been sent to you", and the resend/Verify controls are visible. |

### `BankTransfer/ui/BankTransferLocalization.spec.ts`

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| should render the page in right-to-left direction | Positive | Asserts `<html>` carries `dir="rtl"` once the UI is switched to Arabic. |
| should accept an amount and enable Proceed via the language-agnostic testid locators | Positive | Asserts Proceed is disabled before input and becomes enabled after entering "10", using `data-testid` locators under the Arabic locale. |
| should display the Proceed button label in Arabic | Positive | Asserts the Proceed button text matches the Arabic string "متابعة". |
| should display the summary Next button label in Arabic after proceeding | Positive | Asserts the summary's Next button text matches "التالي". |
| should display the summary Cancel button label in Arabic and leave the balance unchanged | Positive | Asserts the summary Cancel button text matches "إلغاء" and clicking it leaves the wallet balance unchanged. |

## 4. Bill Payment
**File Reference:** `BusinessTestCases/PayBill/functional/PayBillFlow.spec.ts`
*(Data-driven via `approved received bill` variation)*

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| Verify successful payment submission popup | Positive | Asserts the dynamic popup rendering for bill payment. |
| Verify wallet balance decrease after bill payment | Positive | Enforces dynamic balance check: `NewBalance = OldBalance - BillAmount`. |
| Verify transaction record creation and success status in transactions table | Positive | Identifies correct ledger row creation verifying amount and final `SUCCESS` status. |
| Verify bill payment with insufficient funds error message | Negative | First uses Bank Transfer to drain account, then asserts 'Insufficient fund' toast. |

## 5. Wallet Top-up
**File Reference:** `BusinessTestCases/Topup/functional/TopupFlow.spec.ts`

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| Topup_with_Enter_Amount_MADA | Positive | Completes MADA gateway interaction and confirms balance increment. |
| Topup_with_Enter_Amount_VISA | Positive | Completes VISA gateway interaction and confirms balance increment. |
| Topup_with_Enter_Amount_MASTER | Positive | Completes MASTER gateway interaction and confirms balance increment. |
| Topup_with_Select_Amount_VISA | Positive | Uses predefined amount, completes VISA gateway and confirms balance. |
| Topup_with_Valid_TwoDecimal_Amount_VISA | Positive | Completes topup with 2-decimal amount via VISA. |
| Topup_with_Invalid_Card_Data_PayNowDisabled | Negative | Asserts invalid card data disables "Pay Now" button in gateway. |
| Topup_Failed_User_Canceled\|From_The_HyperPay_Screen | Negative | Simulates user cancel (Code 2), asserts `FAILED` state in ledger. |
| Topup_Failed_Limit_Exceeded\|From_The_HyperPay_Screen | Negative | Simulates limit exceeded (Code 4), asserts `FAILED` state in ledger. |
| Topup_Failed_Too_Many_Tries\|From_The_HyperPay_Screen | Negative | Simulates too many tries (Code 5), asserts `FAILED` state in ledger. |
| Topup_Pending_Simulation\|From_The_HyperPay_Screen | Negative | Simulates pending (Code 3), asserts `PENDING` state in ledger. |
| Topup_verifyAmountField_PreventsInvalidInput | Negative | Asserts negative sign is stripped from amount input. |
| Topup_verifyAmountField_PreventsZeroAmount | Negative | Asserts zero amount clears field and disables proceed button. |
| Topup_verifyAmountField_PreventsInvalidChars | Negative | Asserts invalid chars clear field and disable proceed button. |
| Topup_AmountValidation_ValidFloat_2_Decimals | Positive | Asserts valid 2-decimal input is accepted. |
| Topup_AmountValidation_ValidFloat_1_Decimal | Positive | Asserts valid 1-decimal input is accepted. |
| Topup_AmountValidation_InvalidFloat_3_Decimals | Negative | Asserts 3-decimal input is truncated. |
| Topup_AmountValidation_CopyPaste_Valid | Positive | Asserts valid pasted amount is accepted. |
| Topup_AmountValidation_CopyPaste_Invalid | Negative | Asserts invalid pasted amount clears field and disables proceed button. |
| Topup_CancelTransaction_PageRefresh | Negative | Asserts page refresh cancels topup and leaves balance unchanged. |
| Topup_CancelTransaction_SummaryCancelButton | Negative | Asserts summary cancel button leaves balance unchanged. |

<!-- AUTOMATION_REGISTRY_END -->
