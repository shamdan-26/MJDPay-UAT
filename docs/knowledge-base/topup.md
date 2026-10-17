# Knowledge Base - Top-up (only the top-up parts)

Refined 2026-10-15 with `/refine`. All source tickets are Done in Jira. Jira is the source of truth; these are QA notes.
Only the top-up items of each ticket are kept here. Full tickets: see [ALL-BY-MODULE.md](ALL-BY-MODULE.md).

## 1. Top-up items per ticket

| Ticket | Top-up part | Exact wording / detail |
|---|---|---|
| EMI-581 | Parent "Topup" | Empty: no description, comments or links |
| EMI-222 | FE - Topup | Empty. Parent: EMI-171 Cash-in |
| EMI-221 | BE - Topup | Empty. 2024 comments: `/api/v1/transactions/payments` -> `/api/v1/payments`; `/payments/transactions/{checkoutId}/update-status` -> `/payments/{checkoutId}/update-status` |
| EMI-4675 | Request body | `idempotencyKey` added to `POST /api/v1/cards/payment/topup` (also `payments`, bank-transaction x3, cash-out, OTC). Business and Customer apps |
| EMI-5028 | Update ID | The ID returned by `/api/v1/cards/payment/topup` is sent to `/api/v1/cards/payment/topup/update`, **not `cardId`**, in Business and Customer apps. A dev comment says this was blocked by a top-up card issue, later resolved |
| EMI-5480 | Header | `idempotencyKey` header on `POST /api/v1/transactions/card/topup/update-status`. Same key for every call in the top-up flow; new key per flow |
| EMI-5495 | Response | `cards/payment/topup` and `cards/payment/topup/update` return the standard payload (`txnReference`, `status`, `isOtpRequired`, `transactionTypeCode`). `checkoutId` and `draftTransactionId` are replaced by `txnReference` |
| EMI-3874 | Visibility | A Biller with configured privileges must see both **Transfer** and **Topup** on Home. Relates to EMI-3752 (Merchant and Biller buttons missing) |
| EMI-87 | Limits | Top-up is subject to the limit gates (balance min/max, amount per period, count per period). Examples in the story: "Merchant top-up, App, Daily, Count 4, Amount 1000" and a High-risk rule with Count 0 (blocked) |

## 2. Combined top-up flow (as implied by the tickets)

| Step | What happens | Source |
|---|---|---|
| 1 | Biller/Merchant sees Topup on Home (needs privilege) | EMI-3874 |
| 2 | Limit check at initiation | EMI-87 |
| 3 | `POST cards/payment/topup` with `idempotencyKey` in body; response has `txnReference`, `isOtpRequired` | EMI-4675, EMI-5495 |
| 4 | `POST cards/payment/topup/update` with the ID from step 3 (not `cardId`) | EMI-5028 |
| 5 | `POST transactions/card/topup/update-status` with `idempotencyKey` header, same key for the whole flow | EMI-5480 |

## 3. Gaps

| # | Gap | Where | Why it matters | Severity |
|---|---|---|---|---|
| 1 | EMI-581/222/221 have no acceptance criteria | Parents | Nothing to test | High |
| 2 | Top-up paths differ across tickets: `cards/payment/topup`, `cards/payment/topup/update`, `transactions/card/topup/update-status` | 5028, 5480, 5495 | Unclear which is the real call order | Med |
| 3 | `idempotencyKey` is in the **body** (4675) and in the **header** (5480) for top-up | 4675 vs 5480 | Unclear which one the backend now reads | High |
| 4 | "Same key across the flow" has no definition of flow start/end, retry or refresh | 5480 | Duplicate or blocked top-up | High |
| 5 | "ID" to send to `topup/update` is not named (field name unclear) | 5028 | Wrong ID gives a failed top-up | Med |
| 6 | Privilege name for Topup not stated; Merchant only in linked bug | 3874 | Cannot build the role matrix | Med |
| 7 | Top-up limit error message and Count 0 behaviour not defined | 87 | No test oracle | High |
| 8 | Card top-up failure, 3DS or declined card behaviour not described | All | Negative paths untested | Med |

## 4. Risks

| # | Risk | Likelihood | Impact | How to reduce it |
|---|---|---|---|---|
| 1 | Duplicate top-up from a reused or regenerated key | Med | High | Test retry, refresh, double-click, second tab |
| 2 | Wrong ID sent to `topup/update` (`cardId` instead of payment ID) | Med | High | Check the request in Business and Customer |
| 3 | A screen still reads `checkoutId`/`draftTransactionId` | Med | High | Check top-up success and failure screens |
| 4 | Limit block on a test account looks like a top-up bug | High | Med | Check limits first (the repo already notes this on one account) |
| 5 | Topup button missing for Biller or Merchant | Low | Med | Role matrix on Home |

## 5. What may break

| # | Area | Why | What to re-check |
|---|---|---|---|
| 1 | Top-up for Business and Customer | Body key, header key, ID and response all changed | Success, failure, retry |
| 2 | OTP step of top-up | `isOtpRequired` is now in the response | OTP on, OTP off, wrong OTP |
| 3 | Transaction history and summary | `txnReference` replaces old IDs | Top-up row shows correctly |
| 4 | Balances | Top-up is inbound | Available, Reserved Credit, Current after pending and success |
| 5 | Limits | Top-up counts toward amount and count | Cap boundary, Count 0 |
| 6 | Payments TTL (EMI-6031, To Do) | Expired draft must free limit headroom | Expired top-up draft |

## 6. Open questions

| # | Question | Ask who | Blocking? |
|---|---|---|---|
| 1 | Is `idempotencyKey` for top-up read from the body, the header, or both? | Dev | Yes |
| 2 | What defines one top-up flow and when does the key reset? | Dev | Yes |
| 3 | Which exact field is the "ID" sent to `topup/update`? | Dev | Yes |
| 4 | What are the error code/message when a top-up hits a limit gate? | BA / Dev | Yes |
| 5 | Which privilege controls Topup, and does it apply to Merchant? | PO | No |
| 6 | What happens on declined card, 3DS failure or timeout? | PO / Dev | No |
| 7 | Can EMI-581/222/221 be closed as non-testable parents? | PO | No |

## 7. Assumptions

| # | Assumption | Confirm? |
|---|---|---|
| 1 | The three top-up paths are steps of one flow in the order shown in section 2 | Yes |
| 2 | The key is a UUID created when the flow starts | Yes |
| 3 | `cards/payment/topup/update` and `transactions/card/topup/update-status` are different calls | Yes |

## 8. Test ideas

| # | Scenario | Type | Priority | Covered? |
|---|---|---|---|---|
| 1 | Biller with Transfer and Topup privileges sees both on Home; Topup opens its flow | Functional | High | No |
| 2 | Remove Topup privilege: button hidden | Negative | High | No |
| 3 | Merchant and Biller Home screens match | UI | Med | No |
| 4 | `cards/payment/topup` request has `idempotencyKey` in the body | API | High | No |
| 5 | Response matches the standard payload; no `checkoutId`/`draftTransactionId` | API | High | No |
| 6 | `topup/update` receives the payment ID, not `cardId` (Business and Customer) | Functional | High | No |
| 7 | `topup/update-status` has the `idempotencyKey` header; same key as the earlier calls of that flow | API | High | No |
| 8 | A new top-up flow gets a new key | Functional | High | No |
| 9 | Refresh or retry mid-flow creates no duplicate top-up | Negative | High | No |
| 10 | Replay the status call with the same key returns the same result | API | Med | No |
| 11 | OTP required: wrong OTP, correct OTP, `isOtpRequired=false` skips OTP | Functional | High | No |
| 12 | Top-up at the amount cap passes; one more is rejected | Boundary | High | Partial (`Topup/TopupHelper.ts` notes a limit block) |
| 13 | Count cap and Count 0 blocks top-up | Boundary | High | No |
| 14 | Declined card / failed top-up shows an error and leaves balance unchanged | Negative | High | No |
| 15 | Expired top-up draft frees limit headroom | Functional | Med | Partial (`PaymentsTtl/api/DraftExpiry.spec.ts`) |
| 16 | Pending top-up raises Reserved Credit only; Success moves it to Available | API | High | Partial (Balances specs) |
| 17 | Arabic and English + RTL for top-up screens and limit message | UI | Med | No |

## 9. Better acceptance criteria

| Current wording | Clearer, testable wording |
|---|---|
| (581/222/221) empty | "A user with the Topup privilege can top up a wallet by card; success shows `txnReference` and updates the balance; failure shows an error and leaves the balance unchanged" |
| Ensure the ID from `cards/payment/topup` is sent to `topup/update`, not `cardId` | "`topup/update` request field `<name>` equals the `<name>` returned by `topup`; it never contains `cardId`" |
| Same `idempotencyKey` reused across all related calls | "A new UUID is created when the user starts a top-up, sent (header/body, state which) on every call until success, cancel or timeout" |
| Both buttons should be visible and accessible | "A Biller with Transfer and Topup privileges sees both on Home; without the Topup privilege the button is hidden" |
| (87) A Count of 0 means blocked outright | "A top-up matching a rule with Count 0 is rejected with error code X and message Y" |

## Next steps

| Step | Owner |
|---|---|
| Confirm key location (body vs header), the "ID" field name and the flow definition | Dev |
| Close EMI-581/222/221 as non-testable parents and name the Topup privilege | PO |
| Automate top-up idempotency, ID and limit-boundary checks; add declined-card and OTP cases | QA |
