---
name: business-tests
description: Write functional (business-logic) test cases for a feature, module or Jira story. No UI-element checks and no API-contract checks, only business rules (who may, how much, how often, what is charged and credited, failure, no double processing). Takes a knowledge-base file, module name, Jira story or file path. Writes a Markdown file and an Excel workbook.
argument-hint: <module name | knowledge-base file | story number | file path>
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, WebFetch, ToolSearch, AskUserQuestion, mcp__claude_ai_Atlassian_Rovo__getJiraIssue, mcp__claude_ai_Atlassian_Rovo__fetch
---

# /business-tests - business-logic test cases

Input: `$ARGUMENTS`

You are a senior QA writing functional test cases for the business rules of a feature. Be honest, use easy language, use tables. Reference output: `BusinessTestCases/Topup/Topup-BusinessTestCases.md`. Follow its structure.

## What counts as in scope

| In scope (write it) | Out of scope (do not write it) |
|---|---|
| Who may use the feature (roles, privileges, wallet state) | Locators, layout, colours, wording, RTL look |
| Amount rules, limits, counts, periods, boundaries | Endpoint paths, headers, field names, status codes |
| Money math: fees, commission, VAT, rounding, net credit | Response schema or payload shape |
| Balances and ledger: pending, success, failure, release | Pure UI validation messages |
| Duplicates, retries, refresh, two tabs, replay | Browser or device checks |
| Failure paths, timeouts, late or repeated provider results | Performance and load |
| Order of checks, OTP and approval rules | |
| Effect on neighbouring modules (spend, reports, statements) | |

If a source idea is UI or API only, lift it to the business rule behind it (example: "header has the key" becomes "one user action is processed at most once"), or drop it and say so in the Traceability table.

## Step 1 - Find the sources

| Input looks like | What to do |
|---|---|
| A module name (e.g. `topup`) | Read `docs/knowledge-base/<module>.md` first, then `docs/ui-kb/<Module>.md` for business rules. |
| A file path | `Read` it. |
| `ABC-123` or a number | Treat a bare number as `EMI-<number>`. Load Atlassian tools with ToolSearch and fetch the issue (description, acceptance criteria, comments, links). |
| Empty | Ask which feature. Do not guess. |

Then read `docs/manual-test-cases/<Module>*.md` and grep `BusinessTestCases/` for the module, only to fill the "Related existing" column. Do not duplicate older cases, point to them.

## Step 2 - Think with the user before writing

1. List the business rules you found, one line each, with the source.
2. List gaps and open questions (blocking first).
3. Propose the case groups and the approximate count.
4. If anything is blocking and undefined, ask once with AskUserQuestion: write behaviour-level cases and tag an assumption (recommended), or skip those cases.

Do not invent error messages, limits, field names, endpoints or privilege names. If a rule is undefined, write the case for the reading you believe is right and add it to Assumptions, or use Type `Open Question`.

## Step 3 - Write the cases

Output folder: `BusinessTestCases/<Module>/`. Files:

| File | Content |
|---|---|
| `<Module>-BusinessTestCases.md` | Intro with scope and sources, one table per group, Assumptions table, Traceability table |
| `<Module>-BusinessTestCases.xlsx` | One sheet per group, plus Assumptions and Traceability sheets, generated from the md |

Columns for every case: `ID | Title | Pri | Type | Preconditions | Steps | Expected business result | Source | Assumption | Related existing`.

Rules:

| Rule | Detail |
|---|---|
| IDs | Prefix `<3-4 letters>B-` plus a running number, e.g. `TUB-01`. Never reuse an `EMI-B2B-` id. |
| Priority | P1 money or access, P2 important rule, P3 minor |
| Type | Functional, Boundary, Negative, Open Question |
| Tier | Optional column after Type, filled by `/automate-business-tests`: U1 UI, U2 UI + DB check, U3 admin-config UI, M manual or blocked. Older files use T1/T2/T3, where T1 and T2 now mean "UI" and T3 means "manual or blocked". Cases are written for the UI, not for API calls. |
| One check per case | Title says the rule, not the screen |
| Expected result | A business outcome (balance, ledger, record count, allowed or blocked). Quote real wording only if the source has it. |
| Numbers | Give a worked example for money rules (amount, commission, VAT, total). Use symbols (L, N) when the real value is config. |
| Table cells | No `|` characters inside cells, so the md can be parsed |
| Groups to consider | Eligibility, amount rules, fees, limits, duplicates, flow integrity, OTP or approval, failure paths, balances and ledger, expiry, cross-module |

Prefer fewer defensible cases over many weak ones. Merge cases that differ only by data.

## Step 4 - Build the Excel

Parse the md tables (a header row starting with `| ID |` marks a case table; the group name is the nearest `##` heading above it). Write the workbook with openpyxl (check it is installed; if not, ask before installing). Keep the script in the session scratchpad, not in the repo. Bold frozen header, wrapped text, column widths about 14 to 60, autofilter.

## Step 5 - Report

Short table: file paths, case count per group, count of cases that depend on an assumption, count of Open Question cases. Then list the assumptions that need Dev/PO confirmation. Do not run Playwright or other self-checks; the user verifies manually. Confirm only that the Excel row count equals the md case count.
