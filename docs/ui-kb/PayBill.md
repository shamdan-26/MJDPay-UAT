# PayBill - UI logic

Purpose: a Business user (Merchant) pays a bill issued to them - from the "Received Bills" list, or by looking a bill up by number / scanning its QR (EMI-170, EMI-5143, EMI-5144). Flow: pick bill -> Pay -> Summary -> Confirm popup -> OTP (if on) -> success popup.
Route: reached from the sidebar Bills menu -> "Bill Payment" (`HomePage.Bills_NavButton` then `BillPayment_NavButton`, `Shared/HomePage.ts:46-55,109-117`). The URL contains `/bills` (`Homepage/functional/HomepageSidebarNavigation.spec.ts:64`); the exact path is not captured. The sibling Bill Report page is `/business/main/bills/bill-report` (`Topup/ui/TopupShellUI.spec.ts:66`).
Who: a Business account with at least one "Approved" received bill (`PayBill/PayBillHelper.ts:19-25`, account `moduleAccounts.payBill` in `data/testAccounts.json`).
Locator catalog: [PayBill.generated.md](PayBill.generated.md) (`BillsPage`). OTP via the shared OTP modal testids (`otp-input`, `otp-submit-btn`, `otp-cancel-btn`, `otp-resend-btn`).

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| Bill Payment landing | Contains `/bills` (path not captured) | Tabs incl. `receivedBillsTab` (/received bills/); lookup block `billNumberInput`, `getBillInfoButton`, `scanBillQrButton` | Top of page | Choose how to find the bill |
| Received Bills list | same | `billCards` (`article.bill-mobile-card`), each with `.grid-item-data` (status text), `.money-amount`, Pay button | List area | Approved/other bills issued to the payer |
| Bill summary | same | `summaryPayButton` (`#btn_submit_summary`) | Summary panel | Review amount breakdown (initial amount, discount, VAT, total per manual PB-10) |
| Confirm popup | same | `confirmPayButton` (`#submit_btn_confirm`) | Popup | Final confirmation |
| OTP modal | same | `otpInput`, `otpSubmitButton`, `otpCancelButton`, `otpResendButton` | Modal | Shared OTP modal |
| Success popup | same | `successPopupTitle` (`.my-modal-title` "Bill paid successfully"), `goToHomeButton`, `payAnotherBillButton` | Modal | Result and next action |
| Lookup result | same | `billLookupResult` (summary Pay button or button /^pay$/) or `billLookupError` | Below lookup | Outcome of manual search |

## Forms

### Bill lookup

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Bill number | `billNumberInput` (label or placeholder /bill number/) | Text | Yes | Spec uses `1041` (a known UAT bill, env `BILL_LOOKUP_NUMBER`) | `billLookupError` (/something went wrong\|bill (could not be found\|not found)/) | Always |
| Get bill info | `getBillInfoButton` (testid `bill-get-info-btn`, confirmed in handoff 4.6) | Button | - | Must retrieve the bill, not "Something went wrong" (EMI-5143) | - | After number entered |
| Scan bill QR | `scanBillQrButton` (/scan (bill )?qr/) | Button | - | Must show the bill, not a 500 (EMI-5144) | /internal server error\|500/ must NOT appear | Always |

### Pay

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Bill selection | `billCards` filtered by status text (default "Approved") | Cards | Yes | Only Approved, issued, unpaid bills are payable | - | Card with the status exists |
| OTP | `otpInput` (wrapper; focus and type), `otpSubmitButton` | Modal | If enabled | Page object types with 50 ms delay then clicks submit | OTP error | After confirm |

## Tables and lists

| Item | Detail | Source |
|---|---|---|
| Received Bills (card list) | Cards `article.bill-mobile-card`; status read from `.grid-item-data`; amount from `.money-amount`; per-card Pay button (/^pay$/i) | `BillsPage.ts:38,87-119` |
| Columns / filters / sorting / paging | Not captured for this page (BillManagement's Bill Report has paging, see BillManagement.md) | - |
| Empty state | `hasBillWithStatus()` returns false when no card of that status appears within 15 s; spec skips with "verify UAT data setup" | `BillsPage.ts:87-99`, `functional/PayBillFlow.spec.ts` |
| Row actions | Pay | `BillsPage.initiateQuickPayment` |

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| Pay (card button) | Bill card | Starts payment for that bill (returns the card amount) | Card status matches | Summary |
| `summaryPayButton` | Summary | Moves to confirm popup | Visible | Confirm popup |
| `confirmPayButton` | Popup | Submits payment | Visible | OTP modal or success |
| `otpSubmitButton` / `otpCancelButton` / `otpResendButton` | OTP modal | Submit / cancel / resend | Modal open | Success or back |
| `goToHomeButton` (testid `bill-payment-success-cancel-btn`) | Success popup | Go to Home | After success | Home dashboard |
| `payAnotherBillButton` (testid `bill-payment-success-submit-btn`) | Success popup | Back to Received Bills | After success | Received Bills list (manual PB-11) |
| `getBillInfoButton` | Lookup | Fetch bill by number | Number entered | `billLookupResult` |
| `scanBillQrButton` | Lookup | Open QR scanner | Visible | Scanner / bill |

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| Bill status Approved + issued + unpaid | Payable | `B2B-Transactions.md` PB-01; `EMI-Business-Rules-part1:E-Bill` |
| Bill Pending / unapproved | Pay blocked / not listed | PB-02, CB-19 |
| Bill already Paid | Rejected, not processed twice | PB-03 |
| Issue date in the future | Payment blocked until issue date | PB-04 |
| Wallet balance < bill amount | Insufficient-fund toast; no debit; bill unaffected; flow drains wallet first via full-balance Bank Transfer in the spec | `functional/PayBillFlow.spec.ts:79-108` |
| OTP not shown | `confirmPayment` skips the OTP step when the modal does not appear within 5 s | `BillsPage.ts:121-124,138-150` |
| Ledger sync delay | Transaction can show `Pending` before `Success`; reload to see final state | `docs/EMI_Business_Flows.md` section 3 |
| Failed payment | Bill status and due date unchanged; user can retry | `B2B-Transactions.md` PB-09 |

## Business rules

| Rule | Detail | Source |
|---|---|---|
| Eligibility | Only "Approved", issue-date-reached, unpaid bills; Paid bills cannot be paid again | `EMI-Business-Rules-part1-core-modules.md` (E-Bill, Bill Payment) |
| Balance math | NewBalance = OldBalance - BillAmount; any variance is a critical ledger defect | `docs/EMI_Business_Flows.md` section 3; `functional/PayBillFlow.spec.ts:72-76` |
| Ledger | New transaction row status SUCCESS (allow Pending then Success) | `PayBillFlow.spec.ts:78-87` |
| Insufficient funds | Block immediately; toast containing "insufficient", "balance" or "fund"; never reach OTP or provider | `BillsPage.ts:159-166`, `EMI_Business_Flows.md` section 4 |
| OTP | Admin-configurable; shared OTP modal | `BillsPage.ts:121-130` |
| Commission | Fixed/percentage tier, default vs custom; commission on destination: Summary must show Commission/VAT/Rounded amounts (EMI-5614); reserved amount on destination = commission + VAT, not raw commission (EMI-5620) | `functional/PayBillCommission.spec.ts` PB-CM01..20 (skipped) |
| Wallet balance limits | Payer min-balance floor (Merchant), biller max-balance ceiling | `functional/PayBillWalletLimits.spec.ts` PB-WB01..08 (skipped) |
| Transaction limits | Daily/weekly/monthly amount + count, Web and App | `functional/PayBillTransactionLimits.spec.ts` PB-TL01..12 (skipped) |
| Transaction type | 105 Bill Payment | `EMI-Refined-User-Stories-part2-admin-payments.md:51` |
| Audit | Bill actions audited | `EMI-Business-Rules-part1` |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| Payment success | "Bill paid successfully" | `successPopupTitle` (`.my-modal-title`) |
| Insufficient funds | Toast text includes "insufficient" / "balance" / "fund" (English only in page object) | `toastMessage` (testid `toast-message`) |
| Bill not found / lookup failure | "Something went wrong" / "bill could not be found" (bugs EMI-5143) | `billLookupError` |
| QR scan failure | "Internal Server Error" / 500 (bug EMI-5144, must not appear) | page text |
| Arabic wording | Not captured | - |

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| List received bills | `GET /api/v1/bills/received` | Swagger-generated list `ServiceApis/EbillService.generated.spec.ts` (not observed from UI specs) |
| Summary | `POST /api/v1/bills/pay/summary` | `EbillService.generated.spec.ts:69` |
| Pay | `POST /api/v1/bills/pay` | same service |
| Bill by id | `GET /api/v1/bills/{bill-id}` | same service |
| Drain balance (test setup) | Bank Transfer full balance | See BankTransfer.md |
| UI-to-endpoint mapping | Not confirmed by any PayBill spec | `functional/PayBillFlow.spec.ts` |

## Known gaps and product defects

| Item | Evidence |
|---|---|
| Only bill-card and OTP/toast testids are confirmed; scan button, bill number input, `billLookupError` are best-effort guesses | `BillsPage.ts:21-27` (comment) |
| Insufficient-funds test drains the wallet via Bank Transfer, so it depends on that flow and OTP | `functional/PayBillFlow.spec.ts:84-100` |
| Commission, wallet-limit and transaction-limit suites are all `test.skip` | `functional/PayBill{Commission,WalletLimits,TransactionLimits}.spec.ts` |
| BQR-03/BQR-04 only assert absence of an error banner (BQR-04 also asserts `billLookupResult`); BQR-03 does not assert that a bill appears | `functional/PayBillQrAndSearch.spec.ts:49-65` |
| Fixture bill number `1041` and Approved bill can disappear after use; spec relies on the first test paying one approved bill | `PayBillHelper.ts:27-28`, `functional/PayBillFlow.spec.ts:100-107` |
| Not covered: PB-02 pending bill blocked, PB-03 paid twice, PB-04 future issue date, PB-09 failed payment retry, PB-10 breakdown, PB-11 pay another | `B2B-Transactions.md` section B vs specs |
| Insufficient-funds toast check is English-only | `BillsPage.ts:159-166` |

## Open questions

| Question | Why open |
|---|---|
| Exact URL path of Bill Payment | Specs navigate by menu clicks only |
| Other tab names besides "Received Bills" | Not captured |
| Fields on the bill summary and the confirm popup | Only the two buttons are located |
| Is OTP required for bill payment on dev? | `confirmPayment` handles both cases |
| EN/AR texts of the confirm popup and error toasts | Not asserted |
| Does a QR scan from the Business app use the same endpoint as the Customer app (`/bills/qr/scan`)? | BillQr mocks `**/bills/qr/scan**`; PayBill never observes it (see BillQr.md) |
