---
name: automate-business-tests
description: Turn a module's business test cases (BusinessTestCases/<Module>/<Module>-BusinessTestCases.md, made by /business-tests) into browser-driven Playwright UI specs. The rule is proven through the screens (user app and admin portal); the DB is read only to verify the ledger or state. No direct API calls for the action under test. Classifies every case into a tier (UI, UI+DB, admin-config UI, manual), writes grouped UI spec files, and one annotated skip per case that is not automated. Does not run the specs.
argument-hint: <module name, e.g. Topup>
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion
---

# /automate-business-tests - business cases to Playwright UI specs

Input: `$ARGUMENTS` (module name). Reference implementation: `BusinessTestCases/Topup/ui/` (`TopupBizOutcomesUI.spec.ts`, `TopupKbFlowUI.spec.ts`, helper `TopupBizUiHelper.ts`). Copy its structure and style.

`BusinessTestCases/<Module>/business/` (the older API+DB specs, helper `TopupBizApi.ts`) is **legacy**: keep it, do not extend it, do not copy its style. The same case id may exist once there and once in `ui/` (different layers).

**Before writing anything, read `.claude/skills/automate-ui-tests/SKILL.md` and follow its hard rules and Step 3 conventions** (ENV=dev, serial and one session per account, `recordFlow`, `payWithOutcome`, `ledgerFor`, rate-cap rule, no `dblclick`, popup cleanup, soft vs hard asserts, findings as annotations). This skill does not repeat them. It adds the part that is specific to "every md case goes through the UI".

Be honest and short. Use tables in your report.

## Hard rules (in addition to automate-ui-tests)

| Rule | Why |
|---|---|
| The action under test is done through the UI: clicks, typing, navigation in the user app or the admin portal. A spec never sends `request.post`/`put` to perform the business action. | The user wants the functionality proven through the screens |
| Reading the app's own network calls (`recordFlow`) and reading the DB (ledger by idempotency key, balances) is allowed, as evidence only. | Evidence is not the action |
| Locators only from `pageElements/<Module>/` and `docs/ui-kb/<Module>.md`. Never invent a locator, URL, field, message or account. If a locator is missing, add it to the page object only when clearly needed and say so in the report; otherwise skip with the exact missing thing. | Wrong guesses give false failures |
| Config (limits, commission, OTP, privilege) is changed through an existing admin-portal helper or admin screen, snapshotted first and restored in `afterEach`/`afterAll`. No such helper = skip with the missing tool named. Do not build a new config write tool unasked. | Shared dev environment |
| A case that can only be reached by a hand-built request (missing header or key, tampered field, another user's id) has no screen path: tier M, reason "no UI path; covered by the legacy API spec `<file>` if present". Do not force it through the UI and do not write an API spec for it. | Honest coverage |
| Count real payment initiations per file against the module's rate cap and tell the user in the report (see automate-ui-tests). | Avoid self-inflicted limit blocks |
| Do NOT run Playwright, tsc or the new specs. Write them, then give the user the run command. | The user verifies manually |

## Step 1 - Read the inputs

1. `BusinessTestCases/<Module>/<Module>-BusinessTestCases.md`: all case tables and the Assumptions table.
2. `docs/ui-kb/<Module>.md` (+ `.generated.md`) and `docs/knowledge-base/<module>.md`: pages, locators, flow order, conditions.
3. Existing module code: `<Module>Helper.ts`, `pageElements/<Module>/`, admin helpers (`pageElements/Shared/`, `CommissionManagement/`), `ui/` specs, `.env.dev` key NAMES only (never print values).
4. Reusable pieces to look for first:

| Need | Reuse |
|---|---|
| Log in to the app and reach the module screen | `loginTo<Module>`, `goto<Module>Screen` in `<Module>Helper.ts` |
| Complete a payment outcome (success, cancel, pending, error) | `completeCardPayment`, `payWithOutcome` in `ui/<Module>BizUiHelper.ts` |
| Ledger / DB reads | the module helper (e.g. `getTopupTransactionLogHistoryFromSql`), `support/sqlServerClient.ts`, `support/mongoClient.ts`; the `/db` skill for read-only exploration |
| Limits / commission / OTP config through the admin portal | `TopupLimitsHelper.ts` (`openAdminLimits`, `closeAdminLimits`), `AdminCommissionManagementPage`, `AdminOtpConfigPage` |
| Accounts | `data/testAccounts.json`, module account constants, optional `.env.dev` accounts |
| Valid OTP | `FIXED_OTP` from `support/otp.ts`; a wrong code uses another value on purpose |

## Step 2 - Classify every case into a tier

Add or fix a `Tier` column (after `Type`) in the md and regenerate the xlsx. Existing `T1/T2/T3` values in an older md keep working: T1 and T2 both mean "UI" here, T3 means "manual or blocked". New md files use these names:

| Tier | Meaning | Typical cases |
|---|---|---|
| U1 UI | Provable from screens, clicks and visible state | Eligibility entry points, amount rejected on the form, step order, cancel at summary |
| U2 UI + DB | A UI action whose business result is read in the DB or balance | Payment outcome then ledger rows, balance after success or failure, one record for a double click |
| U3 Admin-config UI | Needs a config change in the admin portal first | Limit, commission, OTP on/off, privilege cases (only if a helper exists) |
| M Manual or blocked | No screen path, or a tool, account or decision is missing | Clock or midnight, provider callback, hand-built request, undefined message, feature not delivered |

Rule of thumb: if the case can be done by a person with the app and the admin portal, it is U1, U2 or U3. If it needs data or a tool that does not exist, it is M with the exact missing thing as the reason. When unsure, choose M and say why.

## Step 3 - Existing coverage pass (mandatory)

Follow automate-ui-tests Step 2: grep `ui/`, `functional/`, `business/` (including `<Module>BizNotAutomated.spec.ts`) for each case id, its title keywords and its `Related existing` ids. Show the gap table before writing:

| Case | Legacy API spec | UI spec (existing) | Class | Plan |
|---|---|---|---|---|

Classes: Covered (already proven in the UI, do not rewrite), UI (write a test), Skip (tool/account/decision missing), No UI path (tier M). If more than half the cases end up M, stop and ask before writing filler tests.

## Step 4 - Write the UI specs

Folder `BusinessTestCases/<Module>/ui/`. Name `<Module>Biz<Group>UI.spec.ts`, one file per md group or per shared setup. Shared code in `<Module>BizUiHelper.ts` (extend it, do not duplicate). Titles, annotations, describe tags, serial mode, timeouts, session and robustness patterns follow automate-ui-tests Step 3.

Extra rules for this skill:

| Convention | Detail |
|---|---|
| One md id, one test | Title starts with the md id (`TUB-56: ...`); a test covering several ids uses `TUB-36/TUB-37:`. An id appears once per folder. |
| Assertions | Business outcome seen in the UI (allowed or blocked, balance, status, visible record) plus the DB evidence for U2. Never message wording the PO has not defined. |
| Rejection cases | Prove the block on the screen (Proceed stays disabled, summary never appears, error state shown) and add a CONTROL: restore the config and show the same action now works, so a rejection for another reason cannot pass. |
| Config cases | Use the admin helper, restore in `afterEach`. Count the admin logins: only one at a time. |
| Open assumptions | Where the md has an `AS#`, assert loosely and record what was seen as an annotation (`finding`), as in automate-ui-tests. |

## Step 5 - Not-automated file

`<Module>BizNotAutomated.spec.ts` stays the single place for skipped cases: a constants block of reasons and one array row per case `[id, title, reason]`, each rendered as a test that calls `test.skip(true, reason)` with the `testcase` annotation.

- A case already proven only by a legacy API spec and not yet by a UI spec is listed with the reason `API-covered, UI pending: <file>`.
- A case with no screen path is listed with `No UI path: <what the request would need>`.
- When a case is converted to a UI spec, delete its row and leave a one-line comment pointing to the UI spec.

## Step 6 - Check without running

Allowed: a text check (python or grep) that every md case id appears exactly once across `ui/` and the NotAutomated file (an id may also appear once in legacy `business/`), that tier counts in the md equal the specs, that every page-object member and helper import exists, and that the xlsx row count equals the md case count. Not allowed: running Playwright or tsc.

## Step 7 - Report

| Section | Content |
|---|---|
| Files | each new or changed file, one line |
| Tiers | counts U1/U2/U3/M and the id lists |
| Coverage | table: case -> legacy API spec / UI spec (new or existing) / skipped (reason) |
| Highest-risk guesses | locators or flows not confirmed, config helpers used, accounts that must exist in `.env.dev`, real payments per file vs the rate cap |
| Run command | `npm run test:dev -- BusinessTestCases/<Module>/ui/<file> --workers=1` (the user runs it) |
| Next step | the tool or account that would unlock each skipped case |
