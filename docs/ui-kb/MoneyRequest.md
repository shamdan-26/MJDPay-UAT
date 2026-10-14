# MoneyRequest - UI logic

Purpose: a wallet holder (requester) asks another wallet holder (payer) for money (EMI-834). The payer can Pay, Decline, or pay by scanning a generated QR. Creating a request never reserves the payer's balance; all P2P checks run only when the payer pays.
Route: NOT CONFIRMED. `HomePage.MoneyRequest_NavButton` is a "best-effort guess" (`getByRole('button', /request money|money request/i)`), written without a live DOM (`Shared/HomePage.ts:67-70`). No route string exists in the repo.
Who: two Business accounts: requester and payer (`data/testAccounts.json` `moduleAccounts.moneyRequestRequester` / `moneyRequestPayer`; `MoneyRequest/MoneyRequestHelper.ts:13-20`).
Important: every locator in `MoneyRequestPage.ts` is a best-effort guess ("Reconcile against the live DOM ... before relying on this for CI gating", `MoneyRequestPage.ts:3-8`). Nothing in this file is confirmed against the live app. The sidebar facts confirmed live (`Topup/ui/TopupShellUI.spec.ts`) list no Money Request entry.
Locator catalog: [MoneyRequest.generated.md](MoneyRequest.generated.md).

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| Create request | Not confirmed | Form: `recipientInput`, `amountInput`, `noteInput`, `expiryInput`, `generateQrToggle`, `sendRequestButton` | Main panel | Requester builds a request (`MoneyRequestPage.ts:65-70`, `createRequest` line 107) |
| Create request | Not confirmed | Confirmation dialog: `requestConfirmationModal`, `requestConfirmButton` | Modal | Optional confirm step (never used by specs) |
| Requests Sent | Not confirmed | Tab `requestsSentTab`; list `requestsSentRows`; `statusBadge`; `cancelRequestButton` | Tab | Requester's own requests with status badges |
| QR modal | Not confirmed | `qrModal`, `qrImage`, `qrShareButton`, `qrDownloadButton`, `qrExpiryLabel`, `qrOneTimeUseLabel` | Modal after create with QR on | Share/download QR; shows expiry and one-time-use flag |
| Requests Received | Not confirmed | Tab `requestsReceivedTab`; list `requestsReceivedRows`; `payButton`, `declineButton` | Tab | Payer's inbox |
| Payment summary | Not confirmed | `paymentSummarySection`, `amountRequestedRow`, `commissionRow`, `vatRow`, `totalToDebitRow`, `confirmAndPayButton`, `cancelPaymentButton` | Main panel | Fee breakdown before paying |
| Result | Not confirmed | `successHeading`, `failureHeading`, `transactionReferenceText` | Main panel | Outcome and reference |

## Forms

### Create request

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Recipient | `recipientInput` (label /recipient\|contact/ or placeholder /search recipient/) | Text / search | Yes | Spec types the payer's company number | Not captured | Always |
| Amount | `amountInput` (testid `amount-input`, `#input_set_amount`, or label "Amount") | Text | Yes | Specs use 10, 15, 20, 25, 50 | Not captured | Always |
| Note | `noteInput` | Text | Optional | Per manual case "optional note/TTL" | - | Always |
| Expiry (TTL) | `expiryInput` | Input | Optional | Request auto-expires at TTL (manual MR-EC-02) | - | Always |
| Generate QR | `generateQrToggle` | Checkbox | Optional | If on, a QR modal opens after send (`MoneyRequestFlow.spec.ts` MR-UI-03) | - | Always |
| Send | `sendRequestButton` ("send request") | Button | - | - | - | Not confirmed |

### Pay a received request

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Confirm and pay | `confirmAndPayButton` (/confirm.*pay/) | Button | - | Specs wait for it to be enabled; per manual MR-UI-02 it is disabled when funds are insufficient | `insufficientFundsError` (/insufficient funds?/), `limitExceededError` (/limit exceeded/) | Summary visible and funds sufficient |
| OTP | `OtpPage` | 6 boxes | If enabled | Filled only if `otp.isVisible()` | - | After confirm |

## Tables and lists

| Item | Detail | Source |
|---|---|---|
| Requests Sent | Rows `[class*="request-row"], [class*="request-card"]`; status badge text must match REQUESTED / DECLINED / CANCELLED; row action Cancel | `MoneyRequestPage.ts:75-76,104`, `functional/MoneyRequestFlow.spec.ts` |
| Requests Received | Same row locator; row actions Pay and Decline | `MoneyRequestPage.ts:86-88,134-142` |
| Columns, filters, sorting, paging, empty state | Not captured. Manual MR-UI-01 expects listing, status badges, timestamps, sortable/filterable by status | `docs/manual-test-cases/Transaction-Operations.md` MR-UI-01 |

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| `sendRequestButton` | Create form | Creates request | Form filled | Request appears in Requests Sent as REQUESTED |
| `cancelRequestButton` | Requests Sent row | Cancels before accept | Status REQUESTED | Status CANCELLED (spec: MR-EC-01) |
| `payButton` (/^pay$/) | Requests Received row | Opens payment summary | Request pending | Payment summary |
| `declineButton` | Requests Received row | Declines | Request pending | Requester sees DECLINED; no funds move |
| `confirmAndPayButton` | Summary | Executes payment | See Forms | OTP (if on) then success |
| `cancelPaymentButton` | Summary | Leaves summary | Always | Back to list |
| `qrShareButton` / `qrDownloadButton` | QR modal | Share / download the QR | QR modal open | Only existence modelled; never clicked |

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| Request created | Status `REQUESTED`; visible in Requests Sent; payer notified | MR-FP-01 |
| Payer pays | Status `PROCESSING` then `COMPLETED` with transaction reference | `Transaction-Operations.md` MR-FP-02 |
| Payer declines | Requester sees `DECLINED` after reload | `MoneyRequestFlow.spec.ts` decline test |
| Requester cancels | `CANCELLED`; later Accept returns `REQUEST_CANCELLED`; cannot cancel once `PROCESSING` | MR-EC-01, MR-CC-03 |
| Request past TTL | `EXPIRED`; cannot pay | MR-EC-02 |
| Payer balance < amount + fees | `INSUFFICIENT_FUNDS` -> `FAILED`; no ledger entries | MR-NE-01 |
| Payer limit exceeded | `LIMIT_EXCEEDED` -> `FAILED`; UI "Limit exceeded" | MR-NE-02 |
| KYC / sanctions flag | `KYC_BLOCKED` / `SANCTIONS_BLOCKED` -> `FAILED` | MR-NE-03 |
| QR expired / already used | "Invalid or expired request"; no debit | MR-NE-04 |
| Double Pay tap / two devices race | Only one transaction; second gets duplicate / `QR_ALREADY_USED` / `REQUEST_PROCESSING` | MR-CC-01/02 |
| Payer has several wallets | Payer picks which wallet to debit | MR-EC-03 |

All rows above except the spec-backed ones (create, pay, decline, cancel, QR modal, insufficient funds) come from the manual cases, not from observed UI.

## Business rules

| Rule | Detail | Source |
|---|---|---|
| No reservation | Creating a request never reserves the payer's balance | `Transaction-Operations.md` section A context |
| Payment checks | Balance, limits, KYC, commission and VAT run when the payer sends money | same |
| Fee preview | Summary shows Amount requested, commission, VAT, Total to debit; must match the backend | MR-UI-02 |
| Ledger | Payer debited amount + fees; requester credited amount; commission/VAT wallets credited | MR-INT-01 |
| QR | One-time use, has expiry, signed (tampered QR rejected) | MR-FP-03, MR-SEC-02 |
| Authorisation | Only the intended payer can act; others get 403 | MR-SEC-01 (spec skipped, needs a third account) |
| Rate limiting | Request-ID enumeration limited (429) | MR-SEC-03 |
| Notifications | Both parties notified at each step | MR-INT-02 |
| Idempotency | Pay is idempotent per request | MR-CC-01 |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| Insufficient balance on accept | Matches /insufficient funds?/ (EN only) | `insufficientFundsError` |
| Limit | Matches /limit exceeded/ | `limitExceededError` |
| Success | Heading matches /success\|completed/ or text /payment (successful\|completed)/ | `successHeading` |
| Failure | /failed/ or /payment failed/ | `failureHeading` |
| Expired / used QR | "Invalid or expired request" | Manual MR-NE-04 |
| Arabic wording | Not captured | - |

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| Create request | `POST /api/v1/money-requests` | From swagger-generated list `ServiceApis/CloseLoopOrchestrator.generated.spec.ts:65` (not captured from the UI) |
| Requests Sent / Received / All tabs | `GET /api/v1/money-requests/sent`, `/received`, `/all`; one: `GET /api/v1/money-requests/{id}` | same file, lines 81-85 |
| Cancel / Decline / Accept | `PUT /api/v1/money-requests/{id}/cancel`, `/decline`, `/accept` | same file, lines 47-49 |
| Pay (OTP verify) | `POST /api/v1/money-requests/accept/verify` | same file, line 66 |
| Scan QR | `GET /api/v1/money-requests/qr/scan` | same file, line 84 |
| UI-to-endpoint mapping | Not confirmed by any spec (the UI spec does not observe network calls) | `functional/MoneyRequestFlow.spec.ts` |

## Known gaps and product defects

| Item | Evidence |
|---|---|
| All locators unverified; nav entry unverified; no testids exist for this screen | `MoneyRequestPage.ts:3-8`, `QA-DATA-TESTID-HANDOFF.md` section 5 |
| `requestsSentRows` and `requestsReceivedRows` use the same locator, so which list is open depends on tab state | `MoneyRequestPage.ts:75,86` |
| MR-NE-01 spec skips when the payer has no pending request above balance; MR-SEC-01 skipped (no third account) | `MoneyRequestFlow.spec.ts` |
| No spec for expiry, QR payment, decline-after-accept, limits, KYC, concurrency | Transaction-Operations.md MR-FP-03, MR-NE-02..04, MR-EC-02/03, MR-CC-*, MR-INT-* |
| Requester and payer accounts reuse shared fixtures ("no dedicated pair exists yet") | `MoneyRequestHelper.ts:4-6` |
| Pay/Decline always act on `requestsReceivedRows.first()`, so an older leftover request can be picked instead of the one just created | `MoneyRequestPage.ts:134-142` |

## Open questions

| Question | Why open |
|---|---|
| Does the Money Request screen exist on the live Business web app, and at what route? | No route, no sidebar evidence |
| Field labels, button labels and messages (EN/AR) | Locators are guesses |
| Is TTL a date, duration, or dropdown? | `expiryInput` only matches label /expiry/ |
| How does the payer find the request (notification, tab)? | Not captured |
| Is a "multi-wallet chooser" shown to Business payers? | Manual MR-EC-03 only |
