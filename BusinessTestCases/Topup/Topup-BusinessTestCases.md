# Top-up: Business Test Cases

Scope: business rules only (who may top up, how much, how often, what is charged, what is credited, what happens on failure, no double processing). No locator, layout, wording or endpoint/field checks.
Sources: `docs/knowledge-base/topup.md` (EMI-87, 3874, 4675, 5028, 5480, 5495, 6031) and the business rules in `docs/ui-kb/Topup.md`.
Case IDs use the prefix `TUB-` (Top-up Business). The "Related existing" column points to older UI/config cases so nothing is duplicated by accident.
Currency is SAR. On dev the Biller Bank Cashin amount limit is min 100.00 and max 100000.00 per transaction (hourly), and 5 transactions per hour. L = cap, N = count cap, a = entered amount, c = commission, B = wallet max balance.

How to read the Assumption column: `AS#` means the expected result depends on an assumption listed at the bottom. Those cases must be confirmed with Dev/PO before they are signed off.

## A. Eligibility and permissions

| ID | Title | Pri | Type | Tier | Preconditions | Steps | Expected business result | Source | Assumption | Related existing |
|---|---|---|---|---|---|---|---|---|---|---|
| TUB-01 | Biller with the Topup privilege can top up | P1 | Functional | T2 | Active Biller wallet, Topup privilege granted | Complete a top-up end to end | Top-up succeeds and the wallet is credited | EMI-3874 | AS7 |  |
| TUB-02 | Merchant with the Topup privilege can top up | P1 | Functional | T2 | Active Merchant wallet, Topup privilege granted | Complete a top-up end to end | Succeeds and is recorded as a Merchant top-up (Merchant commission and limit rows apply) | EMI-3874, ui-kb | AS6, AS7 |  |
| TUB-03 | Customer app user can top up | P2 | Functional | T2 | Active Customer wallet | Complete a top-up | Succeeds and the wallet is credited | EMI-4675, EMI-5028 | AS6 |  |
| TUB-04 | User without the Topup privilege cannot top up | P1 | Negative | T1 | User has Transfer privilege but not Topup | Try to start a top-up by every route available (menu, shortcut, direct link) | No top-up can be started; no payment record created; Transfer still works | EMI-3874 | AS7 |  |
| TUB-05 | Privilege removed while a top-up is in progress | P2 | Negative | T3 | Top-up started, not yet paid | Admin removes the Topup privilege, user continues | The in-progress top-up is not completed or credited, or the product's chosen behaviour is documented | EMI-3874 | AS7 |  |
| TUB-06 | Suspended or inactive wallet cannot top up | P1 | Negative | T1 | Wallet suspended | Try to top up | Rejected; no charge to the card; no balance change | Business rule |  |  |

## B. Amount rules

| ID | Title | Pri | Type | Tier | Preconditions | Steps | Expected business result | Source | Assumption | Related existing |
|---|---|---|---|---|---|---|---|---|---|---|
| TUB-07 | Entered amount equals the amount charged and credited | P1 | Functional | T2 | No commission, no limits hit | Top up 250.00 | Card is charged 250.00 and wallet credited 250.00; history shows 250.00 | ui-kb Credit rule |  |  |
| TUB-08 | Zero amount is never processed | P1 | Negative | T1 |  | Try to top up 0 | No payment is created; balance unchanged | ui-kb |  |  |
| TUB-09 | A negative entry can never reduce the balance | P1 | Negative | T1 | Balance known | Try to top up -10 | Either rejected or treated as a normal positive 10 consistently on summary, charge and credit; balance never goes down | ui-kb (sign is stripped) |  |  |
| TUB-10 | More than 2 decimals: charged, shown and credited amounts agree | P2 | Boundary | T1 |  | Enter 10.555 | One consistent amount (10.55 per current behaviour) is shown, charged and credited | ui-kb |  |  |
| TUB-11 | Over-length amount is not charged differently from what the user typed | P2 | Boundary | T1 |  | Enter a 9-digit amount | The amount charged equals the amount the user confirms on the summary; no silent change between entry and charge | ui-kb known gap |  |  |
| TUB-12 | Amount below the configured minimum is rejected, at the minimum accepted | P1 | Boundary | T1 | Minimum m configured | Try m-0.01, then m | m-0.01 rejected; m accepted | ui-kb Min amount | AS5 | TUA-B01, TUA-B02 |
| TUB-13 | A top-up whose net credit would be zero or negative is blocked | P1 | Negative | T1 | Fixed commission f, amount a not above f | Try to top up a | Blocked before payment; never a zero or negative credit | ui-kb Commission |  | TUA-B15, TUA-D10 |

## C. Commission and VAT

Worked examples (VAT is inside the commission: VAT = c x 15/115; round half-up to 2 decimals; total credited = amount - c).

| ID | Title | Pri | Type | Tier | Preconditions | Steps | Expected business result | Source | Assumption | Related existing |
|---|---|---|---|---|---|---|---|---|---|---|
| TUB-14 | Fixed commission and VAT math | P1 | Functional | T1 | Tier gives fixed c = 10.00 | Top up 1000.00 | Commission 10.00, VAT 1.30, credited 990.00; ledger agrees | ui-kb Commission/VAT math |  |  |
| TUB-15 | Percentage commission rounds half-up | P1 | Boundary | T1 | Tier 5% | Top up 10.10 | Commission 0.505 rounds to 0.51 (not 0.50), VAT 0.07, credited 9.59 | ui-kb | AS9 |  |
| TUB-16 | Tier boundaries are inclusive | P1 | Boundary | T1 | Tier from Tmin to Tmax | Top up Tmin, Tmax, Tmin-0.01, Tmax+0.01 | Commission applies at Tmin and Tmax; amounts outside any tier get commission 0 | ui-kb Tier boundaries |  |  |
| TUB-17 | Account-level commission overrides the default | P2 | Functional | T3 | Default and account override both active | Top up on that account | Override rate is used; another account still uses the default | ui-kb |  | TUA-D21 |
| TUB-18 | A commission set for another platform does not apply | P2 | Functional | T3 | Commission exists for APP only | Top up on Web | Commission 0 | ui-kb |  | TUA-D23 |
| TUB-19 | No commission configured: full amount credited | P2 | Functional | T3 | No commission row | Top up 500 | Credited 500, no commission and no VAT posted, no error | ui-kb |  | TUA-D24 |
| TUB-20 | Figures shown before payment equal what is posted | P1 | Functional | T2 | Commission active | Compare summary, ledger and balance change | Commission, VAT and credit are identical in all three | ui-kb Credit rule |  | TUA-A20 |
| TUB-21 | Failed or pending top-up posts no commission | P1 | Negative | T2 | Commission active | Make the payment fail, then pend | No commission or VAT posted until SUCCESS | ui-kb |  | TUA-D19, TUA-D20 |

## D. Limits (EMI-87)

| ID | Title | Pri | Type | Tier | Preconditions | Steps | Expected business result | Source | Assumption | Related existing |
|---|---|---|---|---|---|---|---|---|---|---|
| TUB-22 | Amount cap: exactly the remaining headroom passes, one halala more fails | P1 | Boundary | T2 | Period cap L, usage U | Top up L-U, then another L-U+0.01 on a fresh period | First succeeds and usage reaches L; second rejected | EMI-87 |  | TUA-C11, TUA-C12 |
| TUB-23 | Two top-ups that together exceed the cap | P1 | Boundary | T2 | Daily cap L | Top up 0.6L then 0.6L | First succeeds, second rejected (cap is cumulative) | EMI-87 |  | TUA-C13 |
| TUB-24 | Count cap: N allowed, N+1 rejected | P1 | Boundary | T2 | Daily count cap N (example: 4) | N successful top-ups, then one more | The N+1th is rejected | EMI-87 ("Daily, Count 4") |  | TUA-C24 |
| TUB-25 | Count 0 means top-up is blocked outright | P1 | Boundary | T1 | Rule with Count 0 (example: High-risk rule) | Try to top up | Rejected every time, no card charge, no OTP; error code and message to be defined | EMI-87 | AS11 | TUA-C26 |
| TUB-26 | Rule is chosen by account type, risk level and platform | P1 | Functional | T1 | Different caps for Merchant/Biller, Low/High risk, App/Web | Same amount on each account | Each account is judged only against its own rule | EMI-87 |  | TUA-B10 |
| TUB-27 | Every period type is enforced (hour, day, month, year) | P2 | Boundary | T1 | Caps for each period, hourly the tightest | Exceed each in turn | The tightest exhausted period blocks; others have headroom | ui-kb Periods |  |  |
| TUB-28 | Limits are judged on the gross entered amount | P1 | Boundary | T1 | Cap L, commission active | Top up a = L | Allowed; usage consumed is L, not L minus commission | ui-kb |  | TUA-D01, TUA-D02 |
| TUB-29 | Wallet max balance is judged on balance plus net credit | P1 | Boundary | T1 | Max B, balance B-n | Top up an amount whose net credit is n, then n+0.01 | Net n allowed (balance equals B); n+0.01 blocked; blocked before the card is charged | ui-kb |  | TUA-C01, TUA-C02, TUA-D12 |
| TUB-30 | Only successful top-ups use up the quota | P1 | Functional | T2 | Count cap 1 | Fail one top-up, cancel one, then succeed once | All attempts after the failure/cancel are still allowed; the success uses the quota | ui-kb Quota | AS4 | TUA-C27, TUA-C28 |
| TUB-31 | Limit and minimum failures happen before an OTP is sent and before any charge | P1 | Functional | T1 | OTP on, limit exhausted | Try to top up | Blocked at the start; no OTP created, no card step, no pending record | ui-kb Check order |  | TUA-A18, TUA-A19 |
| TUB-32 | When both minimum and limit are violated the minimum is reported | P3 | Functional | T3 | Below minimum and over the daily limit | Enter the amount | Minimum rule wins | ui-kb Check order |  | TUA-E01 |
| TUB-33 | Limits cannot be bypassed outside the normal screens | P1 | Negative | T1 | Cap exhausted | Submit the top-up by any non-standard route | Rejected with the same rule; nothing created | ui-kb Server-side enforcement |  | TUA-B08 |
| TUB-34 | Limit windows follow Saudi time | P2 | Functional | T3 | Daily cap exhausted | Retry just before and just after midnight KSA | Blocked before midnight, allowed after | ui-kb Limit windows |  | TUA-C19 |
| TUB-35 | A changed limit applies to the next attempt using existing usage | P2 | Functional | T1 | Cap L, usage U | Admin changes cap to L2, user tops up the remainder | Judged against L2 and the real usage U | EMI-87 |  | TUA-C21 |

## E. No duplicate processing (idempotency, EMI-4675 / 5480)

These cases test the business outcome only: one user intent gives at most one charge and one credit. They do not say where the key travels (AS1).

| ID | Title | Pri | Type | Tier | Preconditions | Steps | Expected business result | Source | Assumption | Related existing |
|---|---|---|---|---|---|---|---|---|---|---|
| TUB-36 | Double submit creates one top-up | P1 | Negative | T1 |  | Click the confirming action twice quickly | One payment, one charge, one credit | EMI-4675 | AS1 |  |
| TUB-37 | Retry after a slow or lost response is not a second top-up | P1 | Negative | T1 | Response delayed or connection dropped | User retries | At most one charge and one credit; the user ends with a single clear outcome | EMI-5480 | AS1, AS2 |  |
| TUB-38 | Refreshing mid-flow does not duplicate or leave a blocker | P1 | Negative | T3 | Top-up in progress | Refresh or press Back at each step | No duplicate; no stuck pending record that blocks the next top-up or uses quota | EMI-5480 | AS2 | TUA-A16 |
| TUB-39 | Same top-up open in two tabs or devices completes once | P1 | Negative | T1 | Same user, two sessions | Start in tab 1, continue in both | Only one completes; the other is refused or shows the same final outcome; no double credit | Risk 1 | AS2 |  |
| TUB-40 | A new top-up after a finished one is processed normally | P1 | Functional | T1 | A top-up just succeeded | Start another with the same amount | It is a new transaction, charged and credited, not treated as a repeat of the first | EMI-5480 ("new key per flow") | AS2 |  |
| TUB-41 | Repeating the final confirmation of a finished top-up returns the same result | P2 | Negative | T1 | Completed top-up | Repeat the completion call or reopen the result | Same outcome shown; no second credit or ledger row | EMI-5480 | AS1 |  |
| TUB-42 | Cancelled or timed-out flow does not block or taint the next one | P2 | Functional | T2 | Cancel at summary, then at OTP, then let one time out | Start a new top-up each time | Each new top-up works independently | EMI-5480 | AS2 |  |

## F. Flow integrity (EMI-5028 / 5495)

| ID | Title | Pri | Type | Tier | Preconditions | Steps | Expected business result | Source | Assumption | Related existing |
|---|---|---|---|---|---|---|---|---|---|---|
| TUB-43 | Each top-up completes against its own payment | P1 | Functional | T1 | Two top-ups of different amounts started in sequence | Complete them in either order | Each credit equals its own amount; none applied to the other | EMI-5028 | AS3 |  |
| TUB-44 | A user cannot complete or view another user's top-up | P1 | Negative | T1 | Two users | User B tries to finish or open user A's top-up | Refused; A's wallet and record unaffected | EMI-5028 | AS3 |  |
| TUB-45 | Steps cannot be skipped or reordered | P1 | Negative | T1 | OTP on | Try to reach the card payment or completion without passing the earlier steps | No charge or credit without the required earlier steps | EMI-5495 |  |  |
| TUB-46 | Amount cannot change after the summary is confirmed | P1 | Negative | T1 | Summary confirmed | Try to change amount or method on the later steps | Charged amount equals the confirmed summary | ui-kb |  |  |
| TUB-47 | One transaction reference follows the top-up everywhere | P2 | Functional | T1 | Completed top-up | Compare result, history, summary, and ledger | The same reference is used; no mixed legacy identifiers | EMI-5495 |  |  |
| TUB-48 | Cancelling at the summary has no side effects | P2 | Functional | T1 |  | Cancel at summary, start again with the same amount | No payment record, no quota used, balance unchanged | ui-kb |  |  |

## G. OTP

| ID | Title | Pri | Type | Tier | Preconditions | Steps | Expected business result | Source | Assumption | Related existing |
|---|---|---|---|---|---|---|---|---|---|---|
| TUB-49 | When OTP is required, no card payment happens before it is verified | P1 | Functional | T1 | Top-up OTP on | Start top-up, do not enter OTP | No card step, no charge | EMI-5495 |  | TUA-A01 |
| TUB-50 | A wrong OTP does not continue and does not charge | P1 | Negative | T1 | OTP on | Enter a wrong code | Rejected; no payment; user stays on the OTP step | EMI-5495 |  | TUA-A10 |
| TUB-51 | Repeated wrong OTPs end the attempt | P1 | Negative | T1 | OTP on | Keep entering wrong codes | After the attempt limit the flow ends; no charge | Backend facts |  | TUA-A11 |
| TUB-52 | Expired OTP is rejected and a resent OTP replaces the old one | P1 | Negative | T3 | OTP on | Let it expire, request a new code, try the old then the new | Old rejected, new accepted | ui-kb |  | TUA-A08, TUA-A09 |
| TUB-53 | OTP is tied to this user and this top-up | P1 | Negative | T3 | OTP on, two top-ups | Use top-up 1's code on top-up 2 | Rejected | ui-kb |  | TUA-A06, TUA-A07 |
| TUB-54 | OTP turned off skips the step but not any other rule | P1 | Functional | T2 | OTP off, then limit exhausted | Run a normal top-up, then one over the limit | First goes straight to payment; second still blocked by the limit | EMI-5495 |  | TUA-A02, TUA-A12 |
| TUB-55 | An OTP setting change applies to the next top-up only | P2 | Functional | T2 | OTP on, top-up in progress | Admin turns it off | The in-progress one still verifies its OTP; the next one has no OTP | ui-kb |  | TUA-A03 |

## H. Failure and negative paths

| ID | Title | Pri | Type | Tier | Preconditions | Steps | Expected business result | Source | Assumption | Related existing |
|---|---|---|---|---|---|---|---|---|---|---|
| TUB-56 | Declined or errored card payment leaves the balance unchanged | P1 | Negative | T2 |  | Pay with a declined card | Failed outcome; balance unchanged; ledger shows pending then failed exactly once; no quota used | ui-kb |  |  |
| TUB-57 | User cancels at the card step | P1 | Negative | T2 |  | Cancel at the gateway | Same as declined: nothing credited, one terminal failed record | ui-kb |  |  |
| TUB-58 | 3DS decline or technical error | P1 | Negative | T2 | MADA or MASTER card | Decline then error the 3DS step | Failed; balance unchanged; user can start a new top-up | ui-kb |  |  |
| TUB-59 | Pending payment: no credit until it is confirmed, then exactly once | P1 | Functional | T2 | Gateway returns pending | Wait for resolution as success, repeat as failure | Success credits once; failure releases the reservation; nothing credited while pending | ui-kb, EMI-5495 |  |  |
| TUB-60 | Timeout or unknown outcome never credits twice | P1 | Negative | T2 | Gateway response lost | User retries; later the real outcome arrives | At most one credit overall; final state is consistent with the gateway | Risk 1 | AS2 |  |
| TUB-61 | Duplicate or late provider notification changes nothing | P1 | Negative | T3 | Completed top-up | Provider reports the same result again, then a conflicting one | Exactly one terminal state; one credit; ledger append-only | ui-kb Ledger |  |  |
| TUB-62 | Pop-up blocked or window closed before paying | P2 | Negative | T3 |  | Block pop-ups, or close the card window | No charge; no stuck pending record that consumes quota | ui-kb | AS4 |  |
| TUB-63 | Destination wallet limit reached at completion | P2 | Negative | T2 | Wallet already at its limit | Complete a top-up | Rejected cleanly; nothing posted; user informed | ui-kb |  |  |

## I. Balances and ledger

| ID | Title | Pri | Type | Tier | Preconditions | Steps | Expected business result | Source | Assumption | Related existing |
|---|---|---|---|---|---|---|---|---|---|---|
| TUB-64 | Pending top-up raises Reserved Credit only | P1 | Functional | T2 | Balances noted | Hold a top-up in pending | Reserved Credit rises; Available unchanged; Current unchanged (Reserved Credit is not part of Current) | KB test idea 16, EMI-602 |  |  |
| TUB-65 | Success moves the amount into Available | P1 | Functional | T2 | Pending top-up | Resolve to success | Reserved Credit back down, Available up by the net credit, Current up by the same | KB test idea 16 |  |  |
| TUB-66 | Failure releases the reservation | P1 | Functional | T2 | Pending top-up | Resolve to failure | Reserved Credit back to the earlier value; Available unchanged | KB test idea 16 |  |  |
| TUB-67 | Ledger is append-only with one terminal row | P1 | Functional | T2 |  | Complete one success and one failure | Each top-up has pending then exactly one terminal row; nothing edited | ui-kb Ledger |  |  |
| TUB-68 | History shows one correct row per top-up | P2 | Functional | T2 |  | Complete a top-up | One entry: right type, amount, status and reference; none for cancelled attempts that never started payment | KB what may break 3 |  |  |

## J. Draft expiry (EMI-6031, not yet delivered)

| ID | Title | Pri | Type | Tier | Preconditions | Steps | Expected business result | Source | Assumption | Related existing |
|---|---|---|---|---|---|---|---|---|---|---|
| TUB-69 | Expired top-up draft frees its limit headroom | P2 | Functional | T3 | Cap L, abandoned draft held | Wait for expiry, top up the full remainder | Allowed; abandoned draft no longer counts | EMI-6031 |  | `PaymentsTtl/api/DraftExpiry.spec.ts` |
| TUB-70 | Payment completes after the draft already expired | P2 | Open Question | T3 | Draft expired | Complete the card payment late | Outcome must be defined by PO (refund, credit or reject); never a silent charge without credit | EMI-6031 | AS12 |  |

## K. Cross-module

| ID | Title | Pri | Type | Tier | Preconditions | Steps | Expected business result | Source | Assumption | Related existing |
|---|---|---|---|---|---|---|---|---|---|---|
| TUB-71 | Topped-up money is spendable only after success | P1 | Functional | T2 | Low balance | Try to pay a bill or transfer while top-up is pending, then after success | Refused while pending (not in Available); allowed after success | Balances rule |  |  |
| TUB-72 | Top-up does not use outbound transfer or payment limits | P2 | Functional | T3 | Outbound caps exhausted | Top up | Top-up is judged only by top-up rules | EMI-87 | AS13 |  |
| TUB-73 | Top-up totals appear in reports and statements | P2 | Functional | T3 | Several top-ups of mixed outcomes | Check wallet statement and transaction reports | Only successful top-ups counted in totals; amounts and commission agree with ledger | KB what may break 3 |  |  |

## L. OTP amount threshold (added 2026-10-16 from pasted requirements)

The admin sets an OTP on/off switch and an amount threshold T (example T = 500.00). OTP is asked only when OTP is on and the amount is at or above T (AS14). The "Source" column holds the `REQ-` id from the refinement; the Traceability table maps every `REQ-` id to its case.

| ID | Title | Pri | Type | Tier | Preconditions | Steps | Expected business result | Source | Assumption | Related existing |
|---|---|---|---|---|---|---|---|---|---|---|
| TUB-74 | OTP is skipped just below the threshold | P1 | Boundary | T3 | OTP on, T = 500.00 | Top up 499.99 | No OTP step; goes straight to the card payment | REQ-06 | AS14 | TUB-49 |
| TUB-75 | OTP is required at exactly the threshold | P1 | Boundary | T3 | OTP on, T = 500.00 | Top up 500.00 | OTP requested; no card step before it is verified | REQ-07 | AS14 | TUB-49 |
| TUB-76 | Threshold equal to the minimum top-up amount | P2 | Boundary | T3 | Minimum 100.00, T = 100.00 | Top up 100.00 | OTP requested because the amount equals T | REQ-10b | AS14 | TUB-12 |
| TUB-77 | Threshold is judged on the entered amount, not the net credit | P1 | Boundary | T3 | Commission 10.00 active, T = 500.00 | Top up 505.00 (net 495.00) | OTP requested | REQ-11c | AS14 | TUB-28 |

## M. Idempotency extensions (added 2026-10-16)

Business outcome only: one user intent gives at most one charge and one credit (AS17).

| ID | Title | Pri | Type | Tier | Preconditions | Steps | Expected business result | Source | Assumption | Related existing |
|---|---|---|---|---|---|---|---|---|---|---|
| TUB-78 | Reusing a finished flow's key never charges again | P1 | Negative | T1 | Flow initiated and OTP-verified with key K (a paid flow is the browser tier) | Start a new flow with K | No second charge or credit; the original result is returned | REQ-13a | AS17 | TUB-40 |
| TUB-79 | Same key with a different amount is never processed as new | P1 | Negative | T1 | Key K used for 200.00 | Send K with 300.00 | Rejected, or the original 200.00 result; never a charge of 300.00 (both allowed, the choice is still open) | REQ-14 | AS17 | TUB-36 |
| TUB-80 | Same key with a different payment method | P2 | Negative | T1 | Key K used on one method | Send K with another method | Same rule as TUB-79: no new charge | REQ-14a | AS17 | TUB-79 |
| TUB-81 | One user's key cannot reach another user's payment | P1 | Negative | T1 | Users A and B | B sends A's key | A's payment is not returned to B and not changed; B gets their own payment or is refused | REQ-14b | AS17 | TUB-44 |
| TUB-82 | Retry after a declined first attempt never credits twice | P2 | Negative | T2 | First attempt declined with key K | Retry with K | At most one credit overall; final state matches the gateway | REQ-15a | AS17 | TUB-56 |
| TUB-83 | Retry while the first request is still running | P2 | Negative | T1 | Slow first request | Retry with K before it ends | One payment only | REQ-15b | AS17 | TUB-36 |
| TUB-84 | A request without a key is refused | P2 | Negative | T1 | None | Send the start request without a key, twice | Both refused; no payment created, no charge | REQ-15c | AS17 |  |
| TUB-85 | A retry adds no commission or VAT entry | P1 | Functional | T1 | Commission active | Initiate with K, then retry with K | Ledger rows for K are unchanged by the retry; posting at success time is checked in the browser tier | REQ-15e | AS17 | TUB-41 |

## N. Transaction log: admin view (added 2026-10-16)

| ID | Title | Pri | Type | Tier | Preconditions | Steps | Expected business result | Source | Assumption | Related existing |
|---|---|---|---|---|---|---|---|---|---|---|
| TUB-86 | Admin sees the top-up with the same figures | P1 | Functional | T2 | Completed top-up with commission | Search by reference in the admin portal | Row found; reference, amount, commission, VAT, net credit and status match the user history and the DB | REQ-18c | AS18 | TUB-68 |
| TUB-87 | Admin shows the correct user type | P2 | Functional | T2 | One Merchant and one Biller top-up | Check the admin view | Each row shows its own user type | REQ-18d | AS18 |  |
| TUB-88 | Log rows stay the same after re-login | P2 | Functional | T2 | Completed top-up | Re-login, reopen history and the admin view | Same rows; none missing, none duplicated | REQ-20f | AS18 | TUB-68 |

## O. VAT configuration (added 2026-10-16)

| ID | Title | Pri | Type | Tier | Preconditions | Steps | Expected business result | Source | Assumption | Related existing |
|---|---|---|---|---|---|---|---|---|---|---|
| TUB-89 | Admin changes the VAT rate | P1 | Functional | T3 | VAT 15% then 10%, fixed commission 10.00 | Top up 1000.00 before and after the change | VAT 1.30 then 0.91 (10 x 10/110); commission 10.00 and credited 990.00 do not change | REQ-27 | AS19 | TUB-14 |
| TUB-90 | VAT rate of 0% | P2 | Boundary | T3 | Rate 0, commission 10.00 | Top up 1000.00 | VAT 0.00; commission 10.00; credited 990.00 | REQ-27a | AS19 |  |
| TUB-91 | Old top-ups keep the VAT they were made with | P2 | Functional | T3 | Top-up made at 15%, rate then changed | Reopen the old top-up | VAT figure unchanged | REQ-27f | AS19 |  |
| TUB-92 | Invalid VAT rate is rejected | P3 | Negative | T3 | Admin | Enter -5, then 150 | Rejected with a validation error; stored rate unchanged | REQ-27g | AS19 |  |

## P. Commission range overlap, admin side (added 2026-10-16)

Base rule R1 = 1.00-100.00 for the same transaction type, platform, user type and level (default or account). Bounds are inclusive (AS15). Runtime commission pick at a boundary is TUB-16.

| ID | Title | Pri | Type | Tier | Preconditions | Steps | Expected business result | Source | Assumption | Related existing |
|---|---|---|---|---|---|---|---|---|---|---|
| TUB-93 | A second rule for the same type and platform is rejected whatever its range | P1 | Negative | T2 | A rule exists for the type and platform | Add another rule for the same type and platform, with a different range | Rejected with a clear error (409 on dev); nothing saved | REQ-28 | AS15 | TU-CM14 |
| TUB-94 | Range inside an existing range is rejected | P1 | Dropped | T2 | R1 exists | Add 20.00-30.00 | Not applicable: dev allows one rule per transaction type and platform, so this setup cannot exist (confirmed 2026-10-16). Was: Rejected | REQ-28a | AS15 | TU-CM14 |
| TUB-95 | Range that contains an existing range is rejected | P1 | Dropped | T2 | R1 exists | Add 0.50-200.00 | Not applicable: dev allows one rule per transaction type and platform, so this setup cannot exist (confirmed 2026-10-16). Was: Rejected | REQ-28b | AS15 | TU-CM14 |
| TUB-96 | Exact duplicate range is rejected | P1 | Negative | T2 | R1 exists | Add 1.00-100.00 | Rejected | REQ-28c | AS15 | TU-CM14 |
| TUB-97 | Touching boundary counts as overlap | P1 | Dropped | T2 | R1 exists | Add 100.00-200.00 | Not applicable: dev allows one rule per transaction type and platform, so this setup cannot exist (confirmed 2026-10-16). Was: Rejected, because 100.00 would match two rules | REQ-29 | AS15 | TUB-16 |
| TUB-98 | Adjacent range with no shared amount is accepted | P1 | Dropped | T2 | R1 exists | Add 100.01-200.00 | Not applicable: dev allows one rule per transaction type and platform, so this setup cannot exist (confirmed 2026-10-16). Was: Accepted | REQ-30 | AS15 | TUB-16 |
| TUB-99 | A gap between ranges is allowed | P2 | Dropped | T2 | R1 exists | Add 150.00-200.00 | Not applicable: dev allows one rule per transaction type and platform, so this setup cannot exist (confirmed 2026-10-16). Was: Accepted; amounts in the gap get commission 0 | REQ-30a | AS15 | TUB-16 |
| TUB-100 | Editing a range into an overlap is rejected | P1 | Dropped | T2 | R1 and R2 = 101.00-200.00 | Change R2 to 90.00-200.00 | Not applicable: dev allows one rule per transaction type and platform, so this setup cannot exist (confirmed 2026-10-16). Was: Rejected; R2 unchanged | REQ-31 | AS15 |  |
| TUB-101 | Editing a range without overlap is accepted | P2 | Dropped | T2 | R1 and R2 = 101.00-200.00 | Change R2 to 101.00-300.00 | Not applicable: dev allows one rule per transaction type and platform, so this setup cannot exist (confirmed 2026-10-16). Was: Accepted | REQ-31a | AS15 |  |
| TUB-102 | A rule does not overlap itself on edit | P1 | Functional | T2 | R1 exists | Change only the percentage of R1 | Accepted | REQ-31b | AS15 |  |
| TUB-103 | Same range on another account is allowed | P2 | Functional | T2 | Account A1 has 1.00-100.00 | Add 1.00-100.00 for A2 | Accepted | REQ-32 | AS15 | TUB-17 |
| TUB-104 | Same range for an account and for the default is allowed | P1 | Functional | T2 | Default has 1.00-100.00 | Add 1.00-100.00 for account A1 | Accepted; the account rule wins at runtime | REQ-32a | AS15 | TUB-17 |
| TUB-105 | Same range on another platform is allowed | P2 | Functional | T2 | App has 1.00-100.00 | Add 1.00-100.00 for Web | Accepted: the same range may exist on a different platform (confirmed 2026-10-16) | REQ-32b | AS15 | TUB-18 |
| TUB-106 | Same range for another user type is allowed | P2 | Dropped | T2 | Merchant has 1.00-100.00 | Add 1.00-100.00 for Biller | Not applicable: dev allows one rule per transaction type and platform, so this setup cannot exist (confirmed 2026-10-16). Was: Accepted | REQ-32c | AS15 |  |
| TUB-107 | Percentage and fixed rules cannot share a range | P2 | Dropped | T2 | A percentage rule 1.00-100.00 exists | Add a fixed rule 1.00-100.00 | Not applicable: dev allows one rule per transaction type and platform, so this setup cannot exist (confirmed 2026-10-16). Was: Rejected, because one amount must pick one rule | REQ-33 | AS15 |  |
| TUB-108 | An open-ended range blocks later overlaps | P2 | Dropped | T2 | R1 exists | Add 100.01 with no upper bound, then add 500.00-600.00 | Not applicable: dev allows one rule per transaction type and platform, so this setup cannot exist (confirmed 2026-10-16). Was: First accepted; second rejected | REQ-33a | AS15 |  |
| TUB-109 | Invalid range gives a validation error, not an overlap error | P2 | Negative | T2 | None | Add a range with min above max, then one with a negative min | Rejected as invalid input | REQ-33b |  | TU-CM15 |
| TUB-110 | An inactive rule is ignored by the overlap check | P3 | Open Question | T3 | R1 is inactive | Add 50.00-150.00 | Expected: accepted; confirm with Dev | REQ-33c | AS15 |  |
| TUB-111 | Two admins saving overlapping ranges together | P2 | Negative | T3 | R1 exists | Two admins submit overlapping ranges at the same time | At most one is saved; the table never holds overlapping rows | REQ-33e | AS15 |  |

## Q. Limit combinations (added 2026-10-16)

Check order is count, then amount, then wallet ceiling (AS16). One reason is shown, not several.

| ID | Title | Pri | Type | Tier | Preconditions | Steps | Expected business result | Source | Assumption | Related existing |
|---|---|---|---|---|---|---|---|---|---|---|
| TUB-112 | Count and amount both fail | P1 | Negative | T1 | Count cap and amount cap both exhausted | Top up | Rejected; the count reason is reported; no OTP, no charge | REQ-37 | AS16 | TUB-24 |
| TUB-113 | Amount and wallet both fail | P1 | Negative | T1 | Amount cap and wallet max both exceeded | Top up | Rejected; the amount reason is reported | REQ-37a | AS16 | TUB-22 |
| TUB-114 | Count, amount and wallet all fail | P1 | Negative | T1 | All three exceeded | Top up | Rejected with one reason only (count first) | REQ-37b | AS16 | TUB-24 |
| TUB-115 | A pending top-up does not use the count quota | P2 | Negative | T2 | Count cap 1, first payment pending | Start a second top-up | Second top-up is allowed; only SUCCESS uses quota. Dev saw unpaid top-ups counted on 2026-10-15, so expect this case to expose a defect | REQ-38b | AS4 | TUB-30 |
| TUB-116 | Limit lowered while a top-up waits at the summary | P2 | Negative | T3 | Top-up at summary | Admin lowers the cap, user continues | The in-flight top-up completes under the check made at start; one charge, one credit; the next top-up is judged on the lowered cap | REQ-40 | AS20 | TUB-35 |

## R. Config change mid-flow (added 2026-10-16)

| ID | Title | Pri | Type | Tier | Preconditions | Steps | Expected business result | Source | Assumption | Related existing |
|---|---|---|---|---|---|---|---|---|---|---|
| TUB-117 | Commission changed while the gateway is pending | P1 | Negative | T3 | Summary showed commission 10.00, payment pending | Admin changes commission to 20.00, gateway then returns success | Charged and credited figures equal the confirmed summary; the next top-up uses 20.00 | REQ-45c | AS20 | TUB-46 |

## S. Combination matrix (added 2026-10-16)

One account per row (A1 to A6, reused by the next batch) so limits and counts do not clash. T = OTP threshold, N = count cap. Commission "both" means account and default both exist, so the account rule wins.

| ID | Title | Pri | Type | Tier | Preconditions | Steps | Expected business result | Source | Assumption | Related existing |
|---|---|---|---|---|---|---|---|---|---|---|
| TUB-118 | Matrix 1: Merchant, OTP at or above T, account percentage, no limit hit | P1 | Functional | T2 | A1, Merchant, privilege on, OTP on | Top up at or above T | OTP asked, success, account percentage used | REQ-M01 | AS14 | TUB-17 |
| TUB-119 | Matrix 2: Biller, OTP off, default fixed, count cap exceeded | P1 | Negative | T1 | A2, Biller, privilege on, OTP off, N used | Top up | Rejected before payment; no commission posted | REQ-M02 | AS16 | TUB-24 |
| TUB-120 | Matrix 3: Merchant, OTP below T, both commissions, per-transaction max exceeded | P1 | Negative | T1 | A3, Merchant, privilege on | Top up above the maximum | Rejected; no OTP, no charge | REQ-M03 | AS16 | TUB-22 |
| TUB-121 | Matrix 4: Biller, OTP at or above T, no commission, wallet max exceeded | P1 | Negative | T1 | A4, Biller, privilege on | Top up so that balance plus credit exceeds the max | Rejected before OTP and before the card | REQ-M04 | AS16 | TUB-29 |
| TUB-122 | Matrix 5: Merchant without privilege, OTP on, account percentage | P1 | Negative | T1 | A5, Merchant, privilege off | Top up | Rejected at the start; no OTP, no record | REQ-M05 |  | TUB-04 |
| TUB-123 | Matrix 6: Biller without privilege and count cap exceeded | P1 | Negative | T1 | A6, Biller, privilege off, N used | Top up | Rejected; the permission is reported before the limit | REQ-M06 | AS16 | TUB-04 |
| TUB-124 | Matrix 7: Merchant, OTP off, default percentage, wallet reaches the max exactly | P1 | Boundary | T2 | A1, balance B minus net credit | Top up | Success; balance equals the max | REQ-M07 |  | TUB-29 |
| TUB-125 | Matrix 8: Biller, OTP below T, account fixed, N-th top-up | P1 | Boundary | T2 | A2, N minus 1 successes | Top up below T | Success without OTP; count now equals N | REQ-M08 | AS14 | TUB-24 |
| TUB-126 | Matrix 9: Merchant, OTP at or above T, default fixed, amount equals per-transaction max | P1 | Boundary | T2 | A3 | Top up exactly the maximum | Success after OTP | REQ-M09 | AS14 | TUB-22 |
| TUB-127 | Matrix 10: Biller, OTP off, both commissions with account percentage | P1 | Functional | T2 | A4 | Top up | Success; account percentage used, not the default | REQ-M10 |  | TUB-17 |
| TUB-128 | Matrix 11: Merchant, OTP below T, no commission, count cap exceeded | P2 | Negative | T1 | A5, N used | Top up below T | Rejected; no payment | REQ-M11 |  | TUB-24 |
| TUB-129 | Matrix 12: Biller, OTP at or above T, both commissions, per-transaction max exceeded | P1 | Negative | T1 | A6 | Top up above the maximum | Rejected before OTP | REQ-M12 | AS14, AS16 | TUB-22 |

## Automation summary

Tier: T1 = automated at API + DB level (no browser), T2 = needs the browser (HyperPay popup, 3DS simulator, admin OTP UI), T3 = manual or blocked. Specs live in `BusinessTestCases/Topup/business/`.

| Tier | Cases | Count |
|---|---|---|
| T1 API+DB | 04, 06, 08-16, 25-29, 31, 33, 35, 36, 37, 39-41, 43-51 | 33 |
| T2 Browser | 01-03, 07, 20-24, 30, 42, 54-60, 63-68, 71 | 25 |
| T3 Manual or blocked | 05, 17-19, 32, 34, 38, 52, 53, 61, 62, 69, 70, 72, 73 | 15 |

| Spec file | Cases |
|---|---|
| `TopupBizEligibility.spec.ts` | 04, 06 (need TOPUP_NO_PRIVILEGE_ACCOUNT / TOPUP_SUSPENDED_ACCOUNT in .env.dev) |
| `TopupBizAmountRules.spec.ts` | 08-11 |
| `TopupBizCommission.spec.ts` | 13-16 (reads the active commission row, writes nothing) |
| `TopupBizLimits.spec.ts` | 12, 25-29, 31, 33, 35 (rejection side; restores limits after each test) |
| `TopupBizIdempotency.spec.ts` | 36, 37, 39-41 |
| `TopupBizFlowIntegrity.spec.ts` | 43-48 |
| `TopupBizOtp.spec.ts` | 49-51 |
| `TopupBizNotAutomated.spec.ts` | the 40 T2 and T3 cases, one annotated skip each |

### Browser-tier UI specs (`/automate-ui-tests`)

The same case ids are also proven through the UI in `BusinessTestCases/Topup/ui/`. An id may appear once in `business/` (API+DB) and once in `ui/` (browser); each is unique within its folder. `TopupBizNotAutomated.spec.ts` no longer lists the ids below.

| Spec file | Cases | Note |
|---|---|---|
| `TopupBizOutcomesUI.spec.ts` | 07, 21, 56, 57, 58, 59 (first half), 67 | 5 real sandbox payments; stays under the hourly count cap of 5 (AS4). 3DS "technical error" and the resolution of a pending payment are not covered |
| `TopupKbFlowUI.spec.ts` | 01 (entry points only), 36, 38, 40, 41, 42, 43, 47, 62; 04/05 skipped (no privilege helper) | Reads the app's own calls: key on every call, payload shape, ID sent to the update step |

### UI conversion of the API+DB cases (2026-10-16, `/automate-business-tests`)

The API+DB specs in `business/` are kept as legacy. The same rules are now proven through the screens:

| Spec file | Cases | Note |
|---|---|---|
| `TopupBizLimitCombosUI.spec.ts` | 112-114 (Biller), 120, 128 (Merchant) | Admin limits helper, then the top-up is attempted on the Amount screen; every block has a control (limits restored, same top-up proceeds). Merchant rows skip if the `Merchant Cashin` / `Merchant` limit rows are not found |
| `TopupBizEligibilityUI.spec.ts` | 04, 122 | The test removes `Top-Up Wallet` from the Merchant Admin role in the admin portal (helper `TopupPrivilegeHelper.ts`), logs in as K9491, asserts no quick action, no sidebar link and that the top-up form does not open, then restores the privilege and checks Topup is back. The privilege is on the role, so all Merchant Admins lose Topup while it runs |
| `TopupBizFlowUI.spec.ts` | 48, 49, 51, 85 | UI action plus ledger read as evidence; 3 real initiations per run |
| `TopupBizUiNotAutomated.spec.ts` | 06, 33, 37, 39, 44, 45, 46, 78-81, 84, 123 | No screen path or missing account, one annotated skip each |

API-only by design (kept in `business/`, no UI version planned): 33, 44, 78-81, 84.

Already proven in the UI before this conversion (no new test): 08-11 (`TopupFormUI`), 12, 13, 25-29, 31, 35 (`functional/TopupMinAmount`, `TopupLimits`, `TopupLimitsCommissionMatrix`), 14-16 (`functional/TopupCommission`), 36, 83 (double click, `TopupKbFlowUI`), 40, 41, 43, 47 (`TopupKbFlowUI`), 50 (`functional/TopupNegative`), 119, 121, 129 (`functional/TopupLimits` count 0, wallet ceiling and amount cap).

Still not automated in any layer: 02, 03, 05, 17-20, 22-24, 30, 32, 34, 52-55, 60, 61, 63-66, 68-73 (missing config/privilege write tools, accounts, clock, provider callback, Reserved Credit field not located, or feature not delivered).

### Cases added 2026-10-16 (TUB-74 to 129, from pasted requirements)

The T1 cases are automated; the rest are one annotated skip each in `TopupBizNotAutomated.spec.ts` with the missing tool as the reason.

| Tier | Cases | Count |
|---|---|---|
| T1 API+DB | 78-81, 83-85, 112-114, 119-123, 128-129 | 17 |
| T2 Browser | 82, 86-88, 93-109, 115, 118, 124-127 | 27 |
| T3 Manual or blocked | 74-77, 89-92, 110-111, 116-117 | 12 |

| Spec file | Cases | Note |
|---|---|---|
| `TopupBizIdempotency.spec.ts` | 78-81, 83-85 | Group M. "Finished flow" is approximated by "OTP verified" (a paid flow is the browser tier). TUB-82 needs a declined card, so it is T2 |
| `TopupBizCombinations.spec.ts` | 112-114, 119-123, 128, 129 | Rejections only, each with a control (limits restored, same top-up accepted). 122 and 123 need `TOPUP_NO_PRIVILEGE_ACCOUNT`. 120 and 128 need the Merchant limit rows (`Merchant Cashin`, wallet `Merchant`) and skip if they are not found. OTP state and commission source of the matrix rows cannot be set by current tooling |

## Assumptions to confirm

| # | Assumption | Confirm with | Cases affected |
|---|---|---|---|
| AS1 | Where the idempotency key travels (body, header, both) is irrelevant to these cases; they only require "one intent, one charge, one credit" | Dev | TUB-36, 37, 41 |
| AS2 | One flow runs from the moment the user starts a top-up until success, failure, cancel or timeout; a new flow starts a new attempt | Dev | TUB-37 to 42, 60 |
| AS3 | The completion step always uses the identifier of the payment created at the start (not the card id) | Dev | TUB-43, 44 |
| AS4 | Only SUCCESS consumes limit quota; failed, cancelled and pending do not (`[CONFIRM-5]` in the matrix). **Confirmed by the user 2026-10-16, so Dev's observation below is a defect to raise, not the rule.** Dev contradicts this for the COUNT limit (2026-10-15):** initiated but unpaid top-ups were counted (HOURLY_TRANSACTION_COUNT_LIMITS_EXCEEDED, max 5 per hour for Biller Bank Cashin). Ask BA whether that is intended. | BA | TUB-30, 62 |
| AS5 | The minimum amount is judged on the gross entered amount (`[CONFIRM-1]`) | BA | TUB-12 |
| AS6 | Roles that can top up: Biller, Merchant (Business app) and Customer (Customer app) | PO | TUB-02, 03 |
| AS7 | Topup is a separate privilege that can be removed independently of Transfer (privilege name not stated in the tickets) | PO | TUB-01, 02, 04, 05 |
| AS8 | The KB (card top-up endpoints) and the UI KB (payments endpoints) describe the same business flow | Dev | all |
| AS9 | VAT is computed on the rounded commission | BA | TUB-15 |
| AS11 | Error code and message for a limit or Count 0 block are not defined, so cases check "rejected", not the wording | BA/Dev | TUB-25 |
| AS12 | Behaviour for a late payment after draft expiry is undefined | PO | TUB-70 |
| AS13 | Top-up is an inbound type and is not subject to outbound limits | BA | TUB-72 |
| AS14 | OTP is asked only when OTP is on and the entered amount is at or above the admin threshold T (not on the net credit). **At or above T confirmed by the user 2026-10-16.** T is one global value and is judged on the entered amount; both confirmed 2026-10-16 | PO/Dev | TUB-74 to 77, 118, 125, 126, 129 |
| AS15 | Commission range bounds are inclusive, so touching ranges overlap. The check is within the same transaction type, platform, user type and level (default vs account). Percentage and fixed share one range space. **Confirmed by the user 2026-10-16.** Inactive rules being ignored is still to confirm | PO/Dev | TUB-93 to 111 |
| AS16 | Check order is permission, minimum, count, amount, wallet ceiling; one reason is shown (`docs/ui-kb/Topup.md` check order). Limit error texts are undefined (see AS11) | BA/Dev | TUB-112 to 114, 119 to 121, 123, 129 |
| AS17 | A retry with the same key and the same data returns the original result; the same key with different data is rejected or returns the original, never a new charge. **Original-result rule confirmed by the user 2026-10-16.** Keys belong to one user. A key is valid for its flow and a request with no key is refused; confirmed 2026-10-16 | Dev | TUB-78 to 85 |
| AS18 | Every payment outcome (success, failure, pending) is logged for the user, the admin and the DB with the same reference and figures; cancelled attempts and limit rejections that never reach payment are not logged. Core fields (reference, amount, commission, VAT, net credit, status, user or wallet, time) match in all three places, in Saudi time; confirmed 2026-10-16. Admin-only extra fields are not listed | BA/Dev | TUB-86 to 88 |
| AS19 | The VAT rate is set by the admin and each top-up keeps the rate it was made with; confirmed 2026-10-16 | Dev | TUB-89 to 92 |
| AS20 | A top-up in progress keeps the figures from its confirmed summary when the admin changes commission, VAT or OTP; a removed privilege is checked again at payment; a lowered limit is not re-checked at completion (confirmed 2026-10-16) | Dev | TUB-116, 117 |
| AS21 | **Confirmed 2026-10-16:** one commission rule per transaction type and platform; the same range may exist on a different platform. A second rule for the same type and platform is refused (409 on dev). Multi-range cases are dropped (TUB-94, 95, 97-101, 106-108). Account-level rules (`POST /api/v1/commissions`) are still unconfirmed (TUB-103, 104) | Dev | TUB-93 to 111 |

## Traceability

| Source | Cases |
|---|---|
| EMI-87 Limits | TUB-22 to 35 |
| EMI-3874 Visibility and privilege | TUB-01, 02, 04, 05 |
| EMI-4675 / EMI-5480 Idempotency | TUB-36 to 42 |
| EMI-5028 Payment ID | TUB-43, 44 |
| EMI-5495 Standard response, OTP flag | TUB-45, 47, 49, 50, 54, 59 |
| EMI-6031 Payments TTL | TUB-69, 70 |
| ui-kb business rules (commission, VAT, ledger, quota, check order) | TUB-07 to 21, 56 to 68 |
| Dropped as UI/API only (KB ideas 3, 4, 5, 7, 17) | Lifted to business rules in section E and F |
| Pasted requirements 2026-10-16 (no ticket) | TUB-74 to 129 |
| REQ-01 to 05 permission | TUB-01, 02, 04, 05 |
| REQ-06, 07, 10b, 11c OTP threshold | TUB-74 to 77 |
| REQ-08, 08a, 09, 10, 10a, 11, 11a, 11b OTP (already covered) | TUB-49, 54, 55, 31, 12, 50 |
| REQ-11d separate T per user type | Dropped: T is one global value (AS14) |
| REQ-12, 12a to 12c, 13, 15, 15d idempotency (already covered) | TUB-36, 37, 40, 41, 39, 60 |
| REQ-13a, 14, 14a, 14b, 15a, 15b, 15c, 15e idempotency extensions | TUB-78 to 85 |
| REQ-16, 17 gateway outcomes | TUB-56, 59 |
| REQ-18, 18a, 18b, 19 to 20g log (already covered) | TUB-67, 68, 44, 56, 57, 59, 60, 48, 31, 51, 41, 20, 34, 73 |
| REQ-18c, 18d, 20f admin log | TUB-86 to 88 |
| REQ-21 to 26 commission | TUB-14, 15, 17, 19 |
| REQ-27, 27a, 27f, 27g VAT configuration | TUB-89 to 92 |
| REQ-27b to 27e VAT rounding and summary (already covered) | TUB-15, 19, 20 |
| REQ-28 to 33c, 33e overlap | TUB-93 to 111 |
| REQ-33d boundary at runtime | TUB-16 |
| REQ-34 to 36b, 38, 38a, 39 to 40a limits (already covered) | TUB-22 to 30, 35, 28, 26, 27, 32 |
| REQ-37, 37a, 37b, 38b, 40 limit combinations | TUB-112 to 116 |
| REQ-45, 45a, 45b config change (already covered) | TUB-46, 05, 55 |
| REQ-45c config change while pending | TUB-117 |
| REQ-M01 to M12 matrix | TUB-118 to 129 |
| REQ-41 Arabic/English rejection messages | Dropped: wording check, UI only (use the UI suite) |
