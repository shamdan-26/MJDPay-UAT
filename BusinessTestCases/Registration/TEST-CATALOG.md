# Registration test-case catalog

Generated from the specs (`node ../../scripts/registration-catalog.mjs TEST-CATALOG.md` from the Registration folder). Grouped by test type, then wizard step, then file. Tests under `drafts/` are unverified ideas and are not counted.

| Test type | Spec files | Test cases | Skipped |
|---|---|---|---|
| Functional (business behaviour) | 24 | 237 | 12 |
| UI / UX (elements, layout, screen states) | 19 | 280 | 0 |
| API (gateway endpoints) | 3 | 45 | 0 |
| Security | 2 | 25 | 0 |
| Integration (admin portal / DB) | 1 | 8 | 0 |
| Non-functional / Accessibility | 1 | 1 | 0 |
| Non-functional / Performance | 1 | 4 | 0 |
| Non-functional / Visual regression | 1 | 1 | 0 |
| **Total** | 52 | **601** | 12 |

## Functional (business behaviour)

### 1 Entry (Mobile + OTP)

**RegistrationMobile.spec.ts** (12) — `functional/01-entry/RegistrationMobile.spec.ts`

- `RM-21` should navigate away from registration when the logo is clicked
- `RM-22` should switch to Arabic (RTL) when Arabic button is clicked
- `RM-23` should accept input in the Mobile number field
- `RM-24` should not accept alphabetic characters in the mobile field
- `RM-25` should not accept special characters in the mobile field
- `RM-26` should enable Next button when a valid KSA mobile number is filled
- `RM-27` should disable Next button again after clearing the Mobile number field
- `RM-28` should reject a mobile number that does not start with 5
- `RM-29` should reject a mobile number shorter than 9 digits
- `RM-30` should not allow more than 9 digits in the Mobile number field
- `RM-33` should navigate to the login page when Log In is clicked
- `RM-34` should open the registration page when Sign Up is clicked on the login page

**RegistrationOtp.spec.ts** (12) — `functional/01-entry/RegistrationOtp.spec.ts`

- `RO-08` should have Verify button disabled when OTP inputs are empty
- `RO-09` should keep Verify disabled when fewer than all OTP digits are entered
- `RO-10` should enable Verify button when all OTP inputs are filled
- `RO-11` should not accept non-numeric characters in OTP inputs
- `RO-12` should auto-advance focus to the next input when a digit is entered
- `RO-13` should have Click to resend button disabled while countdown is active
- `RO-14` should enable resend button after countdown expires
- `RO-15` should remain on OTP popup after submitting wrong OTP
- `RO-16` should advance to the Business Info step after entering the correct OTP
- `RO-17` should close the OTP popup when Cancel is clicked
- `RO-18` should return to the mobile number page when Cancel is clicked
- `RO-19` should pre-fill the mobile number when returning via Cancel

**RegistrationOtpMockedBehaviour.spec.ts** (10) — `functional/01-entry/RegistrationOtpMockedBehaviour.spec.ts`

- `RG-OTPM-01` should send the typed code together with the requestId issued for the mobile
- `RO-15` should stay on the OTP dialog and allow another attempt after a wrong code
- `RG-OTPM-02` should advance to Business Info when the second attempt is correct
- `RG-OTPM-03` should not advance when the OTP has expired
- `RG-OTPM-04` should not advance when too many wrong attempts lock the request
- `RG-OTPM-05` should survive a server error on verify without leaving the OTP dialog or throwing
- `RG-OTPM-06` should send only one verify request when Verify is double-clicked
- `RG-OTPM-07` should fill every box when a full code is pasted into the first one
- `RG-OTPM-08` should move focus back to the previous box on Backspace in an empty box
- `RG-OTPM-09` should request a new code (not reuse the old requestId) when Resend is used

### 2 Business Info

**RegistrationInfoNavigation.spec.ts** (10) — `functional/02-business-info/RegistrationInfoNavigation.spec.ts`

- `RI-112` should advance to Tab 2 with Freelancer profile _(skipped)_
- `RI-113` should stay on the /register URL after advancing to Tab 2
- `RI-114` should show the Monthly Expected Number of Bills field on Tab 2
- `RI-115` should show the Next button on Tab 2
- `RI-116` should show the Back button on Tab 2
- `RI-117` should not reach Tab 2 when an unrecognised CRN / National ID pair is submitted
- `RI-118` should keep Next enabled on Tab 1 after going Back
- `RI-119` should successfully re-advance to Tab 2 after going Back and clicking Next _(skipped)_
- `RI-120` should show "Business Info" as the active inner step on load
- `RI-121` should not show NAFATH as active while on Tab 1

**RegistrationInfoServerValidation.spec.ts** (2) — `functional/02-business-info/RegistrationInfoServerValidation.spec.ts`

- `RG-SRV-01` should stay on Business Info with feedback when ${r.rule}
- `RG-SRV-02` should accept a corrected resubmission after a rejection

**RegistrationInfoShellInteractions.spec.ts** (14) — `functional/02-business-info/RegistrationInfoShellInteractions.spec.ts`

- `RI-122` should navigate to the Login page when the "Log In" link is clicked
- `RI-123` Terms & Conditions link should be visible
- `RI-124` Privacy Policy link should be visible
- `RI-125` Terms & Conditions link should be clickable without a JS error
- `RI-126` Privacy Policy link should be clickable without a JS error
- `RI-127` should switch to Arabic when العربية is clicked
- `RI-128` should switch back to English when EN is clicked after Arabic
- `RI-129` should mark EN as not active after switching to Arabic
- `RI-130` should change the body class when Switch theme is clicked
- `RI-131` should return to the original theme class when toggled twice
- `RI-132` should reveal a tooltip when the Unified Number info button is clicked
- `RI-133` should reveal a tooltip when the National ID info button is clicked
- `RI-134` should close the Unified Number tooltip when clicking away
- `RI-135` should display non-empty descriptive text inside the Unified Number tooltip

**RegistrationCrnField.spec.ts** (12) — `functional/02-business-info/fields/RegistrationCrnField.spec.ts`

- `RI-55` should accept a valid CRN and retain the value
- `RI-56` should be empty on initial page load
- `RI-57` should show the Clear button after a value is entered
- `RI-58` should clear the CRN field when the Clear button is clicked
- `RI-59` should hide the Clear button after the field is emptied via Clear
- `RI-60` should not retain alphabetic characters in the CRN field
- `RI-61` should not retain special characters in the CRN field
- `RI-62` should keep Next disabled when CRN is cleared after full form fill
- `RI-64` should handle a 1000-character input without crashing
- `RI-65` should not allow more than 15 digits in the CRN field
- `RI-66` should keep Next disabled when CRN is shorter than the minimum 10 digits
- `RI-67` should enable Next when CRN is exactly 15 digits (maximum valid length)

**RegistrationEmailField.spec.ts** (14) — `functional/02-business-info/fields/RegistrationEmailField.spec.ts`

- `RI-81` should accept a standard email address
- `RI-82` should accept an email with a plus-sign alias
- `RI-83` should accept an email with a subdomain
- `RI-84` should accept an email with numeric local part
- `RI-85` should show error for email missing the @ symbol
- `RI-86` should show error for email with no domain after @
- `RI-87` should show error for a bare @ symbol
- `RI-88` should show error for email containing a space
- `RI-89` should show error for email starting with a dot _(skipped)_
- `RI-90` should show error for email missing TLD (no dot after domain name)
- `RI-91` should clear the email error when a valid email replaces an invalid one
- `RI-92` should keep Next disabled while an invalid email is entered
- `RI-93` should become disabled again after clearing the email from a complete form
- `RI-96` should handle a very long email (500 chars) without crashing

**RegistrationNationalIdField.spec.ts** (12) — `functional/02-business-info/fields/RegistrationNationalIdField.spec.ts`

- `RI-68` should accept a valid National ID and retain the value
- `RI-69` should be empty on initial page load
- `RI-70` should show the Clear button after a value is entered
- `RI-71` should clear the National ID field when the Clear button is clicked
- `RI-72` should hide the Clear button after the field is emptied via Clear
- `RI-73` should keep Next disabled when National ID is cleared after full form fill
- `RI-74` should not retain alphabetic characters in the National ID field
- `RI-75` should not retain special characters in the National ID field
- `RI-77` should not execute a javascript: URI entered in the National ID field
- `RI-78` should handle a 1000-character input without crashing
- `RI-79` should keep Next disabled when National ID starts with a digit other than 1 or 2 _(skipped)_
- `RI-80` should not allow more than 10 digits in the National ID field

**RegistrationNextButton.spec.ts** (15) — `functional/02-business-info/fields/RegistrationNextButton.spec.ts`

- `RI-97` should be disabled when all fields are empty
- `RI-98` should be disabled when only Profile Type is selected
- `RI-99` should be disabled when only CRN is filled
- `RI-100` should be disabled when only National ID is filled
- `RI-101` should be disabled when only Email is filled
- `RI-102` should be disabled with Profile Type + CRN only
- `RI-103` should be disabled with Profile Type + National ID only
- `RI-104` should be disabled with Profile Type + Email only
- `RI-105` should be disabled with Profile Type + CRN + National ID (no email)
- `RI-106` should be disabled with CRN + National ID + Email (no profile type) _(skipped)_
- `RI-107` should be enabled when all fields are filled with Merchant profile
- `RI-108` should be enabled when all fields are filled with Freelancer profile _(skipped)_
- `RI-109` should become disabled again after clearing the CRN from a complete form
- `RI-110` should become disabled again after clearing the National ID from a complete form
- `RI-111` should not advance to Tab 2 when Next is force-clicked while disabled

**RegistrationProfileType.spec.ts** (3) — `functional/02-business-info/fields/RegistrationProfileType.spec.ts`

- `RI-52` should mark Merchant as aria-checked when selected
- `RI-53` should not mark Freelancer as aria-checked when clicked (disabled)
- `RI-54` should keep Merchant selected when the disabled Freelancer card is clicked

### 3 Financial

**RegistrationFinancial.spec.ts** (21) — `functional/03-financial/RegistrationFinancial.spec.ts`

- `RF-50` should not accept alphabetic characters in the Monthly Expected Number field
- `RF-51` should not accept special characters in the Monthly Expected Sum field
- `RF-52` should not accept alphabetic characters in the Expected Monthly Withdrawal field
- `RF-53` should not accept special characters in the Expected Monthly Deposit field
- `RF-54` should not retain a negative number in the Monthly Expected Number field
- `RF-55` should not retain a decimal point in the Monthly Expected Sum field
- `RF-56` should handle a very large value (15 digits) in the Expected Monthly Withdrawal field without crashing
- `RF-57` should treat a zero value in the Expected Monthly Deposit field as valid input
- `RF-62` should keep Next disabled when Monthly Expected Number Of Bills is 0 _(skipped)_
- `RF-63` should keep Next disabled when Monthly Expected Sum Of Bills has a leading zero _(skipped)_
- `RF-64` should restore valid values to all four fields after boundary/security probing
- `RF-66` should reflect the selected industry in the Industries dropdown
- `RF-68` should reflect the selected income in the Annual Income dropdown
- `RF-69` should filter the Industries options when typing in the dropdown search field
- `RF-70` should filter the Annual Income options when typing in the dropdown search field
- `RF-71` should keep Next disabled when only the numeric fields are filled and no dropdown is selected
- `RF-72` should enable Next when all required fields and dropdowns are filled
- `RF-73` should return to the Business Info step when Back is clicked
- `RF-74` should preserve the email on Business Info step after navigating back
- `RF-75` should allow re-advancing to Financial step after going back to Info step
- `RF-76` should advance to Verification & Uploads step when Next is clicked with valid data

### 4 Verification & Uploads

**RegistrationVerificationUploads.spec.ts** (27) — `functional/04-verification/RegistrationVerificationUploads.spec.ts`

- `RVU-37` should accept a valid IBAN
- `RVU-38` should show a validation error for an IBAN that does not start with SA
- `RVU-39` should show a validation error for an IBAN shorter than 24 characters
- `RVU-40` should show a validation error for a well-formed IBAN that fails the checksum
- `RVU-41` should display the IBAN Proof upload area
- `RVU-42` should display the IBAN proof upload hint text
- `RVU-49` should accept a valid VAT Number
- `RVU-50` should show a validation error for a VAT Number shorter than 15 digits
- `RVU-51` should not retain alphabetic characters in the VAT Number field
- `RVU-52` should show a validation error for a 15-digit VAT Number not starting with 2 or 3
- `RVU-53` should not allow more than 15 digits in the VAT Number field
- `RVU-54` should display the VAT Certificate upload area
- `RVU-55` should display the accepted file type for VAT certificate (PDF)
- `RVU-59` should accept a valid PDF for IBAN proof upload
- `RVU-60` should accept a valid PDF for VAT certificate upload
- `RVU-61` should accept a non-PDF file type for VAT certificate upload (no client-side type restriction)
- `RVU-62` should accept an English-named PDF for IBAN proof upload
- `RVU-63` should accept an Arabic-named PDF for IBAN proof upload
- `RVU-64` should accept an English-named PDF for VAT certificate upload
- `RVU-65` should accept an Arabic-named PDF for VAT certificate upload
- `RVU-66` should reject an unsupported file type for IBAN proof upload
- `RVU-67` should reject a file larger than 5MB for IBAN proof upload
- `RVU-68` should reject a file larger than 5MB for VAT certificate upload
- `RVU-69` should display the post-submit NAFATH verification notice
- `RVU-70` should enable Sign Up when Bank, IBAN, VAT Number, and both proof uploads are filled
- `RVU-72` should display Terms & Conditions link
- `RVU-73` should display Privacy Policy link

### 5 Identity (Nafath)

**RegistrationNafath.spec.ts** (5) — `functional/05-identity/RegistrationNafath.spec.ts`

- `RN-19` should display the Nafath page after Sign Up
- `RN-20` should display a countdown timer on the Nafath page
- `RN-21` should have the Verify button disabled while the redirect countdown is active [EMI-4895]
- `RN-22` should keep the Verify button disabled mid-countdown, not just on load [EMI-4895]
- `RN-23` should enable the Verify button once the countdown expires [EMI-4937]

### 6 Products & PoS

**RegistrationPoSOnboarding.spec.ts** (4) — `functional/06-products/RegistrationPoSOnboarding.spec.ts`

- `RP-61` TC-POS-026: should show a validation error for a zero device count _(skipped)_
- `RP-62` TC-POS-027: should show a validation error when split-group quantities do not sum to the total
- `RP-63` TC-POS-028: should send only one PoS order request when Next is clicked twice in quick succession
- `RP-64` should surface an error and stay on Devices & Delivery when the PoS order request fails

**RegistrationPoSSetup.spec.ts** (6) — `functional/06-products/RegistrationPoSSetup.spec.ts`

- `RP-55` should have the Devices & Delivery Next button enabled by default, even before contact fields are filled
- `RP-56` should keep the Devices & Delivery Next button enabled once contact name and mobile are filled
- `RP-57` should add a second delivery group when Add Location Group is clicked in split-by-device mode
- `RP-58` should remove a delivery group when Remove Location Group is clicked
- `RP-59` should return to the expanded PoS card when Back is clicked from Devices & Delivery
- `RP-60` should advance straight to Contract when Continue is clicked without checking "Request devices now" _(skipped)_

**RegistrationProducts.spec.ts** (15) — `functional/06-products/RegistrationProducts.spec.ts`

- `RP-40` should mark "Products" as the active step after NAFATH completes _(skipped)_
- `RP-41` should display a "View more" link on each product card _(skipped)_
- `RP-42` should show the annual price on the POS Terminal card instead of Free
- `RP-43` should show the mandatory product pre-selected and locked by default
- `RP-44` should have the Continue button enabled by default via the mandatory product
- `RP-45` should display "1 Selected" by default with only the mandatory product selected
- `RP-46` should select an optional product and show "2 Selected" when its card is clicked
- `RP-47` should keep the Continue button enabled after selecting another product
- `RP-48` should update the counter to "3 Selected" when a second optional product is selected
- `RP-49` should allow selecting all six available products
- `RP-50` should deselect a product and decrement the counter when its card is clicked again
- `RP-51` should keep the mandatory product selected once every optional product is deselected
- `RP-52` should show "1 Selected" again once every optional product is deselected
- `RP-53` should keep the Cancel button enabled regardless of selection state
- `RP-54` should advance past the Products step when Continue is clicked with a product selected

### 7 Contract

**RegistrationContract.spec.ts** (8) — `functional/07-contract/RegistrationContract.spec.ts`

- `RC-21` should keep Submit disabled while the agreement checkbox is unchecked
- `RC-22` should auto-check the agreement checkbox once the document is scrolled to its end
- `RC-23` should enable Submit once the agreement checkbox is checked
- `RC-24` should disable Submit again when the agreement checkbox is unchecked
- `RC-25` should not advance past Contract when Submit is force-clicked while unchecked
- `RC-26` should trigger a PDF download when "Download PDF file" is clicked
- `RC-27` should surface an error and remain on Contract when submission fails
- `RC-28` should send only one request when Submit is clicked twice in quick succession

### 8 Confirmation

**RegistrationConfirmation.spec.ts** (14) — `functional/08-confirmation/RegistrationConfirmation.spec.ts`

- `RC-29` should show the account-ready and check-email message in Arabic by default
- `RC-31` should lay the page out right-to-left in Arabic
- `RC-32` should not use pending-review wording
- `RC-34` should no longer show the Contract step controls
- `RC-40` should not display the OTP, a password or sensitive data
- `RC-42` should switch theme and keep the message readable
- `RC-39` should leave the profile active and approved with no admin step
- `RC-41` should record a User Activation notification for the new profile
- `RC-37` should not let the registered mobile re-open a completed registration
- `RC-33` should show a Login control that opens the Login page
- `RC-35` should not re-open the Contract step on browser Back
- `RC-36` should not resubmit or return to the wizard on refresh
- `RC-38` should create one profile and one notification when Submit is double-clicked
- `RC-30` should show the confirmation in English and left-to-right after switching to EN

### Journeys (cross-step)

**RegistrationE2EHappyPath.spec.ts** (2) — `functional/journeys/RegistrationE2EHappyPath.spec.ts`

- `RE-01` should complete Business Info, Financial & Business, and Verification & Uploads, then reach NAFATH or Products after Sign Up
- `RE-02` should reach Contract and complete submission after accepting the agreement

**RegistrationFixedMerchantAutoApprove.spec.ts** (6) — `functional/journeys/RegistrationFixedMerchantAutoApprove.spec.ts`

- `RE-03` TC-REG-005: should hide the "Sign Up As" profile-type selector and show a static "Signing up as Merchant" label
- `RE-04` TC-REG-006: should not allow the profile type to be changed in fixed-Merchant mode
- `RE-05` should show the normal profile-type selector when fixed-Merchant mode is off
- `RE-06` TC-REG-001: should reflect automatic approval without a manual admin step
- `RE-07` TC-REG-002: should reflect the profile as immediately active for operations
- `RE-08` TC-REG-007: should show confirmation that the activation email was sent

**RegistrationResilience.spec.ts** (9) — `functional/journeys/RegistrationResilience.spec.ts`

- `RG-RES-01` should stay on the mobile step and keep the number when the request times out
- `RG-RES-02` should recover and continue once the network is back after an offline attempt
- `RG-RES-03` should not advance and should re-enable Next when the submit times out
- `RG-RES-04` should not advance when the registration session has expired (401 SESSION_INVALID)
- `RG-RES-05` should return to a usable wizard after a page refresh on Business Info
- `RG-RES-06` should not break the wizard when the browser Back and Forward buttons are used
- `RG-RES-07` should send one request per submit when the connection is slow
- `RG-RES-08` should keep the entered values when the browser goes offline and back online
- `RG-RES-09` should let two tabs start a registration for the same mobile without breaking either

**RegistrationResumeFromInfo.spec.ts** (2) — `functional/journeys/RegistrationResumeFromInfo.spec.ts`

- `RI-136` should require re-entering Registration Info, then skip straight to Products/Contract, when resuming a registration already past Financial & Business
- `RI-137` should start a brand-new registration when the mobile is reused with a different CRN

**RegistrationResumeStateTable.spec.ts** (2) — `functional/journeys/RegistrationResumeStateTable.spec.ts`

- `RG-RESUME-01` should land on ${row.expect} for ${row.label}
- `RG-RESUME-02` should never land past Contract for an application that is already complete

## UI / UX (elements, layout, screen states)

### 1 Entry (Mobile + OTP)

**RegistrationMobilePage.spec.ts** (16) — `ui/01-entry/RegistrationMobilePage.spec.ts`

- `RM-01` should open the Registration URL
- `RM-02` should have the correct page title
- `RM-04` should display the MJD Pay logo as a clickable link
- `RM-05` should navigate to a valid page when the logo link is clicked
- `RM-07` should not have EN as the active language by default
- `RM-09` should have Arabic as the active language by default
- `RM-11` should change the theme when the toggle is clicked
- `RM-12` should display the "Create Account" eyebrow text
- `RM-13` should display the "Enter Phone Number" heading
- `RM-14` should display the "Start your business registration" description
- `RM-15` should display the Mobile number input
- `RM-16` should have the correct placeholder for Mobile number
- `RM-17` should display the Next button
- `RM-18` should have Next button disabled when Mobile number is empty
- `RM-19` should display the "Already have an account?" text
- `RM-20` should display the Log In link

**RegistrationMobileStates.spec.ts** (9) — `ui/01-entry/RegistrationMobileStates.spec.ts`

- `RG-MOBST-01` should put keyboard focus in the mobile field on load
- `RG-MOBST-02` should expose a numeric input mode for the mobile field
- `RG-MOBST-03` should submit the mobile number when Enter is pressed in the field
- `RG-MOBST-04` should keep Next from firing a second request while the first is in flight
- `RG-MOBST-05` should stay on the mobile step and keep the number when the server returns an error
- `RG-MOBST-06` should show an error and not open the OTP dialog when the number is rejected as already registered
- `RG-MOBST-07` should keep only digits (max 9) when ${label} is pasted
- `RG-MOBST-08` should show the country code prefix next to the field
- `RG-MOBST-09` should move focus logically from the field to Next with the Tab key

**RegistrationOtpPopup.spec.ts** (7) — `ui/01-entry/RegistrationOtpPopup.spec.ts`

- `RO-01` should display the Enter OTP heading
- `RO-02` should display the OTP instruction message
- `RO-03` should display OTP input boxes
- `RO-04` should display the countdown timer
- `RO-05` should display the Cancel button
- `RO-06` should display the Verify button
- `RO-07` should display the Click to resend button

**RegistrationOtpStates.spec.ts** (9) — `ui/01-entry/RegistrationOtpStates.spec.ts`

- `RG-OTPST-01` should show the dialog as a labelled modal
- `RG-OTPST-02` should give every code box an accessible name and a numeric input mode
- `RG-OTPST-03` should focus the first code box when the dialog opens
- `RG-OTPST-04` should show the resend countdown as mm:ss and count down
- `RG-OTPST-05` should keep Verify disabled until every box is filled and enable it after
- `RG-OTPST-06` should announce a wrong code to assistive technology
- `RG-OTPST-07` should accept only digits in a code box
- `RG-OTPST-08` should render the dialog right-to-left in Arabic
- `RG-OTPST-09` should keep the dialog inside a 375px viewport

### 2 Business Info

**RegistrationInfoForm.spec.ts** (33) — `ui/02-business-info/RegistrationInfoForm.spec.ts`

- `RI-19` should display the tab panel container [ref_24]
- `RI-20` should display the Business Info form element [ref_25]
- `RI-21` should display the Profile Type label [ref_26]
- `RI-22` should display the Profile Type radiogroup [ref_27]
- `RI-23` should display exactly two Profile Type options
- `RI-24` should display the Merchant radio option [ref_28]
- `RI-25` should display the Merchant label and description [ref_29, ref_30]
- `RI-26` should display the Freelancer radio option [ref_37]
- `RI-27` should display the Freelancer label and description [ref_38, ref_39]
- `RI-28` should display the Unified Number label [ref_40]
- `RI-29` should display the Unified Number tooltip button [ref_41]
- `RI-30` should display the Unified Number input wrapper [ref_42]
- `RI-31` should display the Unified Number textbox with correct placeholder [ref_43]
- `RI-32` should display the National ID/Iqama label [ref_45]
- `RI-33` should display the National ID/Iqama tooltip button [ref_46]
- `RI-34` should display the National ID/Iqama input wrapper [ref_47]
- `RI-35` should display the National ID/Iqama textbox with correct placeholder [ref_48]
- `RI-36` should display the Email label [ref_50]
- `RI-37` should display the Email textbox with correct placeholder [ref_51]
- `RI-38` should display the Next button [ref_53]
- `RI-39` should display "Already have an account?" text [ref_54]
- `RI-40` should display the Log In link [ref_55]
- `RI-41` should display "By continuing, you agree to our" text [ref_56]
- `RI-42` should display Terms & Conditions reference [ref_57]
- `RI-43` should display Privacy Policy reference [ref_58]
- `RI-44` should allow selecting Merchant profile type [ref_28]
- `RI-45` should not allow selecting Freelancer profile type — disabled as "Coming Soon" [ref_37]
- `RI-46` should accept input in the Unified Number field [ref_43]
- `RI-47` should display the Clear button for Unified Number after entry [ref_44]
- `RI-48` should accept input in the National ID/Iqama field [ref_48]
- `RI-49` should accept input in the Email field [ref_51]
- `RI-50` should have the Next button disabled when form is incomplete [ref_53]
- `RI-51` should enable the Next button when all fields are filled with valid data [ref_53]

**RegistrationInfoShell.spec.ts** (13) — `ui/02-business-info/RegistrationInfoShell.spec.ts`

- `RI-03` should display the Change Language group [ref_4]
- `RI-07` should display the main page container [ref_8]
- `RI-08` should display the "Create Account" eyebrow text [ref_9]
- `RI-09` should display the "Tell us about your business" heading [ref_10]
- `RI-10` should display "1" as the active step number [ref_11]
- `RI-11` should display "Business Info" as the active outer step [ref_12]
- `RI-12` should display "NAFATH" as the second outer step [ref_13]
- `RI-13` should display "Products" as the third outer step [ref_14]
- `RI-14` should display "Contract" as the fourth outer step [ref_15]
- `RI-15` should display the step bar [ref_16]
- `RI-16` should display Tab 1 — Business Info [ref_17, ref_19]
- `RI-17` should display Tab 3 — Products [ref_22, ref_23]
- `RI-18` should display Tab 4 — Contract [ref_24, ref_25]

**RegistrationInfoStates.spec.ts** (12) — `ui/02-business-info/RegistrationInfoStates.spec.ts`

- `RG-INFOST-01` should show exactly one profile type as selected after a click
- `RG-INFOST-02` should let a profile type be chosen with the keyboard
- `RG-INFOST-03` should keep Next disabled until every field is valid and enable it after
- `RG-INFOST-04` should mark the email field invalid and show an error for a malformed address
- `RI-91` should clear the email error once the address is corrected
- `RG-INFOST-05` should accept a ${label} email address
- `RG-INFOST-06` should not overflow the layout with a very long email address
- `RG-INFOST-07` should submit when Enter is pressed in the last field of a valid form
- `RG-INFOST-08` should send the chosen profile type, CRN, National ID and email to the server
- `RG-INFOST-09` should stay on Business Info and keep the entered values when the server answers 500
- `RG-INFOST-10` should not allow a second submit while the first is in flight
- `RG-INFOST-11` should show the server error when the identity is already registered

### 3 Financial

**RegistrationFinancialPage.spec.ts** (30) — `ui/03-financial/RegistrationFinancialPage.spec.ts`

- `RF-06` should show the Financial & Business step fields on arrival
- `RF-07` should show the Financial & Business tab as active
- `RF-08` should mark the Financial & Business inner tab as active (is-active)
- `RF-09` should display all four step indicators
- `RF-10` should display the Monthly Expected Number Of Bills label
- `RF-11` should display the Monthly Expected Number Of Bills field
- `RF-12` should show the correct placeholder for Monthly Expected Number Of Bills
- `RF-13` should display the Monthly Expected Sum Of Bills label
- `RF-14` should display the Monthly Expected Sum Of Bills field
- `RF-15` should show the correct placeholder for Monthly Expected Sum Of Bills
- `RF-16` should display the Expected Monthly Withdrawal label
- `RF-17` should display the Expected Monthly Withdrawal field
- `RF-18` should show the correct placeholder for Expected Monthly Withdrawal
- `RF-19` should display the Expected Monthly Deposit label
- `RF-20` should display the Expected Monthly Deposit field
- `RF-21` should show the correct placeholder for Expected Monthly Deposit
- `RF-22` should display the Industries dropdown label
- `RF-23` should display the Industries dropdown
- `RF-24` should show "Select Option" as the default for Industries
- `RF-25` should display the Annual Income dropdown label
- `RF-26` should display the Annual Income dropdown
- `RF-27` should show "Select Option" as the default for Annual Income
- `RF-28` should display the Back button
- `RF-29` should display the Next button
- `RF-30` should keep Next disabled when required fields are empty
- `RF-31` should display "Already have an account?" text
- `RF-32` should display the Log In link
- `RF-33` should display "By continuing, you agree to our" text
- `RF-34` should display Terms & Conditions link
- `RF-35` should display Privacy Policy link

**RegistrationFinancialPageDedicatedAsset.spec.ts** (1) — `ui/03-financial/RegistrationFinancialPageDedicatedAsset.spec.ts`

- `RF-45` should accept numeric input for Monthly Expected Number Of Bills

**RegistrationFinancialPageStateful.spec.ts** (9) — `ui/03-financial/RegistrationFinancialPageStateful.spec.ts`

- `RF-36` should accept numeric input for Monthly Expected Sum Of Bills
- `RF-37` should accept numeric input for Expected Monthly Withdrawal
- `RF-38` should accept numeric input for Expected Monthly Deposit
- `RF-39` should display the Banks dropdown label
- `RF-40` should open the Industries dropdown when clicked
- `RF-41` should open the Annual Income dropdown when clicked
- `RF-42` should open the Banks dropdown when clicked
- `RF-43` should return to Business Info tab when Back is clicked
- `RF-44` should proceed to Verification & Uploads tab when Next is clicked with valid data

**RegistrationFinancialStates.spec.ts** (8) — `ui/03-financial/RegistrationFinancialStates.spec.ts`

- `RG-FINST-01` should stay usable and not crash when the ${name} lookup fails
- `RG-FINST-02` should show an empty industries list as no options rather than a blank panel
- `RG-FINST-03` should open the industries list with the keyboard and choose an option
- `RG-FINST-04` should close an open dropdown with Escape without selecting anything
- `RG-FINST-05` should show a no-results state when the industries search matches nothing
- `RG-FINST-06` should not overflow a 375px viewport
- `RF-43` should keep Back reachable and return to Business Info
- `RG-FINST-07` should switch to right-to-left layout and keep the form usable in Arabic

### 4 Verification & Uploads

**RegistrationVerificationPage.spec.ts** (30) — `ui/04-verification/RegistrationVerificationPage.spec.ts`

- `RVU-01` should display the MJD Pay logo
- `RVU-02` should link the MJD Pay logo to the landing page
- `RVU-03` should display the EN language button
- `RVU-04` should display the Arabic language button
- `RVU-05` should display the Switch theme button
- `RVU-06` should show the Verification & Uploads step title
- `RVU-07` should keep outer step 1 (Business Info) active while on Verification & Uploads
- `RVU-08` should display all four outer step indicators
- `RVU-09` should display the IBAN field
- `RVU-10` should show the correct placeholder for IBAN
- `RVU-11` should display the IBAN hint "24 characters starting with SA"
- `RVU-12` should display the IBAN Proof upload label
- `RVU-13` should display the "Click to upload" prompt for IBAN proof
- `RVU-14` should display the IBAN proof upload helper text
- `RVU-15` should display the accepted file types for IBAN proof (PDF, JPG)
- `RVU-16` should display the max file size for IBAN proof (5MB)
- `RVU-17` should display the VAT Number field
- `RVU-18` should show the correct placeholder for VAT Number
- `RVU-19` should display the VAT Number hint "From your VAT certificate"
- `RVU-20` should display the VAT Certificate upload label
- `RVU-21` should display the "Click to upload" prompt for VAT certificate
- `RVU-22` should display the VAT certificate upload helper text
- `RVU-23` should display the post-submit OTP/NAFATH verification notice
- `RVU-24` should display the Back button
- `RVU-25` should display the Sign Up button
- `RVU-26` should keep Sign Up disabled when required fields are empty
- `RVU-27` should display "Already have an account?" text
- `RVU-28` should display the Log In link
- `RVU-29` should display Terms & Conditions reference
- `RVU-30` should display Privacy Policy reference

**RegistrationVerificationStates.spec.ts** (10) — `ui/04-verification/RegistrationVerificationStates.spec.ts`

- `RG-VERST-01` should show an error and keep Sign Up disabled when the IBAN proof upload fails (500)
- `RG-VERST-02` should let a failed upload be retried with the same file
- `RG-VERST-03` should reject a renamed non-PDF (server says invalid file) without enabling Sign Up
- `RG-VERST-04` should not enable Sign Up for a zero-byte file
- `RG-VERST-05` should replace the IBAN proof when a second file is chosen
- `RG-VERST-06` should keep the entered IBAN and VAT number after going Back and returning
- `RG-VERST-07` should upper-case a lower-case IBAN
- `RG-VERST-08` should stay on the step with Sign Up usable again when registration fails (500)
- `RG-VERST-09` should send only one registration request when Sign Up is double-clicked
- `RG-VERST-10` should send the uploaded file ids and the IBAN/VAT values in the registration request

### 5 Identity (Nafath)

**RegistrationNafathPage.spec.ts** (13) — `ui/05-identity/RegistrationNafathPage.spec.ts`

- `RN-06` should display the "Create Account" eyebrow text
- `RN-07` should display "Business Info" as the first outer step
- `RN-08` should display "NAFATH" as the active outer step
- `RN-09` should display "Products" as the third outer step
- `RN-10` should display "Contract" as the fourth outer step
- `RN-11` should display the "Verify with Nafath" heading
- `RN-12` should display the verification instruction text
- `RN-13` should display step 1 "Open Nafath app and sign in"
- `RN-14` should display step 2 "Select the number shown"
- `RN-15` should display step 3 "Approve"
- `RN-16` should display the redirect note with a countdown timer
- `RN-17` should display the "Verify" button as initially disabled while the countdown is active [EMI-4895]
- `RN-18` should not display a resend option in the Nafath panel [EMI-4895]

### 6 Products & PoS

**RegistrationProductsPage.spec.ts** (14) — `ui/06-products/RegistrationProductsPage.spec.ts`

- `RP-06` should display the "Setup" eyebrow text
- `RP-07` should display the "Products" title
- `RP-08` should display the products-selection subtitle
- `RP-09` should display all four outer step labels: Business Info, NAFATH, Products, Contract
- `RP-10` should show "Products" as the active outer step
- `RP-11` should display at least one product card
- `RP-12` should display the required Wallet card
- `RP-13` should show a "Show more" link on the Wallet card
- `RP-14` should show a price/billing label on every visible product card
- `RP-15` should display the selection counter
- `RP-16` should show a non-zero count in the selection counter on arrival
- `RP-17` should display the Cancel button
- `RP-18` should display the Continue button
- `RP-19` should have the Continue button enabled by default via the required product

**RegistrationProductsPoSSetup.spec.ts** (20) — `ui/06-products/RegistrationProductsPoSSetup.spec.ts`

- `RP-20` should expand the PoS Terminals card inline without leaving the Products step
- `RP-21` should show "Request devices now" in the expanded card
- `RP-22` should show a Continue button in the expanded card
- `RP-23` should reveal the Devices & Delivery fields after checking "Request devices now" and continuing
- `RP-24` should show the Devices & Delivery fields
- `RP-25` should not show a wallet picker anywhere in the Devices & Delivery step
- `RP-26` should display the delivery mode toggle
- `RP-27` should display the Back button in Devices & Delivery
- `RP-28` should default the total-devices count to 1
- `RP-29` should increment the total-devices count when the increase button is clicked
- `RP-30` should decrement the total-devices count when the decrease button is clicked, without going below the minimum
- `RP-31` should update the total-devices count when typed directly into the field
- `RP-32` should select "single location" delivery by default
- `RP-33` should switch to per-device delivery groups when "split by devices" is selected
- `RP-34` should display the Add Location Group button in split-by-device mode
- `RP-35` should select the Wathiq national address by default and show the resolved address
- `RP-36` should reveal a custom map location option when selected
- `RP-37` should accept a contact name
- `RP-38` should accept a Saudi contact mobile number
- `RP-39` should display the Contract step after completing Devices & Delivery

### 7 Contract

**RegistrationContractPage.spec.ts** (17) — `ui/07-contract/RegistrationContractPage.spec.ts`

- `RC-02` should link the logo to the business landing page
- `RC-04` should display the Arabic (العربية) language button
- `RC-06` should display the "Final step" label
- `RC-07` should display the "Contract review" title
- `RC-08` should display instruction text about reading and agreeing to complete registration
- `RC-09` should display all four outer step labels: Business Info, NAFATH, Products, Contract
- `RC-10` should mark the Contract tab as the active step
- `RC-11` should display the "Download PDF file" button
- `RC-12` should display the contract document title
- `RC-13` should display the contract version field
- `RC-14` should display the registration date field showing today\
- `RC-15` should display a non-empty intro paragraph
- `RC-16` should display the involved company\
- `RC-17` should display at least one numbered contract section, each with visible non-empty heading text
- `RC-18` should display the "I have read and agree to the contract terms" checkbox, unchecked
- `RC-19` should display the Cancel button
- `RC-20` should display the Submit and finish button

### 8 Confirmation

**RegistrationConfirmationPage.spec.ts** (19) — `ui/08-confirmation/RegistrationConfirmationPage.spec.ts`

- `RG-CONF-01` should display the "registration request received" heading
- `RG-CONF-02` should display the account-ready message
- `RG-CONF-03` should tell the applicant to check their email
- `RG-CONF-04` should display the Login button with its Arabic label and keep it enabled
- `RG-CONF-05` should offer exactly one next action
- `RG-CONF-06` should not show any input field
- `RG-CONF-07` should not show raw translation keys or placeholder text
- `RG-CONF-08` should display the language buttons in the header
- `RG-CONF-09` should display the theme toggle in the header
- `RG-CONF-10` should lay the page out right-to-left in Arabic
- `RG-CONF-11` should stack heading, message and Login button top to bottom
- `RG-CONF-12` should centre the content horizontally
- `RG-CONF-13` should not overflow the page horizontally
- `RG-CONF-14` should switch theme and keep the message and button readable
- `RG-CONF-15` should make the Login button reachable by keyboard
- `RG-CONF-16` should open the Login page when the Login button is clicked
- `RG-CONF-17` should keep heading, message and Login button visible without horizontal scroll on ${vp.name}
- `RG-CONF-18` should not show the confirmation when the submit call fails (500)
- `RG-CONF-19` should show the confirmation only after the submit call answers

### Wizard chrome (shared)

**RegistrationWizardChrome.spec.ts** (10) — `ui/shared/RegistrationWizardChrome.spec.ts`

- `RG-CHROME-01` should display the MJD Pay logo
- `RG-CHROME-02` should link the MJD Pay logo to the landing page
- `RG-CHROME-03` should display the EN and Arabic language buttons
- `RG-CHROME-04` should display the theme toggle button
- `RG-CHROME-05` should have the correct page title
- `RG-CHROME-06` should switch the document to Arabic and right-to-left
- `RG-CHROME-07` should switch back to English and left-to-right
- `RG-CHROME-08` should change the theme class when the theme toggle is clicked
- `RG-CHROME-09` should load without console errors or failed asset requests
- `RG-CHROME-10` should not scroll horizontally on a ${vp.label} viewport

## API (gateway endpoints)

### —

**RegistrationAPIFlow.spec.ts** (27) — `api/RegistrationAPIFlow.spec.ts`

- `API-01` API-01: POST /register/mobile/otp should return 200 for an unregistered mobile
- `API-02` API-02: GET /otp-settings/q should return OTP config for REGISTRATION
- `API-03` API-03: POST /register/verify/otp should return 200 with sessionToken
- `API-04` API-04: POST /register/mobile/otp/resend should return 200
- `API-05` API-05: POST /register/profile-registration-type should return 201 for a fresh identity
- `API-06` API-06: POST /file/attachment/upload?fileType=iban should return 200 with fileId
- `API-07` API-07: POST /file/attachment/upload?fileType=vat should return 200 with fileId
- `API-08` API-08: POST /register should return 200 on full sign-up submission
- `API-09` API-09: POST /register/uri/status should initiate NAFATH and return a redirect URI
- `API-10` API-10: GET /products should return active products list
- `API-11` API-11: POST /register/products should assign selected products and return 200
- `API-12` API-12: GET /contracts/preview should return contract preview
- `API-13` API-13: POST /register/contract/accept should return 200 and complete registration
- `API-14` API-14: GET /contracts/generate-file should return contract PDF
- `API-15` API-15: the just-registered account cannot sign in yet (Pending Manual KYB)
- API-N1: POST /register/mobile/otp with invalid number format should return 400
- API-N2: POST /register/verify/otp with wrong OTP should return 400
- API-N3: POST /register/profile-registration-type without token should return 401
- API-N4: POST /register/profile-registration-type with invalid nationalId should return 400
- API-N5: GET /products without token should return 401
- API-N6: POST /register without token should return 401
- API-N7: POST /register/uri/status (NAFATH) without token should return 401
- API-N8: POST /register/products without token should return 401
- API-N9: GET /contracts/preview without token should return 401
- API-N10: GET /contracts/generate-file without token should return 401
- API-N11: POST /register/contract/accept without token should return 401
- API-N12: POST /register/mobile/otp should not require a session token

**RegistrationLookups.spec.ts** (8) — `api/RegistrationLookups.spec.ts`

- API-L1: GET /industries should return a list of industries
- API-L2: GET /lookup/banks should return a list of banks
- API-L3: GET /purpose-of-transfer should return transfer purpose options
- API-L4: GET /transaction-types should return transaction type options
- API-L5: GET /payment-method should return payment method options
- API-L6: GET /annual-incomes should return annual income brackets
- API-L7: GET /discountTypes should return discount type options
- API-L8: GET /register/profile-registration-type should return available profile types

**RegistrationSessionRefresh.spec.ts** (10) — `api/RegistrationSessionRefresh.spec.ts`

- `RSR-01` RSR-01: POST /register/mobile/otp returns nullable sessionToken and refreshToken objects
- `RSR-02` RSR-02: POST /register/verify/otp returns both token pairs populated
- `RSR-03` RSR-03: a valid refresh token issues a new registration session token
- `RSR-03b` RSR-03b: the refresh token travels as a header, not in the body
- `RSR-04` RSR-04: an invalid refresh token is rejected
- `RSR-04b` RSR-04b: refreshing without an active registration session is rejected
- `RSR-05` RSR-05: a refreshed session continues the same registration, not a new one
- `RSR-06` RSR-06: a registration refresh token is not accepted by the login refresh endpoint
- `RSR-06b` RSR-06b: a registration session token is not accepted as a login access token
- `RSR-07` RSR-07: the endpoint paths and the millisecond unit are version-controlled

## Security

### —

**RegistrationApiSecurity.spec.ts** (12) — `security/RegistrationApiSecurity.spec.ts`

- `RG-APISEC-01` ${ep.method} ${ep.path.split('?')[0]} should reject a request with no session token
- `RG-APISEC-02` ${ep.method} ${ep.path.split('?')[0]} should reject a forged session token
- `RG-APISEC-03` POST /register/mobile/otp should not issue an OTP for an invalid mobile (${label})
- `RG-APISEC-04` POST /register/mobile/otp should reject a missing mobileNumber
- `RG-APISEC-05` POST /register/verify/otp should reject a non-numeric OTP without a server error
- `RG-APISEC-06` repeated wrong OTPs should never yield a session and should end in a lockout
- `RG-APISEC-07` OTP requests for one mobile should be rate-limited
- `RG-APISEC-08` profile-registration-type should ignore client-supplied progress flags (mass assignment)
- `RG-APISEC-09` contract/accept should be rejected before Products and Contract steps are completed
- `RG-APISEC-10` a session token should not be usable against another applicant\
- `RG-APISEC-11` a used OTP should not verify twice
- `RG-APISEC-12` two applicants submitting the same CRN at the same time should not both be accepted

**RegistrationInputSecurity.spec.ts** (13) — `security/RegistrationInputSecurity.spec.ts`

- `RM-31` should not execute an XSS payload entered in the Mobile number field
- `RM-32` should not accept a SQL injection pattern in the Mobile number field
- `RI-63` should not execute an XSS payload entered in the CRN field
- `RI-76` should not execute an XSS payload entered in the National ID field
- `RI-94` should not execute XSS entered in the email field
- `RI-95` should treat SQL injection pattern in email as invalid and show error
- `RF-58` should not execute an XSS payload entered in the Monthly Expected Number field
- `RF-59` should not execute an XSS payload entered in the Monthly Expected Sum field
- `RF-60` should not accept a SQL injection pattern in the Expected Monthly Withdrawal field
- `RF-61` should not accept a SQL injection pattern in the Expected Monthly Deposit field
- `RVU-56` should not execute an XSS payload entered in the IBAN field
- `RVU-57` should not execute an XSS payload entered in the VAT Number field
- `RVU-58` should treat a SQL injection pattern in the IBAN field as invalid

## Integration (admin portal / DB)

### —

**RegistrationAdminAccountListing.spec.ts** (8) — `integration/RegistrationAdminAccountListing.spec.ts`

- `RG-ADMIN-01` newly registered business is listed under Manage Users → Accounts → Business
- `RG-ADMIN-02` listed account is Active, Approved and not blocked
- `RG-ADMIN-03` registration request is fully completed in emi_profile
- `RG-ADMIN-04` creates exactly one type-specific profile row matching the account type
- `RG-ADMIN-05` creates one wallet of the matching type in emi_wallet.user_wallets
- `RG-ADMIN-06` records a delivered User Activation email to the registered address in Mongo
- `RG-ADMIN-07` sends two activation emails: API credentials and login details
- `RG-ADMIN-08` listed account shows the registered contact number and a brand name

## Non-functional / Accessibility

### —

**RegistrationAccessibility.spec.ts** (1) — `non-functional/RegistrationAccessibility.spec.ts`

- ${step.name} should have no serious accessibility violations (${lang}, ${theme} theme)

## Non-functional / Performance

### —

**RegistrationPerformance.spec.ts** (4) — `non-functional/RegistrationPerformance.spec.ts`

- `RG-PERF-01` should render the mobile step within ${BUDGET.firstContentMs}ms (largest contentful paint)
- `RG-PERF-02` should move from Mobile to Business Info within ${BUDGET.stepTransitionMs}ms of pressing Next (mocked backend)
- `RG-PERF-03` should keep the main thread responsive (no long task over 500ms) while loading Business Info
- `RG-PERF-04` should finish a 5MB upload within ${BUDGET.uploadUnderSlow3gMs}ms on a throttled connection (mocked server)

## Non-functional / Visual regression

### —

**RegistrationVisualRegression.spec.ts** (1) — `non-functional/RegistrationVisualRegression.spec.ts`

- `RG-VIS-01` ${step.name} should match its ${vp.label} ${lang}/${theme} baseline
