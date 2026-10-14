---
name: db
description: Answer any question about the project's databases (SQL Server emi_* and MongoDB) - find tables/collections, explain columns, look up a user/mobile/company/transaction/OTP/notification, count rows, or check what a test left behind. Read-only. Use for "what's in the DB", "where is X stored", "check the DB for ...".
argument-hint: <your question about the DB>
allowed-tools: Read, Glob, Grep, Bash(node .claude/skills/db/db-query.mjs:*)
---

# /db - ask anything about the database

Question: `$ARGUMENTS`

You answer DB questions with real data, in easy language and tables. **Everything is read-only.**

## How to query

Always use the helper (run from the repo root). It loads `.env.dev` (set `ENV=uat` only if the user names UAT), enforces SELECT-only, caps rows, and never prints credentials.

| Need | Command |
|---|---|
| List SQL databases | `node .claude/skills/db/db-query.mjs sql-databases` |
| Find tables | `... sql-tables <database> [nameFilter]` |
| Table columns | `... sql-columns <database> <table>` |
| Run a SELECT | `... sql <database> "<SELECT ...>" [maxRows]` |
| List Mongo databases / collections | `... mongo-dbs` / `... mongo-collections <database>` |
| Find documents | `... mongo-find <database> <collection> '<json filter>' [limit] ['<json sort>']` |
| Count documents | `... mongo-count <database> <collection> '<json filter>'` |

## Workflow

1. **Understand** what is being asked (which entity, which environment, which fact).
2. **Locate** the data using the map below; if unsure, discover with `sql-tables` / `mongo-collections` instead of guessing names.
3. **Check columns** with `sql-columns` before writing a query on a table you have not used in this session.
4. **Query narrowly**: filter on the identifier, select only needed columns, order by a modified/created date, keep limits small. Never `SELECT *` on large tables without a filter.
5. **Answer** with: a one-line answer first, then a table of the evidence (database.table, key columns/values), then notes/caveats. Show the query you ran in a code block so the user can repeat it.

## Where things live (known from the test code)

| Store | Database | Known objects | Used for |
|---|---|---|---|
| SQL Server | `emi_profile` | `profiles`, `business_profiles`, `merchant_profiles`, `biller_profiles`, `business_profile_registration_requests`, `company_address` | Accounts, profile type/state (`is_active`, `is_approved`, `is_blocked`, `is_email_verified`), registration requests |
| SQL Server | `emi_wallet` | `user_wallets`, `wallet_type` | Balances and wallet types |
| SQL Server | `emi_transaction` | `base_transaction`, `transaction_log` | Transactions and their log |
| SQL Server | (POS) | `pos_callback_event`, `pos_callback_entries` | POS callbacks (find the owning database with `sql-tables`) |
| MongoDB | `notifications-log` | collection `notifications` | Sent SMS/email/OTP notifications (OTP lookups for tests) |
| MongoDB | `transaction_query_log` | collection `transactionLog` | Query-side transaction log |

Other `emi_*` databases exist (one per microservice); discover them with `sql-databases`.

## Gotchas (learned the hard way in this repo)

- Mobile numbers are stored as E.164 `+966xxxxxxxxx`; the UI/tests use local `5xxxxxxxx`. Write the full `+966…` value as a literal in the query; do not build it in SQL with `'+966' + col` (collation conflict with the Arabic_100 columns).
- Registration identities are a shared, reused pool: `business_profile_registration_requests.created_at` can be months old. Order by `last_modified_at` to find the latest activity.
- Amounts are decimals with 2 places; do not round in your head, report the stored value.
- Dev and UAT differ. Say which environment the answer came from (default dev).
- Test data is shared with other people; do not draw conclusions about a user from one row without checking state columns.

## Rules

- Read-only. If the user asks to change data (update, delete, unblock, reset OTP), do not do it through this skill. Explain what the change would be (table, row, column, value) and tell them to run it themselves or approve a separate, explicit action.
- Do not print passwords, tokens, password hashes, full national IDs, IBANs or full OTPs unless the user explicitly needs one for their test; mask them (`****1234`) by default.
- Never echo or open `.env*` files or connection strings; the helper handles them.
- If the connection fails (VPN, host unreachable, env var missing), say exactly which setting is missing or unreachable and stop; do not retry in a loop.
- If you cannot find the answer, say what you checked (databases/tables) and what to try next instead of guessing.

## Output shape

| Part | Content |
|---|---|
| Answer | One or two lines in plain words |
| Evidence | Table of rows/values found (masked where needed) |
| Query used | Code block |
| Notes | Environment, caveats, anything surprising |
