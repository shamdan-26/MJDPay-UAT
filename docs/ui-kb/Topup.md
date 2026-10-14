# Topup - UI logic

Purpose: add money to the wallet by card (MADA / VISA / MASTER) through the HyperPay gateway. Flow: pick method + amount -> Proceed -> Summary -> Next (sends OTP) -> OTP -> card entry in a gateway popup -> result. A SADAD bill top-up page object exists but the feature is not live (see Open questions).
Route: `/business/main/transfer/top-up` (sidebar "Topup" / "Add Funds", home quick action "Add money via card", `Topup/functional/TopupNavigation.spec.ts`). Gateway popup: `/business/hyperpay/top-up?checkoutId=...&paymentMethod=<VISA|MADA|MASTER>` (`Topup/ui/TopupGatewayUI.spec.ts:43-48`).
Who: logged-in Business accounts. Functional specs use the Biller account (wallet type Biller, transaction type "Biller Bank Cashin", code 102003); a Merchant row "Merchant Cashin" also exists (`TopupHelper.ts:26-54,270-276`, `TopupLimitsHelper.ts`).
Locator catalog: [Topup.generated.md](Topup.generated.md) (`TopupPage`, `TopupSadadPage`). OTP boxes: `OtpPage` in [Shared.generated.md](Shared.generated.md).

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| 1 Form | `/business/main/transfer/top-up` | Hero (`pageTitle` "Top up / شحن الرصيد", `pageSubtitle`) | Top | Title + "Add funds to your business wallet using a card or wallet supported in Saudi Arabia" (`docs/manual-test-cases/Topup.md` TUP-03) |
| 1 | same | Balance card (`balanceCardLabel`, `balanceAmount`, `balanceWalletCode`, `balanceQrButton`, `balanceSettingsButton`) | Under hero | Current balance (format `0.00`), wallet code (pattern `[A-Z]{3}-[A-Z0-9-]+`) (`ui/TopupFormUI.spec.ts:136-141`) |
| 1 | same | Payment methods (`paymentMethodsLabel`, `paymentMethodsGroup`, `madaOption`, `visaOption`, `masterOption`, `paymentMethodLogos`) | Middle | Single-select radio cards with a logo each |
| 1 | same | Amount (`inputAmount`, `amountCurrencyIcon`, `quickAmountLabel`, `presetAmountChips`, `disclaimerText`, `proceedButton`) | Below methods | Amount, chips, disclaimer, Proceed |
| 2 Summary | same URL | Summary rows (`summaryRows`, `summaryMoneyAmounts`), `summaryCancelButton`, `summaryNextButton` | Main panel (inline) or modal variant | Heading "ملخص إضافة الأموال / Top-up Summary"; balance card stays (`ui/TopupSummaryUI.spec.ts:50-100`) |
| 3 OTP | same URL | Inline OTP widget (6 boxes, countdown, Resend, Cancel) | Main panel | Mini summary above boxes (labels all caps: "MERCHANT TOP UP", "TOTAL AMOUNT TO BE RECEIVED") (`Topup.md` TUP-22) |
| 4 Gateway popup | `/business/hyperpay/top-up` (new window) | Card fields: `cardNumberInput` (iframe `card.number`), `expiryDateInput`, `cardHolderInput`, `cvvInput` (iframe `card.cvv`), `payNowButton`; 3DS iframe `card_*` for MADA/MASTER | Separate window | Enter card; VISA submit via `hyperpaySubmitButton`, MADA/MASTER via `cardSchemeSubmitButton` |
| 5 Result | `/business/main/transfer/top-up` | `resultContainer` (`section.mp-sec--center`), `resultIcon` (`is-success` / `is-pending` / `is-failed`), `resultTitle`, `resultDescription`, `resultOkButton` | Main panel | Success / Pending / Failed outcome |
| Shell (all steps) | any | Sidebar (Add Funds active), header, profile dropdown | Around page | Sidebar items incl. disabled "SADAD" and "International Transfer" (coming soon) (`ui/TopupShellUI.spec.ts`) |

## Forms

### Top-up form

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Payment method | `madaOption` / `visaOption` / `masterOption` (`paymentMethodOptions`) | Radio cards (`aria-checked`) | Yes | None selected by default; single-select; selecting another clears the first (`ui/TopupFormUI.spec.ts:84-210`) | none | Always |
| Amount | `inputAmount` (testid `amount-input`, `#input_set_amount`, placeholder `0.00`) | Text (decimal, not `type=number`, no `maxlength`) | Yes | Digits + up to 2 decimals. `-10` becomes `10` (sign stripped). `0` rejected. Letters/symbols rejected. `10.555` becomes `10.55`. Paste is sanitised the same way. A 9-digit value is silently cut to 7 digits (`9999999`). Arabic-Indic digits are kept as typed (known defect) (`ui/TopupFormUI.spec.ts:252-310`, `Topup.md` TUP-13) | "Amount should be more than 0" is documented for `0` but not shown on dev (known bug, test skipped) (`ui/TopupFormUI.spec.ts:91-100`) | Always |
| Preset chips | `presetAmountChips` (`.mp-amount-chip`) | Buttons 500, 1000, 2000, 5000, 10000 | No | Click fills amount; manual edit replaces it; all enabled on a fresh form (`ui/TopupFormUI.spec.ts:175-223`) | none | Always |
| Disclaimer | `disclaimerText` | Static text | - | Live copy: "Disclaimer: We at MJD Pay do not store any of your card information." | - | Always |
| Proceed | `proceedButton` (testid `topup-proceed-btn`) | Button | - | Disabled on a fresh form, with only a method, or with only an amount; enabled with method + valid amount (`ui/TopupFormUI.spec.ts:225-250`) | - | Method selected and amount valid and not blocked by admin limits |

### OTP form

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| OTP digits | `OtpPage.inputs` | 6 boxes, one digit each | Yes (only if Top-up OTP is enabled, operationCode 102) | Non-numeric rejected; focus auto-advances; auto-submits on the 6th digit (`functional/TopupOtpFlow.spec.ts:39-75`) | `OtpPage.errorMessage`; wrong code does not advance to the gateway | After Summary Next |
| Verify | `OtpPage.verifyButton` (testid `topup-otp-verify-btn`) | Button | - | Disabled while boxes empty or partial | - | 6 digits |
| Resend | `OtpPage.resendButton` (`topup-otp-resend-btn`) | Link | - | Disabled while countdown runs (~60 s start); enabled at 0, restarts timer, does NOT clear typed digits (`TopupOtpFlow.spec.ts:76-125`) | - | Countdown = 0 |
| Cancel | `OtpPage.cancelButton` (`topup-otp-cancel-btn`) | Button | - | Aborts top-up, returns to form, balance unchanged | - | Always |

### Gateway card form (third-party, popup)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Card number | `cardNumberInput` | Input inside gateway iframe `card.number` (host `eu-test.oppwa.com`) | Yes | Never reaches MJD Pay DOM/storage (`functional/TopupSecurity.spec.ts:33-100`) | Gateway-owned | Popup open |
| Expiry | `expiryDateInput` (`MM / YY` or `شهر / سنة`) | Input on popup page | Yes | - | Gateway-owned | Popup open |
| Card holder | `cardHolderInput` | Input | Yes | - | Gateway-owned | Popup open |
| CVV | `cvvInput` | Input inside iframe `card.cvv` | Yes | - | Gateway-owned | Popup open |
| Pay Now | `payNowButton` ("pay now" / "إدفع الأن") | Button | - | Disabled until fields complete (exact condition not confirmed, `Topup.md` TUP-32) | - | Fields complete |
| Simulator outcome | `selectGatewayReturnCode(value)` / `select3dsOutcome(value)` | Dropdowns on test simulator | - | VISA codes: 1 Success, 2 User canceled, 3 Pending, 4 Error limit exceeded, 5 Error too many tries. 3DS (MADA/MASTER): Y Approve, N Decline, D Decoupled Fallback, U Technical error, X Cancel (`TopupPage.ts:355-383`) | - | UAT/dev simulator only |

## Tables and lists

| Item | Detail | Source |
|---|---|---|
| Summary rows (key/value, not a table) | Transaction Type, Payment Method, Original Amount, commission, VAT, Total. Exactly four `.money-amount` values (original, commission, VAT, total), formatted `0.00` | `ui/TopupSummaryUI.spec.ts:35-160`, `TopupHelper.ts:260-267` |
| Payment method group | 3 radios (MADA, VISA, MASTER), each with a logo (img or svg) | `ui/TopupFormUI.spec.ts:143-167` |
| Transactions page (other screen) | Last topup row; SQL `emi_transaction.transaction_log` shows PENDING (reserve) then SUCCESS or FAILED (append-only) | `functional/TopupHappyPath.spec.ts`, `functional/TopupNegative.spec.ts:170-190` |
| SADAD "My Bills" list (not live) | `myBillsTab`, `billRows`; columns documented as reference, amount, creation date, status Pending/Paid/Expired | `pageElements/Topup/TopupSadadPage.ts`, `B2B-Transactions.md` TU-11 |
| Filters / sorting / paging | Not applicable | - |

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| `proceedButton` | Form | Starts payment summary | See form rules; blocked by admin min/limits (returns 'blocked-at-amount' or 'blocked-at-proceed' in `attemptTopup`) | Summary |
| `summaryNextButton` (testids `topup-summary-next-btn` / `topup-summary-modal-next-btn`) | Summary | Shows spinner "Loading" and sends the OTP (`POST /api/v1/payments`), or opens the gateway popup directly if OTP is off | Visible after summary settles | OTP, or gateway popup |
| `summaryCancelButton` (`topup-summary-cancel-btn` / `topup-summary-modal-cancel-btn`) | Summary | Back to form, no side effects; re-Proceed shows the same amount | Always | Form |
| `OtpPage.cancelButton` | OTP | Abort | Always | Form |
| `payNowButton` / `hyperpaySubmitButton` / `cardSchemeSubmitButton` | Gateway popup | Submit card; popup closes on completion | Fields complete | Result screen |
| `resultOkButton` (testid `topup-result-ok-btn`) | Result | Acknowledge | After any result | Back to form / home |
| `balanceQrButton` / `balanceSettingsButton` | Balance card | Generate wallet QR / wallet settings (aria-labels) | Always | Only presence asserted |
| Sidebar `SADAD`, `International Transfer` | Sidebar | Disabled "coming soon" items, no href, ignore click and keyboard | Always | Stay on page (`ui/TopupShellUI.spec.ts:118-146`) |
| Browser Back on Summary | Browser | Returns to homepage | - | Home (`ui/TopupSummaryUI.spec.ts:219`) |

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| OTP configured off (operationCode 102) | After Summary Next the gateway popup opens directly; OTP specs skip | `TopupHelper.ts:142-146,162` |
| Step order on dev | Amount -> Proceed -> Summary -> Next (sends OTP) -> OTP verify -> THEN gateway popup -> card -> Pay Now -> result (OTP BEFORE card entry) | `TopupHelper.ts:36-41`, `Topup.md` findings |
| Pop-ups blocked | After OTP the app returns to the form with banner "Please allow pop-ups to continue the payment." | `Topup.md` TUP-30 |
| Result = success | Title "successful payment / دفعة ناجحة", description "processed successfully / تمت معالجة دفعتك بنجاح"; wallet credited by exact amount (minus commission if any) | `ui/TopupSuccessUI.spec.ts:33-35` |
| Result = failed (return code 2, 4, 5) | Title "Payment Failed / فشلت الدفعة", description "unsuccessful / غير ناجحة"; balance unchanged; txn log PENDING then FAILED exactly once | `functional/TopupNegative.spec.ts:137-270`, `TopupFailureUI.spec.ts:38-42` |
| Result = pending (return code 3) | Title "Payment Pending Confirmation / الدفعة قيد التأكيد"; balance unchanged until resolved | `ui/TopupPendingUI.spec.ts:12,54-57` |
| Amount below admin minimum | Proceed stays disabled (blocked at amount), no Summary/OTP/payment | `functional/TopupMinAmount.spec.ts` TUA-B01 |
| Amount over admin limit (hour/day/month/year) or count exhausted (count 0 = top-up disabled) | Blocked at Proceed, no Summary, no OTP, no commission preview | `functional/TopupLimits.spec.ts`, `TopupLimitsCommissionMatrix.spec.ts` TUA-D04/D18 |
| Credit would push wallet over max-balance ceiling | Blocked before gateway; checked on balance + NET credit | `functional/TopupLimits.spec.ts` TUA-C02..C05, `Topup-Admin-Config-Matrix.md` assumption 3 |
| Destination wallet at limit | Backend error `COLLECTION_DESTINATION_WALLET_LIMITATION_EXCEEDED` on `POST /api/v1/payments` (seen on accounts A3713 and Q9557) | `TopupHelper.ts:26-34`, `Topup-Admin-Config-Matrix.md:78` |
| Unauthenticated direct URL | Redirect to login | `functional/TopupSecurity.spec.ts:67` |
| Arabic default | `html[dir=rtl]`; labels bilingual | `ui/TopupFormUI.spec.ts:124` |
| Phone width | Hamburger menu appears; hidden at desktop | `ui/TopupShellUI.spec.ts:165-176` |

## Business rules

| Rule | Detail | Source |
|---|---|---|
| Methods | MADA, VISA, MASTER via HyperPay; currency SAR; amount up to 7 digits + 2 decimals, positive only | `EMI-Business-Rules-part1-core-modules.md:53-57`, `Topup.md` TUP-13 |
| Other rails | VIBAN (virtual IBAN credited by ANB polling) and SADAD exist in the business rules; their automation was archived | `EMI-Business-Rules-part1:53-57`, `Topup.md` header |
| OTP | Admin-configurable (operationCode 102); a minimum or limit failure must be rejected BEFORE an OTP is sent | `TopupHelper.ts:142-146`, `Topup-Admin-Config-Matrix.md` TUA-A18/A19 |
| Idempotency | Each `POST /api/v1/payments` carries a fresh `idempotencyKey` UUID header | `functional/TopupSecurity.spec.ts:119-161` |
| PCI | Card number and CVV only inside gateway iframes on `eu-test.oppwa.com`; card number never in localStorage/sessionStorage | `functional/TopupSecurity.spec.ts:33-100` |
| Commission lookup | Default Commission entry for the account type (Biller "Biller Bank Cashin" or Merchant "Merchant Cashin"), platform WEB; an APP-only row does not affect a Web top-up; account-level override wins over default | `TopupHelper.ts:270-276`, `functional/TopupCommission*.spec.ts`, `TopupLimitsCommissionMatrix.spec.ts` TUA-D21..D24 |
| Commission/VAT math | Business rule agreed 2026-10-13: Total = amount - commission. VAT is INSIDE the commission: VAT = commission x 15/115. Commission and VAT rounded half-up to 2 decimals. Amount no tier covers = commission 0 | `functional/TopupCommission.spec.ts:27-37` |
| Tier boundaries | Commission applies at tier min and max inclusive; none just below min or above max | `TopupCommissionMerchant.spec.ts` TU-CM19..23 |
| Min amount | The `min` field of the admin Transaction-limit row (type x risk tier x platform), judged on gross amount (assumption still marked OPEN) | `pageElements/Shared/AdminLimitsApi.ts:14-17`, `Topup-Admin-Config-Matrix.md` 0.3 |
| Periods | Admin limits exist for HOUR / DAY / MONTH / YEAR amount and count; no WEEK, no per-transaction max; hourly is the tightest | `AdminLimitsApi.ts:14-17`, `TopupLimits.spec.ts:118` |
| Check order | Format -> min -> count -> amount -> wallet ceiling -> commission calc (Summary) -> OTP -> gateway; min message wins over limit message | `Topup-Admin-Config-Matrix.md` 0.3 item 4; `TopupLimitsCommissionMatrix.spec.ts` TUA-E01 |
| Limit amount basis | Amount limits judged on gross entered amount; wallet ceiling on balance + net credit | `Topup-Admin-Config-Matrix.md` 0.3 items 2-3 |
| Quota | Only SUCCESS consumes amount/count quota (assumption marked OPEN); failed/pending must not | `Topup-Admin-Config-Matrix.md` 0.3 item 5, TUA-F02 |
| Server-side enforcement | Limits and minimum enforced by the server, not only the UI | `Topup-Admin-Config-Matrix.md` 0.3 item 6 |
| Limit windows | Calendar windows in KSA time (UTC+3) | `Topup-Admin-Config-Matrix.md` 0.3 item 8 |
| Ledger | Transaction log is append-only: PENDING (reserve) then SUCCESS (settle) or FAILED (release); exactly one terminal row | `functional/TopupNegative.spec.ts:180-190` |
| Credit | Success credits wallet with exactly the entered amount (no commission) or net of commission when a tier applies | `functional/TopupHappyPath.spec.ts`, `TopupPage.checkBalanceAfterTopupNetOfCommission` |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| Page title | "Top up" / "شحن الرصيد" | `pageTitle` |
| Balance label | "Current balance" / "الرصيد الحالي" | `balanceCardLabel` |
| Summary heading | "Top-up Summary" / "ملخص إضافة الأموال" | `pageTitle` on Summary |
| Summary subtitle (Arabic) | contains "التفاصيل" (not "التفصيل") | `pageSubtitle` (`ui/TopupSummaryUI.spec.ts:164-168`) |
| Summary labels | Transaction Type / نوع العملية; Payment Method / طريقة الدفع; Original Amount / المبلغ الأصلي; commission / العمولة; VAT / ضريبة القيمة المضافة; Total / "Total amount to be sent" (code) or "Total Amount to be Received" (live) / إجمالي المبلغ المراد استلامه | `TopupHelper.ts:260-267`, `Topup.md` TUP-17 |
| Zero amount | "Amount should be more than 0" (documented; not shown on dev) | Inline under amount |
| OTP subtitle | "A code has been sent to you, in order to continue with the top up process." | OTP step |
| Pop-up blocked | "Please allow pop-ups to continue the payment." | Banner on form |
| Success | "successful payment / دفعة ناجحة"; "...processed successfully / تمت معالجة دفعتك بنجاح" (spec matches the fragment only) | Result |
| Failed | "Payment Failed / فشلت الدفعة"; "unsuccessful / غير ناجحة"; also Arabic "لم تتم عملية الدفع" or "تعذر إتمام الدفع" | Result |
| Pending | "Payment Pending Confirmation / الدفعة قيد التأكيد" | Result |
| OK button | "OK / موافق" | `resultOkButton` |
| Minimum / limit messages | Not captured (TUA-B07 skipped) | Inline under amount (expected) |

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| Open Summary | `GET /api/v1/payments/summary/open` | Unauthenticated request does not return 200 (`api/TopupAPI.spec.ts`) |
| Summary Next | `POST /api/v1/payments` | 201 on success, initiates OTP; carries `idempotencyKey` header; unauthenticated does not return 201 |
| OTP verify | `POST /api/v1/payments/verify` | Wrong code does not return 201 (`194857` used; all-zeros OTP is accepted on dev) |
| Balance | `GET /api/v1/wallets/balance` | Unauthenticated gives 404 on this gateway (not 401/403) |
| Gateway checkout | `POST /payment/checkout-id`, `GET /payment/{checkoutId}/status`, `GET /payment/view` (hyperpay-controller) | Swagger-generated list `ServiceApis/EmiExternalIntegration.generated.spec.ts:42,63-64`; not observed from the UI specs |
| Gateway popup | `/business/hyperpay/top-up?checkoutId&paymentMethod` | Hosted by HyperPay (`eu-test.oppwa.com` iframes) |
| Admin limits | `GET/PUT {gateway}/api/v1/limitations/{admin-wallet-limitations,transaction-limitations,transaction-count-limitations}`; lookups `/api/v1/transaction-types`, `/risk-levels`, `/platform-type`, `/wallet-types` | `AdminLimitsApi.ts:8-12`; PUT body field names unverified |
| Ledger check | SQL `emi_transaction.transaction_log`; Mongo | `TopupHappyPath.spec.ts` |

## Known gaps and product defects

| Item | Evidence |
|---|---|
| Zero amount shows no inline error (field silently emptied) | `ui/TopupFormUI.spec.ts:91-100` |
| Arabic-Indic digits kept as typed | `ui/TopupFormUI.spec.ts:283-294` |
| Amount field has no accessible name; notification bell has no aria-label | `ui/TopupFormUI.spec.ts:116-119`, `ui/TopupShellUI.spec.ts:177-182` |
| 9-digit amount silently truncated to 7 digits with no message | `Topup.md` TUP-13 |
| Summary total label differs: code/EN "Total amount to be sent" vs live "Total Amount to be Received"; OTP mini-summary is all caps | `Topup.md` TUP-17, TUP-22; `TopupHelper.ts:266` |
| Disclaimer copy on dev differs from older locator ("powered by Hyper Pay") | `Topup.md` findings, TUP-19 |
| Second wrong OTP on this screen hangs the page for minutes | `functional/TopupSecurity.spec.ts:109-117` (comment) |
| Biller account wallet fills up and hits `COLLECTION_DESTINATION_WALLET_LIMITATION_EXCEEDED`; UI specs moved to account W1550 | `TopupHelper.ts:48-55` |
| Commission/VAT shown as 0 in manual runs; non-zero tiers only covered by automated TU-CM specs | `Topup.md` findings |
| Matrix doc assumes a WEEK period and a TXN_MAX; live API has neither | `Topup-Admin-Config-Matrix.md` vs `AdminLimitsApi.ts:14-17` |
| Many TUA cases are `test.skip` ("Not automated yet"); VIBAN/SADAD automation archived | `TopupMinAmount.spec.ts`, `TopupLimits.spec.ts:182`, `Topup.md` cross-references |
| `TopupSadadPage` has no matching UI: sidebar SADAD is disabled "coming soon" and no testids exist | `ui/TopupShellUI.spec.ts:118-123`, `TopupSadadPage.ts` header |
| Whether Hyperpay gateway popup requires pop-ups allowed in the test browser is environment dependent | `Topup.md` TUP-30 |

## Open questions

| Question | Why open |
|---|---|
| Is the minimum judged on gross or net amount? | Marked `[CONFIRM-1]` OPEN in the matrix |
| Do failed/pending top-ups consume quota? | Marked `[CONFIRM-5]` OPEN |
| When is the Summary inline versus modal? | TUP-18 undocumented |
| Wording of minimum-amount and limit-exceeded messages (EN/AR) | TUA-B07 and TUA-C18 skipped / "record on first run" |
| Does a failed card (return codes 4, 5) map to the same screen as code 2? | `TopupPage.ts:362` says 4/5 not confirmed (later specs treat them as failure) |
| Exact Pay Now enable condition | TUP-32 |
| SADAD: route, fields, testids | Feature is "coming soon"; EMI-3564 status To Do at authoring time |
| Why does this account sometimes skip the card popup and go straight to OTP? | Observed 2026-09-12 in `BankTransferHelper.ts:90-124`, cause unconfirmed |
