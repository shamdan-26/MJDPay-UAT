---
name: ui-tests
description: Write UI test cases for a module's screens - every element, text, button, menu, state, colour, size, language and responsive behaviour - using measured values from the live page, not guesses. Takes a module name. Reads the UI KB, manual cases and existing UI specs, captures computed styles with a throwaway probe, writes a Markdown file and an Excel workbook.
argument-hint: <module name, e.g. Topup>
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion
---

# /ui-tests - UI element, text and colour test cases

Input: `$ARGUMENTS` (module name). Reference output: `BusinessTestCases/Topup/Topup-UITestCases.md` (+ `.xlsx`). Copy its structure.

Be honest and short. Use tables. Sibling skills: `/business-tests` (business rules, no UI), `/automate-ui-tests` (turns cases into Playwright specs), `/FE-Expert` (where an element is and its locator).

## Hard rules

| Rule | Why |
|---|---|
| Never invent a colour, size, font, text or message. Each value is `Measured` (read from the live page), `Doc` (from the UI KB or a manual case, with the source) or `Capture` (not measured yet; type `Open Question`). | Wrong values give false failures |
| ENV=dev only (`npm run test:dev -- <path> --workers=1`). Never uat unless the user names it. | Project convention |
| The probe is the only thing you run. Do not run other Playwright specs or tsc. The user verifies the cases. | User preference |
| The probe never makes payments, saves config or changes data. If a state needs a real payment (result screens), mark it `Capture` and tell the user. | Module rate caps (Top-up: 5 initiations per hour) |
| Delete the probe spec when done. Keep its JSON in the scratchpad, not in the repo. | No stray files |
| One account = one active session: one login in the probe, `--workers=1`. | `SESSION_INVALID` otherwise |
| Wait for CSS transitions before reading a style after a click or focus (about 500 ms, or poll until two reads match). The first Top-up probe caught the active chip mid-animation and recorded a colour that is never shown. | Wrong measured values |
| Business rules (limits, fees, ledger) are out of scope. Point to the module's `<Module>-BusinessTestCases.md`. | No duplicate cases |
| Where measured behaviour contradicts the KB or the business cases, record it in Findings and do not silently pick a side. | The user decides which is right |

## Step 1 - Read the sources

1. `docs/ui-kb/<Module>.md` and `<Module>.generated.md`: pages, elements, locators, copy, conditions, known gaps.
2. `docs/manual-test-cases/<Module>*.md`: older manual cases (`<3 letters>-` ids).
3. `BusinessTestCases/<Module>/ui/` and `functional/`: read titles to fill "Existing automation".
4. `BusinessTestCases/pageElements/<Module>/`: locators for the probe; `<Module>Helper.ts` for `loginTo<Module>`, `goto<Module>Screen` and the reach-this-step helpers.

## Step 2 - Capture real styles (probe)

1. Write one temporary spec `BusinessTestCases/<Module>/ui/_StyleProbe.spec.ts` that logs in with the module helper and walks the screens that need no payment (fresh form, selected state, enabled state, error state, summary, profile menu, etc.). For each state call a `dump(state, {name: selector})` helper that records per element (first 6 matches): tag, class, text (80 chars), `color`, `backgroundColor`, border (width style colour), radius, font (size/weight/family), opacity, cursor, width x height, `disabled`, `aria-checked` / `aria-label`. Write the result to the file named in the `PROBE_OUT` env var.
2. Run it once: `PROBE_OUT=<scratchpad>/probe.json npm run test:dev -- BusinessTestCases/<Module>/ui/_StyleProbe --workers=1`.
3. Read the JSON, then delete the probe spec. Keep failures honest: a state the probe could not reach becomes `Capture` rows, not guesses.
4. Convert `rgb()` to hex and keep both in the file (hex for people, rgb for `toHaveCSS`). Group repeated colours into a design-token table.

## Step 3 - Write the cases

Files in `BusinessTestCases/<Module>/`: `<Module>-UITestCases.md` and `<Module>-UITestCases.xlsx`.

Structure of the md: scope and sources, how to read it, design-token table, one `##` group per screen or area, Findings table, Automation summary.

Columns: `ID | Title | Pri | Type | Element | Preconditions | Steps | Expected result | Value source | Existing automation`.

| Rule | Detail |
|---|---|
| IDs | `<3 letters>I-` plus a running number (Top-up: `TUI-`). Never reuse an older prefix. |
| Pri | P1 blocks use, P2 visible defect, P3 polish |
| Type | Functional, Visual, Negative, Boundary, Accessibility, Open Question |
| Cover for every screen/step | Page title and subtitle, every label, field, button, link, icon, menu and dropdown; each state (default, hover, focus, active, selected, disabled, error, loading, empty); text in Arabic and English; RTL/LTR; dark mode; phone and tablet width; keyboard order and accessible names; colour and size of each element class; contrast of text pairs |
| Texts | Quote real copy (Arabic first if Arabic is the default). Cases for wording the PO has not defined are `Open Question` |
| One check per case | Merge cases that differ only by data (for example the three payment methods) |
| Existing automation | Spec name when one already proves the case, `None` otherwise. Do not rewrite proven cases |
| Table cells | No `|` characters inside cells so the md can be parsed |

## Step 4 - Build the Excel

Run `node .claude/skills/ui-tests/build-xlsx.cjs <md> <xlsx> <ID prefix>`. One sheet per `##` table (groups, design tokens, findings), bold frozen header, wrapped text, autofilter. The script prints the case count: it must equal `grep -c '^| <prefix>' <md>`.

## Step 5 - Report

Short table: files, case count per group, count by Value source (Measured / Doc / Capture), count already automated. Then list the Findings and what was not captured and why. Do not run the specs.
