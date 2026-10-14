# QRPayment - UI logic

Purpose: pay a wallet by scanning a QR (EMI-590), generate/pay Dynamic (amount) QR (EMI-3545), QR management/integrity (EMI-922). Two QR kinds: Dynamic/Amount QR (fixed, one-time, expiring amount) and Wallet QR (wallet only, payer types the amount).
Route: NOT CONFIRMED. The spec reaches the screen by clicking the home quick-action card "Generate a wallet QR / إنشاء رمز QR للمحفظة" (`quickActionReceivePaymentCard`, `Shared/HomepageQuickActionsPage.ts:27`; `QRPayment/functional/QRPaymentFlow.spec.ts:41-43`). The manual cases speak of "Scan QR" / "Pay via QR" instead (`B2B-Transactions.md` QR-01), so the entry point is unresolved.
Who: logged-in Business accounts; spec logs in with the first account in `data/topupData.json` that has a `companyNumber` (`QRPaymentFlow.spec.ts:25-26`).
Important: `QRPaymentPage.ts` states that no page object existed and "every locator below is a best-effort guess from the ticket AC wording" (`QRPaymentPage.ts:3-9`). Real camera input is not drivable, so "scan" is simulated by mocking the decode call (`QRPaymentHelper.ts`).
Locator catalog: [QRPayment.generated.md](QRPayment.generated.md).

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| Entry | Not confirmed | `scanQrEntry` (/scan qr\|pay via qr/ button or text "generate a wallet qr") | Home quick action / nav | Open the scanner |
| Mode choice | Not confirmed | `dynamicQrOption` (/dynamic qr\|amount qr/), `walletQrOption` (/wallet qr/) | Scanner screen | Choose QR type |
| Scanner | Not confirmed | `cameraView` (`video`, `[class*=camera]`, `[class*=scanner]`) | Full screen per manual QR-01 | Camera view |
| Post-scan | Not confirmed | `recipientNameMasked`, `amountInput`, `invalidQrError` | Main panel | Masked recipient + amount field |
| Confirm | Not confirmed | `proceedButton`, `confirmPayButton`, then OTP (`OtpPage`) | Main panel | Proceed, confirm, OTP |
| Result | Not confirmed | `successHeading`, `toastMessage` | Main panel / toast | Outcome |
| Generate Dynamic QR (merchant side) | Not confirmed | `generateDynamicQrButton`, `generateAmountInput`, `generateReferenceInput`, `generatedQrImage` | Not confirmed | Create a fixed-amount QR |

## Forms

### Post-scan payment form

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Amount | `amountInput` (testid `amount-input`, `#input_set_amount`, or placeholder `0.00`) | Text | Yes | Dynamic QR: pre-filled with the QR amount and DISABLED. Wallet QR: editable, accepts manual entry (spec types 30, 75). Over balance: blocked before OTP (spec enters 999999999) | Toast / text matching /insufficient/ | Wallet QR only |
| Recipient | `recipientNameMasked` | Read-only | - | Masked wallet/merchant name | - | After scan |
| Proceed | `proceedButton` (/proceed/) | Button | - | Spec clicks after entering amount | - | After scan, amount valid |
| Confirm / Pay | `confirmPayButton` (/^pay$\|confirm/) | Button | - | Not used by current specs | - | Not confirmed |
| OTP | `OtpPage` | 6 boxes | If enabled | Filled only if `otp.isVisible()` | - | After proceed |

### Generate Dynamic QR (merchant)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Amount | `generateAmountInput` (label /amount/) | Input | Yes | Fixed amount baked into QR | Not captured | Not confirmed |
| Reference | `generateReferenceInput` (label /reference/) | Input | Yes (per manual QR-10: amount, reference, expiry) | Unique reference | Not captured | Not confirmed |
| Generate | `generateDynamicQrButton` (/generate qr\|create dynamic qr/) | Button | - | QR encodes amount, unique reference, one-time-use flag, TTL | - | Not confirmed |

No spec drives the generate form; `generateDynamicQr(amount, reference)` exists in the page object only.

## Tables and lists

| Item | Detail | Source |
|---|---|---|
| Lists, filters, sorting, paging | None on this screen | - |
| QR image | `generatedQrImage` (`img[alt*=QR]` or `canvas[class*=qr]`) | `QRPaymentPage.ts:63` |

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| `scanQrEntry` | Entry | Opens scanner | Visible | Camera / mode choice |
| `dynamicQrOption` | Scanner | Selects Dynamic QR mode (`selectDynamicQrMode`) | Visible | Post-scan screen expects locked amount |
| `walletQrOption` | Scanner | Selects Wallet QR mode (`selectWalletQrMode`) | Visible | Post-scan screen expects editable amount |
| `proceedButton` | Post-scan | Validates balance, goes to OTP/confirm | Amount entered | OTP or insufficient-funds message |
| `confirmPayButton` | Post-scan | Confirms payment | Not confirmed | Success |
| `generateDynamicQrButton` | Generate screen | Creates QR | Not confirmed | `generatedQrImage` |

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| Dynamic QR scanned | Amount populated with QR amount and disabled | `QRPaymentFlow.spec.ts:46-56`, QR-02/QR-04 |
| Wallet QR scanned | Amount editable | `QRPaymentFlow.spec.ts:59-68`, QR-03 |
| Expired / already-used QR (mock decode 410, "Invalid or Expired QR") | Error "Invalid or Expired QR"; no payment attempted | `QRPaymentHelper.ts:36-41`, QR-12/QR-13 |
| Tampered QR (mock decode 400, "QR signature validation failed") | Generic invalid-QR error, payment blocked | `QRPaymentHelper.ts:43-48`, QR-15 |
| Amount > payer balance | Insufficient-funds message before OTP; Dynamic QR stays valid until its TTL | QR-05, QR-14 |
| Real camera needed | Cannot be driven by Playwright; decode call is mocked instead | `QRPaymentHelper.ts:3-10` |

## Business rules

| Rule | Detail | Source |
|---|---|---|
| Amount QR | Pre-fills and disables the amount; customer cannot change it | `EMI-Business-Rules-part1-core-modules.md:Merchant payment (EMI-2197)` |
| Wallet QR | Identifies wallet only; amount editable | same |
| One flow | Both converge: masked merchant/wallet info -> amount -> balance validation -> OTP -> payment -> commission applied automatically -> both parties notified | same |
| Dynamic QR | One-time use, TTL, unique reference; invalidated after successful use; expired QR rejected | manual QR-10/QR-12/QR-13 |
| Integrity | Payload signed/encrypted server-side; EMVCo compliant | manual QR-15/QR-16 |
| Commission | Fixed or percentage tier, default vs per-account schema; payer pays on top, payee receives less | `functional/QRPaymentCommission.spec.ts` QR-CM01..18 (skipped) |
| Wallet balance limits | Payer min-balance floor (Merchant), payee max-balance ceiling (Biller), risk level Low/Medium | `functional/QRPaymentWalletLimits.spec.ts` QR-WB01..08 (skipped) |
| Transaction limits | Daily/weekly/monthly amount + count; Web and App platforms | `functional/QRPaymentTransactionLimits.spec.ts` QR-TL01..12 (skipped) |
| OTP | Required to confirm; wrong OTP allows resend | manual QR-06/QR-07 |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| Invalid / expired / used QR | "Invalid or Expired QR" (mock body 410) | `invalidQrError` (/invalid or expired qr/) |
| Tampered QR | "QR signature validation failed" (mock body 400); spec looks for /signature\|invalid qr/ | Page text |
| Over balance | /insufficient/ text or `toastMessage` (testid `toast-message`) | Toast |
| Success | /payment (successful\|complete)/ heading | `successHeading` |
| Arabic wording | Not captured | - |

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| Decode / scan (as mocked by spec) | `**/qr/**/decode` (guessed pattern) | `QRPaymentHelper.ts:25-48`; does not match any swagger path below |
| Real scan endpoints | `GET /qr/scan`, `GET /qr/dynamic/scan` (EbillService qr-controller; `/qr/scan` also in WalletService) | `ServiceApis/EbillService.generated.spec.ts:73-74`, `WalletService.generated.spec.ts:64` (swagger list, not observed) |
| Generate Dynamic QR | `POST /qr/dynamic` | `EbillService.generated.spec.ts:46` |
| Regenerate wallet QR | `PUT /qr/regenerate` | `WalletService.generated.spec.ts:36` |
| Payment | `POST /api/v1/transactions/wallet-payment-draft` | `CloseLoopOrchestrator.generated.spec.ts:51` (swagger list; link to this UI not observed) |

## Known gaps and product defects

| Item | Evidence |
|---|---|
| Every locator is a guess; screen not in the testid handoff | `QRPaymentPage.ts:3-9`, `QA-DATA-TESTID-HANDOFF.md` section 5 |
| Entry via "Generate a wallet QR" card contradicts the scan flow in the manual cases | `QRPaymentFlow.spec.ts:41-43` vs `B2B-Transactions.md` QR-01 |
| Mock path `**/qr/**/decode` does not match the swagger paths `/qr/scan` and `/qr/dynamic/scan`, so the mocks may never fire | `QRPaymentHelper.ts:25` vs `EbillService.generated.spec.ts:73-74` |
| QR-08 payment test never asserts balances or commission; QR-14 (QR stays valid after insufficient funds), QR-06/QR-07 OTP, QR-09 commission, QR-10/QR-11 generation, QR-16/QR-17 EMVCo parsing are not automated | `QRPaymentFlow.spec.ts` vs `B2B-Transactions.md` section E |
| Commission, wallet limits and transaction limits suites are all `test.skip` | `functional/QRPayment{Commission,WalletLimits,TransactionLimits}.spec.ts` |
| Weekly period used in QR-TL cases, but admin limits API has only HOUR/DAY/MONTH/YEAR | `ServiceApis` / `pageElements/Shared/AdminLimitsApi.ts:14-17` |
| Login data taken from `topupData.json` rather than a QR-specific account | `QRPaymentFlow.spec.ts:25-26` |

## Open questions

| Question | Why open |
|---|---|
| What is the real route and entry point for scanning on the Business web app? | Only a quick-action card whose label says "generate" is used |
| Does the Business web app even have a camera scanner? | Never confirmed live |
| UI copy (EN/AR) for post-scan screen and errors | Locators are guesses |
| Where does a merchant generate a Dynamic QR and with what fields (expiry too)? | Manual QR-10 vs page object (amount + reference only) |
| Is `proceedButton` followed by a separate confirm step before OTP? | Spec only clicks Proceed then OTP |
