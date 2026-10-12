# Manual Test Cases — Registration — Contract Review Step

Context: the final step of registration. The applicant reviews the generated contract document, may download it as a PDF, must scroll to its end (auto-checking the agreement checkbox) or check it manually, then submits to complete registration.

Priority key: **P1** = blocks the release / core happy path, **P2** = important secondary behavior, **P3** = edge case / polish.

---

## A. Contract Review

Context: covers "Registration — Contract Review".

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| RC-01 | Display the MJD Pay logo | Load the Contract Review step | The MJD Pay logo is visible | P3 |
| RC-02 | Link the logo to the business landing page | Load the Contract Review step | Link the logo to the business landing page | P2 |
| RC-03 | Display the EN language button | Load the Contract Review step | The EN language button is visible | P2 |
| RC-04 | Display the Arabic (العربية) language button | Load the Contract Review step | The Arabic (العربية) language button is visible | P2 |
| RC-05 | Display the Switch theme button | Load the Contract Review step | The Switch theme button is visible | P2 |
| RC-06 | Display the "Final step" label | Load the Contract Review step | The "Final step" label is visible | P3 |
| RC-07 | Display the "Contract review" title | Load the Contract Review step | The "Contract review" title is visible | P3 |
| RC-08 | Display instruction text about reading and agreeing to complete registration | Load the Contract Review step | Instruction text about reading and agreeing to complete registration is visible | P3 |
| RC-09 | Display all four outer step labels: Business Info, NAFATH, Products, Contract | Load the Contract Review step | All four outer step labels: Business Info, NAFATH, Products, Contract is visible | P3 |
| RC-10 | Mark the Contract tab as the active step | Load the Contract Review step | Mark the Contract tab as the active step | P2 |
| RC-11 | Display the "Download PDF file" button | Load the Contract Review step | The "Download PDF file" button is visible | P2 |
| RC-12 | Display the contract document title | Load the Contract Review step | The contract document title is visible | P3 |
| RC-13 | Display the contract version field | Load the Contract Review step | The contract version field is visible | P2 |
| RC-14 | Display the registration date field showing today\ | Load the Contract Review step | The registration date field showing today\ is visible | P2 |
| RC-15 | Display a non-empty intro paragraph | Load the Contract Review step | A non-empty intro paragraph is visible | P2 |
| RC-16 | Display the involved company\ | Load the Contract Review step | The involved company\ is visible | P2 |
| RC-17 | Display at least one numbered contract section, each with visible non-empty heading text | Load the Contract Review step | At least one numbered contract section, each with visible non-empty heading text is visible | P3 |
| RC-18 | Display the "I have read and agree to the contract terms" checkbox, unchecked | Load the Contract Review step | The "I have read and agree to the contract terms" checkbox, unchecked is visible | P2 |
| RC-19 | Display the Cancel button | Load the Contract Review step | The Cancel button is visible | P2 |
| RC-20 | Display the Submit and finish button | Load the Contract Review step | The Submit and finish button is visible | P1 |

## B. Contract Review: Acknowledgement & Actions (Live)

Context: covers "Registration – Contract Review: Acknowledgement & Actions (Live)".

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| RC-21 | Keep Submit disabled while the agreement checkbox is unchecked | While the agreement checkbox is unchecked | The primary action control stays disabled | P1 |
| RC-22 | Auto-check the agreement checkbox once the document is scrolled to its end | Load the Contract Review step | Auto-check the agreement checkbox once the document is scrolled to its end | P2 |
| RC-23 | Enable Submit once the agreement checkbox is checked | Set up the state: Submit once the agreement checkbox is checked | The control becomes enabled | P1 |
| RC-24 | Disable Submit again when the agreement checkbox is unchecked | The agreement checkbox is unchecked | The control becomes/stays disabled | P1 |
| RC-25 | Not advance past Contract when Submit is force-clicked while unchecked | Attempt the blocked transition: Submit is force-clicked while unchecked | The step does not advance | P1 |
| RC-26 | Trigger a PDF download when "Download PDF file" is clicked | "Download PDF file" is clicked | Trigger a PDF download | P2 |

## C. Contract Submission (Mocked)

Context: covers "Registration – Contract Submission (Mocked)".

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| RC-27 | Surface an error and remain on Contract when submission fails | Submission fails | Surface an error and remain on Contract | P2 |
| RC-28 | Send only one request when Submit is clicked twice in quick succession | Submit is clicked twice in quick succession | Send only one request | P1 |

## D. Registration Complete (Confirmation Page after Submit and finish)

Context: the final screen shown after the applicant clicks Submit and finish on the Contract step. Sources: the live confirmation text recorded in `RegistrationHelper.ts` (confirmed 2026-09-27: "حسابك جاهز... راجع بريدك الإلكتروني", "Your account is ready... check your email"); auto-approval and auto-activation (TC-REG-001, TC-REG-002); the "User Activation" notification record. The exact wording, controls and layout of this page are not documented anywhere in the suite sources, so every expectation marked "verify against live UI" must be confirmed by the tester and the wording recorded in the result. Complements RE-02, RE-06, RE-07 and RE-08, which only say the flow completes and do not describe this page.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| RC-29 | Confirmation page is shown in Arabic by default after Submit and finish with the account-ready and check-email message | Preconditions: a new applicant has reached the Contract step with the agreement checkbox checked; the app language is the default (Arabic). 1. Click Submit and finish. 2. Wait for the next screen. 3. Read the heading and the message. | 1. The wizard leaves the Contract step and a confirmation page is shown. 2. The message tells the applicant the account is ready and to check their email, e.g. "حسابك جاهز... راجع بريدك الإلكتروني" (wording seen live 2026-09-27; record the exact full text and heading found - verify against live UI). 3. No error toast or error banner is shown. | P1 |
| RC-30 | Confirmation page shows the same account-ready and check-email message in English after switching the language to EN | Preconditions: the applicant is on the confirmation page in Arabic (see RC-29). 1. Use the EN/AR toggle to switch to English. 2. Read the heading and the message. | 1. The page stays on the confirmation page; the applicant is not sent back into the wizard and nothing is resubmitted. 2. The heading and message are in English and say the account is ready and to check the email (exact English wording not documented - verify against live UI). 3. No Arabic text is left in the heading or message, and no raw translation key (for example a dotted key name) is shown. | P1 |
| RC-31 | Confirmation page layout is right-to-left in Arabic and left-to-right in English | Preconditions: the applicant is on the confirmation page. 1. In Arabic, note text alignment, the position of the main control and the page direction. 2. Switch to English and note the same items. | 1. In Arabic the text is right-aligned and the layout is mirrored (right-to-left). 2. In English the text is left-aligned and the layout is left-to-right. 3. In both languages nothing overlaps, is cut off or overflows the screen. | P2 |
| RC-32 | Confirmation page does not use pending-review wording | Preconditions: a registration has just been submitted (see RC-29). Registration auto-approves and auto-activates the profile (TC-REG-001, TC-REG-002). 1. Read all text on the confirmation page in Arabic. 2. Switch to English and read all text again. | 1. The page says the account is ready. 2. Nothing on the page says the application is pending, under review, awaiting approval or awaiting an admin (in either language). 3. If any such wording appears, record it: it contradicts auto-approval and is a defect. | P1 |
| RC-33 | Confirmation page shows a control to continue to Login and it opens the Login page | Preconditions: the applicant is on the confirmation page. The label and type of the next-action control are not documented - verify against live UI. 1. Identify the control that moves the applicant on (for example a Login button or link) and record its label in Arabic and English. 2. Click it. | 1. A next-action control is visible and enabled. 2. Clicking it opens the Business Login page (record the URL reached - verify against live UI). 3. The registration wizard is not shown again and no registration data is pre-filled on the Login page. | P1 |
| RC-34 | Step indicator shows the registration as complete on the confirmation page | Preconditions: the applicant is on the confirmation page. Whether a step indicator is still shown on this page is not documented - verify against live UI. 1. Look for the wizard step indicator. 2. If it is shown, read the state of every step including Contract. | 1. If the step indicator is shown, every step including Contract is marked complete and no step is marked current or incomplete. 2. If it is not shown, record that it is hidden on the confirmation page and no half-drawn wizard header remains. | P3 |
| RC-35 | Browser Back from the confirmation page does not re-open the Contract step for editing | Preconditions: the applicant is on the confirmation page after a successful submission. 1. Click the browser Back button. 2. Observe the page that loads. 3. Click browser Forward. | 1. The applicant is not returned to a live Contract step where Submit and finish can be clicked again. 2. The applicant lands on the confirmation page, the Login page, or the start of registration (record which - verify against live UI); no earlier wizard step shows the previously entered data as editable. 3. No second profile is created (see RC-38). | P1 |
| RC-36 | Refreshing the confirmation page does not resubmit the registration or return the applicant to the wizard | Preconditions: the applicant is on the confirmation page after a successful submission. 1. Refresh the page (F5). 2. Observe the page that loads. 3. In the Network tab, check whether a registration submit request is sent on reload. | 1. The applicant is not shown the Contract step with Submit and finish enabled. 2. The page shows the confirmation page again, or the Login page, or a blank start of registration (record which - verify against live UI). 3. No submit request is sent by the reload. | P1 |
| RC-37 | Opening the registration wizard URL directly after submission does not reopen a completed registration | Preconditions: a registration has been submitted successfully in this browser session; the mobile number used is now registered. 1. In the same browser, open the registration page URL directly. 2. Enter the same mobile number and request the OTP. 3. Observe the result. | 1. The applicant is not able to continue the finished registration from the Contract step. 2. The mobile number is treated as already registered, or the flow starts from the beginning (record the exact message shown - verify against live UI). 3. No second profile is created for the same mobile number or CRN. | P1 |
| RC-38 | Clicking Submit and finish twice does not create two profiles | Preconditions: a new applicant at the Contract step with the agreement checkbox checked. Access to the admin portal or the profile database to count profiles for the CRN. 1. Double-click Submit and finish quickly. 2. Wait for the confirmation page. 3. Search for profiles by the CRN and the mobile number used. | 1. Only the confirmation page is shown; no duplicate-registration error appears for the applicant. 2. Exactly one profile exists for the CRN and mobile number. 3. Exactly one User Activation notification record exists for that profile (see RC-41). This is the end-result counterpart of RC-28, which only checks the number of requests. | P1 |
| RC-39 | Profile is active after submission and the applicant can log in with no admin step | Preconditions: a registration has just been submitted successfully (see RC-29). Registration auto-approves and auto-activates (TC-REG-001, TC-REG-002). 1. Check the profile status in the admin portal or database. 2. From the confirmation page, go to Login. 3. Log in with the company number, mobile number and the password set during registration, completing the OTP. | 1. The profile status is Active (not Pending Verification or Under Review). No manual approval was performed. 2. Login succeeds and the applicant reaches the Home page. 3. No message says the account is awaiting approval. | P1 |
| RC-40 | Confirmation page does not display the password, OTP or other sensitive data | Preconditions: the applicant is on the confirmation page. 1. Read all text on the page in Arabic and English. 2. Open the page source or the Network response for the submit call and search for the password and the OTP used. | 1. The password and the OTP are not shown anywhere on the page. 2. No full national ID or other secret value is displayed (whether the CRN, mobile or email is shown at all is not documented - verify against live UI; if shown, it must match what the applicant entered and the email must be the one entered during registration). 3. The password and OTP are not in the page URL. | P1 |
| RC-41 | A User Activation notification record exists for the new profile (delivery is not asserted on dev) | Preconditions: a registration has just been submitted successfully; access to the Mongo collection notifications-log.notifications. 1. Note the profile code of the new profile. 2. Find the most recent notification for that profile with subject "User Activation". 3. Read its recipient and notificationType fields. | 1. A record exists for the profile with subject "User Activation". 2. The recipient is the email the applicant gave during registration. 3. On dev, isSuccessfullySent is false because outbound SMTP (smtp.gmail.com:587) is unreachable, confirmed 2026-09-27: this is an environment limitation, do not fail the case on it. Record the value; on an environment with working SMTP it should be true and the email should arrive. | P2 |
| RC-42 | Confirmation page theme toggle switches between light and dark and the message stays readable | Preconditions: the applicant is on the confirmation page. Whether a theme toggle exists on this page is not documented - verify against live UI. 1. Look for the theme toggle and switch the theme. 2. Read the message and the next-action control in each theme. | 1. If the toggle exists, the page changes theme without leaving the confirmation page. 2. The message and the control stay readable in both themes (no text lost against the background). 3. If no toggle exists on this page, record that and close the case as not applicable. | P3 |

---

## Automated coverage note

This manual test suite mirrors the existing Playwright automation for the Registration Contract Review step. The corresponding automated specs are:

- `BusinessTestCases/Registration/ui/07-contract/RegistrationContractPage.spec.ts` — page elements & layout
- `BusinessTestCases/Registration/functional/07-contract/RegistrationContract.spec.ts` — agreement checkbox behavior (Live section) and mocked submission error/double-submit handling

Supporting helper: `BusinessTestCases/pageElements/Registration/RegistrationContractPage.ts`.
