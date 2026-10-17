---
name: automate-ui-tests
description: Turn a module's business test cases (BusinessTestCases/<Module>/<Module>-BusinessTestCases.md, tier T2 browser and UI-doable T3 rows), its knowledge base (docs/knowledge-base/<module>.md test ideas) and the UI KB (docs/ui-kb/<Module>.md) into browser-driven Playwright UI specs. First maps what UI/functional/business specs already cover, writes only the missing cases under the md's case ids, captures the app's own network calls, and removes converted ids from the NotAutomated skips. Does not run the specs.
argument-hint: <module name, e.g. Topup>
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion
---

# /automate-ui-tests - business cases + knowledge base to Playwright UI specs

Input: `$ARGUMENTS` (module name). Reference implementation: `BusinessTestCases/Topup/ui/` (`TopupBizOutcomesUI.spec.ts`, `TopupKbFlowUI.spec.ts`, helper `TopupBizUiHelper.ts`). Copy its structure and style. Sibling skills: `/business-tests` (writes the md), `/automate-business-tests` (md cases to UI specs; it follows the rules in this file). This one adds the KB-only ideas and owns the existing-coverage pass.

Be honest and short. Use tables in the report.

## Hard rules

| Rule | Why |
|---|---|
| Do NOT run Playwright, tsc or the new specs. Write them and give the user the run command. Checks are grep/text only. | The user verifies manually |
| ENV=dev (`npm run test:dev -- <path>`). Never uat unless the user names it. | Project convention |
| Never invent a locator, URL, endpoint, header, field, message or account. Locators come from `pageElements/<Module>/` and `docs/ui-kb/<Module>.md`; contract facts from existing specs/helpers. Missing = skip with the exact missing thing, or add a locator to the page object only if clearly needed (say so). | Wrong guesses give false failures |
| The KB is stale in places (Topup KB names `cards/payment/topup`, dev serves `/api/v1/payments`). Check real endpoints in existing specs first, match old and new paths in captures, report the difference. | Avoid false failures |
| Reuse the module helper (`loginTo<Module>`, `goto<Module>Screen`, `reach...`, `completeCardPayment`, SQL ledger readers, limits/commission/OTP config helpers) and shared page objects. No duplicate helper. | Avoid drift |
| Do not add exceptions to POM/fixture rules; flag them in the report. | Architectural drift |
| Where the md has an `AS#` assumption or the KB leaves a question open, assert loosely (header or body, rejected not wording) and record what was seen as an annotation. No message-wording asserts that the PO has not defined. | No test oracle |
| Valid OTP is `FIXED_OTP` (`support/otp.ts`); module helpers already use it. | One source of truth |
| Config changes (limits, commission, OTP) are snapshotted and restored in `afterEach`/`afterAll`. No write helper = skip with the missing tool named. | Shared dev environment |
| Count real payment initiations per file and compare with the module's rate cap (Topup: hourly COUNT cap 5, unpaid attempts count, AS4). Raise and restore the cap with `raiseMerchantCountHeadroom` (`ui/TopupBizUiHelper.ts`, uses `AdminLimitsApi.getCountTiers`/`putCountTier`, whose row shape and PUT body were confirmed live on 2026-10-17: rows are objects with codes such as riskLevel "001"; the older `getCountCell`/`putCountCell` assume strings and never match). It snapshots, verifies that only the hourly count changed, and restores in afterAll. Never save a count limit through the admin screen to "test" it: the screen recalculates MONTH and YEAR. | Avoid self-inflicted limit blocks without blind writes to shared config |
| One account = one active session. Run UI files with `--workers=1`; put `test.describe.configure({ mode: 'serial' })` at file level when several describes log in as the same account. | `SESSION_INVALID` 401 otherwise |
| Never use `dblclick()` to model a double submit (the second click lands on the next screen). Fire two clicks on the same element in one task via `evaluate`. Cleanup clicks always carry `{ timeout }`. | False failures and 120 s hangs |
| Close stray popups in `afterEach`. | Popups leak into the next test |

## Step 1 - Read the three sources

1. `BusinessTestCases/<Module>/<Module>-BusinessTestCases.md`: case tables (ID, Tier, Steps, Expected), Assumptions, Automation summary.
2. `docs/knowledge-base/<module>.md`: "Test ideas", "Gaps", "Open questions". Ideas already lifted into md cases (its Traceability table says so) are not new work.
3. `docs/ui-kb/<Module>.md` (+ `.generated.md`): pages, locators, flow order, conditions.

## Step 2 - Existing coverage pass (mandatory, before writing)

Grep, in this order, for each candidate case id, its title keywords and its `Related existing` ids:

| Where | What it tells you |
|---|---|
| `BusinessTestCases/<Module>/ui/` and `functional/` | UI/functional tests already proving it (read `testcase` annotations and titles) |
| `BusinessTestCases/<Module>/business/` incl. `<Module>BizNotAutomated.spec.ts` | API tier proof; the skip row you will remove if you automate it |
| `<Module>Helper.ts`, `pageElements/<Module>/` | the helper/locator to reuse |

Build the gap table and show it before writing:

| Case | Covered by (file:test) or "No" | Class | Plan |
|---|---|---|---|

| Class | Meaning | Action |
|---|---|---|
| Covered | An existing UI/functional spec already proves the rule | Do not rewrite. List it. Add the id to a title only if the md should point to it |
| UI | Provable from screens, clicks, visible state | Write a test |
| UI + capture | Needs a request/response rule the UI triggers | Write a test with `recordFlow` |
| UI + ledger | Needs the DB result of a UI payment | Write a test; read the ledger by idempotency key |
| Skip | Needs a tool/account/decision that does not exist (privilege or commission write helper, clock, provider callback, undefined message, unlocated field) | Keep or add a `test.skip(true, '<exact missing thing>')` |
| API only | No screen involved | Leave to `/automate-business-tests` |

If most T2 cases turn out Skip, say why and stop to ask before writing filler tests.

## Step 3 - Write the specs

Folder `BusinessTestCases/<Module>/ui/`. Name `<Module>Biz<Group>UI.spec.ts`, grouped by shared setup (outcomes, balances, quota/OTP, eligibility, flow). Shared code in `<Module>BizUiHelper.ts`.

| Convention | Detail |
|---|---|
| Ids | Use the md case id as the title prefix and `testcase` annotation: `TUB-56: ...`. A test covering several ids: `TUB-36/KB-04:`. KB-only ideas not in the md keep `KB-NN`. An id appears at most once per folder (once in `business/`, once in `ui/` is fine: different layers) |
| Describe | `test.describe('<Module> business – UI – <group>', { tag: ['@<module>','@ui','@business'], annotation: [{type:'feature',...},{type:'layer',description:'ui'}] }, ...)` |
| Serial + timeouts | `describe.configure({ mode: 'serial' })`; `test.setTimeout(180000)` at describe level and inside `beforeAll` when it pays |
| Session | `beforeAll`: `loginTo<Module>(browser, <UI_ACCOUNT>)`; `afterAll`: close page and `closeSqlPool()` if SQL is used |
| Outcome helper | `payWithOutcome(session, method, code)`: balance before, captures the idempotency key off `POST /api/v1/payments`, runs `completeCardPayment(..., code)`. Gateway codes: VISA 1 success, 2 user canceled, 3 pending, 4 error limit, 5 too many tries; MADA/MASTER 3DS Y/N/D/U/X |
| Ledger | `ledgerFor(key, terminalExpected)` polls `transaction_log` by key. Assert: first row PENDING, exactly one non-PENDING row, status as expected; SUCCESS absent for fail/cancel/pending |
| Network capture | `recordFlow(session)` records url, headers, body, status, response for the flow URL regex; always `stop()` in `finally`. Header names are lower-case. One real payment in `beforeAll`, one assertion per test |
| Robustness | Double click: `dblclick()` then count initiation calls == 1. Refresh mid-flow: `reload()`, zero initiation calls, zero new windows. Popup closed: `popup.close()`, balance unchanged, no SUCCESS row. New flow: keys differ |
| Soft vs hard | Hard-assert what the md defines. `expect.soft` for a documented point that dev has drifted from (message states the drift) |
| Findings | Contradictions with an `AS#` go in as `test.info().annotations.push({ type: 'finding', ... })`, not as failing asserts |
| Partial cases | Say in an annotation what half is not covered (`not-covered`) |
| Skips | `test.skip(true, reason)` with the account env key, helper or decision that is missing |

## Step 4 - Keep the bookkeeping consistent

1. Delete each converted id's row from `<Module>BizNotAutomated.spec.ts`; leave a one-line comment pointing to the UI spec. Partially covered ids stay listed.
2. In the md `Automation summary`, add or update a "Browser-tier UI specs" table (file, cases, note) and a "Still not automated in any layer" line. Do not change case rows, so the xlsx stays valid; regenerate the xlsx (per `/business-tests` Step 4) only if case rows or tiers changed.
3. Grep check only: ids unique per folder, every page-object member and helper import exists, md case count unchanged.

## Step 5 - Report

| Section | Content |
|---|---|
| Files | each new/changed file, one line |
| Coverage | table: case -> new test / already covered by file:test / skipped (reason) |
| KB vs reality | stale endpoints, fields or steps found, with evidence file |
| Riskiest guesses | contract fields, header vs body, accounts, real payments per file vs rate cap |
| Run command | `npm run test:dev -- BusinessTestCases/<Module>/ui/<file>` (the user runs it) |
| Next step | the tool or account that would unlock each skipped case |
