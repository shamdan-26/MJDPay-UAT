---
name: fix-test-run
description: Fix the failures from a Playwright run that the user pastes in (error text, stack trace, or a report path). Finds the root cause in the spec, helper, data or environment, fixes the code, and says what the user should re-run. Does not run the tests itself.
argument-hint: <pasted error | spec path | report path>
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, AskUserQuestion
---

# /fix-test-run - fix issues shown by a test run

Input: `$ARGUMENTS` (or the pasted error in the message).

Be short. Use tables. Say what was wrong, what you changed, what the user must re-run.

## Rules

| Rule | Why |
|---|---|
| Do not run Playwright or tsc to check the fix; the user re-runs. When a run is needed, it is `ENV=dev` (`npx cross-env ENV=dev playwright test <spec>`), never uat unless named. | User verifies manually; dev is the test env |
| Fix the cause, not the symptom. Do not loosen an assertion, add `test.skip` or add a retry just to turn a real product failure green. A skip is right only when data or tooling is missing, and its reason must say what to set. | A false pass hides bugs |
| Tell product bugs apart from test bugs. If the system under test is behaving wrongly, report it as a defect with the evidence and leave the assertion. | Tests exist to find bugs |
| Never print secrets from `.env.*` (passwords, tokens). Look at key names, lengths, quoting. | Safety |
| Do not add exceptions to the POM/fixture rules to make a test pass. Flag the drift instead. | Architecture |
| Change only what the failure needs. | Small diffs |

## Steps

1. **Read the failure**: error message, first stack frame inside the repo (`file:line`), the line of the spec or helper it points at, and any `beforeAll` that sits above it. A failure in `beforeAll` fails every test in that describe, so fix it once.
2. **Classify** with this table:

| Symptom | Usual cause | Fix |
|---|---|---|
| 404 `USER_NOT_FOUND` on `/auth/signin` for a known account | Dev signin is intermittent, or parallel workers signing in as one account, or wrong or truncated password (unquoted `#` in `.env`) | Retry ONCE at most (repeated wrong passwords can lock the account). If it still fails it is credentials: API sign-in can reject an account the UI accepts (seen with Q9557 and its `LOGIN_PASSWORD`). Switch the API specs to an account from `data/testAccounts.json` with `defaultPassword` (biller Y4171, merchant K9491), never guess passwords |
| 412 with an empty body | Bad `device-finger-print` (user-agent, device not registered) | Use `commonHeaders()` and `signIn()` from `Login/helpers/loginApi.ts`, never hand-built headers |
| 401 on an AUTHENTICATED gateway call although sign-in worked | `device-finger-print` embeds the access token; a fingerprint built by `buildDeviceFingerprint` + bearer is only good for `/auth/signin` | Log in once through the app and relay the headers of a real gateway request (`startSession(browser)` in `TopupBizApi.ts`, same idea as `AdminLimitsApi`). Never treat 401/412 as a business rejection: `expectRejected` must fail on them |
| 401 `SESSION_INVALID` in admin specs | A second admin login invalidated the first | One admin login at a time; run admin specs serially |
| 400/422 where success was expected | Request body drifted from the contract | Compare with the Postman collection and the SPA's real request; fix the body, do not guess |
| `Timeout` waiting for a row | Ledger row is written later than assumed | Poll with a timeout (`waitLedger`), or skip with the reason |
| Locator or visibility timeout | UI changed or `isVisible({timeout})` used (it never waits) | Use `expect(locator).toBeVisible({timeout})` / `waitFor`; locators come from the page object |
| Passes alone, fails in a bulk run | Shared account state, parallel workers, quota used by earlier runs | Serial mode, dedicated or unused account, restore config in `afterAll` |
| `Fixture { request } from beforeAll cannot be reused in a test` | The `request` fixture is disposed when `beforeAll` ends | Create `await playwright.request.newContext()` (helper `newApiContext()`) in `beforeAll` and `dispose()` it in `afterAll`; never build a shared session on the fixture |
| Wallet limit error `COLLECTION_DESTINATION_WALLET_LIMITATION_EXCEEDED` | The account's wallet is full | Use a fresh account; do not change the assertion |

3. **Fix** in the shared helper when many tests fail for the same reason; in the spec when one test has a wrong expectation.
4. **Check by reading** that the other specs using the same helper still make sense; grep for other callers.
5. **Report**: table of failure, root cause (test bug, data, environment, or product defect), the fix with `file:line`, and the exact re-run command for the user. List anything you could not fix and what you need (an account, a captured request, a decision).
