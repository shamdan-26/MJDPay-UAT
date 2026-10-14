# BankTransfer - UI logic

Purpose: "Cashout" / "Withdraw" - a Business user sends wallet money to the Saudi IBAN registered on their own account. Three steps: Amount -> Confirmation (summary) -> OTP -> Success.
Route: `/business/main/transfer/bank-transfer` (sidebar "Withdraw" link, Transfer panel; href regex in `Topup/ui/TopupShellUI.spec.ts:98-102`). Also opened from the home quick-action card "Send to any Saudi IBAN" (`quickActionCashoutCard`, `Shared/HomepageQuickActionsPage.ts:26`) and the home `#quick-bank` button (`Shared/HomePage.ts:74`).
Who: logged-in Business accounts (Merchant / Biller). Access is driven by Admin roles/groups; a user without the permission gets no page access plus a validation message (not automated - `security/BankTransferSecurity.spec.ts:443-446`, memory note `project_banktransfer_coverage_expansion`).
Locator catalog: [Shared.generated.md](Shared.generated.md) section `BankTransferPage` (page object `BusinessTestCases/pageElements/Shared/BankTransferPage.ts`). OTP boxes come from `OtpPage` (same file).

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| Amount (step 1 screen) | `/business/main/transfer/bank-transfer` | Page hero (`pageTitle`, `pageSubtitle`) | Top | Title "Cashout / سحب نقدي"; subtitle "Send funds to a Saudi IBAN" (`ui/BankTransferAmountPage.spec.ts:67-70`) |
| Amount | same | Balance card (`balanceCardLabel`, `balanceAmount`, `balanceWalletCode`, `balanceTopupButton`, `balanceQrButton`, `balanceSettingsButton`) | Under hero | Shows current balance, wallet code, Topup / QR / wallet-settings actions (`ui/BankTransferAmountPage.spec.ts:74-92`) |
| Amount | same | IBAN card (`ibanCardLabel`, `ibanCardValue`, `ibanCardBank`, `ibanCardCheck`) | Under balance card | Read-only destination: masked IBAN `SA## ** ####`, bank name, verified check (`ui/BankTransferAmountPage.spec.ts:96-102`) |
| Amount | same | Amount section (`sectionStepBadge` = "2", `sectionTitle`, `sectionDescription`) | Below IBAN card | Heading "Amount / المبلغ", text "enter the amount to transfer" (`ui/BankTransferAmountPage.spec.ts:106-110`) |
| Amount | same | Amount field block (`inputAmount`, `amountCurrencyIcon`, `useFullBalanceToggle`, `fullBalanceToggleLabel`, `quickAmountLabel`, `presetAmountChips`, `proceedButton`) | Inside Amount section | Enter amount, optional full-balance toggle, 5 preset chips, Proceed |
| Confirmation (step 2) | same URL (no route change seen) | Summary rows (`.mp-sum-row`, read by `getSummaryText` / `getSummaryMoney`) + `summaryCancelButton`, `proceedButtonInSummary` | Main panel; `pageTitle` = "Confirmation / التأكيد" | Review Transaction Type, Bank, IBAN, Original Amount, commission, VAT, Total (`ui/BankTransferConfirmationPage.spec.ts:75-101`) |
| OTP (step 3) | same URL | Inline OTP widget: 6 boxes (`OtpPage.inputs`), `countdownTimer`, `resendButton`, `verifyButton`, `cancelButton`, recap (`otpRecapIban`, `otpRecapTotal`) | Main panel; `pageTitle` still "Confirmation" | Enter code; recap repeats masked IBAN and total (`ui/BankTransferOtpPage.spec.ts:58-171`) |
| Success | same URL | Success modal (heading /successful\|ناجح\|نجاح/ + `Successful_OkButton`) | Modal | Final confirmation (`functional/BankTransferHappyPath.spec.ts:94-96`) |

## Forms

### Amount form

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Amount | `inputAmount` (testid `amount-input` or `#input_set_amount`, `BankTransferPage.ts:53`) | Text, placeholder `0.00` (`ui/BankTransferAmountPage.spec.ts:134-136`) | Yes (Proceed disabled while empty) | Accepts digits, up to 2 decimals (`20.5`, `15.75` OK). Rejected / stripped: `-10.00`, `0`, `abc!@#`, `10.555`, `1,000`, `1e5`, pasted `abc` (`functional/BankTransferNegative.spec.ts:56-78`) | No inline error text confirmed; value is filtered silently | Always, except read-only while "Use full balance" is ON (`readonly` attribute, `functional/BankTransferEdgeCases.spec.ts:65-72`) |
| Use full balance | `useFullBalanceToggle` (`app-toggle-button#use-full-balance-toggle` / testid `amount-full-balance-toggle`, `BankTransferPage.ts:84`) | Toggle | No | ON: fills balance (up to 4 decimals), locks field. OFF: field editable again (`functional/BankTransferEdgeCases.spec.ts:65-84`) | - | Only shown when balance > 0 (`ui/BankTransferAmountPage.spec.ts:138-150`) |
| Preset chips | `presetAmountChips` (testid `amount-chip-<value>`) | 5 buttons: 500, 1000, 2000, 5000, 10000 | No | Click fills `inputAmount`. Typing afterwards overrides the chip (`functional/BankTransferEdgeCases.spec.ts:57-62`). A chip above the balance is disabled or leaves Proceed disabled (`ui/BankTransferAmountPage.spec.ts:195-225`) | - | Always rendered; value must be <= balance to be usable |
| Proceed | `proceedButton` (testid `bank-amount-proceed-btn`) | Button | - | See Buttons table | - | Amount valid and > 0 |

No IBAN entry field exists in this flow: the IBAN is bound at registration (memory note `project_banktransfer_coverage_expansion`; handoff testids `bank-transfer-iban-input` / `bank-transfer-continue-btn` are listed in `QA-DATA-TESTID-HANDOFF.md` 4.4 but not used by this flow).

### OTP form

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| OTP digits | `OtpPage.inputs` | 6 single-digit boxes | Yes | Paste of 6 digits is spread across boxes; widget auto-submits on the 6th digit (`ui/BankTransferOtpPage.spec.ts:138-157`, memory note) | `OtpPage.errorMessage` (invalid OTP wording, bilingual) | Shown after Confirmation "Next" |
| Verify | `OtpPage.verifyButton` (testids `bank-amount-otp-verify-btn` / `bank-confirm-otp-verify-btn`) | Button | - | Disabled until all 6 digits entered (`ui/BankTransferOtpPage.spec.ts:122-135`) | - | 6 digits present |
| Resend | `OtpPage.resendButton` | Link/button | - | Disabled until countdown ends; click restarts countdown (`ui/BankTransferOtpPage.spec.ts:93-118`) | - | Countdown = 0 |

## Tables and lists

| Item | Detail | Source |
|---|---|---|
| Confirmation summary rows (key/value list, not a data table) | Order: Transaction Type, Bank, IBAN, Original Amount, commission, VAT, Total amount to be sent. Labels via `SUMMARY_LABEL` regex (EN/AR). Money cells are `.money-amount` | `BankTransferHelper.ts:15-23`; `BankTransferPage.ts` `getSummaryText`/`getSummaryMoney` |
| Transactions list (outside this page) | After a transfer the newest row in Transactions shows the status; failed attempts appear as FAILED | `docs/manual-test-cases/BankTransfer.md` BT-82; `BankTransferPage.verifyLastTransactionFailed` |
| Filters / sorting / paging / empty state / row actions | Not applicable to this page | - |

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| `bankTransferButton` (`#balance-transfer-text`) | Locator carried over from the Java suite | Intended to open Cashout; `clickBankTransferButton` exists but specs enter via the quick-action card | Not confirmed | Amount step (`BankTransferPage.ts:52,139`) |
| `proceedButton` | Amount step | Sends amount for pricing, opens summary | Enabled only with valid amount. Click sometimes does not register on dev; helper retries while still enabled, then waits up to 90 s for the summary (`BankTransferHelper.ts:35-70`) | Confirmation |
| `balanceTopupButton` (`#btn_top_up_compact`) | Balance card | Topup shortcut (label "Topup / إضافة الأموال"; only presence and text asserted, click target not tested) | Always | Not confirmed |
| `balanceQrButton` / `balanceSettingsButton` | Balance card | Generate wallet QR / wallet settings (aria-labels, bilingual) | Always | Open respective view (only presence asserted) |
| `useFullBalanceToggle` | Amount field | Fill + lock the full balance | Balance > 0 | See Forms |
| `summaryCancelButton` (testid `bank-summary-cancel-btn`) | Confirmation | Abandons the summary | Always on summary | Back to Amount, balance unchanged (`functional/BankTransferSession.spec.ts:66-75`) |
| `proceedButtonInSummary` (testids `bank-summary-next-btn` / `bank-confirm-proceed-btn`) | Confirmation | "Next" - sends OTP | Enabled after summary renders; commission/VAT may show 0 until the async calc settles (`waitForSummaryToSettle`) | OTP step (or direct success if OTP requirement is off) |
| `OtpPage.cancelButton` | OTP | Cancels transfer | Always | Back out; test navigates home; balance unchanged (`functional/BankTransferSession.spec.ts:77-89`) |
| `OtpPage.resendButton` | OTP | Re-issue OTP and restart timer | After countdown expires | Timer jumps back up |
| `Successful_OkButton` (testids `bank-amount-ok-btn` / `bank-confirm-ok-btn`) | Success modal | Close modal | Success shown | Back to page; balance refreshed after reload |
| `ibanViewFullToggle` | Not present by design | There is NO control to reveal the full IBAN | - | Test asserts count 0 and no `SA\d{22}` in DOM (`ui/BankTransferAmountPage.spec.ts:182-190`) |
| Back button on summary | Not rendered | `bank-confirm-back-btn` from the handoff does not exist; Cancel is the only way back | - | `functional/BankTransferSession.spec.ts:91-94` |

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| Amount empty / zero / invalid | Proceed disabled | `ui/BankTransferAmountPage.spec.ts:153-156`, `functional/BankTransferNegative.spec.ts` |
| Balance = 0 | "Use full balance" toggle hidden; every debit test fails, so specs top up first (`ensureNonZeroBalance`) | `ui/BankTransferAmountPage.spec.ts:138-146`, `BankTransferHelper.ts:126-186` |
| Amount > balance | Proceed then shows an insufficient-funds toast; flow does not reach OTP | `functional/BankTransferNegative.spec.ts:88-93`, `docs/EMI_Business_Flows.md` section 4 |
| Full balance toggle ON | Field filled (<= 4 decimals) and read-only | `functional/BankTransferEdgeCases.spec.ts:65-72` |
| Summary just opened | Commission/VAT briefly 0 while backend calculates; wait before asserting | `BankTransferHelper.ts` (doc comment), `BankTransferPage.waitForSummaryToSettle` |
| Page refreshed mid-flow | Transfer discarded; fresh Amount step; balance unchanged | `functional/BankTransferSession.spec.ts:58-64` |
| Fresh load of the URL during an abandoned OTP | Must not resume OTP step | `security/BankTransferSecurity.spec.ts:222-237` |
| Session expired during long run | App shows "session expired" dialog; spec re-logs in | `functional/BankTransferHappyPath.spec.ts:56-69` |
| Language | App loads Arabic (`html[dir=rtl]`) by default on dev/UAT; labels bilingual, testids language-neutral | `ui/BankTransferLocalization.spec.ts:9-46` |
| OTP requirement config (Admin: Configuration Settings -> Transaction) | ON: OTP modal shown. OFF: transfer executes with no OTP | `docs/manual-test-cases/BankTransfer.md` BT-41/BT-42 (spec skipped) |

## Business rules

| Rule | Detail | Source |
|---|---|---|
| Destination | Own registered IBAN only; masked `SAxx**xxxx`; never revealable | `ui/BankTransferAmountPage.spec.ts:182-190`, memory note |
| Decimals | Up to 2 decimal places accepted; 3rd decimal rejected or truncated (EMI-2050 TC-3123 "no decimals" is NOT dev behaviour) | `BankTransferNegative.spec.ts:64-66`, memory note |
| Presets | 500, 1000, 2000, 5000, 10000 | `ui/BankTransferAmountPage.spec.ts:160-170`, `QA-DATA-TESTID-HANDOFF.md` section 3 |
| VAT | VAT = commission x 15% (VAT_RATE 0.15) | `functional/BankTransferHappyPath.spec.ts:14,128` |
| Total | Total amount to be sent = Original - commission - VAT | `functional/BankTransferHappyPath.spec.ts:129` |
| Commission | Admin-configured Fixed or Percentage tier (min/max range); applies only inside range. No commission/min/max configured on dev yet | `docs/manual-test-cases/BankTransfer.md` BT-24..33; memory note |
| Balance debit | After success, balance decreases by exactly the entered amount (checked after reload) | `functional/BankTransferHappyPath.spec.ts:93-102` |
| Insufficient funds | Block immediately, toast, never reach OTP or the provider | `docs/EMI_Business_Flows.md` section 4 |
| OTP | 6 digits, countdown timer, auto-submit on last digit, resend after expiry. Dev always accepts the fixed OTP | `ui/BankTransferOtpPage.spec.ts`, `security/BankTransferSecurity.spec.ts:183-185` |
| OTP attempts | Intended: 3 wrong codes -> error, redirect to Amount step, in-flight transfer abandoned, new idempotency key needed, no hard lock (EMI-TC-3125/3126). Actual dev behaviour is defective | `functional/BankTransferNegative.spec.ts:106-114` |
| Wallet balance limits | Admin Manage Limits -> Wallet Balance by risk level; transfer over ceiling blocked before OTP (EMI-180) | `functional/BankTransferWalletLimits.spec.ts` (all skipped), `docs/manual-test-cases/BankTransfer.md` BT-46..57 |
| Transaction limits | Hourly/daily/monthly/yearly amount and count limits; count 0 blocks outright; violation shows "Payment Failed" / limit message (EMI-180/EMI-87) | `functional/BankTransferTransactionLimits.spec.ts` (all skipped); `EMI-Business-Rules-part2` EMI-87 |
| Limit order | Balance min/max, then amount per period, then count per period; first breach wins | `docs/business-knowledge/EMI-Business-Rules-part2-admin-payments.md:31-39` |
| Settlement | Open-loop: bank rail (ANB) confirms later via polling; 1-2 business day SLA, transaction type 101002 Merchant Bank Transfer | `EMI-Business-Rules-part1:73`, `part2:29` |
| Transaction status | Failed attempt (wrong OTP) shows FAILED in Transactions | `docs/manual-test-cases/BankTransfer.md` BT-82 |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| Amount > balance after Proceed | "Insufficient funds" / "لا توجد أموال كافية" | Toast (`toast-message`) (`functional/BankTransferNegative.spec.ts:93`) |
| Page title | "Cashout" / "سحب نقدي" | `pageTitle` |
| Page subtitle | "Send funds to a Saudi IBAN" / "أرسل أموالاً إلى آيبان سعودي" | `pageSubtitle` |
| Section | "Amount" / "المبلغ"; "enter the amount to transfer" / "أدخل مبلغ التحويل" | `sectionTitle`, `sectionDescription` |
| Quick-amount label | "Or select amount" / "أو اختر المبلغ" | `quickAmountLabel` |
| Full balance label | "Use full balance" / "استخدام كامل الرصيد" or "استخدام الرصيد بالكامل" | `fullBalanceToggleLabel` |
| Proceed / Next / Cancel | "Proceed" / "متابعة"; "Next" / "التالي"; "Cancel" / "إلغاء" | buttons (`ui/BankTransferLocalization.spec.ts:70-87`) |
| Confirmation heading | "Confirmation" / "التأكيد" | `pageTitle` on steps 2 and 3 |
| Summary labels | Transaction Type / نوع العملية; Bank / البنك; IBAN / رقم الآيبان; Original Amount / المبلغ الأصلي; commission / العمولة; VAT / ضريبة القيمة المضافة; Total amount to be sent / إجمالي المبلغ المراد إرساله | `BankTransferHelper.ts:15-23` |
| Transaction Type value | "Cashout" / "سحب نقدي" | Summary row |
| Success | Heading matches "successful" / "ناجح" / "نجاح" | Success modal |
| Wrong OTP | Inline invalid-OTP error (regex in `OtpPage.errorMessage`) | OTP step |
| Hourly/count limit hit | "Payment Failed" (count) / limit-exceeded message naming the period | Planned, not automated (`functional/BankTransferTransactionLimits.spec.ts:79,116`) |
| Invalid system IBAN (System Cash-Out) | "The destination IBAN is invalid. Please update the configuration and try again." | Admin Portal System Cash-Out, stub (`functional/BankTransferSystemCashout.spec.ts`) |

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| Proceed (price quote) | Confirm-summary call returning `summaryDto` | Stateless calculator: echoes any amount, returns 201, commits nothing. Exact URL not hardcoded; discovered at runtime (`security/BankTransferSecurity.spec.ts:53-62,124-131`) |
| Next / OTP verify | Post-OTP commit endpoint | Path not captured in repo; security spec discovers it from recorded POSTs (`security/BankTransferSecurity.spec.ts:15-19`) |
| Balance read | Read from the on-screen balance (`balanceAmount`), no API call in the page object | `BankTransferPage.getBalanceBeforeBankTransfer` (line 299) |
| Admin limits setup (other suites) | `GET/PUT /api/v1/limitations/{admin-wallet-limitations,transaction-limitations,transaction-count-limitations}` | `pageElements/Shared/AdminLimitsApi.ts:8-12` |
| Ledger check | SQL `emi_transaction.transaction_log` | Used by Topup specs; not by BankTransfer specs |

## Known gaps and product defects

| Item | Evidence |
|---|---|
| Three wrong OTPs: dev behaviour defective, spec is `test.fixme`; actual behaviour not yet described by QA | `functional/BankTransferNegative.spec.ts:106-114`; memory note |
| `ensureNonZeroBalance` top-up branch is known broken (popup never opens / balance stays 0), so specs fail in `beforeAll` when balance hits 0 | `BankTransferHelper.ts:90-124` |
| Wallet limits, transaction limits, commission tiers, OTP requirement toggle, System Cash-Out: all `test.skip` placeholders pending Admin Portal automation (EMI-180, EMI-2050) | `functional/BankTransfer{WalletLimits,TransactionLimits,Commission,OtpRequirement,SystemCashout}.spec.ts` |
| Handoff testids `bank-transfer-iban-input`, `bank-transfer-continue-btn`, `bank-confirm-back-btn` do not exist in this flow | `QA-DATA-TESTID-HANDOFF.md` 4.4 vs `ui/BankTransferConfirmationPage.spec.ts:96-97` |
| Proceed click sometimes does not register on dev (hydration timing); summary API can take 1-45 s | `BankTransferHelper.ts:25-34` |
| Security tests: server-side validation of bad amounts on the commit path not confirmed (only the stateless quote endpoint was observed); consumed-OTP replay gated by `RUN_BANKTRANSFER_SECURITY_DEBIT`; permission-denied needs a restricted account | `security/BankTransferSecurity.spec.ts:303-347,391-446` |
| Manual doc says OTP-requirement and limits are P1/P2 but nothing automated runs them | `docs/manual-test-cases/BankTransfer.md` Automated coverage note |
| Amount-field title (`amountFieldTitle`) no longer exists in the DOM; test only skips that half | `ui/BankTransferAmountPage.spec.ts:114-131` |

## Open questions

| Question | Why open |
|---|---|
| Exact commission/limit error wording (EN/AR) when an admin limit blocks a Cashout | Specs are skipped placeholders with comments only |
| Is the Confirmation step a separate route or the same URL? | Specs only check element presence, never `page.url()` per step |
| What does dev actually do after 3 wrong OTPs? | QA owner has not supplied the observed behaviour |
| Exact endpoint paths for confirm-summary and OTP-verify | Never hardcoded; only discovered at runtime |
| Is there a minimum / maximum Cashout amount? | Memory note says none configured on dev yet; Admin limit `min` field exists per `AdminLimitsApi.ts` |
| Does commission here follow "VAT = commission x 15%" or Topup's "VAT inside commission (15/115)"? | Happy-path spec asserts the former; Topup spec documents the latter (see Topup.md) |
