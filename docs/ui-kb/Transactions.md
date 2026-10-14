# Transactions - UI logic

Purpose: Business Portal **Transactions** list (datatable of the account's transactions) with a View More summary panel showing amount, commission, VAT and total.
Route: `https://<host>/business/main/transactions` (`TRANSACTIONS_URL`, `Transactions/TransactionsHelper.ts` line 21). List container `#transactions-reports-list` and its rows are real (confirmed in `pageElements/Shared/TransactionsPage.ts`).
Who sees it: any logged-in Business Portal user (roles not specified in repo). Homepage shows only the last 10 transactions with a link here (`ALL-TEST-CASES.md` line 1608).
Locator catalog: [Transactions.generated.md](Transactions.generated.md) and the shared `TransactionsPage` section of [Shared.generated.md](Shared.generated.md) (line 383). The summary panel, filters and commission labels are best-effort locators; the `TransactionSummaryPage.ts` source also defines `anyCommissionOrVat`, which is missing from the generated catalog.
Specs are **mock-driven** (list payloads mocked with `page.route()`).

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| Transactions list | `/business/main/transactions` | Datatable `list` (`#transactions-reports-list`), `rows` = `datatable-row-wrapper` | Main body | Browse transactions |
| Transactions list | same | Filters: `filterButton`, `transactionTypeFilter`, `statusFilter`, `applyFilterButton` | Above list (position not confirmed) | Filter by type and status |
| Row cells (shared page object) | same | Cell 3 = amount (`lastTransactionAmount`), cell 5 = status (`lastTransactionStatus`), cell 6 = View More (`viewMoreButtonForLastTransaction`) | Row | Quick read of the last (first) row |
| Summary panel | same (panel or `mat-dialog-container`) | `summaryPanel` with `sourceCommission`, `sourceVat`, `destinationCommission`, `destinationVat`, `totalAmount` | Overlay/side panel after View More | Standardised transaction summary |
| Details panel | same | `batchTransactionReferenceTxt` (label "batch Transaction Reference" + `<p>`) | Details | Shows batch transaction reference |
| Error state | same | `errorMessage` | Body | Shown if list fails (500) |

Sources: `TransactionSummaryPage.ts`, `Shared/TransactionsPage.ts`, `TransactionSummaryDisplay.spec.ts`.

## Forms

The Transactions page has no data-entry form. Filters only.

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Filter toggle | `filterButton` | button /filter/ | No | Opens filter controls | - | Always |
| Transaction type | `transactionTypeFilter` | labelled select | No | Values not listed in repo (type codes seen: `101003` W2W, `102001` top-up) | - | Filter open |
| Status | `statusFilter` | labelled select | No | Status values seen in payload: `SUCCESS`, `PENDING`, `FAILED` | - | Filter open |
| Apply | `applyFilterButton` | button /apply\|search/ | - | - | - | Filter open |

Related OTP configuration (admin-side, API only): see Backend table (`transaction-otp-configurations`).

## Tables and lists

| Aspect | Detail | Source |
|---|---|---|
| Table type | ngx-datatable (`datatable-row-wrapper`, `datatable-body-cell`) | `Shared/TransactionsPage.ts` |
| Columns (by cell index) | Cell 3 amount, cell 5 status, cell 6 View More. Other columns not documented | `Shared/TransactionsPage.ts` lines 16-18 |
| Sorting | Newest first implied (row 1 = "last transaction"). Column sort not documented | `TransactionsPage.lastTransactionRow` |
| Filters | Transaction type, Status (page object); reported defect EMI-5626: filter resets after admin updates a transaction (admin side) | `AdminTransactionReports.spec.ts` line 42 |
| Paging | API takes `page`/`size` (e.g. `/api/v1/transaction-log?page=0&size=10`); UI paging control not documented | `TransactionAmountCalculation.spec.ts` line 52 |
| Empty state | List renders with no error banner (TS-05); empty text not confirmed | `TransactionSummaryDisplay.spec.ts` line 105 |
| Row action | View More opens summary panel (`openFirstRowSummary`) | `TransactionSummaryPage.ts` |

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| `viewMoreButtonForLastTransaction` / `openFirstRowSummary` | Row, cell 6 | Opens summary/details | Row exists | `summaryPanel` |
| `filterButton` | Above list | Shows filters | Always | Filter controls |
| `applyFilterButton` | Filters | Applies filters | Filter open | Narrowed rows |
| `clickViewMoreButtonForLastTransaction` (action) | Shared page object | Same for most recent row | - | Details with batch reference |

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| Transaction has commission/VAT (W2W, top-up) | Summary shows source and destination commission and VAT separately plus total | TS-01/02/03, EMI-5699/5621/5544 |
| Payload lacks commission/VAT (pre-fix) | `sourceCommission` etc. not shown | TS-02 guard |
| Type is Cash-Out or VIBAN | Stored amount stays the bare transaction amount (exempt from composition) | TAC-03, EMI-6020 |
| List empty | No error message | TS-05 |
| Status | SUCCESS / PENDING / FAILED in the summary payload | `TransactionSummary` interface |
| Transaction OTP required | Max attempts exceeded must give clear message and restart flow | TO-02, EMI-5560 |

## Business rules

| Rule | Detail | Source |
|---|---|---|
| Total amount formula | `totalAmount = amount + sourceCommission + destinationCommission + sourceVat + destinationVat`, 2 decimals, for all types except CASH_OUT and VIBAN | EMI-6020; `expectedTotal()` in `TransactionsHelper.ts` |
| Types the formula applies to | W2W_TRANSFER, TOPUP, BILL_PAYMENT, QR_PAYMENT, BANK_TRANSFER, EXTERNAL_WALLET_PAYMENT | `AMOUNT_COMPOSITION_TYPES` |
| Same total in transaction, transaction log and external party payload | Commission/VAT never added twice | EMI-6020; TAC-04 |
| EMI-5970 repro | amount 100 + commission 10+10 + VAT 1.5+1.5 must total 123.00 (was 88.50; control wallet went to -111.50) | `TransactionAmountCalculation.spec.ts` lines 6-10 |
| Empty idempotency key refused | 400 `IDEMPOTENCY_KEY_REQUIRED` | EMI-5525, TV-01 |
| Wallet config restricts transaction types | 400 `TRANSACTION_TYPE_NOT_ALLOWED` | EMI-5570, TV-02 |
| Insufficient funds must not read as hourly limit | `INSUFFICIENT_FUNDS` vs `HOURLY_TRANSACTION_LIMITS_EXCEEDED` | EMI-5803, TV-03 |
| Inactive recipient says so | `RECIPIENT_INACTIVE` rather than `PROFILE_NOT_FOUND` | EMI-5087, TV-04 |
| OTP config `required` flag persists | | EMI-5627, TO-01 |
| Ledger `initiator` not shown in Business UI | Ledger/DB attribute only | `Transaction-Operations.md` line 178 |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| Empty idempotency key | "Idempotency key is required" (mock) | API response |
| Type not allowed | "This transaction type is not allowed for this wallet configuration" (mock) | Transfer response |
| Low balance | "Insufficient funds" | Transfer response |
| Inactive recipient | "Recipient account is inactive" | Transfer response |
| Pre-fix profile error | "The profile could not be found." | Transfer response |
| OTP attempts exceeded | "Maximum OTP attempts exceeded" (`OTP_MAX_ATTEMPTS_EXCEEDED`) | OTP verify response |
| List failure | /internal server error\|500\|something went wrong/ | `errorMessage` |
| AR texts | Not in repo | - |

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| Load list | `GET **/api/v1/transactions**` | Best-effort pattern, mocked |
| Transfer | `**/api/v1/**transfer**`; sample `/api/v1/wallet-transfer` | Pattern only |
| Transaction log | `/api/v1/transaction-log?page=0&size=10` | Used for TAC-04 consistency |
| OTP config update | `/api/v1/transaction-otp-configurations/{id}` | Real (EMI-5627 curl); body has `required`, `code`, `minimumAmount`, `maxAttempts` |
| OTP verify | `**/otp/**verify**` | Pattern only |
| Admin report download | Admin Portal | AR-01..06 all skipped |

## Known gaps and product defects

| Item | Evidence |
|---|---|
| AR-01..AR-06 (report download 500 EMI-5537, date one day early EMI-5381, empty Pending column EMI-5402, duplicate failed reasons EMI-5165, filter reset EMI-5626) are skipped: Admin Portal only | `Transactions/api/AdminTransactionReports.spec.ts` |
| EMI-6020 / EMI-5970 fixed assertions pass only once on UAT (dev done when written) | `TransactionAmountCalculation.spec.ts` line 24 |
| All summary checks run against mocked data, not live | `TransactionsHelper.ts` header |
| `anyCommissionOrVat` missing from generated catalog | `TransactionSummaryPage.ts` vs generated file |

## Open questions

| Question | Note |
|---|---|
| Full column list and order of the datatable | Only cells 3, 5, 6 known |
| Allowed values in type and status filters | Not in repo |
| Paging control, page size, default sort | Not in repo |
| Whether filters are a drawer, dialog or inline | Locators are generic |
| Roles that may open the page | Not documented |
