# Other-Modules - UI logic (Balances, PaymentsTtl, Reconciliation, TransactionOperations, TransactionLedger)

Purpose: these five folders in `BusinessTestCases/` have **no page objects and no Business Portal screen**. They are API/back-office suites (Finance/Ops jobs, Admin Portal tooling, ledger/DB attributes). This file records what UI-facing behaviour the repo does state, and where there is none.
Route/URL: none in the Business Portal. Reconciliation and rebuild have Admin Portal "Manage Reconciliation" screens (no URL or page object in the repo). PaymentsTtl is meant to be managed from the Admin Jobs section (EMI-719; not accessible to tests).
Who sees it: Finance Lead / Finance Ops / Operations Manager and Admin Portal users; never Business (merchant/biller) users - `docs/manual-test-cases/Transaction-Operations.md` lines 14-19; `Balances/README.md` lines 3-5; `PaymentsTtl/README.md` lines 3-4.
Locator catalog: none (no `pageElements/` folder for these modules; nothing in `docs/ui-kb/*.generated.md`).
Status of all specs: **every test is skipped on purpose** (`test.skip(true, ...)` or an `*_IMPLEMENTED` flag), so none of the behaviour below has been run.

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| Admin "Manage Reconciliation" | not in repo | Run, report, export, rules, pairs, systems, ingestion | Admin Portal | Reconciliation framework screens (EMI-4538/4541/4542/4543/4549/4550/4551, To Do) - `Transaction-Operations.md` section B |
| Admin running-balance rebuild | not in repo | Manual rebuild with `from_date`/`to_date` | Admin Portal | RCN-10 |
| Admin transaction Reversal | not in repo | Reverse form with reason | Admin Portal | Financial Ops Manager action (EMI-2028) |
| Admin transaction Adjustment form | not in repo | Fields incl. read-only Batch Reference Number | Admin Portal | Append-only correction (EMI-2219) |
| Admin Jobs section | not in repo | Schedule/enable/inspect jobs (EMI-719) | Admin Portal | Payments TTL job is NOT in EMI-719's register today |
| Balances repair tooling | not in repo | Recompute / Rebuild | Admin / Finance-Lead tooling | EMI-5946 recompute, EMI-5945 rebuild |
| Transaction ledger initiator | no UI | DB/ledger field only | - | Not shown in Business UI (`TransactionSummaryPage` has no initiator) |

## Forms

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Adjustment reason | none (no page object) | select from predefined Reasons Table | Yes | Blocked until selected (AD-06) | not recorded | Adjustment form |
| Adjustment amount / external_reference / date | none | editable | At least a required field set | Missing required field gives a specific field-level error (AD-12) | field-level, text not recorded | Adjustment form |
| Wallet direction (source/destination) | none | fixed | - | Cannot be edited (AD-05) | - | Never |
| Batch Reference Number | none | read-only | - | Displayed, not editable (AD-10) | - | Batched transaction |
| Reversal reason | none | required | Yes | Logged with Transaction ID, Batch ID, Reversal Type, Reason (RV-07) | not recorded | Reverse action |
| Rebuild date range | none | `from_date`, `to_date` | Yes | RCN-10 | not recorded | Admin rebuild |

Source: `docs/manual-test-cases/Transaction-Operations.md` sections B, D, E.

## Tables and lists

| Aspect | Detail | Source |
|---|---|---|
| Mismatch report (Reconciliation) | Lists missing TXN, amount/status/date discrepancy, omnibus vs Control Wallet difference | RCN-01..03 |
| Reversal reasons table | Transaction ID, Batch ID (if any), Reversal Type, Reason | RV-07 |
| Discrepancy queue (EOD) | Shows aging; resolution SLA 3 business days | EOD-17 |
| Daily held-funds line | `gross received = credited + held + in-transit` | EOD-16 |
| Balances buckets | `available`, `reserve_debit`, `reserve_credit`, `current` | `Balances/BalancesHelper.ts` line 55 |
| Run statuses | RUNNING, COMPLETED, NO_OP, FAILED, PARTIAL; scopes ALL, WALLET_CODES, WALLET_ID | `BalancesHelper.ts` lines 109-110 |
| Paging/filters/sorting | Not documented | - |

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| Manual reconciliation run + generate report | Admin Reconciliation | Triggers a run | Admin | Report with matched/discrepant totals (RCN-19) |
| Export report | Report | Download file | Report generated | File intact (RCN-20) |
| Manual rebuild | Admin | Rebuilds running_balance for date range | Admin | Job completes; wallets updated (RCN-10) |
| Reverse | Admin transaction | Reverses Successful / Pending / Failed, single or whole batch | Only those three states; once only | Funds back or reserve released (RV-01..06) |
| Adjust | Admin transaction | Appends `reversal_of` + `adjustment_of` entries | Admin with reason | Original never modified (AD-01) |
| Balance recompute | Admin / Finance Lead | Order-independent bucket repair | Finance Lead token | Seconds-long routine repair |
| Run Payments TTL job | Admin Jobs | Expires stalled payments | Ops/Admin token | Not built (EMI-6031 To Do) |

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| Transaction not Successful/Pending/Failed | Reversal blocked | RV-08 |
| Transaction/batch already reversed | Second reversal rejected | RV-06 |
| Draft state INITIATED / PENDING_CHECKS / PENDING_OTP | Draft TTL applies; expires to `EXPIRED`, affects no balance | `PaymentsTtlHelper.ts` lines 51-56 |
| Ledger state LEDGER_PENDING | Ledger TTL: append compensating posting or park for Ops | same |
| SUCCESS / FAILED | Never touched by TTL | same |
| Rail has not confirmed outcome | Action is ESCALATE, even for CASHOUT configured AUTO_REVERSE | TTL-LG-05 |
| Weekend | Friday and Saturday not counted for business-day TTL; timezone Asia/Riyadh | TTL-DR-09, EMI-5139 |
| Wallet identity | `current = available + reserve_debit` (reserve_credit excluded) | `Balances/README.md` |
| Negative `available` | Tolerated, recorded as variance and alerted, never rejected or clamped | EMI-5944 Q5 |
| Cross-wallet sum off | Shortfall = a leg never applied; surplus = applied twice; recorded distinctly | BAL-ID-06 |
| PoS callback recon_id cases | Exceptions E13, E14, E15, E18, E19; DISPUTED at day 3; COMPLIANCE_HOLD classified matched-but-held | EOD-07..15 |

## Business rules

| Rule | Detail | Source |
|---|---|---|
| Reconciliation scope | External = bank vs system; internal = ledger vs wallet balances; auto-insert of missing bank TXN with `reconciliation_batch_id`, `source`, `inserted_by`, timestamp; all actions logged in `reconciliation_runs` | RCN-04..06 |
| Rebuild archives first | Existing rows move to `running_balance_history` before rewrite | RCN-12 |
| Append-only ledger | Adjustment/reversal never edit or delete originals; multiple adjustments allowed | AD-01, AD-09 |
| Adjustment pair edge case | On a settled txn: reverse success entry, reverse pending entry, append new pending, append new success | AD-11 |
| Batch reference inherited | | AD-08 |
| EOD bank balance | Control wallet + bank amount = zero (EMI-710 wording) | EOD-03 |
| Reserved funds on failed EOD statement | Released; while PENDING stays reserved | EOD-05/06, EMI-5771 |
| Recompute vs Rebuild | Different questions: wallet money right vs customer statement right | `Balances/README.md` |
| Ledger initiator | Bill and Wallet payment link both `"System, MjdPay Profile User"` (`CONFIRMED_INITIATOR`); same value at pending and successful | EMI-5839, LI-01..05 |
| Draft vs ledger TTL | Draft: mark terminal, release limit headroom. Ledger: compensating posting or escalate | `PaymentsTtl/README.md` |
| Proposed TTL matrix | Our proposal sent to Finance, not yet returned (Q1) | `PROPOSED_TTL_MATRIX` |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| Ineligible reversal | "Transaction is not eligible for reversal. Ensure it meets the criteria for reversal." | Admin UI (RV-08) |
| Adjustment API failure | "An error occurred while processing your request. Please try again later." (no internals) | Admin UI (AD-13) |
| Missing required field | Specific field-level error | Adjustment form (AD-12) |
| AR texts | Not in repo | - |

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| Incoming bank transactions job | `/api/v1/job/incoming-bank-transactions` | `ReconciliationHelper.ts` line 19 |
| Balance recompute | `/api/v1/wallets/balance/recompute` | Inferred, env `BALANCES_RECOMPUTE_PATH` |
| Balance rebuild | `/reconciliation/internal/rebuild` | Inferred, env `BALANCES_REBUILD_PATH` |
| Payments TTL run | `/api/v1/job/payments-ttl` | Inferred, env `TTL_JOB_RUN_PATH` |
| Payments TTL config | `/api/v1/admin/jobs/payments-ttl/config` | Inferred, env `TTL_CONFIG_PATH` |
| Admin report download/dates/pending column | Admin transaction reports | See Transactions.md, AR-01..06 skipped |
| Reversal / Adjustment / Ledger | no paths in helpers | Helpers only export `API_BASE` |

## Known gaps and product defects

| Item | Evidence |
|---|---|
| All specs skipped pending Admin Portal tooling access | `Reconciliation/api/*.ts` line 14 comment; `TransactionOperations`, `TransactionLedger` specs |
| Balances (EMI-5944) and PaymentsTtl (EMI-6031) epics are To Do; no API contract; paths inferred; gated by `BALANCES_IMPLEMENTED` / `TTL_IMPLEMENTED` | READMEs |
| Payments TTL job already runs in production but is unspecified and unmonitored (EMI-5139 did not execute, EMI-5165 duplicate rows, EMI-4762) | `PaymentsTtl/README.md` |
| EMI-5839 AC 4 (flows where initiator cannot be populated) is an open discovery item; failed/cancelled/expired ledger behaviour undefined | `Transaction-Operations.md` lines 178-192 |
| Reserve-never-released defect class: EMI-2013, EMI-4591, EMI-5771, EMI-3506 | `Balances/README.md` |
| EMI-5945 rebuild, EMI-5954 daily close, EMI-5955 EMI_MISSING have manual cases but no specs | `Balances/README.md` |
| PaymentsTtl Q2 (PG already captured then refund vs void) unresolved | `PaymentsTtl/README.md` |

## Open questions

| Question | Note |
|---|---|
| Admin Portal URLs, labels and form fields for Reconciliation, Reversal, Adjustment | No page objects; only AC text |
| Whether Business Portal shows any trace of reversals/adjustments in the Transactions list | Not documented |
| Final TTL and SLA matrix per transaction type | Awaiting Finance (Q1) |
| Real endpoint paths and payloads for Balances and PaymentsTtl | Inferred only |
| Exact error text/EN-AR for reconciliation exceptions E13-E19 | Codes only |
