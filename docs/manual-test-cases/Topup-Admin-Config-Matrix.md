# Test Cases — Topup × Admin Configuration (OTP, Minimum Amount, Limits, Commission)

Scope: card top-up (Cash-In: MADA / VISA / MASTER, SAR) on the business web client, where behaviour is
driven by **Admin Portal configuration**. This document covers the configuration-driven rules and the
way they interact, plus the non-functional, security and usability cases that sit around them. It is
written to be **turned into automation later**, so every case has a stable ID, explicit config, and an
automation hint.

It complements, and does not repeat:
- `Topup.md` — UI-element level cases (`TUP-01..35`).
- `B2B-Transactions.md` §D (`TU-01..14`), §M (`TU-WB01..08` wallet max balance), §N (`TU-TL01..12`
  transaction limits), §O (`TU-CM01..32` commission). Cases here that extend those say so.

ID prefix: **`TUA-`** (Topup Admin-config). Sections: A OTP · B Minimum amount · C Limits · D Limits × Commission ·
E Cross-rule precedence · F Outcome/state interplay · G Concurrency & idempotency · H Config lifecycle & restore ·
I Security · J Non-functional · K Usability & localization · L Data integrity & audit.

Priority: **P1** release-blocking / money-moving, **P2** important, **P3** edge/polish.
Auto: **A** = automatable now with existing helpers, **A\*** = automatable once the noted dependency exists,
**M** = manual only (visual / human judgement / env not controllable).

---

## 0. Conventions, assumptions and the restore rule

### 0.1 Config symbols used in the tables

| Symbol | Meaning | Where configured |
|---|---|---|
| `OTP_on` / `OTP_off` | Top-up OTP enabled / disabled (operationCode **102**) | Admin → OTP configuration |
| `MIN_TOPUP` | **Minimum top-up amount** (separate setting from the commission tier minimum) | Admin portal — *exact screen/name to confirm* |
| `BAL_MAX` | Wallet max-balance ceiling, per account type (Merchant/Biller) and risk tier (Low/Medium/High) | Admin → Wallet limits |
| `AMT_D / AMT_W / AMT_M` | Cumulative top-up **amount** limit per day / week / month | Admin → Transaction limits |
| `CNT_D / CNT_W / CNT_M` | Top-up **count** limit per day / week / month (0 = top-up disabled for that tier) | Admin → Transaction limits |
| `TXN_MAX` | Single-transaction maximum, if configured for top-up | Admin → Transaction limits (*confirm exists*) |
| `COM(pct\|fixed, v, [Tmin,Tmax], platform)` | Default Commission tier for the account's cash-in type (Biller: "Biller Bank Cashin" code 102003; Merchant: "Merchant Cashin"), platform WEB/APP | Admin → Default Commission |
| `COM_ACC` | Account-level commission override; takes priority over `COM` | Admin → Accounts Commission |

### 0.2 The restore rule (mandatory for every case that changes config)

> Every limit, OTP flag, minimum amount and commission value changed by a case **must be returned to the exact
> original value** — including "not configured" — when the case ends, **pass or fail**.

1. **Snapshot first.** Before the first change, read and store the original value *and* its Active/Inactive state
   (for "not configured", store "absent"). Prefer the admin API read (as `prepareBillerTopupCommission` does) over
   scraping the grid.
2. **Restore in a `finally` / `afterAll`**, not in the last step of the test. Restore exactly: value, type
   (percentage/fixed), min, max, platform, Active state.
3. **Verify the restore** by re-reading after writing; fail the run loudly if it does not match the snapshot.
4. **One admin session per file**, reused (a second concurrent login as the same admin invalidates the first —
   confirmed 401 `SESSION_INVALID`).
5. **Rows that did not exist** (created by the test) are disabled/removed afterwards; if no delete exists, they must be
   left Inactive, never Active.
6. **Counters are not config but are state**: day/week/month usage accumulated by a case is real state on the test
   account. Cases that consume count/amount quota must state the quota they leave behind (see §0.4).
7. **Interrupted run safety net:** a pre-flight check at the start of every config-changing suite compares live config to
   the last known baseline and reports drift instead of silently building on it.

### 0.3 Assumptions — review status (cases still depending on an open one keep the `[CONFIRM-n]` tag)

| # | Assumption | Status |
|---|---|---|
| 1 | `MIN_TOPUP` is evaluated on the **entered (gross) amount**, before commission | **OPEN — verify live on dev** with one large amount; keep `[CONFIRM-1]` |
| 2 | Amount limits (`AMT_*`) are evaluated on the **gross entered amount**, not net of commission | **Approved** |
| 3 | `BAL_MAX` compares **balance + net credited amount** (amount − commission − VAT) against the ceiling | **Approved** |
| 4 | Order of checks: format validation → `MIN_TOPUP` → `TXN_MAX` → `CNT_*` → `AMT_*` → `BAL_MAX` → commission calc (Summary) → OTP → gateway | **Approved** |
| 5 | A **failed or pending** top-up does **not** consume `AMT_*` / `CNT_*` quota; only SUCCESS does | **OPEN — verify on dev**; keep `[CONFIRM-5]` (expected results of dependent cases are recorded on the first dev run, then locked) |
| 6 | Limits and minimum are enforced **server-side**, not only in the UI | **Approved** |
| 7 | Config changes take effect on the **next** initiation without re-login | **Approved** |
| 8 | Day/week/month windows are **calendar** windows in **KSA time (UTC+3)** | **Approved** |
| 9 | VAT is 15% **on the commission**; net credit = amount − commission − VAT | **Approved** |
| 10 | A single-transaction maximum (`TXN_MAX`) exists for top-up, **per account type and risk tier** | **Confirmed** |

### 0.4 Test accounts & quota hygiene

- **Multiple accounts can run in parallel.** Use one dedicated account per quota-consuming case/suite, so no two cases share
  daily/weekly/monthly usage or wallet headroom (the Biller account Q9557 has already hit
  `COLLECTION_DESTINATION_WALLET_LIMITATION_EXCEEDED` from accumulated top-ups — do not reuse it for limit/count suites).
- **Parallel workers are fine across different accounts, but admin-config changes must serialize per config row:** one admin
  session is reused, and a second admin login invalidates the first (401 `SESSION_INVALID`).
- Prefer cases that stop at the **Summary / initiation** step wherever the rule is enforced there — they consume no quota.
- Where a full payment is required, state it in the Auto column as "full pay" so the runner can budget quota.

### 0.5 Worked arithmetic used in the tables

Percentage commission `p%` on amount `a`: `commission = a × p/100`; VAT = `commission × 15%`; **net credited = a − commission − VAT**.
Fixed commission `f`: `commission = f` regardless of `a`.
Tier boundaries are inclusive unless a live check shows otherwise: `Tmin ≤ a ≤ Tmax`.

---

## A. Top-up OTP (operationCode 102) — admin-configured

| ID | Title | Config / Preconditions | Steps | Expected Result | P | Auto |
|---|---|---|---|---|---|---|
| TUA-A01 | OTP enabled → OTP screen shown after Summary Next | `OTP_on` | Amount → Proceed → Summary → Next | OTP screen appears (6 boxes, countdown); gateway popup has **not** opened yet | P1 | A |
| TUA-A02 | OTP disabled → gateway opens straight after Next | `OTP_off` | Same flow | No OTP screen; gateway popup opens right after Next | P1 | A |
| TUA-A03 | Toggle takes effect on next initiation without re-login | Start `OTP_on`; admin switches to `OTP_off` mid-session | Refresh Topup, run a new top-up | New top-up skips OTP; a top-up already at the OTP screen is not altered — its in-flight OTP still verifies normally | P1 | A |
| TUA-A04 | Re-enabling OTP restores the OTP step | `OTP_off` → admin sets `OTP_on` | New top-up | OTP screen shown again | P1 | A |
| TUA-A05 | OTP flag restored to original after the suite | Snapshot original `OTP` state | Run any A-case, then check config | State equals snapshot (see §0.2) | P1 | A |
| TUA-A06 | OTP sent to the registered mobile of the logged-in account only | `OTP_on` | Next on Summary; read OTP from DB for account mobile | OTP exists for that mobile; none for other numbers | P1 | A |
| TUA-A07 | OTP is bound to this top-up (cannot be replayed for another) | `OTP_on` | Obtain OTP for top-up #1; initiate top-up #2; enter #1's code | Rejected | P1 | A\* |
| TUA-A08 | Expired OTP rejected | `OTP_on` | Wait past countdown (00:00); enter the original code | Rejected with clear message; Resend becomes available | P1 | A |
| TUA-A09 | Resent OTP invalidates the previous OTP | `OTP_on` | Wait for expiry, Resend; enter the **old** code, then the new one | Old rejected, new accepted | P1 | A |
| TUA-A10 | Wrong OTP does not open the gateway | `OTP_on` | Enter a non-bypass wrong code (not `918512`-style bypass) | Gateway popup does not open; still on OTP screen (extends `TUP-28`) | P1 | A |
| TUA-A11 | Repeated wrong OTPs end in a redirect | `OTP_on` | Keep entering wrong (non-bypass) codes until the system redirects (expected after ~3–4 attempts); count the attempts | Redirected away from the OTP screen; no payment initiated, no gateway popup; the actual attempt count is recorded and then locked as the expected value | P1 | A |
| TUA-A12 | OTP-disabled path still enforces every other rule | `OTP_off` + a limit exceeded | Next on Summary | Limit/min-amount/commission rules still applied; disabling OTP never bypasses them | P1 | A |
| TUA-A13 | OTP-disabled path is not a downgrade for the idempotency key | `OTP_off` | Capture `POST /api/v1/payments` | `IdempotencyKey` header present and unique per initiation | P2 | A |
| TUA-A14 | OTP screen mini-summary shows the same figures as Summary | `OTP_on`, commission on | Compare Summary vs OTP mini-summary | Method and total identical (copy casing differences are cosmetic — see `TUP-22`) | P2 | A |
| TUA-A15 | OTP cancel returns to form with no side effects, quota untouched | `OTP_on`, `CNT_D` configured | Cancel at OTP; check usage counter and balance | Balance unchanged; count/amount quota **not** consumed | P1 | A\* |
| TUA-A16 | Browser back/refresh on OTP screen | `OTP_on` | Refresh the OTP page; press browser Back | No duplicate initiation; user returned safely; no orphan PENDING that blocks the next attempt | P2 | A |
| TUA-A17 | OTP disabled for top-up only does not affect other operations | `OTP_off` for 102 only | Check bill-payment/bank-transfer OTP | Their OTP flags unchanged (config isolation) | P2 | A |
| TUA-A18 | Mixed: OTP on + minimum amount not met | `OTP_on`, `MIN_TOPUP`=m | Enter amount m−0.01 | Rejected **before** an OTP is sent (no OTP row created) | P1 | A |
| TUA-A19 | Mixed: OTP on + limit exceeded | `OTP_on`, `AMT_D` exhausted | Enter amount → Proceed | Blocked **before** any OTP is sent (no OTP row created, no OTP screen); no gateway popup | P1 | A |
| TUA-A20 | Mixed: OTP on + commission shown | `OTP_on`, `COM` active | Full flow | Summary commission == credited difference after success (guards the known gross-credit defect, TU-CM13) | P1 | A\* |

---

## B. Minimum top-up amount (`MIN_TOPUP`, separate admin setting)

Let `m = MIN_TOPUP`. Boundary table: `m−0.01` (below), `m` (at), `m+0.01` (above).

| ID | Title | Config | Steps | Expected Result | P | Auto |
|---|---|---|---|---|---|---|
| TUA-B01 | Amount below minimum blocked | `MIN_TOPUP`=m | Enter `m−0.01`, Proceed | Amount field shows an inline "minimum amount" message and **Proceed stays disabled**; no Summary, no OTP, no payment | P1 | A |
| TUA-B02 | Amount equal to minimum accepted | same | Enter `m` | Reaches Summary; flow continues | P1 | A |
| TUA-B03 | Amount just above minimum accepted | same | Enter `m+0.01` | Reaches Summary | P2 | A |
| TUA-B04 | Raising the minimum takes effect | Admin raises m → m2 | Enter old m (now below) | Blocked | P1 | A |
| TUA-B05 | Lowering the minimum takes effect | Admin lowers m → m3 | Enter m3 | Accepted | P1 | A |
| TUA-B06 | Minimum restored to original after test | Snapshot m | Run B04/B05 then read config | Equals snapshot (§0.2) | P1 | A |
| TUA-B07 | Minimum message is localized (AR/EN) and contains the configured value | `MIN_TOPUP`=m | Trigger B01 in each language | Message reads correctly and shows `m` (not a stale/hard-coded number) | P2 | A |
| TUA-B08 | Server enforces the minimum, not only the UI | `MIN_TOPUP`=m | Replay `POST /api/v1/payments` with amount `m−0.01` (valid token) | 4xx with a business error code; no PENDING row | P1 | A |
| TUA-B09 | Minimum vs. preset chips | `MIN_TOPUP` > 500 | Click the 500 chip | Chip fills the field but Proceed is blocked/the amount rejected consistently (chips must not bypass the rule) | P2 | A |
| TUA-B10 | Minimum applied per account type **and** risk tier | `MIN_TOPUP` set to a different value for each cell of the matrix {Merchant, Biller} × {Low, Medium, High} (dedicated account per cell, run in parallel) | In each cell enter `m−0.01`, `m`; also enter another cell's minimum | Each account is judged only against its own cell's minimum; no cross-cell leakage | P2 | A\* |
| TUA-B11 | Minimum with decimals | `MIN_TOPUP`=m (e.g. 10.50) | Enter `10.49`, `10.50`, `10.505` | 10.49 blocked, 10.50 accepted, 10.505 truncated to 10.50 by the 2-dp rule then accepted | P2 | A |
| TUA-B12 | Minimum of 0 / not configured | `MIN_TOPUP` absent or 0 | Enter `0.01` | Only the generic ">0" rule applies (`TUP-12`) | P3 | A |
| TUA-B13 | Minimum **greater than** maximum limit (misconfiguration) | `MIN_TOPUP` > `TXN_MAX` or > `AMT_D` | Try to save; then try any amount | **Verify on dev** — record whether the admin save is rejected/warned or saved silently; if saved, no amount can succeed and the user sees a coherent message, not a crash | P2 | A\* |
| TUA-B14 | Minimum interacts with commission tier gap | `m` < `Tmin` (amount valid but outside any tier) | Enter `m` | **Verify on dev** — record the outcome (no commission vs blocked); same "gap" outcome as TU-CM22 | P2 | A |
| TUA-B15 | Net credit would be ≤ 0 | `COM(fixed, f)` with `m` ≤ f | Enter `m` | **Blocked with a clear message** — a top-up must never credit ≤ 0 or negative | P1 | A |
| TUA-B16 | Minimum persists across sessions/devices | `MIN_TOPUP`=m | Check in a fresh login and on the mobile app (same account) | Same minimum enforced | P3 | A\* |

---

## C. Limits — standalone coverage extending TU-WB / TU-TL

Existing `TU-WB01..08` and `TU-TL01..12` prove "within = pass, over = block". These cases add **exact-boundary**, **window**,
**accounting** and **message** coverage. `L` = the limit under test, `U` = usage already consumed.

### C.1 Wallet max balance (`BAL_MAX`)

| ID | Title | Config | Steps | Expected | P | Auto |
|---|---|---|---|---|---|---|
| TUA-C01 | Top-up landing exactly on the ceiling | `BAL_MAX`=B; balance = B−a | Top up `a` | Succeeds; balance == B | P1 | A\* |
| TUA-C02 | Top-up 0.01 over the ceiling | same | Top up `a+0.01` | Blocked **before** gateway; balance unchanged | P1 | A\* |
| TUA-C03 | Balance already at ceiling | balance == B | Any top-up | Blocked | P1 | A\* |
| TUA-C04 | Ceiling raised mid-use | Blocked at B; admin raises to B2 | Retry same amount | Now succeeds | P2 | A\* |
| TUA-C05 | Ceiling lowered below current balance | admin sets B < balance | Top up `a` | Existing balance untouched (no clawback); every new top-up is blocked until balance falls under the ceiling | P1 | A\* |
| TUA-C06 | Ceiling per risk tier (Low/Med/High) | Different B per tier | Same account, change tier | Matching ceiling applies | P2 | A\* |
| TUA-C07 | Ceiling per account type | Merchant vs Biller B differ | Top up on each | Own ceiling applies | P2 | A\* |
| TUA-C08 | Reserved / pending funds counted? | PENDING top-up exists | Second top-up near ceiling | Behaviour documented: pending either counts or not, consistently with the ledger `[CONFIRM-5]` | P2 | A\* |
| TUA-C09 | Ceiling error message | `BAL_MAX` breached | Observe | Clear localized message; no technical code leaked | P2 | M |
| TUA-C10 | Ceiling restored | Snapshot B | After C-cases | Equals snapshot | P1 | A\* |

### C.2 Cumulative amount limits (`AMT_D / AMT_W / AMT_M`)

| ID | Title | Config | Steps | Expected | P | Auto |
|---|---|---|---|---|---|---|
| TUA-C11 | Exactly reaching the daily amount limit | `AMT_D`=L, usage U | Top up `L−U` | Succeeds; usage == L | P1 | A\* |
| TUA-C12 | One halala over the daily limit | same | Top up `L−U+0.01` | Blocked | P1 | A\* |
| TUA-C13 | Two top-ups that together cross the limit | `AMT_D`=L | #1 `0.6L`, #2 `0.6L` | #1 ok, #2 blocked (limit is cumulative, not per-txn) | P1 | A\* |
| TUA-C14 | Failed top-up does not consume daily amount | `AMT_D`=L | Fail a top-up (gateway "User canceled"), then top up `L` | Second succeeds `[CONFIRM-5]` | P1 | A\* |
| TUA-C15 | Pending top-up and the amount limit | pending exists | Check usage; try top-up using the remaining | Documented: pending counted or not — must match ledger reality | P2 | A\* |
| TUA-C16 | Weekly limit tighter than daily | `AMT_W` < sum of 7 daily allowances | Reach `AMT_W` across days | Weekly blocks even though daily has headroom | P2 | A\* |
| TUA-C17 | Monthly limit tighter than weekly | `AMT_M` < 4×`AMT_W` | Reach `AMT_M` | Monthly blocks | P2 | A\* |
| TUA-C18 | Most-restrictive-limit-wins message | `AMT_D` and `AMT_W` both exceeded | Attempt | Blocked with one clear message naming the tightest / first limit hit; record which limit is named and lock it as expected | P2 | A\* |
| TUA-C19 | Daily window rollover at midnight (KSA) | `AMT_D` exhausted at 23:59 | Retry just after 00:00 | Allowed again | P2 | M |
| TUA-C20 | Weekly / monthly rollover | `AMT_W/M` exhausted | Retry at window start | Allowed again | P3 | M |
| TUA-C21 | Limit raised / lowered mid-day | `AMT_D` L→L2 with usage U | Attempt remaining | Evaluated against the **new** value and **existing** usage | P2 | A\* |
| TUA-C22 | Limit removed (not configured) | delete/clear `AMT_D` | Large top-up | No amount cap from this limit (other caps still apply) | P3 | A\* |
| TUA-C23 | Amount limit restored | Snapshot | After suite | Equals snapshot | P1 | A\* |

### C.3 Count limits (`CNT_D / CNT_W / CNT_M`)

| ID | Title | Config | Steps | Expected | P | Auto |
|---|---|---|---|---|---|---|
| TUA-C24 | Nth top-up allowed, N+1 blocked | `CNT_D`=N, usage 0 | N successful top-ups then one more | N+1 blocked | P1 | A\* (full pay ×N) |
| TUA-C25 | `CNT_D`=1 boundary | `CNT_D`=1 | Two top-ups | 1st ok, 2nd blocked | P1 | A\* |
| TUA-C26 | `CNT_D`=0 disables top-up | `CNT_D`=0 (extends TU-TL09) | Open Topup, try | The Topup page still opens; the user is blocked at initiation (Proceed/Next) with a clear message; no OTP, no payment | P1 | A |
| TUA-C27 | Failed attempts do not consume count | `CNT_D`=1 | Fail one, then succeed once | Both allowed `[CONFIRM-5]` | P1 | A\* |
| TUA-C28 | Cancel at Summary/OTP does not consume count | `CNT_D`=1 | Cancel, then top up | Allowed | P1 | A |
| TUA-C29 | Pending counted? | pending exists | Try again | Documented and consistent | P2 | A\* |
| TUA-C30 | Count window rollover | `CNT_*` exhausted | After window start | Allowed again | P2 | M |
| TUA-C31 | Weekly/monthly count tighter than daily | `CNT_W` < 7×`CNT_D` | Exhaust `CNT_W` | Weekly blocks | P2 | A\* |
| TUA-C32 | Count limit restored | Snapshot | After suite | Equals snapshot | P1 | A\* |

### C.4 Single transaction maximum (`TXN_MAX`) — configured per account type and risk tier

| ID | Title | Config | Steps | Expected | P | Auto |
|---|---|---|---|---|---|---|
| TUA-C36 | `TXN_MAX` applied per account type × risk tier | `TXN_MAX` set to a different value for each cell {Merchant, Biller} × {Low, Medium, High} (dedicated account per cell, run in parallel) | In each cell enter its own max and max+0.01; also enter another cell's max | Each account is judged only against its own cell's value; no cross-cell leakage | P2 | A\* |
| TUA-C33 | Exactly `TXN_MAX` accepted | `TXN_MAX`=X | Enter X | Accepted | P1 | A\* |
| TUA-C34 | `TXN_MAX`+0.01 blocked | same | Enter X+0.01 | Blocked with a clear message | P1 | A\* |
| TUA-C35 | Interaction with 7-digit input cap | `TXN_MAX` > 9,999,999 | Enter 9,999,999 | UI cap applies first (silent truncation, see `TUP-13`) | P3 | A |

---

## D. Limits × Commission (the mixed matrix)

Core idea: commission changes **what the user pays/receives** while limits are measured against
**one of those figures**. Each case below fixes both the limit and the commission and
asserts the Summary figures, the allow/block decision and the final credited amount.

Common setup: `COM(pct, p, [Tmin,Tmax], WEB)` active; account is Biller (code 102003) unless stated.
`a` = entered amount, `c` = commission, `n` = net credited.

### D.1 Amount limits × commission

| ID | Title | Config | Steps | Expected | P | Auto |
|---|---|---|---|---|---|---|
| TUA-D01 | Limit measured on gross entered amount | `AMT_D`=L, `COM(pct,p)` | Top up `a = L` | Allowed; usage consumed == `L` (gross), **not** `L−c` | P1 | A\* |
| TUA-D02 | Gross over limit blocked even if net would fit | `AMT_D`=L, `p` large | Top up `a = L+1` (net `n < L`) | Blocked — the check must not use net | P1 | A\* |
| TUA-D03 | Net figure never exceeds the limit headroom | `AMT_D`=L, usage U | Top up `a = L−U` | Succeeds; credited `n = a−c−VAT`; usage == L | P1 | A\* |
| TUA-D04 | Exhausted limit blocks at Proceed, before any commission preview | `AMT_D` exhausted, `COM` active | Enter amount → Proceed | Blocked at Proceed with a clear message; **no Summary, no commission preview**, no OTP | P2 | A |
| TUA-D05 | Disabling commission does not change limit accounting | `AMT_D`=L; `COM` Inactive | Top up `a` | Usage == `a`; credited == `a` | P2 | A\* |
| TUA-D06 | Enabling commission mid-day: earlier usage unchanged | usage U from before | Activate `COM`, top up | New usage adds gross; old usage not recomputed | P2 | A\* |
| TUA-D07 | Commission tier boundary amount that is also the limit | `Tmax` == `AMT_D` | Top up `Tmax` | Commission computed at tier max; limit exactly reached; both correct | P1 | A\* |
| TUA-D08 | Limit smaller than tier minimum | `AMT_D` < `Tmin` | Top up `AMT_D` | Allowed by limit; amount is in the tier gap (commission per gap rule, TU-CM22) | P2 | A |
| TUA-D09 | Weekly/monthly amount × percentage commission | `AMT_W`, `COM(pct)` | Several top-ups reaching `AMT_W` | Usage tracks gross; last permitted top-up lands exactly on `AMT_W` | P2 | A\* |
| TUA-D10 | Fixed commission ≥ amount | `COM(fixed,f)`, `a ≤ f` | Top up `a` | Blocked with a clear message — never a non-positive credit (see TUA-B15) | P1 | A |

### D.2 Wallet max-balance × commission

| ID | Title | Config | Steps | Expected | P | Auto |
|---|---|---|---|---|---|---|
| TUA-D11 | Net credit lands exactly on ceiling | `BAL_MAX`=B, `COM(pct,p)`, balance = B−n | Top up `a` with net `n` | Allowed; final balance == B | P1 | A\* |
| TUA-D12 | Gross would exceed, net would not | balance + a > B but balance + n ≤ B | Top up `a` | **Allowed** — the ceiling is checked on balance + net credit (assumption 3); final balance ≤ B and equals the ledger | P1 | A\* |
| TUA-D13 | Net exceeds by 0.01 | balance + n = B + 0.01 | Top up | Blocked | P1 | A\* |
| TUA-D14 | Commission removed → previously allowed amount now blocked | `BAL_MAX`, `COM` Active then Inactive | Same amount twice | With commission: allowed; without: blocked (net grows) — verifies ordering of checks | P2 | A\* |
| TUA-D15 | VAT included in net for the ceiling check | `COM(pct)` with VAT | Compute `n = a−c−VAT` | Ceiling check uses the same `n` as the credit | P2 | A\* |

### D.3 Count limits × commission

| ID | Title | Config | Steps | Expected | P | Auto |
|---|---|---|---|---|---|---|
| TUA-D16 | Commission applied on every counted top-up | `CNT_D`=3, `COM` | 3 top-ups | Each credit is net of its own commission; 4th blocked | P1 | A\* (full pay ×3) |
| TUA-D17 | Blocked 4th top-up shows no commission charge | same | Attempt 4th | No ledger commission, no balance movement | P1 | A\* |
| TUA-D18 | `CNT_D`=0 with commission active | `CNT_D`=0 | Open Topup | Blocked regardless of commission; commission never previewed for a disallowed top-up | P1 | A |
| TUA-D19 | Failed top-up with commission leaves no commission charged | `COM`, gateway fail | Fail then check ledger | `destination_commission_amount` null/0; count not consumed | P1 | A\* |
| TUA-D20 | Pending top-up with commission | gateway pending | Check ledger | Commission **not** posted until SUCCESS | P1 | A\* |

### D.4 Platform and override interplay

| ID | Title | Config | Steps | Expected | P | Auto |
|---|---|---|---|---|---|---|
| TUA-D21 | Account override + limit | `COM_ACC` (p2), `AMT_D`=L | Top up | Override commission applied; limit identical to without override | P1 | A\* |
| TUA-D22 | Override disabled mid-test, default resumes, limit unchanged | `COM_ACC` Active→Inactive | Same amount twice | Commission switches default↔override; limit usage same | P2 | A\* |
| TUA-D23 | APP-only commission does not affect Web top-up, limit still applies | `COM(APP)`, `AMT_D` | Web top-up | No commission; limit applies normally | P2 | A\* |
| TUA-D24 | No commission row exists + limits active | Delete/none `COM` | Top up | Commission 0; limits apply; no error | P2 | A |
| TUA-D25 | Commission type flipped percentage↔fixed does not alter limit accounting | `COM` type edit | Top up | Usage == gross in both cases | P3 | **Blocked by defect TU-CM03** (type edit ignored by backend) — keep, do not run until fixed |

---

## E. Cross-rule precedence (several rules violated at once)

Approved order (assumption 4): **format validation → `MIN_TOPUP` → `TXN_MAX` → `CNT_*` → `AMT_*` → `BAL_MAX` → commission → OTP → gateway.**
Each case violates two or more rules and asserts **exactly one** clear message (the first in order) and **no** side effects.

| ID | Title | Config | Steps | Expected | P | Auto |
|---|---|---|---|---|---|---|
| TUA-E01 | Below minimum **and** over daily limit | `MIN_TOPUP`=m; `AMT_D` exhausted | Enter `m−1` | Minimum message wins; no limit message | P1 | A\* |
| TUA-E02 | Over `TXN_MAX` **and** over `AMT_D` | both | Enter above both | One deterministic message | P2 | A\* |
| TUA-E03 | Count exhausted **and** amount fine | `CNT_D` exhausted | Valid amount | Count message | P1 | A\* |
| TUA-E04 | Amount limit and balance ceiling both violated | both | Large amount | One deterministic message | P2 | A\* |
| TUA-E05 | Valid amount, all limits fine, OTP wrong | all ok, `OTP_on` | Wrong OTP | OTP error only; no limit consumed | P1 | A |
| TUA-E06 | All rules satisfied together (golden path) | `OTP_on`, `MIN_TOPUP`, all limits with headroom, `COM` active | Full flow with VISA | Success; credit == `a − c − VAT`; usage += gross; count += 1; PENDING→SUCCESS rows | P1 | A\* (full pay) |
| TUA-E07 | All rules loosened (nothing configured) | no limits, no `MIN_TOPUP`, no `COM`, `OTP_off` | Full flow | Success; credit == `a`; no commission | P2 | A\* |
| TUA-E08 | Same flow across MADA / VISA / MASTER | all rules on | Repeat E06 per method | Rules identical per method (no per-brand bypass) | P1 | A\* |
| TUA-E09 | Restoring config returns the original precedence outcome | Snapshot → mutate → restore | Re-run E01 | Outcome identical to the first run | P1 | A\* |

---

## F. Outcome/state interplay (what counts toward quota and commission)

> **F02, F03, F04, F07, F08 — expected results are verify-on-dev.** Whether failed / pending / reversed top-ups use quota is
> open (assumption 5). The first dev run records the real behaviour; the recorded result is then locked as the expected value.

| ID | Title | Setup | Expected | P | Auto |
|---|---|---|---|---|---|
| TUA-F01 | SUCCESS consumes count and gross amount, posts commission | Success top-up | usage += gross; count += 1; commission posted once | P1 | A\* |
| TUA-F02 | FAILED (User canceled / limit exceeded / too many tries) consumes nothing | Each gateway code 2/4/5 | usage and count unchanged; no commission; reserve released | P1 | A\* |
| TUA-F03 | PENDING consumes nothing until resolved | Gateway code 3 | usage unchanged while pending; on later SUCCESS it is consumed once | P1 | A\* |
| TUA-F04 | PENDING later resolves FAILED | pending → fail | No quota consumed; one terminal row | P1 | A\* |
| TUA-F05 | Pop-up blocked after OTP (`TUP-30`) consumes nothing | Block pop-ups | No payment; quota unchanged; user can retry | P2 | A |
| TUA-F06 | Browser closed mid-gateway | Kill the tab at card entry | PENDING handled by TTL/auto-reverse; quota not stuck | P2 | M |
| TUA-F07 | Gateway success but callback delayed | Delay callback | Wallet credited once when it arrives; limits updated once | P2 | A\* |
| TUA-F08 | Reversal / refund restores quota? | Reverse a successful top-up | Document whether `AMT_*`/`CNT_*` usage is given back | P2 | M |
| TUA-F09 | Successful top-up with commission: ledger identity | Success | `amount` (gross) − `commission` − `vat` == wallet delta; matches `base_transaction` and `transaction_log` | P1 | A\* |
| TUA-F10 | Home, Topup widget, Transactions list, Mongo, SQL all agree after success | Success | Four status vocabularies consistent (as in the happy-path test) | P1 | A\* |

---

## G. Concurrency & idempotency

> G01–G03 use **two separate accounts' sessions** racing for one remaining slot/headroom on a shared rule (e.g. a shared
> account-level config) or **two sessions of one account** for per-account quota; G09 uses one account in two browsers.

| ID | Title | Setup | Expected | P | Auto |
|---|---|---|---|---|---|
| TUA-G01 | Two simultaneous top-ups racing the last count slot | `CNT_D` has 1 slot left; two sessions | Exactly one succeeds; the other blocked; never both | P1 | A\* |
| TUA-G02 | Two simultaneous top-ups racing the last amount headroom | `AMT_D` headroom fits one | Exactly one succeeds | P1 | A\* |
| TUA-G03 | Race against `BAL_MAX` | Headroom for one | Exactly one succeeds; balance never exceeds ceiling | P1 | A\* |
| TUA-G04 | Same `IdempotencyKey` replayed | Replay `POST /payments` | One payment only; quota consumed once; commission once | P1 | A |
| TUA-G05 | Double-click on Next / Pay Now | Click twice quickly | One OTP send / one payment | P1 | A |
| TUA-G06 | Admin changes limit between Summary and Pay Now | Open Summary, lower limit, continue | Defined outcome: re-validated at initiation or at settle; no over-limit credit | P1 | A\* |
| TUA-G07 | Admin changes commission between Summary and Pay Now | Open Summary, change `COM`, continue | Documented: the figure shown at Summary vs the figure charged must match, or user is told | P1 | A\* |
| TUA-G08 | Admin disables OTP while a user is on the OTP screen | Toggle `OTP_off` | That in-flight OTP still verifies; no stuck state | P3 | A\* |
| TUA-G09 | Same account in two browsers | Two sessions | Quota shared, not per-session | P2 | A\* |

---

## H. Config lifecycle & restore (admin side)

| ID | Title | Steps | Expected | P | Auto |
|---|---|---|---|---|---|
| TUA-H01 | Each config write is read back and equals the snapshot after restore | Snapshot → change → restore → re-read | Equal for OTP, `MIN_TOPUP`, every limit, commission | P1 | A\* |
| TUA-H02 | Restore runs when the test fails midway | Force an assertion failure after mutation | `finally`/`afterAll` still restores | P1 | A |
| TUA-H03 | Restore runs when the browser crashes | Kill browser mid-test | Next run's pre-flight detects and repairs drift (or reports it) | P1 | A\* |
| TUA-H04 | Restoring "not configured" | Limit absent originally | After run it is absent/Inactive, not left at the test value | P1 | A\* |
| TUA-H05 | Admin saves invalid config (min > max, negative, non-numeric, blank) | Try each | Rejected with validation message; nothing persisted | P2 | A\* |
| TUA-H06 | Admin changes are audited | Change a limit | Audit log shows who/what/old→new/when | P2 | M |
| TUA-H07 | Only authorized admin roles can edit these configs | Non-privileged admin | Edit controls absent or 403 | P1 | A\* |
| TUA-H08 | Single-session-per-admin policy | Two admin logins | Second invalidates first — tests reuse one session (documented) | P3 | A |
| TUA-H09 | Duplicate commission row rejected | Create a second row same type+platform | 409 `COMMISSION_ALREADY_EXISTS`, nothing persisted | P2 | A |
| TUA-H10 | Config change visible to the mobile app and the web consistently | Change limit; check both clients | Same enforcement | P3 | A\* |

---

## I. Security

| ID | Title | Steps | Expected | P | Auto |
|---|---|---|---|---|---|
| TUA-I01 | Tamper amount below `MIN_TOPUP` in the request | Edit `amount` in `POST /payments` | Server rejects (see TUA-B08) | P1 | A |
| TUA-I02 | Tamper amount above limit in the request | Craft over-limit payload | Server rejects | P1 | A |
| TUA-I03 | Client-supplied commission/VAT ignored | Add `commission`/`vat` fields to the payload | Server recomputes; client values ignored | P1 | A |
| TUA-I04 | Negative, zero, scientific-notation, very large, and string amounts | `-10`, `0`, `1e9`, `"abc"`, `99999999` | All rejected cleanly; no 500 | P1 | A |
| TUA-I05 | Skip OTP step by calling the payment endpoint directly | `OTP_on`; call `/payments` without OTP verification | Rejected (no gateway session issued) | P1 | A |
| TUA-I06 | Replay a previous OTP verification | Reuse old verified token | Rejected | P1 | A\* |
| TUA-I07 | IDOR: initiate/read another account's top-up | Swap profile/wallet IDs | 403/404 | P1 | A |
| TUA-I08 | Missing / expired / forged JWT | No token; expired; tampered signature | 401; no data | P1 | A |
| TUA-I09 | Missing device fingerprint header | Drop `device-finger-print` | Rejected by gateway filter | P2 | A |
| TUA-I10 | Idempotency key reuse across accounts | Same key, different account | No cross-account effect | P2 | A |
| TUA-I11 | Card data never stored client-side | Inspect localStorage/sessionStorage/network | No PAN/CVV in main page (extends `TUP-35`) | P1 | A |
| TUA-I12 | PAN/CVV not present in logs or API responses | Inspect responses/logs | None | P1 | M |
| TUA-I13 | Brute-force OTP | Rapid guesses | Throttled/locked (TUA-A11) | P1 | A\* |
| TUA-I14 | OTP delivery rate limiting | Hammer Resend | Throttled; no SMS flood | P2 | A\* |
| TUA-I15 | Rate limiting on `/payments` | Burst of initiations | Throttled or limit logic holds; no limit bypass by speed | P2 | A\* |
| TUA-I16 | XSS / injection in free fields | `<script>`, SQL in amount/holder name | Rejected/escaped | P2 | A |
| TUA-I17 | CSRF / cross-origin initiation | Cross-site form post | Blocked (token/origin checks) | P2 | A\* |
| TUA-I18 | Gateway return URL / callback tamper | Alter result params | Server trusts gateway callback only, not client redirect params | P1 | A\* |
| TUA-I19 | Gateway amount mismatch | Gateway reports different amount than initiated | Rejected/flagged; no credit | P1 | A\* |
| TUA-I20 | Session expiry mid-flow | Let token expire at Summary | Redirect to login; no orphan payment | P2 | A |
| TUA-I21 | Direct URL without auth (`TUP-04`) | Open top-up URL logged out | Redirect to login | P1 | A |
| TUA-I22 | Clickjacking / framing | Embed page in iframe | Blocked by headers | P3 | A |
| TUA-I23 | Security headers & TLS | Inspect response headers | HSTS, CSP, X-Content-Type-Options present | P3 | A |
| TUA-I24 | Admin-config endpoints not callable by business tokens | Call admin limit/commission APIs with a business JWT | 401/403 | P1 | A |

---

## J. Non-functional

### J.1 Performance

| ID | Title | Target (confirm) | Auto |
|---|---|---|---|
| TUA-J01 | Topup page load | ≤ 3 s (p95) on dev/UAT | A |
| TUA-J02 | Proceed → Summary (incl. commission lookup) | ≤ 2 s | A |
| TUA-J03 | Summary Next → OTP screen | ≤ 3 s | A |
| TUA-J04 | OTP verify → gateway popup | ≤ 5 s | A |
| TUA-J05 | Gateway result → balance reflected | ≤ 10 s | A |
| TUA-J06 | Limit/commission lookup under many tiers/rows | No visible degradation with 100+ commission rows | A\* |
| TUA-J07 | 50 concurrent initiations | No errors beyond business rejections; limits stay correct | A\* |
| TUA-J08 | Soak: 200 sequential Summary previews | No memory growth or slowdown | A\* |

### J.2 Reliability & resilience

| ID | Title | Expected | Auto |
|---|---|---|---|
| TUA-J09 | Gateway unavailable | Clear error; no PENDING stuck forever; quota untouched | A\* |
| TUA-J10 | Network drop at Pay Now | No double charge on reconnect; defined state | M |
| TUA-J11 | Commission service unavailable | Top-up blocked with a clear message, or documented safe default — never silently 0 commission | P1 A\* |
| TUA-J12 | Limits service unavailable | **Fail closed** (block), not fail open | P1 A\* |
| TUA-J13 | OTP/SMS provider outage | Clear error; user can retry; no payment started | A\* |
| TUA-J14 | DB read replica lag (Mongo vs SQL) | UI/ledger eventually consistent; no double credit | A\* |
| TUA-J15 | Timeouts: abandoned Summary / OTP / gateway | Defined timeouts; clean return to form | A |

### J.3 Compatibility & environment

| ID | Title | Expected | Auto |
|---|---|---|---|
| TUA-J16 | Chrome / Edge / Safari / Firefox latest | Identical behaviour incl. pop-up handling | M/A |
| TUA-J17 | Desktop / tablet / mobile viewport | Layout usable; Summary inline vs modal documented (`TUP-18`) | A |
| TUA-J18 | Pop-up blocker on/off | `TUP-30` message vs gateway opens | A |
| TUA-J19 | Slow network (3G throttle) | Spinners shown; no duplicate submits | A |
| TUA-J20 | Time zone / locale of the browser differs from KSA | Windows and amounts unaffected | A\* |

### J.4 Accessibility

| ID | Title | Expected | Auto |
|---|---|---|---|
| TUA-J21 | Keyboard-only full flow (Tab/Enter/Space/Esc) | Every step reachable; focus order logical | A |
| TUA-J22 | Screen-reader names for amount, chips, methods, OTP boxes | Meaningful accessible names; errors announced | M |
| TUA-J23 | Error messages (min/limit) associated with the field (`aria-describedby`/live region) | Announced | A |
| TUA-J24 | Colour contrast and not colour-only validation (red border + text) | WCAG AA | A\* |
| TUA-J25 | Zoom 200% / reflow | No loss of function | M |

---

## K. Usability & localization

| ID | Title | Expected | P | Auto |
|---|---|---|---|---|
| TUA-K01 | Min/limit/commission messages state the **number** and the **reason** in plain words | e.g. "Minimum top-up is SAR 50.00" | P1 | M |
| TUA-K02 | User can see remaining daily allowance before trying `[nice-to-have]` | If shown, equals `L−U` | P3 | A\* |
| TUA-K03 | Summary labels commission and VAT clearly; total label correct (`TUP-17` mismatch) | Labels match the build | P2 | A |
| TUA-K04 | Arabic (RTL) and English: all new messages translated, aligned, no truncation | Both complete | P1 | A |
| TUA-K05 | Number formatting: SAR, thousands separator, 2 dp, Arabic-Indic vs Western digits consistent | Consistent across Summary, OTP mini-summary, result, Transactions | P2 | A |
| TUA-K06 | Error recovery: after a block, the user can edit the amount without losing the method | Method retained | P2 | A |
| TUA-K07 | Result screens (success / failed / pending) explain the next step; OK returns to a clean form | Clear | P2 | A |
| TUA-K08 | Currency symbol/prefix always visible (`TUP-15`) | Visible | P3 | A |
| TUA-K09 | Disabled Proceed gives a visible reason (not just greyed) | Inline message | P2 | A |
| TUA-K10 | Toast/message timing readable (not instantly vanishing) | ≥ 4 s or persistent | P3 | M |
| TUA-K11 | Tooltips/disclaimer copy current (`TUP-19`) | Matches live copy | P3 | A |

---

## L. Data integrity, reconciliation & audit

| ID | Title | Expected | P | Auto |
|---|---|---|---|---|
| TUA-L01 | One top-up = one PENDING + one terminal row, same idempotency key | Append-only, ordered | P1 | A\* |
| TUA-L02 | `base_transaction`: `amount` gross, `destination_commission_amount`, `destination_vat_amount` correct | Equality with Summary | P1 | A\* |
| TUA-L03 | `transaction_log.destination_amount` is consistent with wallet delta | Equal to credited net | P1 | A\* |
| TUA-L04 | Wallet delta == credited net, exactly (to 2 dp) | Equal; guards TU-CM13 gross-credit defect | P1 | A\* |
| TUA-L05 | Sum of all top-ups in a day == usage counter for `AMT_D` | Equal | P1 | A\* |
| TUA-L06 | Count of SUCCESS top-ups in window == `CNT_*` usage | Equal | P1 | A\* |
| TUA-L07 | Commission revenue wallet receives exactly the commission posted | System wallet delta matches | P2 | A\* |
| TUA-L08 | Daily reconciliation: gateway settlement report vs ledger | No unmatched items | P2 | M |
| TUA-L09 | Rounding: 3-decimal commission (e.g. 3.333%) rounded consistently in Summary, ledger, VAT | Same rounding rule everywhere | P1 | A\* |
| TUA-L10 | Statement / receipt shows gross, commission, VAT, net | Matches ledger | P2 | A\* |
| TUA-L11 | Audit trail: initiator, IP, device, timestamps, config version used | Present | P3 | M |
| TUA-L12 | No orphan PENDING rows after cancel/abandon | None beyond TTL | P2 | A\* |

---

## M. Automation guidance (for the later build)

> **Commission rules agreed 2026-10-13 (these supersede the draft assumptions in 0.3).**
> - Total = amount − commission. VAT is inside the commission: VAT = commission × 15/115.
> - Commission and VAT are rounded half-up to 2 decimals.
> - An amount that no tier covers proceeds with commission 0, VAT 0 and Total = amount.
> - Failed payment: ledger commission and VAT 0, balance unchanged. Pending reserves the commission; SUCCESS posts it, FAILED or timeout releases it.
> - The admin API refuses min > max and a duplicate rule (one rule per transaction type and platform, 409), so "overlapping tiers" only exists as a duplicate. There is no delete.
> - Summary commission and VAT must equal `destination_commission_amount` and `destination_vat_amount` in `base_transaction`.
> - Open, recorded on run: pending reservation shape in the ledger; quote lock when a rule is edited between Summary and Next; fixed commission ≥ amount. A fixed WEB rule cannot be created (one rule per type and platform, TU-CM03 blocks editing).
> - The Customer account type is app-only (no web top-up), so it is out of scope. Merchant uses company T2605.
> - Implemented in `Topup/functional/TopupCommission.spec.ts`, `TopupCommissionLedger.spec.ts` and `TopupCommissionMerchant.spec.ts`.

> **Admin screens captured live on dev (2026-10-13) — corrections to the draft above.**
> - The **minimum top-up amount is not a separate setting**: it is the `min` field of *Manage Limits → Transaction* for the transaction type ("Biller Bank Cashin", "Merchant Cashin", …) × risk level × platform, saved together with the four period maximums.
> - Periods are **HOUR / DAY / MONTH / YEAR** — there is **no weekly** period (`AMT_W`, `CNT_W`: C16, C17, C31 need amending) and **no separate per-transaction max** (`TXN_MAX`: C33–C36, the E-order and B13 need amending; the hourly cap is the tightest per-period amount rule).
> - Count limits are a separate screen (*Manage Limits → Count*) keyed the same way; wallet ceilings are *Manage Limits → Wallet Balance* (wallet type × risk level, min/max balance).
> - API: `GET|PUT /api/v1/limitations/{admin-wallet-limitations | transaction-limitations | transaction-count-limitations}` on `gateway-dev-emi.dg-cash.app` (write = PUT on the same URL). The risk/platform pickers offer **ALL** behind a warning modal — automation must never use it.
> - Implemented: `pageElements/Shared/AdminLimitsApi.ts`, `Topup/TopupLimitsHelper.ts`, `Topup/functional/TopupMinAmount.spec.ts`, `Topup/functional/TopupLimits.spec.ts`. Cases needing a fresh per-case account or a clock rollover are `test.skip` stubs with the reason.

1. **Reuse** `TopupHelper.ts`: `loginToTopup`, `gotoTopupScreen`, `clickSummaryNextAndDetectOtp` (OTP on/off), `reachOtpScreen`,
   `reachCardEntryPopup`, `completeCardPayment`, the SQL/Mongo readers, and the `prepare*/restore*Commission` snapshot pattern
   from `TopupCommission.spec.ts`. Mirror that pattern for OTP, `MIN_TOPUP` and every limit: **`prepareX → snapshot`, `restoreX(snapshot)` in `afterAll`.**
2. **New helper needed:** an admin config client (`TopupAdminConfig`) exposing `get/set/restore` for OTP-102, `MIN_TOPUP`, wallet limits,
   transaction limits — API-first like `apiFindCommission`/`apiSetActive` (UI scraping proved flaky for the commission grid).
3. **Stop at Summary whenever the rule fires there** (min amount, many limit/commission cases) — no quota consumed, fast, repeatable.
4. **Budget full-pay cases** (marked "full pay") — each consumes real quota and wallet headroom; run them on a dedicated account and read usage counters before/after.
5. **Derive amounts at runtime** from the live snapshot (as the commission suite does); never hardcode `m`, `L`, `B`, `p`.
6. **Serial mode + one admin session** per spec file; second concurrent admin login invalidates the first.
7. **Tag** specs `@topup @functional` / `@security` / `@performance` / `@a11y` and keep one spec per testing type (matching the existing `Topup/functional|ui|api` layout), e.g. `TopupOtpConfig.spec.ts`, `TopupMinAmount.spec.ts`, `TopupLimits.spec.ts`, `TopupLimitsCommissionMatrix.spec.ts`.
8. **Known blockers to respect:** TU-CM03 (type edit ignored) blocks `D25`, `TU-CM24`; TU-CM13 (gross credited) means `A20`, `D03`, `L04` are expected to **fail today** — keep them as live regression guards, do not skip silently; SQL/Mongo assertions need VPN.
9. **Data-driven matrix:** `TUA-D` and `TUA-E` are best generated from a table of `{limit type, commission type, amount relation (below/at/above)}` rather than hand-written cases.

## N. Coverage summary

| Section | Cases | Notes |
|---|---|---|
| A OTP config | 20 | admin-toggled op 102 |
| B Minimum amount | 16 | separate setting |
| C Limits | 36 | wallet, amount, count, single-txn |
| D Limits × commission | 25 | the mixed matrix |
| E Precedence | 9 | multi-rule violations |
| F Outcome interplay | 10 | success/failed/pending/reversal |
| G Concurrency | 9 | races, idempotency |
| H Config lifecycle | 10 | restore guarantees |
| I Security | 24 | |
| J Non-functional | 25 | perf, resilience, compat, a11y |
| K Usability/i18n | 11 | |
| L Data integrity | 12 | |
| **Total** | **207** | |
