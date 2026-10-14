# BillQr - UI logic

Purpose: result screen after scanning a Bill QR in the Customer app - show the bill summary and a Pay button, or a handled error (EMI-5903: 500 on scan; EMI-5685: 500 when the maximum scan/pay attempts are exceeded). A Business-app counterpart (scan bill QR / enter bill number on Pay Bill) is covered by the PayBill module (BQR-03, BQR-04), see [PayBill.md](PayBill.md).
Route: `${BASE_URL}/customer/bills/qr-scan?qr=<encoded payload>` - a GUESS built from the ticket cURL (`BillQr/BillQrHelper.ts:11-19`). Not confirmed against any live build.
Who: payer using the Customer app (the repo has no other Customer-app coverage). No Business-portal role applies.
Status: MOCK ONLY. All data comes from `page.route('**/bills/qr/scan**')` mocks (`BillQrHelper.ts`). Every locator is "built directly from the ticket wording, not yet verified" (`BillQrPage.ts:3-7`).
Locator catalog: [BillQr.generated.md](BillQr.generated.md) (`BillQrPage`, 7 elements).

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| Scan result (loading) | `/customer/bills/qr-scan?qr=...` (guess) | `loadingIndicator` (`[class*=loading]`, `[class*=spinner]`, `[role=progressbar]`) | Main panel | Shown while the QR is decoded |
| Scan result (success) | same | `billSummarySection` (`[class*=bill-summary]` or `[class*=summary]`), `billAmountValue` (`[class*=amount]`), `payButton` (/^pay$/i) | Main panel | Bill summary with amount and Pay |
| Scan result (error) | same | `scanErrorMessage` (/internal server error\|500\|something went wrong/i), `backToFirstPageButton` (/back\|scan again\|try again/i) | Main panel | Handled error and way back |

## Forms

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| QR payload | Query string `qr` | URL parameter, not a field | Yes | Mocked as `mock-valid-bill-qr-payload` | `scanErrorMessage` | n/a |
| Mock bill summary | `BillQrSummary` { referenceNumber, amount, status APPROVED / PAID / EXPIRED } | Mock data only | - | Default mock: ref `QA-QR-BILL`, amount 90, APPROVED | - | n/a |

This screen has no input fields in the page object.

## Tables and lists

| Item | Detail | Source |
|---|---|---|
| Lists, filters, sorting, paging, empty state | None on this screen | - |

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| `payButton` | Result screen | Starts bill payment | Bill resolved | Not exercised by any spec |
| `backToFirstPageButton` | Error state | Returns to the first page / scan again | Visible after the max-attempts error (spec clicks it if visible within 5 s) | First page (not asserted) |

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| Valid QR (mock 200) | Bill summary visible; no scan error | `functional/BillQrScanning.spec.ts` BQR-01 |
| Scan returns 500 (pre-fix bug, EMI-5903) | Raw server-error text; the spec only checks the mock returns 500 | `BillQrScanning.spec.ts` BQR-01 regression guard |
| Max scan/pay attempts exceeded (mock 400 `MAX_ATTEMPTS_EXCEEDED`, "Maximum attempts exceeded") | Handled, no "internal server error"/500 text; user can go back to the first page | `BillQrHelper.ts:49-58`, BQR-02 |
| Max attempts, pre-fix (mock 500) | Raw 500 | BQR-02 regression guard |

## Business rules

| Rule | Detail | Source |
|---|---|---|
| Errors | Scan failures and max-attempt overruns must surface as handled errors, never a 500 | `BillQrScanning.spec.ts` header (EMI-5903, EMI-5685) |
| Bill states | Mock statuses APPROVED / PAID / EXPIRED; only Approved unpaid bills are payable elsewhere | `BillQrHelper.ts:25-29`, `EMI-Business-Rules-part1` E-Bill |
| QR integrity | Bill QR payloads are signed/EMVCo compliant (platform QR rule) | `B2B-Transactions.md` QR-15/QR-16 |
| Attempt limit | A maximum number of scan/pay attempts exists; the value is not stated anywhere in the repo | `BillQrHelper.ts:49` |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| Server error (bug) | "Internal Server Error" / 500 | `scanErrorMessage` |
| Max attempts (mock) | "Maximum attempts exceeded" (`messageCode: MAX_ATTEMPTS_EXCEEDED`) | API message; UI copy not captured |
| Generic | "something went wrong" | `scanErrorMessage` pattern |
| Arabic wording | Not captured | - |

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| Scan / decode bill QR | `GET .../api/v1/bills/qr/scan` | From the ticket repro cURL; mocked as `**/bills/qr/scan**` (`BillQrHelper.ts:33`). Not present in the swagger-generated service list (`ServiceApis/*.generated.spec.ts`), where QR paths are `/qr/scan` and `/qr/dynamic/scan` |
| Bill by reference | Not captured | - |

## Known gaps and product defects

| Item | Evidence |
|---|---|
| Mock-only; URL and endpoint are guesses; no live evidence | `BillQrHelper.ts:3-10` |
| "Regression guard" tests assert only that the mock returns 500, not app behaviour | `BillQrScanning.spec.ts:31-38,59-66` |
| BQR-01 assertion `billSummarySection.or(scanErrorMessage)` is satisfied by either outcome, then asserts the error is hidden | `BillQrScanning.spec.ts:27-29` |
| BQR-02 only checks no 500 text; does not prove the back button exists or works | `BillQrScanning.spec.ts:50-55` |
| `payButton` and `billAmountValue` are modelled but never asserted | `BillQrPage.ts` vs specs |
| Endpoint `/api/v1/bills/qr/scan` is absent from the swagger-derived lists | `ServiceApis/` search |
| No manual test cases exist for BQR-01/BQR-02 in `docs/manual-test-cases/` | grep result |

## Open questions

| Question | Why open |
|---|---|
| Does the Customer app route `/customer/bills/qr-scan` exist? | Guessed from ticket cURL |
| How many scan/pay attempts are allowed before the error? | Not stated |
| What is the exact user-facing text and button label on the max-attempts screen (EN/AR)? | Mock body and regex only |
| Is the Business-app scanner (PayBill) the same backend endpoint? | Never observed |
