# Postman collections

Six **curated** collections plus a **generated** set, one per API surface. The
curated ones follow the same shape: a committed collection + environment pair,
request-level `pm.test()` assertions on status code and response shape, and a
matching Playwright suite for regression (the collections are for exploratory
and manual runs).

- [`POS-API-majdpay.postman_collection.json`](#pos-api) — POS transactions,
  ledger, ACH transfers, terminal callback. Curated.
- [`Registration-API-majdpay.postman_collection.json`](#registration-api) —
  Business-portal Merchant registration flow, plus its lookup endpoints. Curated.
- [`Topup-API-majdpay.postman_collection.json`](#topup-api) — card top-up
  (Cash-in) flow: payment methods, summary, initiate, OTP, verify,
  update-status, balance. Curated.
- [`WalletSnapshotAdmin-API-majdpay.postman_collection.json`](#wallet-snapshot-admin-api)
  — EMI-6127's two Admin-portal wallet-snapshot GET endpoints (list + detail).
  Curated.
- [`WalletSnapshotJob-API-majdpay.postman_collection.json`](#wallet-snapshot-job-api)
  — EMI-6115's on-demand wallet-snapshot job trigger, on an internal-only host.
  Curated. No auth anywhere in this collection — see its own section for why.
- [`WalletSnapshotAggregate-API-majdpay.postman_collection.json`](#wallet-snapshot-aggregate-api)
  — EMI-6124's end-to-end composition/consistency checks, chaining the two
  collections above rather than adding new endpoints. Curated.
- [`<Service>-API-majdpay.postman_collection.json` ×27](#emi-service-collections-generated)
  — generated from the EMI gateway OpenAPI specs, one per microservice, sharing
  `EMI-dev.postman_environment.json`. Does **not** yet include the wallet-snapshot
  endpoints above — they postdate the last regeneration and aren't in the
  `/wallet-service/v3/api-docs` swagger this set is pulled from; see
  "Regenerating" below.

---

## POS API

`POS-API-majdpay.postman_collection.json` covers the POS endpoints of
`product-management-service`: business (tenant-scoped), admin (back-office) and
the terminal callback. `POS-dev.postman_environment.json` holds the dev
variables.

The same coverage exists as Playwright specs in
`BusinessTestCases/PosTransactions/` — the collection is for exploratory and
manual runs, the specs are for regression. Both trace to the same manual test
cases (`POS-API-Manual-Test-Cases.xlsx`, TC-001..TC-109).

### Running it by hand

Import both files into Postman, select the **POS - dev (majdpay)** environment,
then fill in `token` and `deviceFingerPrint`. Nothing else needs editing.

### Running it from the command line

```bash
npm run postman:pos
```

That uses Newman via `npx --yes` (no dependency is added to the repo) and writes
a JSON run report to `test-results/newman-pos.json`, which is already gitignored.

The committed environment file deliberately ships with an **empty** `token` and
`deviceFingerPrint`. Do not paste a real token into it — the pre-commit secret
scanner (`scripts/check-secrets.js`) will flag it, and it would land in git
history. Pass credentials on the command line instead:

```bash
npx --yes newman run postman/POS-API-majdpay.postman_collection.json -e postman/POS-dev.postman_environment.json --env-var token=YOUR_JWT --env-var deviceFingerPrint=YOUR_FINGERPRINT
```

### What the run does

19 requests in 4 folders, each with assertions on the documented status code and
response shape. Two behaviours worth knowing before reading a red run:

- A callback for an **unknown terminal returns 200** with `subStatus: PARKED`.
  The tests assert on `subStatus`, not just the status code.
- ACH per-item failures (`NOT_FOUND`, `INVALID_STATUS`, `ALREADY_RELEASED`)
  arrive **inside a 200 body**, not as HTTP errors.

### Caution

The `Admin > 4. POST release ACH transfers` request sends a real payment
instruction to the bank, and `5. POST reject` permanently kills a settlement
batch. Newman runs every request in the collection, so a full
`npm run postman:pos` against an environment with live batches **will** act on
them. For an unattended or CI run, restrict it to the read-only folders:

```bash
npx --yes newman run postman/POS-API-majdpay.postman_collection.json -e postman/POS-dev.postman_environment.json --folder "Business (self-service, tenant-scoped)" --folder "Integration (terminal callback)"
```

The Playwright suite has no such footgun — its release/reject tests stay skipped
unless `POS_ACH_ALLOW_MUTATIONS=true` is set deliberately.

---

## Registration API

`Registration-API-majdpay.postman_collection.json` covers the Business-portal
Merchant registration flow of `emi-profile-service` — mobile OTP, business
info, NAFATH initiation, product selection, contract acceptance, the
session-refresh mechanism, and the public lookup endpoints the wizard depends
on. `Registration-dev.postman_environment.json` holds the dev variables.

The same coverage exists as Playwright specs in
`BusinessTestCases/Registration/api/`:
`RegistrationAPIFlow.spec.ts` (the 22-endpoint happy-path + negative + lookup
suite, IDs `API-01..API-15` / `API-N1..API-N12` / `API-L1..API-L8`) and
`RegistrationSessionRefresh.spec.ts` (EMI-5995 / EMI-6059 session refresh, IDs
`RSR-01..RSR-07`). The Postman request numbering (`1.`..`38.`) follows the same
order as the spec's endpoint list so the two are easy to cross-reference. Both
trace to the same manual test cases in
[`docs/manual-test-cases/Registration-API.md`](../docs/manual-test-cases/Registration-API.md).

### Running it by hand

Import both files into Postman, select the **Registration API - dev (majdpay)**
environment. Nothing needs filling in to start — unlike POS, this flow bootstraps
its own session token by running the collection in order (see below), and dev
accepts a fixed OTP so no mailbox access is needed.

Run folders **1–6 in order** for one full registration pass:

1. **Phone Entry** — sends a fresh mobile OTP, verifies it, captures `sessionToken`.
2. **Business Info** — establishes the identity (CRN + National ID), uploads the
   IBAN/VAT files, submits the registration.
3. **NAFATH** — initiates the redirect URI (NAFATH itself is not automatable).
4. **Products** — lists and assigns products.
5. **Contract** — previews, accepts, and downloads the contract.
6. **Session Refresh** — can be run at any point after folder 1's OTP verify to
   swap in a fresh `sessionToken` before it expires.

Folders **7 (Lookups)** and **8 (Negative / Auth checks)** are independent and
can run at any time.

### Running it from the command line

```bash
npm run postman:registration
```

Writes a JSON run report to `test-results/newman-registration.json` (gitignored).

### What to know before reading a run

- **`{{unifiedNumber}}` / `{{nationalId}}` are a shared UAT fixture identity**
  (from `data/registrationAssets.json`'s `uatOtpAssets` pool), the same pool
  `RegistrationHelper.ts` cycles through for Playwright. A `409`, or a `400`
  whose body mentions "already registered" / "duplicate", on request 5 just
  means that identity was already consumed by an earlier run — swap in a fresh
  entry from that file, not a bug to chase.
- **`{{otp}}` defaults to `'918512'`** — dev and UAT both accept a fixed
  all-zero OTP for any mobile number (see `RegistrationHelper.getOtpFromDb`),
  so the OTP step needs no IMAP/mailbox access to run by hand.
- **File uploads (requests 6–7) need a file attached manually** in Postman's
  file picker before sending — a committed collection cannot embed binary file
  content. Any small image or PDF works.
- **Completing the flow does not create a working login.** Per EMI-122,
  accepting the contract only creates a "Pending Manual KYB" profile; a
  wallet, Company Number, and login credentials are issued only after an admin
  reviews and activates the account in the Admin Portal (out of scope here —
  request 15 in the Negative folder asserts the account genuinely cannot sign
  in yet).
- **The refresh token travels as a header**, not a body field (EMI-6059,
  request 15 in Session Refresh / request 14 in Negative / Auth checks). If a
  body-only refresh starts returning 200, the API contract has quietly widened.

No money-moving or destructive caution applies here — every request in this
collection is safe to run repeatedly against dev.

---

## Topup API

`Topup-API-majdpay.postman_collection.json` covers the card top-up (Cash-in)
flow: list payment methods, open the summary, initiate the payment, read OTP
settings, verify the OTP, resolve the card-entry outcome via
`update-status`, and read the wallet balance. `Topup-dev.postman_environment.json`
holds the dev variables.

Captured live against `gateway-dev.majdpay.com` (2026-09-28) rather than
generated from a swagger spec — `/api/v1/payments`, `/api/v1/payments/verify`
and `/api/v1/payments/update-status` were not discoverable through the gateway
swagger-ui (`/v3/api-docs` on the relevant services returns 401 for both a
business and an admin JWT), so this collection is the source of truth for
their request/response shape until that's fixed.

The same flow exists as Playwright specs in `BusinessTestCases/Topup/functional/`
(`TopupHappyPath.spec.ts`, `TopupNegative.spec.ts`) — those drive the real UI
end to end (including the HyperPay/3-D-Secure widget); this collection is for
exploratory/manual API-level runs. Both trace to the same manual cases in
`docs/manual-test-cases/audit-additions.json` (`TU-API-01`..`TU-API-06`), which
verify the wallet-bucket movement `update-status` produces against EMI-6120's
balance-calculation rule.

### Running it by hand

Import both files into Postman, select the **Topup API - dev (majdpay)**
environment, then fill in `token` (a real Bearer JWT for an authenticated
business account — e.g. the Q9557/597389429 Biller account
`BusinessTestCases/Topup/TopupHelper.ts` logs into) and `deviceFingerPrint`.

Run folders **1–5 in order** for the initiation half of the flow: payment
methods → summary → initiate → OTP settings → verify (captures `paymentId`
and `checkoutId` as collection variables along the way).

Folder **6 (Update Status)** needs a real `checkoutId` — the card-entry
widget's own traffic (HyperPay/3-D-Secure) never reaches this gateway, so
Postman alone cannot produce one. Complete the card-entry step in a real
browser or Playwright run of the full flow first (or paste in a `checkoutId`
captured that way), then send folder 6 to see the resolved status.

Folder **7 (Balance)** is independent — run it before folder 3 and again
after folder 6 resolves to compare the delta. Folder **8 (Negative)** is
independent too.

### Running it from the command line

```bash
npm run postman:topup
```

Runs folders 1–5 and 7 only (skips 6 and 8, which either need a real
`checkoutId` or are exploratory negative checks) and writes a JSON run report
to `test-results/newman-topup.json` (gitignored):

```bash
npx --yes newman run postman/Topup-API-majdpay.postman_collection.json -e postman/Topup-dev.postman_environment.json --env-var token=YOUR_JWT --env-var deviceFingerPrint=YOUR_FINGERPRINT
```

### What to know before reading a run

- **`amount` is a JSON number in `summary/open` but a JSON string in
  `/payments`** — confirmed live, not a typo in this collection. Folder 8's
  negative case checks whether the two steps validate decimal precision the
  same way despite the type difference.
- **The transaction type's description and its category disagree on
  transfer direction** (description says Merchant→Control wallet; category
  implies Control-wallet-as-source) — a live data/label defect, unrelated to
  anything in this collection's own requests.
- **`update-status` resolves the outcome, it does not set it.** It queries
  the payment provider by `checkoutId` and returns whatever that checkout's
  real status is — SUCCESS, a failure status, or pending — so its response
  in a given run depends entirely on which sandbox card/return code was used
  in the widget step, not on anything sent in this collection's request body.

No money-moving or destructive caution applies here — top-ups against the
dev sandbox gateway are safe to run repeatedly.

---

## Wallet Snapshot Admin API

`WalletSnapshotAdmin-API-majdpay.postman_collection.json` covers the two
Admin-portal endpoints EMI-6127 added on top of the existing wallet-snapshot
subsystem: `GET /api/v1/admin/wallet-snapshots` (paged list) and
`GET /api/v1/admin/wallet-snapshots/{id}` (detail, with discrepancies and a
validation-event history). `WalletSnapshotAdmin-dev.postman_environment.json`
holds the dev variables. Full write-up:
[`docs/business-knowledge/EMI-6127-Refined-Ticket.md`](../docs/business-knowledge/EMI-6127-Refined-Ticket.md).

Both routes are confirmed live in `dev` (2026-09-29) — an unauthenticated call
answers `401`, not `404`. Folder 3 (Negative / Auth) exercises exactly that and
needs no token. Folders 1 and 2 need a real Bearer JWT for an admin user
holding `ADMIN_GET_WALLET_SNAPSHOTS` — there is no confirmed pure-API admin
sign-in contract yet (the business-portal `/auth/signin` + `tenantNumber` flow
returns `401` for admin credentials; it's a separate auth realm), so mint one
by signing in through the Admin Portal UI and pasting the resulting token.

Every request also sends the full Admin Portal header set (`Accept`,
`Content-Type`, `Accept-Language`, `locale`, `platform`, `platformType`,
`channel`, `toster_ID`, `latitude`, `longitude`), matched to a real captured
Admin Portal request against `gateway-dev.majdpay.com` — the same contract
Login/Topup's own `commonHeaders()` use on the business-portal side.
`{{deviceFingerPrint}}` is deliberately left empty: the real value is
generated client-side per session and itself embeds the current access token,
so it has no safe static value to commit — paste a freshly captured one if a
request needs it to pass.

Two requests are deliberately-failing regression tripwires, not smoke tests —
each is named `KNOWN DEFECT - ...` and its `pm.test()` asserts the *correct*
behavior:

- **Folder 1, request 5** — `openingBalances`/`movementBalances` currently put
  the available balance into `current` and leave `available` null (list and
  detail). `closingBalances` is unaffected.
- **Folder 2, request 3** — `validationDetails[].verificationSteps` is always
  null (a `verificationSteps`/`verifications` MapStruct field-name mismatch).

Don't "fix" either test to match today's response — they should stay red until
the underlying defect is fixed.

### Running it by hand

Import both files into Postman, select the **Wallet Snapshot Admin API - dev
(majdpay)** environment, sign into the Admin Portal to mint a token, then paste
it into `token`. Folder 3 needs no setup and is safe to run first.

### Running it from the command line

```bash
npm run postman:wallet-snapshot-admin
```

This only runs folder 3 (Negative / Auth) — the part that needs no token and
is confirmed live — and writes a JSON report to
`test-results/newman-wallet-snapshot-admin.json` (gitignored). Run folders 1
and 2 by hand once a real admin token is available; they aren't wired into an
npm script because they need one.

All three folders are read-only GETs against the public gateway — no
money-moving or destructive caution applies to any of them.

The on-demand snapshot job-trigger endpoint (EMI-6115) used to live here as a
fourth folder. It has moved to its own dedicated collection — see
[Wallet Snapshot Job API](#wallet-snapshot-job-api) below — since it lives on
a different host with a fundamentally different auth posture (no auth at all,
vs. this collection's bearer token); keeping it here risked the two getting
mixed up.

---

## Wallet Snapshot Job API

`WalletSnapshotJob-API-majdpay.postman_collection.json` covers EMI-6115's
on-demand trigger for the wallet-snapshot pipeline:
`POST /api/v1/wallet-snapshot-jobs?cutoffTime=...`. Full write-up:
[`docs/business-knowledge/EMI-6115-Refined-Ticket.md`](../docs/business-knowledge/EMI-6115-Refined-Ticket.md)
and [`docs/business-knowledge/Wallet-Snapshot-Pipeline-Architecture.md`](../docs/business-knowledge/Wallet-Snapshot-Pipeline-Architecture.md).

This is a **separate collection from `WalletSnapshotAdmin-API`**, not a folder
inside it, because the two live on different hosts with different auth
postures: this one's host (`http://10.243.128.20:9094` in dev) is internal-only
and, per two independent sources (this suite's own captures and the
implementing engineer's own ticket comment), appears to carry **no
application-level authentication at all**.

**No auth anywhere in this collection, deliberately**: the collection-level
`auth` is explicitly set to `noauth` (not just left unset), and every request
in folder 1 also explicitly sets its own `auth: noauth` rather than
inheriting. The one exception is folder 2's single request, which reads the
result back through EMI-6127's endpoint on the *public* gateway and therefore
needs a real bearer token — that token is set **on that request only**, never
at the collection level, specifically so folder 1's requests can never
accidentally pick it up.

### Caution

Folder 1 (Trigger the job) **mutates real data** — every request in it runs
an actual snapshot-computation job. Folder 2 needs a real admin token and
reads real data (safe, but not free of the token-management concerns already
documented for `WalletSnapshotAdmin-API`). Folder 3 (Gateway routing check)
is the only always-safe, read-only part — it just confirms the public gateway
answers `404` for this path, which is what `npm run postman:wallet-snapshot-job`
runs.

### Running it by hand

Import both files into Postman, select the **Wallet Snapshot Job API - dev
(majdpay)** environment. Folders 1 and 3 need no token. Folder 2 needs a real
`{{adminToken}}` pasted into that request specifically (see
`WalletSnapshotAdmin-API`'s own section for how to mint one).

### Running it from the command line

```bash
npm run postman:wallet-snapshot-job
```

Runs only folder 3. `10.243.128.20:9094` is not reachable from outside the
internal network, so folders 1-2 cannot run from a normal CI position anyway.

---

## Wallet Snapshot Aggregate API

`WalletSnapshotAggregate-API-majdpay.postman_collection.json` covers EMI-6124
(BE - Aggregate the Complete Wallet Snapshot Logic) — `WalletSnapshotFacade
.start(cutoff)`, the composition root over EMI-6116–6123/6126. Full write-up:
[`docs/business-knowledge/EMI-6124-Refined-Ticket.md`](../docs/business-knowledge/EMI-6124-Refined-Ticket.md).

**This ticket has no endpoint of its own.** This collection doesn't add one —
it chains `WalletSnapshotJob-API`'s trigger (folder 1) with
`WalletSnapshotAdmin-API`'s read endpoint (folders 2–3) specifically to
exercise two things only observable across a *whole run*, not from any single
sub-ticket's own test in isolation:

- **Folder 2 (WAG-01)** — trigger a run covering a deliberate mix of wallet
  states (normal, provisional-opening, no-running-balance-zero-ledger,
  no-running-balance-non-zero-ledger/DRIFT), then read all of them back and
  manually confirm each shows the composed result its own sub-ticket's rule
  predicts, all from the *same* run.
- **Folder 3 (WAG-02)** — two wallets with structurally identical ledger
  histories should produce byte-identical computed snapshots (aside from
  `id`/`walletCode`). Request 1 captures wallet A's fields into a collection
  variable; request 2 reads wallet B and asserts equality — run them in that
  order, in the same collection run, or the comparison has nothing to compare
  against.

**Auth, same lesson as `WalletSnapshotAdmin-API`'s duplicate-header 500**: no
auth is set at the collection level. Folder 1 explicitly sets `noauth` (it's
truly unauthenticated). Folders 2–3 set a real bearer `{{adminToken}}`
per-request only — never at the collection level — specifically so folder 1
can never accidentally inherit a token it shouldn't have.

### Caution

Folder 1 **mutates real data** (runs an actual snapshot job) — same caution as
`WalletSnapshotJob-API`'s folder 1. Folders 2–3 are read-only but need a real
admin token.

### Running it by hand

Import both files into Postman, select the **Wallet Snapshot Aggregate API -
dev (majdpay)** environment. Before folder 1, arrange `{{walletA}}`/`{{walletB}}`
and any other fixture wallets to actually cover the states WAG-01/WAG-02 need
— this collection can't manufacture those states itself. Paste a real
`{{adminToken}}` before folders 2–3.

### Running it from the command line

No npm script — every request here either mutates data or needs a real admin
token and pre-arranged wallet fixtures, so there's no subset that's both safe
and meaningful to run unattended.

---

## EMI service collections (generated)

27 collections named `<Service>-API-majdpay.postman_collection.json`, one per
non-empty definition in the UAT gateway swagger-ui
(`https://gateway-uat.majdpay.com/webjars/swagger-ui` → "Select a definition").
They are **machine-generated** from each service's OpenAPI 3.1 `/v3/api-docs`
via `openapi-to-postmanv2`, not hand-curated:

- Folders follow the OpenAPI tags; one request per operation.
- Request bodies are **schema-derived placeholders** (lorem-ipsum strings,
  sample numbers) — edit before sending.
- The only assertion is a collection-level **"no 5xx"** test, so a Newman run
  surfaces server errors but says nothing about correctness.
- Collection-level bearer auth is `{{token}}`; base URL is
  `{{gatewayBaseUrl}}<service-path>`.

The companion Playwright scaffolds live in
[`BusinessTestCases/ServiceApis/`](../BusinessTestCases/ServiceApis/README.md)
— every operation is a `test.skip` placeholder there, same "coverage tracked,
not yet runnable" rationale as `Reconciliation/`.

`profile-service`, `product-management-service`, `beneficiary-management` and
`otp-service` overlap the curated POS / Registration collections — prefer the
curated ones for those flows. Each generated collection's description names its
own overlap.

### Shared environment

`EMI-dev.postman_environment.json` — used by all 27. Ships with an **empty**
`token` / `password` (the pre-commit secret scanner blocks non-empty ones, and
they would land in git history). `gatewayBaseUrl` defaults to
`https://gateway-dev.majdpay.com`; for a UAT run set it to
`https://gateway-uat.majdpay.com`.

### Running one by hand

Import `EMI-dev.postman_environment.json` and any collection, select
**EMI - dev (majdpay)**, set `token` (mint one with the Authentication Service
collection's sign-in, or paste a known-good JWT), then send.

### Running from the command line

```bash
# all 27 (skips the curated POS/Registration collections), one JSON report each
npm run postman:services -- --token YOUR_JWT

# a subset
node scripts/run-service-collections.mjs --only Wallet,Auth,Aml --token YOUR_JWT

# a single collection, the plain Newman way
npx --yes newman run postman/WalletService-API-majdpay.postman_collection.json -e postman/EMI-dev.postman_environment.json --env-var token=YOUR_JWT
```

Reports land in `test-results/newman-<service>.json` (gitignored). The runner
passes `--suppress-exit-code`, so one failing collection does not abort the rest;
the final line reports how many had a non-zero Newman exit.

### Regenerating

The import script is not committed — it needs live gateway access and a
throwaway `openapi-to-postmanv2` install. To rebuild after an API change:

1. From the gateway swagger-ui, fetch `/<service>/v3/api-docs` for each
   definition listed by `/v3/api-docs/swagger-config` (Basic auth).
2. Run `openapi-to-postmanv2` per spec with `folderStrategy: Tags`,
   `requestParametersResolution: Example`; then set collection-level bearer
   `{{token}}` and the `baseUrl` variable to `{{gatewayBaseUrl}}<service-path>`.
3. Re-derive the `OPERATIONS` array in each
   `BusinessTestCases/ServiceApis/<Service>.generated.spec.ts` from the spec's
   `paths` (id = `operationId`, `pathParams` = path contains `{…}`,
   `body` = has `requestBody`).
