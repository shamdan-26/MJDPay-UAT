# PaymentLinks - UI logic

Purpose: a payment link or QR lets a payer (guest or signed-in) pay a bill or send money to a wallet through a public page, without opening the Business portal. Two sides: the Business side creates and manages links; the Customer/guest side resolves the link and pays (EMI-5463, EMI-5791-5794, EMI-5774/5775/5814, guest flow EMI-5424/5446/5523/5551/5640/5653/5860, bill-link bugs EMI-5684 and others).
Routes:
- Business side: `/business/main/payment-links/manage` (sidebar "Payment Links", `Topup/ui/TopupShellUI.spec.ts:67`; header link `a[href*="/business/main/payment-links"]`, `Shared/DashboardPage.ts:77`).
- Customer/guest side: `${BASE_URL}/customer/payment-link/<token>` - a GUESS (`PaymentLinks/PaymentLinkHelper.ts:19-21`); the helper says every URL and endpoint is "best-effort guess ... reconcile against the real app on first live run".
Who: Biller/Merchant creates links; payer is a guest or Customer-app user.
Whole module status: MOCK ONLY. All specs use `page.route()` mocks (`PaymentLinkHelper.ts:6-15`); nothing here is confirmed against a live build. The Business-side manage page has NO page object and no spec.
Locator catalog: [PaymentLinks.generated.md](PaymentLinks.generated.md) (`PaymentLinkPage`, all best-effort guesses; the Routes line in that file is a generator artifact).

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| Manage links (Business) | `/business/main/payment-links/manage` | Not modelled | Sidebar entry | List/manage links (contents unknown) |
| Create/share link (Biller) | Not confirmed | `createPaymentLinkButton`, `generatedLinkUrl` (testid `payment-link-url`), `qrCodeImage`, `copyLinkButton`, `shareLinkButton`, `downloadQrButton` | Not confirmed | Generate link and QR, copy/share/download (EMI-5474, EMI-5527) |
| Link resolution (guest) | `/customer/payment-link/<token>` (guess) | `loadingIndicator`, `invalidLinkError`, `summarySection`, `linkTypeLabel`, `amountValue` | Main panel | Resolve token and show sanitised summary |
| Payer info (old flow) | same | `payerInfoSection`, `mobileInput`, `emailInput`, `nameInput`, `nationalIdInput` | Main panel | Retired in newer builds (EMI-5791-5794) |
| Payment method | same | `paymentMethodGroup`, `paymentMethodOptions` | Main panel | Choose Mada / Visa / Mastercard / Apple Pay per mock |
| Amount (wallet links) | same | `amountInput`, `amountError` | Main panel | Payer enters amount within min/max |
| Continue / pay | same | `continueButton` (/^(continue\|next\|pay)$/) | Main panel | Proceed to OTP/payment |
| Result | same | `resultHeading`, `resultSuccessIcon`, `resultFailureIcon` | Main panel | Outcome |

## Forms

### Payer info (legacy, pre EMI-5791-5794)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Mobile | `mobileInput` | Textbox | Yes in old flow | Validated (spec TC-PL-004) | Not captured | Old flow only |
| Email | `emailInput` | Textbox | Yes in old flow | Validated | Not captured | Old flow only |
| Name | `nameInput` | Textbox | Yes in old flow | Validated | Not captured | Old flow only |
| National ID | `nationalIdInput` | Textbox | Yes in old flow | Validated | Not captured | Old flow only |

New behaviour (EMI-5791-5794): checkout info is resolved server-side from the link owner's profile; the payer is NOT asked for info; an incomplete owner profile gives an error (`incompleteProfileError`). Specs skip the old-flow cases when the form is absent (`PaymentLinkResolution.spec.ts:57,109,138`).

### Wallet-link amount

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Amount | `amountInput` (textbox or spinbutton named "amount") | Number | Yes for wallet links | Mock summary `minAmount` 10, `maxAmount` 5000; below min and above max are rejected (TC-PL-005/006) | `amountError` (/minimum\|maximum\|amount (must\|should)/) | Wallet link |

### Payment method

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Method | `paymentMethodOptions` (radios in `paymentMethodGroup`) | Radio group | Yes | Must offer every configured method, not only Mada (EMI-5830); mock lists MADA, VISA, MASTERCARD, APPLE_PAY | - | Group shown |

## Tables and lists

| Item | Detail | Source |
|---|---|---|
| Links list on `/payment-links/manage` | Not modelled; columns/filters unknown. API list endpoints exist (see touchpoints) | - |
| Payment method list | Radios inside `paymentMethodGroup` | `PaymentLinkPage.ts:69,83` |
| Transactions list | After settle, a payment-link transaction must appear in the payer's list with status SETTLED or SUCCESS (EMI-5967, mocked) | `functional/BillPaymentLinkBugs.spec.ts:270-310` |

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| `createPaymentLinkButton` (/create payment link\|share payment link\|generate link/) | Biller bill/wallet screen | Creates link | Bill must be Approved and unpaid (create is not offered for a Paid bill, rejected `BILL_NOT_APPROVED` for unapproved) | `generatedLinkUrl` + QR |
| `copyLinkButton`, `shareLinkButton`, `downloadQrButton` | Share panel | Copy / share / download QR | After creation | - |
| `continueButton` | Guest page | Next/pay | Info + method valid | OTP / result |
| Cancel button on card payment page | Card page | Cancel returns a result state, must not spin forever (EMI-5774/5775/5814; spec skips if not shown) | - | Result |
| `incompleteProfileError` | Guest page | Error when owner profile lacks info | Mock `ownerProfileComplete: false` | - |

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| Valid bill token | Summary type "Bill Payment"; amount fixed (mock 250) | `PaymentLinkHelper.ts:28-33`, `data/paymentLinkMocks.json` |
| Valid wallet token | Summary type "Wallet Transfer"; amount editable within 10-5000 (mock) | same |
| Invalid / expired / disabled token | Invalid/expired message; no summary, no JWT (404 mock "Link is invalid, expired, or disabled") | `PaymentLinkHelper.ts:44-50` |
| Disabled or already-paid bill link | Rejected with "invalid" or "already paid" before payment | `GuestWalletPayment.spec.ts:69-79` |
| Link owner profile incomplete | Clear error (`incompleteProfileError`) | `PaymentLinkPayerInfoRemoval.spec.ts:43` |
| Older-format link | Still resolves without erroring | TC-PL-012 |
| OTP disabled for link | OTP step skipped (mock `{enabled:false}`) | `PaymentLinkHelper.ts:62-66` |
| Max OTP attempts exceeded | Handled error `OTP_MAX_ATTEMPTS_EXCEEDED`, never a raw 500 | `PaymentLinkHelper.ts:181-190` (EMI-5684) |
| Guest JWT scope | JWT bound to one link; used on another link returns 401 Unauthorized | `GuestWalletPayment.spec.ts:173-185` |
| Location-permission prompt | Must not block guest payment | `GuestWalletPayment.spec.ts:127-145`, GF-09 |
| Opening a bill link | Must open bill payment, not wallet payment (TC-PL-015) | `PaymentLinkBugs.spec.ts:53-60` |

## Business rules

| Rule | Detail | Source |
|---|---|---|
| Nature | Thin access layer over a bill (pay it) or a wallet (send/add funds); the underlying object stays the source of truth | `EMI-Business-Rules-part6-wallet-pos-emerging.md:91` |
| Payer | Guest on a hosted public page, or sign in and be redirected to the in-app flow | same |
| Guest session | Backend issues a short-lived JWT scoped to one link and reference type (BILL/INVOICE or WALLET); stateless, high-entropy token | `B2B-Transactions.md` GF-04 (mock `expiresInSeconds: 600`, `PaymentLinkHelper.ts:131-136`) |
| Sanitised summary | Guest sees only sanitised fields; no internal IDs, profileId, walletId, stack traces | GF-02, GF-13; `GuestWalletPayment.spec.ts:35-47,164-171` |
| Eligibility | No link for unapproved bill; none offered once the bill is paid | BPL-05, BPL-06 |
| Bill link | Merchant-to-merchant bill links must resolve (BPL-02); summary shows payable amount, fees, VAT (BPL-10, BPL-11) | `BillPaymentLinkBugs.spec.ts` |
| Transfer draft | Wallet/bill transfer draft must not fail with `WALLET_TYPE_NOT_FOUND` (BPL-07) | `PaymentLinkHelper.ts:263-275` |
| Authorisation | Biller returning from a link result can still open bill info (no 403 `BILL_NOT_FOUND_OR_UNAUTHORIZED_ACCESS`) (BPL-08, BPL-09) | `PaymentLinkHelper.ts:282-296` |
| Rate limiting | Excessive guest resolution requests throttled | GF-15 |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| Invalid / expired / disabled link | /invalid\|expired\|disabled\|not found/; mock text "Link is invalid, expired, or disabled" | `invalidLinkError` |
| Already paid | /already paid/ | page text |
| Old guest-QR bug | "Payment link not found" must NOT appear (EMI-5551) | page text |
| Old guest-pay bugs | "Wallet Payment Failed" (EMI-5640) and "Payment failed (invalid wallet code)" (EMI-5860) must NOT appear | page text |
| Amount out of range | /minimum\|maximum\|amount (must\|should)/ | `amountError` |
| Incomplete profile | /profile (information )?is incomplete\|missing (required )?information/ | `incompleteProfileError` |
| Unauthorized bill view | "The bill could not be found, or you do not have the necessary permissions." | Page text (BPL-08 mock) |
| Create for unapproved bill | `BILL_NOT_APPROVED`: "A payment link cannot be generated for an unapproved bill" | API message |
| Max OTP attempts | `OTP_MAX_ATTEMPTS_EXCEEDED`: "Maximum OTP attempts exceeded" | API message |
| Wallet type missing | `WALLET_TYPE_NOT_FOUND`: "The wallet type could not be found." | API message |
| Result | /payment (successful\|failed\|complete)/ | `resultHeading` |

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| Resolve (spec mock) | `**/emi-profile/api/v1/payment-links/<token>` | Guess (`PaymentLinkHelper.ts:40`) |
| Resolve (swagger) | `GET /api/v1/bills/payment-links/pay/{token}`; wallet: `GET /api/v1/wallets/payment-links/pay/{token}` | `ServiceApis/EbillService.generated.spec.ts:88`, `WalletService.generated.spec.ts:84` |
| Create / list / disable / delete / regenerate | `POST/GET /api/v1/bills/payment-links`; `POST .../{id}/disable`; `DELETE .../{id}`; `POST .../regenerate`; wallet equivalents under `/api/v1/wallets/payment-links` | Swagger list only |
| Pay | `POST /api/v1/bills/payment-links/pay/{token}/submit`, `/submit/verify`, `/submit/update-status` | `EbillService.generated.spec.ts:65-67`; mocks use `**/bills/payment-links/pay/**/submit` and `**/bank-transaction/**/update-status` |
| Payer info / guest session / payment methods (spec mocks) | `.../payer`, `.../guest-session`, `.../payment-methods`, `**/otp/otp-settings/**` | Guessed paths |
| Settle | `**/api/v1/payment-links/settle**` | Mock only |
| Transfer draft | `**/transactions/transfer-draft` | `PaymentLinkHelper.ts:263` |

## Known gaps and product defects

| Item | Evidence |
|---|---|
| Entire module is mock-only; URL shape and paths are guesses; no page object for the Business manage page | `PaymentLinkHelper.ts:6-15`, `PaymentLinkPage.ts:3-11` |
| Mocked resolve path `/emi-profile/api/v1/payment-links/<token>` differs from the swagger path `/api/v1/bills/payment-links/pay/{token}` | `PaymentLinkHelper.ts:40` vs `EbillService.generated.spec.ts:88` |
| "Regression guard" tests assert the mocked bug (500) is returned by the mock itself, which proves nothing about the app | `BillPaymentLinkBugs.spec.ts` BPL-01..07 "pre-fix mock" tests |
| Old payer-info flow and new server-resolved flow cannot both be true; cases skip based on which one is present | `PaymentLinkPayerInfoRemoval.spec.ts:11-22` |
| EMI-5876 and EMI-5870 have no content; EMI-5420/EMI-5475 not separately tested | `BillPaymentLinkBugs.spec.ts:49-54` |
| Sidebar route `/payment-links/manage` has no coverage (not tagged in handoff either) | `QA-DATA-TESTID-HANDOFF.md` section 5 |
| Several tests skip when expected elements are not present (method selection, continue, cancel) | `BillPaymentLinkBugs.spec.ts:109,122,142`, `PaymentLinkBugs.spec.ts:44` |

## Open questions

| Question | Why open |
|---|---|
| Real guest URL and whether it lives under `/business/` or `/customer/` | Guess only |
| What does the Business "manage" page list and which actions (create, disable, regenerate, delete) does it expose? | No page object |
| Does the guest flow ask for OTP, and from which service? | Mocked as configurable |
| Real EN/AR copy for all guest-page errors | Locators are regex guesses |
| Which payment methods are really offered (Apple Pay)? | Mock-only list |
| Are limits (min/max) for wallet links configured per link or globally? | Mock `minAmount`/`maxAmount` only |
