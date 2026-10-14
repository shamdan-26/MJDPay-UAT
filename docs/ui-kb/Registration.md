# Registration - UI logic

Business-portal merchant sign-up wizard: Mobile number + OTP, Business Info, Financial, Verification & Uploads, NAFATH, Products (with PoS devices), Contract, Confirmation.
Locators: [Registration.generated.md](Registration.generated.md) (8 page objects in `BusinessTestCases/pageElements/Registration/`). The OTP dialog uses `OtpPage` (see Shared.md).

| Item | Value | Source |
|---|---|---|
| Route | `/business/auth/register` (all steps stay on this URL, including the inner tabs) | docs/manual-test-cases/Registration-Mobile.md; RI-113 |
| Who can see it | Anyone not signed in (applicant). Reached from Login "Sign Up" | Login/functional/04-session/LoginNavigation.spec.ts LG-102 |
| Default language | Arabic (AR button active on load) | RM-07, RM-09 |
| Outer step bar | 4 labels: Business Info, NAFATH, Products, Contract | RI-11 to RI-14; RC-09 |
| Inner tabs (under outer step 1) | Business Info, Financial & Business, Verification & Uploads (`tabList`, `businessInfoTab`, `financialTab`, `verificationTab`) | RegistrationVerificationPage.ts:85-88; RVU-07 |
| Real order | Mobile > OTP dialog > Business Info > Financial & Business > Verification & Uploads ("Sign Up") > NAFATH > Products (> Devices & Delivery) > Contract > Confirmation | functional/05-identity/RegistrationNafath.spec.ts:19-26; RegistrationPoSOnboarding.spec.ts:8-14 |
| Profile types | MERCHANT live; FREELANCER card disabled ("Coming Soon"); BILLER and CUSTOMER cards exist in the page object | RI-45, RI-53; RegistrationInfoPage.ts:81-84 |

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| Wizard chrome (all steps) | `/business/auth/register` | `logoImage`, `logoLink`, `enButton`, `arabicButton`, `themeToggle` | Header | Brand, language (testids `lang-en` / `lang-ar`), theme |
| Wizard chrome (post-mobile) | same | `formEyebrow`, `formTitle`, `formSubTitle`, `outerStepBar`, `innerStepBar`, `activeStep` | Top of card | Step title and progress |
| Wizard chrome (post-mobile) | same | `loginLine` ("Already have an account?"), `loginLink`, `footer` (Terms, Privacy) | Card bottom | Back to Login, legal text |
| 1 Mobile | same | `createAccountEyebrow`, `enterPhoneHeading`, `startRegistrationDescription`, `mobileInput`, `countryCode`, `nextButton`, `alreadyHaveAccountText`, `loginLink`, `termsText`, `privacyText` | Centre card | Start registration |
| 1b OTP dialog | same (modal) | Heading "Enter OTP", code boxes, countdown, Verify, Cancel, Resend | Centre modal | Prove mobile ownership |
| 2 Business Info (tab 1) | same | `profileTypeGroup` cards, `crnInput`, `idInput`, `emailInput`, `nextButton` | Card body | Identify the business |
| 3 Financial & Business (tab 2) | same | 4 numeric fields, 2 dropdowns, `nextButton`, `backButton` | Card body | Expected activity |
| 4 Verification & Uploads (tab 3) | same | `bankDropdown`, `ibanInput`, IBAN proof upload, `vatInput`, VAT certificate upload, `signUpButton`, `backButton` | Card body | Bank and tax proof; submit registration |
| 5 NAFATH | same | `nafathHeading`, 3 instruction steps, `countdownTimer`, `verifyButton` | Card body | Identity check via NAFATH app |
| 6 Products | same | `productCards`, `selectedCounter`, `continueButton`, `cancelButton` | Card body + footer | Pick products |
| 6b PoS Devices & Delivery | same | Device counter, delivery mode, address source, contact fields, `devicesDeliveryNextButton`, `devicesDeliveryBackButton` | Expanded PoS card | Order terminals |
| 7 Contract | same | `finalStepLabel`, `contractReviewTitle`, `downloadPdfButton`, `documentContainer`, `agreeCheckbox`, `cancelButton`, `submitButton` | Card body | Read and accept contract |
| 8 Confirmation | same | `heading`, `message`, `loginButton` | Centre | Registration received |

## Forms

### Step 1 - Mobile (`RegistrationMobilePage`)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Mobile number | `mobileInput` (placeholder "مثال: 522284484"), prefix `countryCode` (+966) | text, numeric keypad, focused on load | Yes | 9 digits, starts with 5, no leading 0; max 9 characters (paste keeps digits only); letters and special characters rejected | Next stays disabled; server error keeps number and stays on step | Always |
| Next | `nextButton` | button | - | Disabled when empty or invalid; Enter submits; no second request while one is in flight | - | Valid mobile |

Sources: functional/01-entry/RegistrationMobile.spec.ts (RM-21 to RM-34); ui/01-entry/RegistrationMobileStates.spec.ts (RG-MOBST-01 to 09).

### Step 1b - OTP dialog

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Code boxes | `OtpPage.inputs` | single-digit boxes, numeric mode, accessible name | Yes | Digits only; first box focused; auto-advance; paste fills all; Backspace on empty box goes back | Wrong code announced to assistive tech; dialog stays | Always |
| Verify | `OtpPage.verifyButton` | button | - | Disabled until all boxes filled; auto-submits on last digit; double click sends one request | - | All boxes filled |
| Resend | `OtpPage.resendButton` | button | - | Disabled during mm:ss countdown; new request uses a new `requestId` | - | Countdown ended |
| Cancel | `OtpPage.cancelButton` | button | - | Closes dialog, back to mobile step with number pre-filled | - | Always |

Sources: functional/01-entry/RegistrationOtp.spec.ts (RO-08 to RO-19); RegistrationOtpMockedBehaviour.spec.ts (RG-OTPM-01 to 09); ui/01-entry/RegistrationOtpStates.spec.ts.

### Step 2 - Business Info (`RegistrationInfoPage`)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Profile type | `profileTypeGroup`, `merchantButton` (`#register-profile-card-MERCHANT`, testid `register-profile-type-MERCHANT`), `freelancerCard`, `billerCard`, `customerCard` | radio cards (`aria-checked`) | Yes (hidden in fixed-Merchant mode) | Exactly one selected; Freelancer disabled "Coming Soon"; keyboard selectable | - | Merchant card |
| Fixed-merchant label | `fixedMerchantLabel` ("Signing up as Merchant") | text | - | Replaces the selector when fixed-Merchant mode is on (EMI-5768) | - | Mode on |
| Unified Number (CRN) | `crnInput`, `crnLabel`, `crnTooltipButton`, `crnClearButton`; placeholder "مثال: 7001234567" | text | Yes | Digits only; test spec says 10 to 15 digits (9 keeps Next disabled, 15 enables, 16th not accepted); tooltip says 10 digits starting with 7 | Server codes: `COMMERCIAL_REGISTRATION_ALREADY_EXISTS` (409), `CRN_NOT_ACTIVE`, `CRN_NATIONAL_ID_MISMATCH` | Always |
| National ID / Iqama | `idInput`, `idLabel`, `idTooltipButton`, `idClearButton`; placeholder "مثال: 1012345678" | text | Yes | Digits only, max 10; documented rule: exactly 10 digits starting with 1 (Saudi) or 2 (resident) | Server code `INVALID_NATIONAL_ID` | Always |
| Email | `emailInput`, `emailLabel`, `emailError` (`#error_email`); placeholder "مثال: example@email.com" | email | Yes | Needs `@`, domain and TLD, no spaces; plus-alias, subdomain, numeric local part accepted; error shows on blur and clears when corrected | Server code `EMAIL_ALREADY_EXISTS` (409) | Always |
| Next | `nextButton` (`#register-next-button`) | submit | - | Disabled unless profile type + CRN + ID + email valid; clearing any field disables it again; Enter in last field submits; no second submit in flight | - | All valid |

Sources: functional/02-business-info/fields/*.spec.ts (RI-52 to RI-111); RegistrationInfoServerValidation.spec.ts; ui/02-business-info/RegistrationInfoStates.spec.ts; pageElements/Registration/RegistrationInfoPage.ts.

### Step 3 - Financial & Business (`RegistrationFinancialPage`)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Monthly expected number of bills | `monthlyBillsInput`; placeholder contains "2000" | numeric text | Yes | Digits only (no letters, specials, negative, decimal); documented rule: greater than 0, no leading zero (test skipped) | None recorded | Always |
| Monthly expected sum of bills | `monthlyAmountInput` | numeric text | Yes | Same; leading-zero rule documented, test skipped | None recorded | Always |
| Expected monthly withdrawal | `monthlyWithdrawalInput` | numeric text | Yes | Digits only; zero accepted; 15 digits does not crash | None recorded | Always |
| Expected monthly deposit | `monthlyDepositInput` | numeric text | Yes | Digits only; zero accepted | None recorded | Always |
| Industries | `industriesDropdown` (testid `register-industry`), default "Select Option" | searchable select | Yes | Search filters; Escape closes; empty list shows no-options; no-match shows no-results state | - | Always |
| Annual income | `annualIncomeDropdown` (`register-annual-income`) | searchable select | Yes | Same | - | Always |
| Banks | `banksDropdown` (`register-bank`) | select | See gaps | Spec says there is no Banks select on this step (bank is on Verification) | - | - |
| Next / Back | `nextButton`, `backButton` | buttons | - | Next disabled until all four numbers and both dropdowns are set; Back returns to Business Info keeping the email | - | All required filled |

Sources: functional/03-financial/RegistrationFinancial.spec.ts (RF-30 to RF-76); ui/03-financial/*.spec.ts.

### Step 4 - Verification & Uploads (`RegistrationVerificationPage`)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Bank | `bankDropdown` | select | Yes | Choice sent as `bic` | - | Always |
| IBAN | `ibanInput`; placeholder "SA0380000001234567891234"; hint "24 characters starting with SA" | text | Yes | 24 characters, starts with SA, digits after; MOD-97 checksum must pass (check digits "00" rejected); lower case is upper-cased | Validation error text (not recorded) | Always |
| IBAN proof | upload (`ibanProofLabel`, `ibanUploadPrompt`, `ibanUploadHelperText`) | file | Yes | PDF or JPG, max 5 MB; zero-byte and over-size rejected; replacing is allowed; failed upload can be retried | Error banner; Sign Up stays disabled | Always |
| VAT number | `vatInput`; placeholder "300123456700003" | text | Yes | 15 digits, starts with 2 or 3; letters rejected; max 15 | Validation error text (not recorded) | Always |
| VAT certificate | upload (`vatCertLabel`, `vatUploadPrompt`, `vatUploadHelperText`) | file | Yes | PDF/JPG, max 5 MB (manual RVU-61 notes no client-side type restriction) | Same | Always |
| Sign Up | `signUpButton` | submit | - | Disabled until bank, IBAN, VAT and both uploads are valid; one request on double click; 500 leaves the step usable | - | All valid |
| Back | `backButton` | button | - | Keeps IBAN and VAT values | - | Always |

Sources: functional/04-verification/RegistrationVerificationUploads.spec.ts; ui/04-verification/RegistrationVerificationStates.spec.ts (RG-VERST-01 to 10); manual Registration-Verification-Uploads.md.

### Step 5 - NAFATH (`RegistrationNafathPage`)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Panel | `nafathHeading` ("Verify with NAFATH" / "التحقق عبر نفاذ"), `instructionText`, `step1Text`, `step2Text`, `step3Text`, `redirectNote` | text | - | 3 steps: open the NAFATH app, select the number shown, approve | - | - |
| Countdown | `countdownTimer` (mm:ss then "s") | text | - | Duration read at runtime (documented as 20 s, EMI-4937) | - | - |
| Verify | `verifyButton` | button | - | Disabled while the countdown runs (EMI-4895); enabled when it ends | - | Countdown ended |
| Resend | `resendButton` | button | - | Must not exist (EMI-4895 removed it) | - | Never shown |
| Next / Back | `nextButton`, `backButton`, `loadingButton` | buttons | - | Shown while moving on | - | - |

Sources: functional/05-identity/RegistrationNafath.spec.ts (RN-18 to RN-23); ui/05-identity/RegistrationNafathPage.spec.ts.

### Step 6 - Products and PoS devices (`RegistrationProductsPage`)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Product cards | `productCards` (`.mp-product-card`), `productCard(name)`, `selectedBadge`, `showMoreLink` | selectable cards | One mandatory | Mandatory product (Wallet card) is pre-selected and locked; counter `selectedCounter` starts at "1 Selected"; clicking an optional card toggles it ("2 Selected", ...); all six can be selected | - | Always |
| Request devices now | `requestDevicesNowButton` (testid `register-pos-request-now-checkbox`) | checkbox in the expanded PoS card | No | If unchecked, Continue skips straight to Contract | - | PoS card expanded |
| Total devices | `deviceCountInput`, `increaseDeviceCountButton`, `decreaseDeviceCountButton` | number | Yes | Default 1; not below the minimum; typing allowed; 0 should show a validation error (case skipped) | Text like "must be 1 or greater" (regex only) | Devices step |
| Delivery mode | `singleLocationDeliveryOption` (default), `splitByDeviceDeliveryOption` | radios | Yes | Split shows per-device groups; split quantities must sum to the total (validation, mocked) | Not recorded | Devices step |
| Address source | `wathiqAddressOption` (default, shows resolved address), `customPinAddressOption`, `updateWathiqAddressButton` | radios + button | Yes | Custom option reveals a map location | - | Devices step |
| Contact | `contactNameInput`, `contactMobileInput` | text | No (Next enabled even when empty) | Saudi mobile accepted | - | Devices step |
| Group actions | `addLocationGroupButton`, `removeLocationGroupButton` | buttons | - | Add a second group, remove a group (split mode) | - | Split mode |
| Devices Next / Back | `devicesDeliveryNextButton`, `devicesDeliveryBackButton` | buttons | - | Next submits the PoS order and goes straight to Contract (there is no Review step); one request on double click; failure keeps the step and shows an error; Back returns to the expanded PoS card | - | Enabled by default |
| Continue / Cancel | `continueButton` (also testid `register-products-continue-btn`), `cancelButton` (`register-products-cancel-btn`) | buttons | - | Continue enabled by default via the mandatory product; Cancel always enabled | - | Always |

Sources: functional/06-products/*.spec.ts (RP-43 to RP-64); ui/06-products/*.spec.ts; QA-DATA-TESTID-HANDOFF.md section 4.7.

### Step 7 - Contract (`RegistrationContractPage`)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Contract document | `documentContainer`, `agreementHeading`, `contractVersionLabel/Value`, `acceptanceDateLabel/Value`, `introParagraph`, `customerNameValue`, `contractSections` | read-only | - | v4.0.0 "اتفاقية تقديم خدمات رقمية"; old build has 4 sections (أولاً to رابعاً), new build about 10 numbered headings | - | - |
| Download PDF | `downloadPdfButton` (`register-contract-download-pdf-btn`) | button | No | Triggers a PDF download | - | Always |
| Agree checkbox | `agreeCheckbox` (`register-contract-accept-checkbox`), label "لقد قرأت وأوافق على شروط العقد" | checkbox | Yes | Auto-checks when the document is scrolled to its end; can be unchecked | - | After scroll or click |
| Submit and finish | `submitButton` (`register-contract-submit-btn`, "إرسال وإنهاء") | submit | - | Disabled while unchecked; force-click does not advance; one request on double click; failure keeps step with an error | - | Checkbox checked |
| Cancel | `cancelButton` ("إلغاء") | button | - | Cancels the flow | - | Always |

Sources: functional/07-contract/RegistrationContract.spec.ts (RC-21 to RC-28); pageElements/Registration/RegistrationContractPage.ts.

## Tables and lists

| List | Columns / items | Behaviour | Source |
|---|---|---|---|
| Dropdowns (Industries, Annual income, Bank) | Options from lookup APIs | Search box inside the panel (`#floating-select-search-input`); empty list shows "no options"; Escape closes | RegistrationFinancial.spec.ts; RegistrationFinancialStates.spec.ts RG-FINST-02 to 05 |
| Product catalogue | Cards with name, price/billing label, "Show more" | Selectable; mandatory card locked; counter text "N Selected" | RegistrationProducts.spec.ts; manual RP-14 |
| Dev catalogue names | walletTest (mandatory), ttt, testTuqa, TuqaTestLimit, Point of Sale Device, POS Terminal | Environment data, not fixed copy | RegistrationProducts.spec.ts:12-18 |
| Contract sections | Numbered headings | Read-only | RegistrationContractPage.ts |

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| `nextButton` (mobile) | Step 1 | Calls `register/mobile/otp` | Valid mobile | OTP dialog (or Business Info if OTP not required) |
| OTP `verifyButton` | OTP dialog | `register/verify/otp` | All digits entered | Business Info |
| OTP `cancelButton` | OTP dialog | Closes the dialog | Always | Mobile step, number kept |
| `nextButton` (info) | Business Info | `register/profile-registration-type`; response flags decide the next step (see Conditions) | All fields valid | Financial, NAFATH, Products or Contract |
| `nextButton` (financial) | Financial | Moves to Verification | Required fields set | Verification & Uploads |
| `signUpButton` | Verification | Uploads files then `POST /register` | All valid | NAFATH (or straight to Products when NAFATH is bypassed on dev) |
| `verifyButton` (NAFATH) | NAFATH | Checks NAFATH status | After countdown | Products |
| `continueButton` | Products | Saves products (`register/products`) | Always | Contract, or Devices & Delivery if "Request devices now" is checked |
| `devicesDeliveryNextButton` | Devices & Delivery | Submits the PoS order | Enabled by default | Contract |
| `submitButton` | Contract | `register/contract/accept` | Agree checked | Confirmation |
| `loginButton` (`register-finish-login-btn`, "سجّل الدخول إلى حسابك") | Confirmation | Opens Login | Always | `/business/auth/login` |
| `backButton` | Financial, Verification, NAFATH | Previous tab; values kept | Always | Previous tab |
| `loginLink` (`register-login-link`, `#btn_register_login_step1`) | Mobile / all steps | Opens Login | Always | Login page |
| Tab headers `businessInfoTab`, `financialTab`, `verificationTab` | Verification step | Show which inner tab is active | Always | - |
| `enButton` / `arabicButton`, `themeToggle` | Header | Language / theme | Always | Same step; on the Confirmation page switching language drops back to the start of the wizard |

Sources: see Forms; RegistrationConfirmationPage.ts comment lines 12-13.

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| Fixed-Merchant sign-up mode on | Profile selector hidden, static "Signing up as Merchant" label, profile cannot be changed | manual Registration-E2E-and-Modes.md RE-03, RE-04 (EMI-5768) |
| Fixed-Merchant mode off | Normal selector shown | RE-05 |
| Registration OTP disabled in an environment | OTP dialog never appears; OTP specs skip | RegistrationOtp.spec.ts:28 |
| Mobile already registered | Error shown, OTP dialog not opened | RG-MOBST-06 |
| Resume: all flags false | Land on Financial | functional/journeys/RegistrationResumeStateTable.spec.ts |
| Resume: `isGetNafathRandomNumberCompleted` | Land on NAFATH | same |
| Resume: `isGetNafathStatusCompleted`, no product | Land on Products | same |
| Resume: `isProductAssigned`, contract not accepted | Land on Contract | same |
| Resume: everything complete | Never reopens an editable step | RG-RESUME-02 |
| Same mobile reused with a different CRN | Starts a new registration | manual RI-137 |
| Server rejects Business Info | Stays on step, keeps values, shows feedback, can correct and resubmit | RegistrationInfoServerValidation.spec.ts |
| 409 on business info with no visible text | Pool identity treated as already registered | RegistrationNafath.spec.ts:50-60 |
| Session expired (401 `SESSION_INVALID`) | Wizard does not advance | RG-RES-04 |
| Timeout or offline | Stays on step, number kept, Next re-enabled, recovers when back online | RG-RES-01 to 03, 08 |
| Page refresh or browser Back/Forward on Business Info | Wizard stays usable | RG-RES-05, 06 |
| Dev environment | NAFATH is bypassed: a successful Sign Up lands on Products. Citizens go through real NAFATH only where enabled | RegistrationNafathPage.spec.ts:75-79 |
| Resident vs citizen identity | Resident assets bypass NAFATH, citizen assets go through it | ui/05-identity/RegistrationNafathPage.spec.ts:25-26 |
| Verification step upload fails (500) | Error shown, Sign Up disabled, retry with same file works | RG-VERST-01, 02 |
| PoS "Request devices now" unchecked | Continue goes straight to Contract | RP-60 |
| After submission | Confirmation page: step controls gone; Back, refresh and re-opening the URL must not reopen the Contract; double Submit creates one profile | RC-34 to RC-38 |
| Viewport 375 px | No horizontal scroll on chrome, OTP dialog, Financial | RG-CHROME-10, RG-OTPST-09, RG-FINST-06 |

## Business rules

| Rule | Detail | Source |
|---|---|---|
| Auto-approval | Profile is Active right after "Submit and finish"; no admin step; applicant can log in at once | manual RC-39; RE-06, RE-07 (TC-REG-001/002) |
| Activation emails | Exactly 2 "User Activation" emails per profile: API credentials and login details (company number = `tenant_number`) | project memory, RC-38/RC-41 |
| DB timeline | Request row at OTP verification; flags `is_completed_form`, `is_get_nafath_*`, `is_product_assigned`; `profiles`, wallet and merchant/biller rows created together at "Submit and finish" | project memory (Registration DB provisioning timeline) |
| CRN | 10 to 15 digits (documented) | RegistrationCrnField.spec.ts:78 |
| National ID | 10 digits starting 1 or 2 | RegistrationNationalIdField.spec.ts:85 |
| Bills number/sum | Greater than 0, no leading zero | RegistrationFinancial.spec.ts:112 |
| IBAN | 24 chars, SA prefix, MOD-97 | RegistrationVerificationUploads.spec.ts:80 |
| VAT | 15 digits, starts with 2 or 3 | RegistrationVerificationUploads.spec.ts:136 |
| Uploads | PDF or JPG, max 5 MB | RegistrationVerificationPage.spec.ts hint text; RVU-66 to 68 |
| NAFATH | No resend; Verify only after countdown (EMI-4895, EMI-4937) | RN-18, RN-21 to RN-23 |
| Products | Wallet is mandatory and cannot be deselected | RP-43, RP-51 |
| PoS | No separate Review step; order created when onboarding completes | RegistrationPoSOnboarding.spec.ts header; Registration products reviewConfirmationNote |
| Admin OTP lock | REGISTRATION OTP operation is locked on in admin OTP configuration | Registration/README.md (`OtpAdminConfig`) |
| Confirmation | No pending-review wording; no password/OTP shown | RC-32, RC-40 |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| Confirmation heading | AR "تم استلام طلب التسجيل"; EN unconfirmed ("registration request received/submitted") | `heading` |
| Confirmation body | AR "حسابك جاهز. يمكنك الآن تسجيل الدخول ... يرجى مراجعة بريدك الإلكتروني ..."; EN unconfirmed | `message` |
| Confirmation button | AR "سجّل الدخول إلى حسابك" | `loginButton` |
| Already registered | AR "الملف الشخصي موجود بالفعل." ; matched also by "already registered/exists", "مسجل مسبقا", "مكرر" | Error on Business Info / Mobile |
| Country prefix | "(+966)" | Mobile field |
| Eyebrow | "Create Account" / "Tell us about your business" (EN headings per manual) | Mobile / Info |
| Business info rejection codes | `CRN_NATIONAL_ID_MISMATCH` 400, `COMMERCIAL_REGISTRATION_ALREADY_EXISTS` 409, `EMAIL_ALREADY_EXISTS` 409, `INVALID_NATIONAL_ID` 400, `CRN_NOT_ACTIVE` 400, `AML_BLOCKED` 403 (expected contract in a mock) | Feedback on Business Info |
| Upload hint | "bank letter or statement header" / "خطاب بنكي أو ترويسة كشف حساب · PDF، JPG · بحد أقصى 5 ميجابايت" | Under upload |
| IBAN hint | "24 characters starting with SA" / "24 خانة تبدأ بـ SA" | Under IBAN |
| VAT hint | "from your VAT certificate" | Under VAT |
| NAFATH steps | "Open NAFATH app and sign in", "Select the number shown", "Approve"; "return to this page" note | NAFATH panel |
| Products counter | "1 Selected", "2 Selected", "3 Selected" | `selectedCounter` |
| Zero devices | text matching "must be/enter ... 1/one/greater" | Devices & Delivery |
| Contract checkbox | "لقد قرأت وأوافق على شروط العقد" | Contract |
| Gateway header error | `400 MISSING_REQUIRED_HEADER` without locale/platform/platformType/channel/toster_ID/device-finger-print/latitude/longitude | API |

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| Mobile Next | `POST /emi-profile/api/v1/register/mobile/otp` | Body `mobileNumber` (+966). Returns `otpRequired`, `requestId`, `sessionToken`. Dev may skip OTP when mocked with `otpRequired:false` |
| OTP config | `GET /otp/otp-settings/q?operationCode=REGISTRATION` | Returns `length`, `validityInSeconds`. Dev: 4 digits, 30 s (unconfirmed, project memory) |
| Resend | `POST /emi-profile/api/v1/register/mobile/otp/resend` | New `requestId` |
| Verify | `POST /emi-profile/api/v1/register/verify/otp` | Needs `requestId`; dev accepts `918512`, rejects `000000` |
| Business Info Next | `POST /emi-profile/api/v1/register/profile-registration-type` | Dev now wants `idNumber`, `mobileNumber`, `profileType`, `unifiedNumber`, `email`; returns progress flags |
| Resume read | `GET /emi-profile/api/v1/register/profile-registration-type` | |
| Uploads | `POST /file/attachment/upload?fileType=iban` / `vat` | Bare 412 on dev for every variant tried (unresolved) |
| Sign Up | `POST /emi-profile/api/v1/register` | Dev wants `identityNumber`, `mobileNumber`, `bic`, `ibanFileToken` |
| NAFATH | `POST /emi-profile/api/v1/register/uri/status` | |
| Products | `GET /emi-profile/api/v1/products`; `POST /emi-profile/api/v1/register/products` | |
| Contract | `GET /emi-profile/api/v1/contracts/preview?profileCode=`; `GET .../contracts/generate-file?profileCode=`; `POST /emi-profile/api/v1/register/contract/accept` | |
| Lookups | `/emi-profile/api/v1/industries`, `/api/v1/lookup/banks`, `/api/v1/purpose-of-transfer`, `/api/v1/transaction-types`, `/api/v1/payment-method`, `/emi-profile/api/v1/annual-incomes`, `/api/v1/discountTypes` | |

Sources: api/RegistrationAPIFlow.spec.ts header (22 endpoints); project memory registration_api_contract_drift and registration_mock_otp_bypass. Gateway: `https://gateway-dev-emi.dg-cash.app`.

## Known gaps and product defects

| Item | Evidence |
|---|---|
| CRN rule conflict: tooltip "10 digits starting with 7" vs spec 10 to 15 digits | RegistrationInfoPage.ts:90; RegistrationCrnField.spec.ts:78 |
| National ID first-digit rule (1 or 2) not enforced by UI (test skipped) | RegistrationNationalIdField.spec.ts:87 |
| Email starting with a dot not flagged (skipped) | RegistrationEmailField.spec.ts:69 |
| Financial: "bills = 0" and leading-zero rules not enforced (skipped) | RegistrationFinancial.spec.ts:114, 120 |
| Zero PoS device count validation case skipped | RegistrationPoSOnboarding.spec.ts:98 |
| Freelancer card disabled; Freelancer tests skipped (RI-108, RI-112) | RegistrationNextButton.spec.ts:88; RegistrationInfoNavigation.spec.ts:28 |
| Business Info step is located by CSS ids, not testids; profile-type testid not migrated | QA-DATA-TESTID-HANDOFF.md section 4.7 |
| `banksDropdown` in `RegistrationFinancialPage` points at a control the spec says is absent on that step | RegistrationFinancial.spec.ts:136-137 |
| API spec `RegistrationAPIFlow` still sends old field names (stale for steps 5 to 8); upload returns 412 | project memory registration_api_contract_drift |
| Dev registration API: invalid mobiles accepted, 12 wrong OTPs never lock, 12 OTP requests never rate-limited | project memory registration_mock_otp_bypass |
| Dev OTP valid only 30 s; one intermittent run stuck on the OTP dialog | project memory registration_admin_integration_todo |
| Identity pools are finite and shared; fixed-index lookups race across workers | Registration/README.md; RegistrationInfoNavigation.spec.ts:12-21 |
| Switching language on the Confirmation page restarts the wizard | RegistrationConfirmationPage.ts:11-13 |
| Product names in specs are environment data and drift | RegistrationPoSOnboarding.spec.ts:19-23 |
| Specs written without running (mock-based states) may need selector tweaks | project memory registration_mock_otp_bypass |
| Contract content has two live templates (old 4 sections, new about 10) | RegistrationContractPage.ts:97-128 |
| Skipped placeholder tests: RP-40, RP-41, one Fixed-merchant and Resume cases | RegistrationProducts.spec.ts:164-168; RegistrationFixedMerchantAutoApprove.spec.ts:117-128 |

## Open questions

| Question | Why open |
|---|---|
| Real OTP length and validity for REGISTRATION on dev | Memory says 4 digits and 30 s; specs only read `length` |
| English text of the Confirmation page | Switching to EN restarts the wizard; manual RC-30 expects English |
| Exact validation error texts (IBAN, VAT, email, financial) in EN/AR | Specs check presence only |
| Does the NAFATH countdown equal 20 s? | Spec reads it live; manual says 20 s |
| Are BILLER and CUSTOMER profile cards ever visible to an applicant? | Page object defines them; manual lists only Merchant and Freelancer |
| Is a Banks select shown on Financial or only on Verification? | Page object and spec disagree |
| Which products appear in production vs the dev catalogue? | Names are test data |
| Whether the 6 product types can all be selected on UAT | RP-49 says six, dev catalogue lists six names |
| Endpoint and error contract for PoS order submit | Not in the repo files read |
