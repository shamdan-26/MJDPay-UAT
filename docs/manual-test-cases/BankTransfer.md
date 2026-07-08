# Manual Test Cases — Bank Transfer (Cashout)

Context: the Bank Transfer ("Cashout") flow lets a logged-in Business user send funds from their wallet to their registered Saudi IBAN. The flow is a three-step wizard — **Amount → Confirmation → OTP** — reached from the homepage Quick Actions "Cashout" card. The Confirmation step computes a commission and VAT (15% of commission) against the entered amount before showing a final total; the OTP step re-confirms the masked IBAN and total before submitting. Several business rules (wallet-balance limits, hourly/daily/monthly/yearly transaction limits, fixed/percentage commission tiers, and the Merchant OTP-requirement toggle) are configured in the Admin Portal (EMI-180) and are documented here as manual cases even though their Playwright counterparts are currently `test.skip()`-ed pending an Admin Portal automation helper.

Priority key: **P1** = blocks the release / core happy path, **P2** = important secondary behavior, **P3** = edge case / polish.

---

## A. Amount Entry

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| BT-01 | Cashout page title and subtitle | Open Cashout from the homepage Quick Actions card | Page heading reads "Cashout" and subtitle reads "Send funds to a Saudi IBAN" (or equivalent) | P3 |
| BT-02 | Current balance shown | Land on the Amount step | "Current Balance" label is shown with a numeric balance amount | P2 |
| BT-03 | Wallet code shown | Land on the Amount step | Wallet code is displayed alongside the balance | P3 |
| BT-04 | Balance card actions shown | Land on the Amount step | Topup, QR-code, and wallet-settings buttons are all visible on the balance card | P3 |
| BT-05 | IBAN card details shown | Land on the Amount step | IBAN label, a masked IBAN (format `SA##**####`), the bank name, and a verified checkmark are all displayed | P2 |
| BT-06 | Amount section header | Land on the Amount step | Section shows step badge "2", title "Amount", and a description to enter the amount to transfer | P3 |
| BT-07 | Amount field label and currency icon | Land on the Amount step | "Set Amount You Want Transfer" label and a currency icon are shown in/near the input | P3 |
| BT-08 | Amount field placeholder | Land on the Amount step, amount field empty | Field shows placeholder text "0.00" | P3 |
| BT-09 | "Use full balance" toggle shown | Land on the Amount step | Toggle control and its "Use full balance" label are visible | P3 |
| BT-10 | Proceed disabled while amount empty | Land on the Amount step, leave amount field empty | Proceed button is disabled | P1 |
| BT-11 | Preset amount chips shown | Land on the Amount step | "Or select amount" label is shown; exactly 5 preset chips are present reading 500, 1000, 2000, 5000, 10000 | P2 |
| BT-12 | Proceed button appearance | Land on the Amount step | Proceed button is visible, labeled "Proceed", with an arrow icon | P3 |
| BT-13 | Amount with 2 decimal places accepted | Enter an amount such as `15.75` | Value is accepted as-is; Proceed becomes enabled | P1 |
| BT-14 | Amount with 1 decimal place accepted | Enter an amount such as `20.5` | Value is accepted as-is; Proceed becomes enabled | P2 |
| BT-15 | Pasted valid amount accepted | Paste `50.00` into the amount field (e.g. via clipboard paste) | Field shows `50.00`; Proceed becomes enabled | P2 |
| BT-16 | Select a preset amount | Tap any preset chip at or below the current balance | Chip is selected; Proceed becomes enabled | P2 |
| BT-17 | Editing amount overrides preset selection | Select a preset chip, then type a different amount (e.g. `123`) into the field | Field now shows the manually typed value, overriding the preset | P2 |
| BT-18 | "Use full balance" fills and locks the field | Toggle "Use full balance" on | Field auto-fills with the current balance (up to 4 decimal places) and becomes read-only, blocking manual edits | P2 |

---

## B. Confirmation Summary & Commission Calculation

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| BT-19 | Original Amount matches entry | Enter an amount (e.g. `10`) and proceed to Confirmation | "Original Amount" row on the summary equals the amount entered | P1 |
| BT-20 | Transaction Type / Bank / IBAN rows correct | Proceed to Confirmation | "Transaction Type" reads "Cashout"; "Bank" and "IBAN" match the bank/IBAN shown on the Amount step's IBAN card | P1 |
| BT-21 | VAT computed as 15% of commission | Proceed to Confirmation and let the summary settle | "VAT" row equals commission × 15% | P1 |
| BT-22 | Total amount computed correctly | Proceed to Confirmation and let the summary settle | "Total amount to be sent" equals Original Amount − commission − VAT | P1 |
| BT-23 | Confirmation heading and subtitle | Proceed to Confirmation | Heading reads "Confirmation"; subtitle references sending funds to a Saudi IBAN | P3 |
| BT-24 | Fixed commission deducted (standard transfer) | Admin configures a fixed-amount commission tier; transfer an amount within its applicable range | Confirmation summary reflects the deducted fixed commission; biller/admin wallet deltas match | P2 |
| BT-25 | Fixed commission deducted at minimum boundary | Same admin setup; transfer an amount equal to the tier's configured minimum | Fixed commission is deducted | P2 |
| BT-26 | Fixed commission deducted at maximum boundary | Same admin setup; transfer an amount equal to the tier's configured maximum | Fixed commission is deducted | P2 |
| BT-27 | Fixed commission not deducted below minimum | Same admin setup; transfer an amount below the configured minimum | Fixed commission is not applied | P2 |
| BT-28 | Fixed commission not deducted above maximum | Same admin setup; transfer an amount above the configured maximum | Fixed commission is not applied | P2 |
| BT-29 | Percentage commission deducted (standard transfer) | Admin configures a percentage commission tier; transfer an amount within its range | Confirmation summary reflects the percentage-based commission | P2 |
| BT-30 | Percentage commission deducted at minimum boundary | Same admin setup; transfer an amount equal to the tier's configured minimum | Percentage commission is deducted | P2 |
| BT-31 | Percentage commission deducted at maximum boundary | Same admin setup; transfer an amount equal to the tier's configured maximum | Percentage commission is deducted | P2 |
| BT-32 | Percentage commission not deducted below minimum | Same admin setup; transfer an amount below the configured minimum | Percentage commission is not applied | P2 |
| BT-33 | Percentage commission not deducted above maximum | Same admin setup; transfer an amount above the configured maximum | Percentage commission is not applied | P2 |

---

## C. OTP Verification & Requirement

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| BT-34 | OTP boxes and countdown shown | Proceed through Amount → Confirmation → Next | Six OTP input boxes are displayed, along with a countdown timer that visibly ticks down | P2 |
| BT-35 | OTP step heading, resend, and Verify button | Reach the OTP step | Heading reads "Confirmation", subtitle references a code having been sent, a resend link and a Verify button are both visible | P3 |
| BT-36 | Masked IBAN and total carry over unchanged | Note the masked IBAN and Total shown on Confirmation, then proceed to OTP | OTP step's recap shows the identical masked IBAN and the same total (within rounding) as Confirmation | P1 |
| BT-37 | Correct OTP completes a standard transfer | Enter a custom amount (e.g. `10.00`), proceed to Confirmation and OTP, submit the correct OTP | Success modal appears; wallet balance is debited by exactly the entered amount | P1 |
| BT-38 | Correct OTP completes a preset-amount transfer | Select a preset amount within balance, complete Confirmation and OTP with the correct code | Success modal appears; balance is debited by exactly the preset amount selected | P1 |
| BT-39 | Correct OTP completes a 2-decimal transfer | Enter an amount like `15.75`, complete the flow with the correct OTP | Transfer succeeds; balance debited matches the entered amount exactly | P2 |
| BT-40 | Correct OTP completes a 1-decimal transfer | Enter an amount like `20.5`, complete the flow with the correct OTP | Transfer succeeds; balance debited matches the entered amount exactly | P2 |
| BT-41 | OTP prompted when Merchant OTP requirement is active | Admin: Configuration Settings → Transaction → activate OTP requirement. Merchant: transfer a valid amount and Proceed | OTP modal appears; transfer only processes after successful OTP verification | P2 |
| BT-42 | OTP skipped when Merchant OTP requirement is inactive | Admin: Configuration Settings → Transaction → deactivate OTP requirement. Merchant: transfer a valid amount and Proceed | Transfer processes immediately with no OTP modal shown | P2 |

---

## D. Session Handling & Cancellation

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| BT-43 | Refresh mid-flow discards the transfer | Enter an amount, proceed to Confirmation, then refresh the page | User is returned to a fresh Amount step; wallet balance is unchanged; no transfer is recorded | P1 |
| BT-44 | Cancel on Confirmation returns to Amount step | Enter an amount, proceed to Confirmation, let the summary settle, tap Cancel | User returns to the Amount step; balance remains unchanged | P1 |
| BT-45 | Cancel at OTP step returns home | Enter an amount, proceed through Confirmation to OTP, tap Cancel on the OTP modal, navigate home | User lands on the homepage; balance remains unchanged (no transfer occurred) | P1 |

---

## E. Wallet Balance Limits (Admin-configured, EMI-180)

Context: Admin Portal → Manage Limits → Wallet Balance lets an admin cap the wallet balance a Biller may hold/transfer per risk level. These cases require an Admin Portal setup step per risk level before execution.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| BT-46 | Transfer within wallet limit succeeds (risk level 1) | Admin sets a wallet-balance ceiling for a risk level and saves. Biller enters an amount under the ceiling and proceeds | Transfer succeeds; balance is debited, admin wallet credited, and the running-balance popup shows Wallet reference, Amount, Balance Before/After, Debit/Credit, and Created date | P1 |
| BT-47 | Transfer exceeding wallet limit is blocked (risk level 1) | Same admin setup as BT-46; Biller enters an amount over the ceiling and proceeds | Transfer is rejected before reaching OTP/summary, rather than silently succeeding | P1 |
| BT-48 | Transfer within wallet limit succeeds (risk level 2) | Repeat BT-46 with the second configured risk-level ceiling | Transfer succeeds as expected | P2 |
| BT-49 | Transfer exceeding wallet limit is blocked (risk level 2) | Repeat BT-47 with the second configured risk-level ceiling | Transfer is rejected | P2 |
| BT-50 | Transfer within wallet limit succeeds (risk level 3) | Repeat BT-46 with the third configured risk-level ceiling | Transfer succeeds as expected | P2 |
| BT-51 | Transfer exceeding wallet limit is blocked (risk level 3) | Repeat BT-47 with the third configured risk-level ceiling | Transfer is rejected | P2 |
| BT-52 | Transfer within wallet limit succeeds (risk level 4) | Repeat BT-46 with the fourth configured risk-level ceiling | Transfer succeeds as expected | P2 |
| BT-53 | Transfer exceeding wallet limit is blocked (risk level 4) | Repeat BT-47 with the fourth configured risk-level ceiling | Transfer is rejected | P2 |
| BT-54 | Transfer within wallet limit succeeds (repeat scenario A) | Repeat BT-46 as a regression pass | Transfer succeeds as expected | P3 |
| BT-55 | Transfer exceeding wallet limit is blocked (repeat scenario A) | Repeat BT-47 as a regression pass | Transfer is rejected | P3 |
| BT-56 | Transfer within wallet limit succeeds (repeat scenario B) | Repeat BT-46 as a second regression pass | Transfer succeeds as expected | P3 |
| BT-57 | Transfer exceeding wallet limit is blocked (repeat scenario B) | Repeat BT-47 as a second regression pass | Transfer is rejected | P3 |

---

## F. Transaction Limits — Hourly / Daily / Monthly / Yearly (Admin-configured, EMI-180)

Context: Admin Portal → Manage Limits → Transaction lets an admin cap cash-out activity both by cumulative amount and by transaction count, over hourly/daily/monthly/yearly windows.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| BT-58 | Transfer within hourly amount limit succeeds | Admin sets an hourly amount ceiling and saves. Biller transfers an amount within that ceiling | Standard success flow completes | P1 |
| BT-59 | Transfer below configured hourly amount limit is rejected | Same setup; Biller attempts a transfer amount outside the allowed hourly range on the low side | Validation message tells the Biller the amount falls outside the allowed range | P2 |
| BT-60 | Transfer exceeding hourly amount limit is blocked | Same setup; Biller attempts to transfer over the hourly ceiling | Validation message informs the Biller the hourly limit was exceeded; transfer blocked | P1 |
| BT-61 | Transfer within daily amount limit succeeds | Admin sets a daily amount ceiling; Biller transfers within it | Standard success flow completes | P2 |
| BT-62 | Transfer exceeding daily amount limit is blocked | Same setup; Biller transfers over the daily ceiling | Transfer is blocked with a clear message | P1 |
| BT-63 | Transfer within monthly amount limit succeeds | Admin sets a monthly amount ceiling; Biller transfers within it | Standard success flow completes | P2 |
| BT-64 | Transfer exceeding monthly amount limit is blocked | Same setup; Biller transfers over the monthly ceiling | Transfer is blocked with a clear message | P1 |
| BT-65 | Transfer within yearly amount limit succeeds | Admin sets a yearly amount ceiling; Biller transfers within it | Standard success flow completes | P2 |
| BT-66 | Transfer exceeding yearly amount limit is blocked | Same setup; Biller transfers over the yearly ceiling | Transfer is blocked with a clear message | P1 |
| BT-67 | Transfers within hourly transaction-count limit succeed | Admin sets an hourly transaction-count ceiling and saves. Biller makes transfers up to that count | Each transfer within the count succeeds | P2 |
| BT-68 | Transfer below configured hourly count limit shows Payment Failed | Same setup; force a transfer attempt outside the expected count range on the low side | "Payment Failed" message is displayed to the Biller | P2 |
| BT-69 | Transfer once hourly count limit is exceeded is blocked | Same setup; Biller exceeds the hourly transaction count | "Payment Failed" message is displayed; transfer blocked | P1 |
| BT-70 | Transfers within daily transaction-count limit succeed | Admin sets a daily count ceiling; Biller transfers up to that count | Each transfer succeeds | P2 |
| BT-71 | Transfer once daily count limit is exceeded is blocked | Same setup; Biller exceeds the daily count | Transfer blocked with a clear message | P1 |
| BT-72 | Transfers within monthly transaction-count limit succeed | Admin sets a monthly count ceiling; Biller transfers up to that count | Each transfer succeeds | P2 |
| BT-73 | Transfer once monthly count limit is exceeded is blocked | Same setup; Biller exceeds the monthly count | Transfer blocked with a clear message | P1 |
| BT-74 | Transfers within yearly transaction-count limit succeed | Admin sets a yearly count ceiling; Biller transfers up to that count | Each transfer succeeds | P2 |
| BT-75 | Transfer once yearly count limit is exceeded is blocked | Same setup; Biller exceeds the yearly count | Transfer blocked with a clear message | P1 |

---

## G. Negative & Edge Cases

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| BT-76 | Negative amount is rejected | Type `-10.00` into the amount field | Field does not accept the negative sign/value as entered; Proceed remains disabled if the field ends up empty/zero | P1 |
| BT-77 | Zero is rejected as a transfer amount | Type `0` into the amount field | Field rejects the value as a valid transfer amount; Proceed remains disabled | P1 |
| BT-78 | Alphabetic characters and symbols are rejected | Type `abc!@#` into the amount field | Field does not accept non-numeric characters; Proceed remains disabled | P1 |
| BT-79 | 3-decimal-place amount is rejected or truncated | Type `10.555` into the amount field | Field either rejects the third decimal or truncates to 2 decimal places — the raw 3-decimal string is never accepted verbatim | P2 |
| BT-80 | Pasted invalid amount is rejected | Paste `abc` into the amount field | Field remains empty; Proceed stays disabled | P2 |
| BT-81 | Insufficient funds blocks the transfer | Enter an amount greater than the current wallet balance and tap Proceed | An insufficient-funds toast/message is displayed; the transfer does not proceed | P1 |
| BT-82 | Incorrect OTP fails the transaction | Enter a valid amount, proceed to OTP, submit an incorrect code (e.g. `9999`), then cancel out | Transaction is not completed; the transactions list shows the attempt with status FAILED | P1 |

---

## Automated coverage note

This manual test suite mirrors the existing Playwright automation for Bank Transfer. Corresponding automated specs (relative to repo root):

- `BusinessTestCases/BankTransfer/functional/BankTransferHappyPath.spec.ts` — end-to-end successful transfers, decimal handling, preset amounts, commission/VAT/total math (BT-13, BT-14, BT-19–BT-22, BT-37–BT-40)
- `BusinessTestCases/BankTransfer/functional/BankTransferNegative.spec.ts` — invalid-input rejection, insufficient funds, incorrect OTP (BT-76–BT-82)
- `BusinessTestCases/BankTransfer/functional/BankTransferEdgeCases.spec.ts` — preset-override-by-edit and full-balance precision/lock behavior (BT-17, BT-18)
- `BusinessTestCases/BankTransfer/functional/BankTransferSession.spec.ts` — refresh/cancel abandonment and cross-step IBAN/total persistence (BT-36, BT-43–BT-45)
- `BusinessTestCases/BankTransfer/functional/BankTransferWalletLimits.spec.ts` — wallet-balance limit enforcement (BT-46–BT-57); currently `test.skip()`-ed pending an Admin Portal "Manage Limits → Wallet Balance" automation helper (EMI-180) — execute manually until then
- `BusinessTestCases/BankTransfer/functional/BankTransferTransactionLimits.spec.ts` — hourly/daily/monthly/yearly amount- and count-based transaction limits (BT-58–BT-75); currently `test.skip()`-ed pending an Admin Portal "Manage Limits → Transaction" automation helper (EMI-180) — execute manually until then
- `BusinessTestCases/BankTransfer/functional/BankTransferCommission.spec.ts` — fixed and percentage commission tiers and min/max boundaries (BT-24–BT-33); currently `test.skip()`-ed pending an Admin Portal "Commission Management" automation helper (EMI-180) — execute manually until then
- `BusinessTestCases/BankTransfer/functional/BankTransferOtpRequirement.spec.ts` — Merchant OTP-requirement toggle (BT-41, BT-42); currently `test.skip()`-ed pending an Admin Portal "Configuration Settings → Transaction OTP toggle" automation helper (EMI-180) — execute manually until then
- `BusinessTestCases/BankTransfer/ui/BankTransferAmountPage.spec.ts` — Amount step element presence (BT-01–BT-12)
- `BusinessTestCases/BankTransfer/ui/BankTransferConfirmationPage.spec.ts` — Confirmation summary element presence (BT-20, BT-23)
- `BusinessTestCases/BankTransfer/ui/BankTransferOtpPage.spec.ts` — OTP step element presence (BT-34, BT-35)
