# Registration — backlog draft (cases not yet automated)

Status: **DRAFT for review** — design only, no specs written. Prepared 2026-10-11.

These are the Registration cases that could not be built with the mock-driven approach used for the rest of the suite
(`Registration/helpers/registrationMocks.ts`: OTP bypass, mocked Business Info submit, resume-state landing) because they
need a captured backend response, an unknown database schema, or a real OTP session.

## Conventions

- **Id:** `RB-<area>-nn` (NAF = Nafath, PRD = Products, CON = Contract, CNF = Confirmation, AUD = audit/consent).
- **Auto:** how the case would be automated — *Mocked* (route stubs, no backend), *API* (gateway directly, needs a registration
  session so it depends on a working OTP), *DB* (SQL/Mongo read helpers), *Live* (real backend end to end).
- **P:** P1 = money, legal or identity impact; P2 = journey correctness; P3 = polish.
- Reusable pieces already in the repo: `goToInfoStepMocked`, `goToFinancialStepMocked`, `goToVerificationStepMocked`,
  `mockProfileType`, `NEW_APPLICATION_STATE`, `RegistrationResumeStateTable.spec.ts` (landing by flags), `RegistrationApiSecurity.spec.ts`
  (session-gated API pattern), `registrationDb.ts` (SQL/Mongo helpers).

## Fixtures to capture first (unblock Areas 1–4)

Record one real exchange per endpoint in the browser network tab (dev) and save the JSON under `data/registrationFixtures/`:

| Endpoint | Needed for |
|---|---|
| `POST /emi-profile/api/v1/register/uri/status` and the Nafath status poll | Area 1 |
| `GET /emi-profile/api/v1/products` | Area 2 |
| `POST /emi-profile/api/v1/register/products` | Area 2 |
| `GET /emi-profile/api/v1/contracts/preview?profileCode=…` | Areas 3, 4 |
| `POST /emi-profile/api/v1/register/contract/accept` | Areas 3, 4 |

## Area 1 — Nafath identity verification

Real Nafath cannot be automated on dev/UAT. Plan: mock the Nafath calls and reach the panel with
`mockProfileType(201, { ...NEW_APPLICATION_STATE, isGetNafathRandomNumberCompleted: true, nafathRandomNumber: '42' })`.

| Id | Case | Expected | Auto | P |
|---|---|---|---|---|
| RB-NAF-01 | Random number is shown exactly as issued (2 digits; Arabic-Indic digits in AR) | number visible and equal to the fixture, correct `dir` | Mocked | P2 |
| RB-NAF-02 | Nafath app rejects the request (status poll returns REJECTED) | rejection message, Verify stays disabled, Retry offered, no step advance | Mocked | P1 |
| RB-NAF-03 | Request expires (EXPIRED / timeout) | expired state, a new number can be requested, old number gone | Mocked | P1 |
| RB-NAF-04 | Verified identity differs from the National ID typed on Business Info | blocked with a mismatch message; Products unreachable | Mocked | P1 |
| RB-NAF-05 | Retry after rejection sends a new `uri/status` request and shows a different number | 2 requests, 2 distinct numbers | Mocked | P2 |
| RB-NAF-06 | Countdown reaches 0 → Verify enables (EMI-4895/4937); second click does not double-submit | exactly one status request | Mocked | P2 |
| RB-NAF-07 | Refresh on Nafath resumes at Nafath when flags say a random number was issued | lands on Nafath, not Financial | Mocked | P2 |
| RB-NAF-08 | Nafath service 5xx / network drop while polling | error + retry, no crash, no page error | Mocked | P2 |
| RB-NAF-09 | Back from Nafath returns to Verification with IBAN/VAT/files retained | values retained | Mocked | P3 |
| RB-NAF-10 | Same identity opens Nafath in two tabs | latest number wins; older tab cannot verify | Mocked | P3 |

## Area 2 — Products step business rules

Plan: mock `GET /products` with a fixed catalogue (mandatory wallet, optional products, POS with an annual price) so totals are
deterministic; reach Products by landing with `isGetNafathStatusCompleted: true`.

| Id | Case | Expected | Auto | P |
|---|---|---|---|---|
| RB-PRD-01 | Mandatory wallet is pre-selected and cannot be unselected | locked, counter ≥ 1 | Mocked | P1 |
| RB-PRD-02 | Total = selected prices + VAT (15%), 2 dp, SAR; Arabic digits in AR | total equals arithmetic from the fixture | Mocked | P1 |
| RB-PRD-03 | POS cannot be selected / continued without the wallet product | Continue disabled with message | Mocked | P1 |
| RB-PRD-04 | Selection survives Back from Contract and a page refresh | same cards selected | Mocked | P2 |
| RB-PRD-05 | `register/products` sends exactly the selected product ids, no client-side price | payload assertion | Mocked | P1 |
| RB-PRD-06 | Product price tampered in the API request is ignored or rejected | server recalculates / 4xx | API (session) | P1 |
| RB-PRD-07 | Catalogue returns empty or 500 | empty/error state, Continue disabled, no crash | Mocked | P2 |
| RB-PRD-08 | Select all then deselect all keeps only the mandatory product (mocked twin of the live test) | counter = 1 | Mocked | P3 |
| RB-PRD-09 | "Free" vs annual-price label per product type | label per fixture | Mocked | P3 |
| RB-PRD-10 | PoS request-now: device count 0 / negative / above max, non-numeric paste, split quantities ≠ total (TC-POS-026/027 exist) | validation shown | Mocked | P2 |
| RB-PRD-11 | `register/products` 500 and double-click | stays on Products, one request | Mocked | P2 |

## Area 3 — Contract rules

Plan: mock `GET /contracts/preview` with a known document (business name, CRN, version, date); API bypass cases reuse the
session-gated pattern of `RegistrationApiSecurity.spec.ts`.

| Id | Case | Expected | Auto | P |
|---|---|---|---|---|
| RB-CON-01 | Contract shows business name, CRN, contract version and acceptance date from the preview | values match the fixture | Mocked | P1 |
| RB-CON-02 | Arabic and English versions render with correct direction; switching language keeps scroll position and agreement state | `dir` and text per language | Mocked | P2 |
| RB-CON-03 | Short document that needs no scroll enables the agree checkbox immediately (negative of the scroll-to-end rule) | checkbox enabled | Mocked | P2 |
| RB-CON-04 | `contract/accept` called directly before Products is complete | 4xx; `isContractAccepted` stays false | API (session) | P1 |
| RB-CON-05 | `contract/accept` for another applicant's `profileCode` | 403/404 | API (session) | P1 |
| RB-CON-06 | Accept stores the contract version that was displayed | request carries the version; DB row matches | Live + DB | P1 |
| RB-CON-07 | Download PDF: file name pattern, `application/pdf`, non-empty | download event with a .pdf | Mocked / Live | P3 |
| RB-CON-08 | Submit failure (500) keeps the agreement checked and Submit usable; second click does not duplicate | one accept per success | Mocked | P2 |
| RB-CON-09 | Contract preview 500 or empty body | error state, Submit disabled | Mocked | P2 |
| RB-CON-10 | Cancel on Contract, then resume | resume lands on Contract | Mocked (state table) | P2 |

## Area 4 — Confirmation screen UI

The functional spec already walks the real flow (RC-29…42). To avoid another multi-minute live climb, mock the Contract step and
`contract/accept` (200) so the confirmation screen is reachable cheaply.

| Id | Case | Expected | P |
|---|---|---|---|
| RB-CNF-01 | Heading, message and Login button present; no wizard chrome left (step bar, Back, Next) | only confirmation controls | P2 |
| RB-CNF-02 | Arabic default and RTL; EN switch (known dev defect: drops to wizard start — keep a `test.fail()` twin) | per RC-30/31 | P2 |
| RB-CNF-03 | Light/dark theme and axe scan | no serious violations | P2 |
| RB-CNF-04 | 375px phone and 200% zoom | message not clipped, CTA reachable | P3 |
| RB-CNF-05 | Login button works; Back/refresh never returns to Contract (mocked twin of RC-33/35) | no re-open | P3 |
| RB-CNF-06 | No OTP, password or token text in the DOM or `localStorage` after completion | none present | P1 |

## Area 5 — Audit and consent trail (database)

Blocked on schema: only `profiles`, `business_profile_registration_requests`, `business_profiles`, `company_address` and
`user_wallets` are mapped in `registrationDb.ts`. First task (read-only): list `emi_profile` tables matching
`%consent%|%audit%|%contract%|%terms%` and the Mongo audit collections, capture column names, then add one typed helper per table.

| Id | Case | Expected | Auto | P |
|---|---|---|---|---|
| RB-AUD-01 | Contract acceptance stored with profile, contract version, timestamp, client IP/device | one row; version = displayed | DB | P1 |
| RB-AUD-02 | Terms and Privacy acceptance recorded at Sign Up | row with version and time | DB | P1 |
| RB-AUD-03 | Registration request status history (created → completed) is ordered and complete | monotonic timestamps | DB | P2 |
| RB-AUD-04 | OTP issuance/verification logged without the OTP in clear text | no clear OTP stored | DB / Mongo | P1 |
| RB-AUD-05 | Nafath result stored (verified identity id, time), no raw token | row present | DB | P1 |
| RB-AUD-06 | Approval actor recorded ("system" for auto-approval) | actor column set | DB | P2 |
| RB-AUD-07 | Failed attempts logged (wrong-OTP burst, CRN mismatch) | count matches attempts | DB | P2 |
| RB-AUD-08 | Updated-by / `last_modified_at` change on resume | values change | DB | P3 |

## Suggested build order

1. Area 4 (Confirmation) and Area 3 (Contract) — they share the Contract fixture.
2. Area 2 (Products) — needs the products fixture.
3. Area 1 (Nafath) — needs the captured Nafath exchange.
4. Area 5 (Audit) — needs DB schema discovery; also the session-gated API cases (RB-PRD-06, RB-CON-04/05) once an OTP source works.

## Open questions

- Which OTP source will dev use for test mobiles? (blocks every session-gated API case)
- Can the backend team confirm the expected error codes for the Business Info rejections already mocked in
  `RegistrationInfoServerValidation.spec.ts`, and whether OTP lockout / rate limiting is intentionally off on dev?

## Extra testing types

Draft files for fuzzing, contract, load, config-matrix, notifications, idempotency, release-resume, web/JWT security, privacy, supply chain, real devices, hostile browser, localization and process live in `BusinessTestCases/Registration/drafts/` (see its `README.md` index). They are unverified and excluded from the runner.
