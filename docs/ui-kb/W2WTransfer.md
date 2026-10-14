# W2WTransfer - UI logic

Purpose: a Business wallet sends money to another Business wallet, found by its CRN (Corporate Registration / Unified Number). Steps: CRN -> Check Recipient -> Amount + Purpose -> Proceed -> Summary -> OTP -> Success.
Route: `/business/main/transfer/wallet-to-wallet-transfer` (sidebar "Wallet Transfer" link in the Transfer panel; `Topup/ui/TopupShellUI.spec.ts:99-104`). Also opened from the home quick action "Send to another wallet" (`quickActionWalletTransferCard`) or `#quick-transfer` (`W2WTransferButton`, `Shared/HomePage.ts:74-77`).
Who: logged-in Business accounts, Merchant (sender) to Biller (receiver) in the test data (`data/w2wTransferData.json`, `docs/EMI_Business_Flows.md` section 1).
Catalog note: the page object uses getters (now included in the catalog). The getters (used below, exact names from `pageElements/W2WTransfer/W2WTransferPage.ts`) are: `inputCRN`, `inputAmount`, `checkRecipientButton`, `purposeOfTransferDropdown`, `proceedButton`, `transferButton`, `okButton`, `companyNameDiv`, `toastErrorMessage`, `predefinedAmountChips`.

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| 1 Recipient + amount form | `/business/main/transfer/wallet-to-wallet-transfer` | Recipient form: `inputCRN` + `checkRecipientButton` (class `.mp-recipient-form__button`) + `companyNameDiv` | Top of form | Enter CRN, look the recipient up, show resolved company name (`W2WTransferPage.ts:25-50,95`) |
| 1 | same | Purpose of Transfer (`purposeOfTransferDropdown`, a `mat-select[id^="floating-dropdown-purpose-of-transfer"]`) | Under recipient | Mandatory classification list (admin-configurable) |
| 1 | same | Amount (`inputAmount`, `predefinedAmountChips` inside `.mp-amount-quick-chips`) + `proceedButton` | Below purpose | Amount entry, preset chips |
| 2 Summary | same URL | Summary (inline) or modal variant `summary-wallet-to-wallet`; `transferButton` | Main panel / modal | Review then press Transfer (testid `w2w-summary-transfer-btn` covers both variants; modal also has `w2w-summary-cancel-btn`) (`QA-DATA-TESTID-HANDOFF.md` 4.3) |
| 3 OTP | same URL | Inline OTP widget (`OtpPage`) | Main panel | Enter code; testids `w2w-otp-cancel-btn` / `w2w-otp-verify-btn` / `w2w-otp-resend-btn` |
| 4 Result | same URL | Success screen with `okButton` (testid `w2w-result-ok-btn`) | Main panel | Acknowledge |
| Transactions | `/business/main/transactions` | Transactions table | Sidebar | Verify the row shows SUCCESS (`TransactionsPage`) |

## Forms

### Recipient + amount form

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Recipient CRN | `inputCRN` (testid `w2w-unified-number`, id `floating-text-unified-number-4`) | Text | Yes | Digits only; input filter strips letters, special chars and spaces; hard cap 15 digits (16th typed digit is dropped); Check Recipient valid for 10-15 digits (`data/w2wTransferData.json` crn_validation rows) | None shown; field filters silently. Button stays disabled | Always editable |
| Check Recipient | `checkRecipientButton` (testid `w2w-check-recipient-btn`) | Button | - | Disabled for empty CRN, fewer than 10 digits, letters, special characters, and a spaced CRN that collapses to 9 digits; enabled for 10-15 digits | - | CRN length 10-15 |
| Recipient name | `companyNameDiv` (`div.d-flex.justify-content-center.pt-3`) | Read-only text | - | Filled after a valid CRN lookup; stays EMPTY for an unrecognised CRN; shown masked per KYB (manual WT-01) | - | After lookup |
| Amount | `inputAmount` (testid `amount-input`) | Text | Yes | See rules table below | None shown; value filtered | Visible after recipient step |
| Preset chips | `predefinedAmountChips` (testid `amount-chip-<value>`) | Chips | No | Click fills amount (500/1000/2000/5000/10000 per shared Amount component) | - | Rendered with Amount |
| Purpose of Transfer | `purposeOfTransferDropdown` | `mat-select` | Yes (Proceed blocked without it per manual WT-05) | Options from admin config; spec picks one at random or by name (e.g. "Item purchases") | Not captured | Always |
| Notes | not in page object | Optional text, max 200 chars (manual WT-06) | No | - | - | Open question |

Amount filter results (`data/w2wTransferData.json` amount_validation, run by `functional/W2WTransferFunctionality.spec.ts` suite 4):

| Typed | Field shows | Proceed |
|---|---|---|
| `-100` | `100` (minus stripped) | enabled |
| `0` | empty | disabled |
| `abc` / `!@#$%` | empty | disabled |
| `10.55` / `10.5` | as typed | enabled |
| `10.555` | `10.55` (3rd decimal dropped) | enabled |
| clipboard paste `100` | `100` | enabled |

CRN filter results (suite 6):

| Typed | Field shows | Check Recipient |
|---|---|---|
| empty | empty | disabled |
| `123456789` (9 digits) | as typed | disabled |
| `1130000123` (10 digits) | as typed | enabled |
| `1234567890123456` (16 digits) | `123456789012345` | enabled |
| `abcde`, `@#$-` | not asserted | disabled |
| `113 000 123` | `113000123` | disabled |

## Tables and lists

| Item | Detail | Source |
|---|---|---|
| Purpose of Transfer options | Dropdown panel of `[role="option"]` / `mat-option`; list is admin-configured (examples in docs: Friends and Family, Travel, Investment, Personal, Item purchases) | `W2WTransferPage.ts` `selectRandomPurposeOfTransfer`; `EMI-Business-Rules-part1-core-modules.md:106` |
| Preset chips | `.mp-amount-quick-chips` collection | `W2WTransferPage.ts:97-103` |
| Transactions table (other page) | Newest row must show the amount and status `success`; `Pending` can appear first (ledger sync), spec reloads up to 3 times | `functional/W2WTransferFunctionality.spec.ts:100-122` |
| Filters / sorting / paging / empty state / row actions | Not applicable to this page | - |

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| `checkRecipientButton` | Recipient form | Calls recipient lookup, fills `companyNameDiv` or shows toast | CRN valid length | Name shown or "No recipient found" toast |
| `purposeOfTransferDropdown` | Form | Opens options panel | Visible | Choose one option |
| `proceedButton` (testid `w2w-proceed-btn`) | Form | Goes to summary | Enabled when CRN checked, amount valid, purpose chosen (page object waits visible + enabled, `W2WTransferPage.ts:468-474`) | Summary |
| `transferButton` (testid `w2w-summary-transfer-btn`; `btn_submit_summary` is only the old Java-era id in a comment) | Summary | Executes transfer; triggers OTP or the insufficient-funds toast | Visible + enabled | OTP or toast |
| `w2w-summary-back-btn` | Summary (inline) | Back to form | Present per handoff | Not used by specs |
| `OtpPage.verifyButton` / `cancelButton` / `resendButton` | OTP | Verify / cancel / resend | See BankTransfer OTP behaviour | Result screen |
| `okButton` | Success screen | Closes result | After success | Form reset |
| QR scan option | CRN step | Scan a wallet QR to fill the recipient (manual WT-02) | Not in page object | Open question |

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| CRN does not exist (e.g. `1010088888`) | "No recipient found" toast; company name empty | `functional/W2WTransferFunctionality.spec.ts:170-179` |
| CRN equals sender's own CRN (`1120000115` data) | Same "No recipient found" toast (self-transfer rejected) | `data/w2wTransferData.json` row `IsSame_For_Sender_And_Receiver` |
| Other invalid CRN types | Name div stays empty after the lookup settles | `W2WTransferPage.assertCompanyNameIsEmpty` |
| Amount > balance | Proceed, then Transfer click, shows insufficient-fund toast; no OTP | `functional/W2WTransferFunctionality.spec.ts:216-239` |
| OTP disabled in admin config | `OtpPage.isVisible()` false; specs skip the fill | `functional/W2WTransferFunctionality.spec.ts:62-65` |
| Language Arabic | `html[dir=rtl]`; testid locators still resolve; Proceed label "متابعة" | `functional/W2WTransferLocalization.spec.ts:46-63` |
| Receiver credit lands late | Biller page waits ~4 s then reads balance with retry polling | `functional/W2WTransferFunctionality.spec.ts:67-68` |
| Sender below min-balance floor / receiver above max-balance ceiling | Transfer blocked before OTP (Admin limits) | `functional/W2WTransferWalletLimits.spec.ts` (skipped), `docs/manual-test-cases/B2B-Transactions.md` section G |

## Business rules

| Rule | Detail | Source |
|---|---|---|
| Debit and credit | Sender debited by exactly X, receiver credited by exactly X (tolerance +/-0.1 in page-object checks) | `docs/EMI_Business_Flows.md` section 1; `W2WTransferPage.ts:249-290` |
| Recipient lookup | By CRN, resolved name shown (masked per KYB) | `docs/manual-test-cases/B2B-Transactions.md` WT-01 |
| Purpose | Mandatory, admin-configurable; picking one helps bypass manual approval queues | `docs/EMI_Business_Flows.md` section 1; `EMI-Business-Rules-part1:106` |
| Notes | Optional, max 200 chars | `EMI-Business-Rules-part1:106` (manual WT-06) |
| Pre-OTP checks | Wallet limitations, wallet status, account status and transaction limits are all checked every time before OTP | `EMI-Business-Rules-part1:107` |
| Summary | Shows amount, destination CRN, masked name, source wallet + balance, purpose, notes | `EMI-Business-Rules-part1:107`; manual WT-07 |
| OTP | Required to confirm; wrong OTP -> error + resend; widget auto-submits at 6 digits | manual WT-09/WT-10; memory note `project_banktransfer_coverage_expansion` |
| Commission | Fixed or Percentage tier by min/max; added on sender side, deducted on receiver side; default schema vs custom per-account schema; overlapping rules rejected; min <= max; type not editable after creation | `functional/W2WTransferCommission.spec.ts` WT-CM01..18 (skipped); `EMI-Business-Rules-part2:106` |
| Wallet balance limits | Sender min-balance floor (Merchant), receiver max-balance ceiling (Biller), by risk level Low/Medium | `functional/W2WTransferWalletLimits.spec.ts` WT-WB01..08 (skipped) |
| Transaction limits | Daily/weekly/monthly amount + count, by Web/App platform; count 0 blocks | `functional/W2WTransferTransactionLimits.spec.ts` WT-TL01..12 (skipped) |
| Amount decimals | Max 2 decimals; negative sign stripped (not rejected); 0 rejected | `data/w2wTransferData.json` |
| Ledger status | Transaction appears with status `success` (case-insensitive) | `W2WTransferPage.assertW2WTransactionIsSuccess` |
| CRN format | 10-15 digits | `data/w2wTransferData.json` crn_validation |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| Unknown / self CRN | "No recipient found" / Arabic matched as `لم يتم العثور` or `مستلم غير موجود` (best-effort, not confirmed live) | Toast (`toastErrorMessage`, testid `toast-message`) |
| Amount > balance | Text contains "insufficient", "balance" or "fund"; Arabic matched as `غير كاف` or `الرصيد` (best-effort, not confirmed live) | Toast |
| Proceed label (Arabic) | "متابعة" | `proceedButton` |
| Success | Not asserted by text; `okButton` presence | Success screen |
| Limit / commission violations | Not captured (specs skipped) | - |

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| Check Recipient | Likely `GET /api/v1/recipient/{profileCode}` (ProfileService, recipient-controller) | Swagger-generated list `ServiceApis/ProfileService.generated.spec.ts:129`; the UI-to-endpoint link is not observed by any W2W spec, and the path parameter name `profileCode` vs the CRN typed in the form is unconfirmed |
| Purpose of Transfer list | `GET /api/v1/lookup/purpose-transfer` | `ServiceApis/BankIntegration.generated.spec.ts:68` (swagger list, not observed) |
| Proceed / Transfer | `POST /api/v1/transactions/summary` (summary) and `POST /api/v1/transactions/transfer-draft` (draft) | `ServiceApis/CloseLoopOrchestrator.generated.spec.ts:52-53`; payment-link helper also mocks `**/transactions/transfer-draft` (`PaymentLinks/PaymentLinkHelper.ts:263`); not observed from W2W specs |
| Draft lifecycle | `PENDING_CHECKS -> PENDING_OTP -> POSTED` (closed-loop) | `EMI-Business-Rules-part2-admin-payments.md:15-16` |
| Balance / ledger | Transaction type 103004 B2B Transfer (Business -> Business, closed loop) | `EMI-Business-Rules-part2:29` |

## Known gaps and product defects

| Item | Evidence |
|---|---|
| Arabic toast fragments are guesses, "reconcile on first live run" | `W2WTransferPage.ts:574-607` (comments) |
| Commission, wallet-limit and transaction-limit specs all `test.skip` pending Admin Portal automation | `functional/W2WTransfer{Commission,WalletLimits,TransactionLimits}.spec.ts` |
| Weekly period appears in specs/manual docs, but the admin limits API only has HOUR/DAY/MONTH/YEAR | `pageElements/Shared/AdminLimitsApi.ts:14-17` vs `W2WTransferTransactionLimits.spec.ts` WT-TL03..10 |
| QR scan recipient (WT-02), notes field (WT-06), SMS to both parties (WT-13) are in manual cases but have no page-object element or spec | `docs/manual-test-cases/B2B-Transactions.md` section C |
| Hard 4 s wait for the receiver credit; cross-account serial tests | `functional/W2WTransferFunctionality.spec.ts:67` |
| No UI element checks (labels, titles) for W2W beyond Arabic Proceed text | `functional/W2WTransferLocalization.spec.ts` |

## Open questions

| Question | Why open |
|---|---|
| Exact page title/subtitle and field labels (EN/AR) | Never asserted |
| Is the summary inline or modal for this account? | Handoff documents both variants; spec only clicks `transferButton` |
| Does the Notes field exist on the live form? | In business rules and manual WT-06, not in page object |
| Does the QR-scan recipient option exist on the web form? | Manual WT-02 only |
| Real endpoint names observed from the W2W UI | Only swagger-generated lists exist; no W2W spec records network calls |
| Is the min/max transfer amount enforced on the form (manual WT-04)? | No automation or message captured |
