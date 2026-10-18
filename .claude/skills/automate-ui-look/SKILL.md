---
name: automate-ui-look
description: Turn a module's UI test cases (BusinessTestCases/<Module>/<Module>-UITestCases.md, made by /ui-tests) into Playwright specs that check text, colours, sizes, states, widths and accessibility with the measured values. Writes only the cases no older spec proves, keeps "Capture" cases as record-the-value tests, and updates the Existing automation column. Does not run the specs.
argument-hint: <module name, e.g. Topup>
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion
---

# /automate-ui-look - UI test cases to Playwright specs

Input: `$ARGUMENTS` (module name). Reference implementation: `BusinessTestCases/Topup/ui/TopupStyleFormUI.spec.ts`, `TopupStyleSummaryUI.spec.ts`, `TopupUiTokens.ts`. Copy their structure and style.

Sibling skills: `/ui-tests` (writes the cases and measures the values), `/automate-ui-tests` (business cases to flow specs), `/FE-Expert` (locators). Be honest and short; use tables.

## Hard rules

| Rule | Why |
|---|---|
| Do NOT run Playwright, tsc or the new specs. Write them and give the run command. Checks are grep/text only. | The user verifies manually |
| ENV=dev: `npm run test:dev -- BusinessTestCases/<Module>/ui/<File> --workers=1`. Never uat unless named. | Project convention |
| Use only values from the md: `Measured` values become hard asserts, `Doc` values become asserts with the documented text, `Capture` cases become record-only tests (annotation `capture`, no pass/fail on the value). Never invent a colour, size or message. | No test oracle for unmeasured values |
| Colours live in one tokens file `<Module>/ui/<Module>UiTokens.ts` (computed `rgb()` strings, a `readStyle` helper, a `contrastRatio` helper). Specs import it; no hex or rgb literals in the specs except one-off element values. | One place to update when the design changes |
| Reuse the module helper (`loginTo<Module>`, `goto<Module>Screen`, `proceedToSummary`) and the page object locators. Add a locator to the page object only when none exists, and say so. | No duplicate helpers |
| Never make a payment or save config in a look spec. Stop at the last screen that needs none (for Top-up: before Next). Result screens and gateway popups belong to the flow specs. | Rate caps and shared dev data |
| A finding (md "Findings" table, or a case the md marks as contradicting another source) is annotated with `type: 'finding'`, not asserted as a failure. Hard-assert only what every reading agrees on. | The user decides who is right |
| One account = one active session. `test.describe.configure({ mode: 'serial' })` at file level, one login in `beforeAll` (`test.setTimeout` inside the hook), `--workers=1`. | `SESSION_INVALID` otherwise |
| Colours after a click, hover or focus animate: `toHaveCSS` retries, so assert the settled value; for backgrounds and borders that were never measured settled, record them (`readStyle` after a short wait) instead of asserting. Fractional sizes (43.9062px) use `expectSize` (+-1px), never an exact `toHaveCSS('width', ...)`. Text matched by regex needs `\s*` around anchors (`/^\s*...\s*$/`). | Mid-transition probe values and rendered whitespace caused false failures |
| Tests that change the viewport reset it in `beforeEach`. | The page is shared by the file |
| `isVisible({timeout})` never waits: use `expect(...).toBeVisible()` or `waitFor`. | Playwright ignores the option |
| Do not add exceptions to POM/fixture rules; flag them in the report. | Architectural drift |

## Step 1 - Read

1. `BusinessTestCases/<Module>/<Module>-UITestCases.md`: design tokens, case tables, Findings.
2. Existing specs in `BusinessTestCases/<Module>/ui/` and `functional/` (titles and `testcase` annotations), `pageElements/<Module>/` locators, the module helper.

## Step 2 - Gap table (show it before writing)

| Case | Value source | Existing automation | Plan |
|---|---|---|---|

| Plan | When |
|---|---|
| Skip (already proven) | The "Existing automation" column names a spec that checks the value, not just presence |
| Assert | `Measured` or `Doc` and reachable without a payment or config change |
| Record | `Capture`: hover, focus, error text colour, disclaimer style and so on |
| Not automated | Needs a payment (result screens, gateway), another account, a tool that does not exist: one annotated `test.skip(true, '<exact missing thing>')` per case in `<Module>UiLookNotAutomated.spec.ts` |

## Step 3 - Write the specs

Folder `BusinessTestCases/<Module>/ui/`. Names `<Module>Style<Group>UI.spec.ts`, grouped by the screen reached (form, summary and shell, ...) so each file logs in once.

| Convention | Detail |
|---|---|
| Title | `<ID>: <what is checked>`; the same text in the `testcase` annotation (`TUI-38: ...`). An id appears once per folder |
| Describe | `test.describe('<Module> – UI look – <screen>', { tag: ['@<module>','@ui','@style'], annotation: [{type:'feature',...},{type:'layer',description:'ui'}] }, ...)` |
| Style asserts | `await expect(loc).toHaveCSS('color', RGB.ink)`; border as `` `1px solid ${RGB.border}` ``; size as `'28px'`; font family with a regex |
| State asserts | Reach the state through the UI (click a card, type 0, blur), assert class (`is-error`, `is-active`), aria (`aria-checked`) and CSS together |
| Record tests | `readStyle(loc)` before and after the action, then `test.info().annotations.push({ type: 'capture', description: JSON.stringify(...) })` |
| Contrast | `contrastRatio(fg, bg)` against 4.5:1; use `expect.soft` so every pair is reported |
| Widths | `page.setViewportSize` then check `scrollWidth - clientWidth <= 0` |
| Text | Bilingual regex (Arabic first); no guessed wording |

## Step 4 - Update the md

In `<Module>-UITestCases.md` replace `None` in "Existing automation" with the new spec name (`TopupStyleFormUI`) for each automated case; keep Capture cases noted as "record only". Rebuild the workbook: `node .claude/skills/ui-tests/build-xlsx.cjs <md> <xlsx> <ID prefix>` and check the count is unchanged.

## Step 5 - Report

Table: spec files, tests per file, assert / record / skipped counts, cases left to a flow spec. Then the run command and which tests the user should look at first (Capture tests give values to paste back into the md). Do not run the specs.
