# PosTransactions - UI logic

Purpose: POS (card terminal) transaction screens: Business and Admin **POS Device Transactions** lists, and the Admin-only **ACH Records** screen (settlement batches that can be released or rejected).
Routes: Business `/business/main/pos-transactions`; Admin `/admin/main/pos-transactions`; Admin `/admin/main/ach-records` (`PosTransactionsHelper.ts` lines 494-496). The Admin host is `ADMIN_BASE_URL` (separate from the business host).
Who sees it: Business portal merchant users (own terminals only) see POS Device Transactions; Admin portal users see all devices plus ACH Records. Release/reject need an admin token with write privilege (a read-only admin cannot, POS-ACH-12/13).
Locator catalog: [PosTransactions.generated.md](PosTransactions.generated.md). All locators are best-effort: POS is absent from QA-DATA-TESTID-HANDOFF.md. UI specs mock list responses; the API folder is documented in `BusinessTestCases/PosTransactions/README.md`.
Tickets: EMI-6011 (Business screen), EMI-6013 (Admin screen), EMI-6015 (ACH Records), defects EMI-6036/6037/6053/6063/6064/6065.

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| POS Device Transactions (Business) | `/business/main/pos-transactions` | Table (`transactionsTable`, `transactionRows`) | Main body | Transactions for the selected device/TID |
| Same, Admin | `/admin/main/pos-transactions` | Same table, all devices | Main body | Cross-device list; can filter or go to a device/TID (EMI-6013) |
| Both | same | Filters `terminalFilter`, `statusFilter`, `applyFiltersButton`, `resetFiltersButton` | Above table | Narrow list |
| Both | same | `refreshButton`, `nextPageButton`, `previousPageButton` | Table toolbar / footer | Reload, paginate |
| Both | same | `loadingIndicator`, `emptyState`, `errorState`, `errorToast` | Body | State display |
| ACH Records (Admin) | `/admin/main/ach-records` | Table (`recordsTable`, `recordRows`, `columnHeaders`) | Main body | Paginated ACH batches across all devices |
| ACH Records | same | Filters `terminalFilter`, `statusFilter`, `applyFiltersButton`, `resetFiltersButton` | Above table | Backend-supported filters, resettable |
| ACH Records | same | `viewDetailsButton` -> `detailsPanel` | Row action -> dialog/panel | Full record including dates |
| ACH Records | same | `releaseButton`, `rejectButton` -> `confirmActionButton`, `actionProgressIndicator` | Row actions / dialog | Release or reject a batch |

Sources: `PosDeviceTransactionsPage.ts` and `AchRecordsPage.ts` headers; `ui/*.spec.ts`.

## Forms

No data-entry forms. Filters and a confirmation dialog only.

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Terminal / TID | `terminalFilter` | text (label /terminal\|tid/) | No | Sent as `terminalId` query param; list narrows to that terminal (POS-UI-03, ACH-UI-08) | - | Always |
| Status | `statusFilter` | select | No | Business/Admin POS: `processingStatus`; ACH: ACH status | - | Always |
| Apply | `applyFiltersButton` | button | - | - | - | Always |
| Reset | `resetFiltersButton` | button | - | Restores full list (POS-UI-03b, ACH-UI-08) | - | Always |
| Confirm release/reject | `confirmActionButton` | button | - | Release must be confirmed before it is submitted (ACH-UI-06c) | - | After clicking Release/Reject |
| Reject reason (API) | not in page object | text | Yes for reject (API) | Max length 255 (`ACH_REASON_MAX_LENGTH`) | not confirmed | Reject flow; UI field not modelled |

## Tables and lists

### POS Device Transactions (Business and Admin)

| Aspect | Detail | Source |
|---|---|---|
| Columns | Terminal ID (`terminalIdCells`), Device ID (`deviceIdCells`, `posDeviceId`), Amount (`amountCells`), Status (`statusCells`, `processingStatus`), Reference (`referenceCells`, `rrn`). Payload also has walletCode, maskedPan, currency, stan, transactionDate | `PosDeviceTransactionsPage.ts`; helper `PosTransactionRow` |
| Status values | RECEIVED, ACCEPTED, UNMATCHED, COMPLIANCE_HOLD, SETTLEMENT_HELD, GROUPED, SETTLED, DISPUTED, FAILED_RETRYABLE, REJECTED, FAILED | `PROCESSING_STATUSES` |
| Filters | Terminal/TID, Status; filter honoured by backend (`terminalId`, `processingStatus`) | `mockPosTransactionList` |
| Paging | Next / Previous; second page must not repeat first-page rows (EMI-6011, POS-UI-04). API Spring page: `content,totalElements,totalPages,size,number` | spec POS-UI-04 |
| Refresh | Keeps the active filter and reloads page one (POS-UI-05) | spec line 198 |
| Empty state | Text /no transactions\|no records\|no data/ - not a stuck spinner (POS-UI-02) | spec |
| Error state | 500 shows an error state, not an empty table (POS-UI-02b) | spec |
| Row identity | Reference (RRN) column must show (EMI-6037); Admin Device ID must never be blank (EMI-6053) | POS-UI-01c, POS-UI-06b |
| PAN display | Masked only, pattern `410621******1234` | `MASKED_PAN_PATTERN` |

### ACH Records (Admin)

| Aspect | Detail | Source |
|---|---|---|
| Columns | Status (`statusCells`), Wallet Code (`walletCodeCells`, EMI-6064), Batch ref (`batchRefCells`, `reconBatchRefNum`); payload also terminalId, memberCount, transferAmount, beneficiaryAccountIban, beneficiaryName, matchedAt, approvedAt, sentAt, valueDate | `AchRecordsPage.ts`; helper `AchRecordRow` |
| Date column | No standalone Date column in the table; dates live in the details view (EMI-6065, ACH-UI-05) | spec lines 177-197 |
| Status values | AWAITING_APPROVAL, APPROVED, PENDING, SUCCESSFUL, REVERSED, REJECTED. Must render as prose "Awaiting approval", "Successful", never raw key `Main.Ach_records.Status_successful` (EMI-6063) | `ACH_STATUSES`; ACH-UI-02/02b |
| Filters | Terminal/TID, Status; reset restores list | ACH-UI-08 |
| Paging | Server-side, page size capped at 100 (API) | POS-ACH-05 |
| Empty state | /no (ach )?records\|no data/ | ACH-UI-01b |
| Row actions | View Details (every record), Release, Reject (only if allowed) | ACH-UI-04, 06 |

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| `refreshButton` | POS list | Reloads page one, keeps filter | Always | Reloaded list |
| `nextPageButton` / `previousPageButton` | POS list | Paginates | Another page exists (test skips if disabled) | Next rows, no duplicates |
| `viewDetailsButton` | ACH row | Opens `detailsPanel` with full record and dates | Every record (EMI-6065) | Dialog/panel |
| `releaseButton` | ACH row | Starts release (PUT/POST `.../ach-transfers/release`) | `allowedActions` contains RELEASE (only AWAITING_APPROVAL) | `confirmActionButton`, progress, success toast, state refresh |
| `rejectButton` | ACH row | Starts reject | `allowedActions` contains REJECT | Confirm, then batch REJECTED |
| `confirmActionButton` | Confirm dialog | Submits the action | Dialog open | `successToast` or `errorToast` |
| `applyFiltersButton` / `resetFiltersButton` | Filters | Apply / clear filters | Always | Narrowed / full list |

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| ACH record `allowedActions` empty (e.g. SUCCESSFUL) | No Release or Reject shown | ACH-UI-06 |
| `allowedActions` includes RELEASE | Release shown; confirmation required before submit | ACH-UI-06b/c |
| Actions are backend-driven | Only actions the backend declares are rendered | EMI-6015 |
| Business user | Sees own terminals only; cross-tenant access refused | API security tests, EMI-6052 |
| Read-only admin | Cannot release/reject (403) | POS-ACH-12/13 |
| Loading | `loadingIndicator` clears once rows arrive | POS-UI-01b |
| API 500 | Error state shown | POS-UI-02b |
| Empty result | Empty state | POS-UI-02, ACH-UI-01b |
| Beneficiary data missing in payload (pre-fix) | IBAN and name absent on screen | ACH-UI-07, EMI-6036 |

## Business rules

| Rule | Detail | Source |
|---|---|---|
| Release only for AWAITING_APPROVAL | Re-release of settled batch skipped, reject of settled batch refused | POS-ACH-16/17/21 |
| Release is idempotent per ref | Same ref twice pays once; mixed batch reports each ref independently; result codes RELEASED, ALREADY_RELEASED, NOT_FOUND, INVALID_STATUS | POS-ACH-18/19; `ACH_RELEASE_RESULTS` |
| Release moves real money | Sends bank payment instruction; test mutation gated by `POS_ACH_ALLOW_MUTATIONS` | README "Money-moving safety" |
| Reject reason | Recorded; max 255 chars | POS-ACH-20; `ACH_REASON_MAX_LENGTH` |
| PAN always masked | Full PAN must never appear | `isFullPan`, README |
| Refund | Captured, not rejected, even on zero balance; EMI-5918 To Do, tests gated by `POS_REFUNDS_IMPLEMENTED` | README |
| Event types | PURCHASE, REFUND, VOID | `POS_EVENT_TYPES` |
| Cross-tenant wallet code must say not permitted rather than device not found | EMI-6052 | `PosApiContractDefects.spec.ts` |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| ACH status | "Awaiting approval", "Successful" (prose). AR not in repo | Status column |
| Release success | A success toast matching /successfully/ (exact text not confirmed) | `successToast` |
| Release/other failure | /error\|failed\|went wrong/ | `errorToast` |
| Listing 500 | "Failed to process your request.Please contact support." (`INTERNAL_SERVER_ERROR`, mock) | `errorState` |
| Locale | `Accept-Language` `en_uk` / `ar_sa` must apply immediately (EMI-6050) | API messages |
| Empty | "No transactions", "No ACH records" (regex only) | `emptyState` |

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| Business list | `GET /api/v1/pos/transactions`, `.../terminals/{terminalId}` | Dev returned 404 without token (documented 401) - README |
| Admin list | `GET /api/v1/admin/pos/transactions` | Needs admin token; headers without token gave 412 |
| ACH list | `GET /api/v1/admin/pos/ach-transfers` (`batchRef`, `terminalId`, status filters) | Page cap 100 |
| ACH release | `POST /api/v1/admin/pos/ach-transfers/release` | Response `{total, succeeded, failed, skipped, items[{batchRef,result}]}` |
| ACH reject | `POST /api/v1/admin/pos/ach-transfers/reject` | HTTP method not stated in helper |
| Ledger | `GET /api/v1/pos/ledger/terminals/{id}`, `/wallets/{ref}`, `/api/v1/admin/pos/ledger` | API only |
| Terminal callback | `POST /api/v1/pos/transactions/callback` | API only (TC-078..105) |

## Known gaps and product defects

| Item | Evidence |
|---|---|
| EMI-6063 raw i18n key in ACH Status; EMI-6064 Wallet Code column missing; EMI-6065 no View Details and Date in table | `AchRecordsPage.ts` header |
| EMI-6053 admin `posDeviceId` null; EMI-6055 ledger currency null; EMI-6037 reference not shown | `PosApiContractDefects.spec.ts` lines 25-26, ui spec |
| EMI-6047 no token gives 404 not 401; EMI-6048 expired token returns 200 (open); EMI-6049 size=0 gives 500; EMI-6050 locale ignored; EMI-6051 dateFrom 500 (open); EMI-6052 foreign wallet code message | `PosApiContractDefects.spec.ts` lines 19-32 |
| Business `/api/v1/pos/**` route appears unregistered on dev; malformed token returns 500 | README "Observed gateway behaviour" |
| Many UI tests skip when a locator does not resolve | `ui/*.spec.ts` (`test.skip(... reconcile locators)`) |
| POS-ACH-24/25/26 (bank failure paths, audit log) are placeholders | `PosAchTransfers.spec.ts` line 486 |

## Open questions

| Question | Note |
|---|---|
| Real column labels (EN/AR) and order | Only data-column hints in locators |
| How the Business user "selects a device" before the list loads | EMI-6011 wording; no page object for a device picker |
| HTTP method for ACH reject, exact toast texts | Not in repo |
| Business-role names/privileges required | Not in repo |
| Whether the Admin route is gated by a distinct privilege for viewing vs releasing | Only read-only vs write token seen |
