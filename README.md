# MJD Pay — Playwright Automation

End-to-end UI and API test automation for the MJD Pay business banking app, built with [Playwright Test](https://playwright.dev/) and TypeScript.

## Getting started

```bash
npm install
npx playwright install
```

Copy the relevant `.env.<env>` file (see [Environments](#environments)) into the project root before running anything.

## Running tests

```bash
# Run everything against a given environment
npm run test:dev       # ENV=dev      — local/dev backend, OTP hardcoded to 00000000
npm run test:uat       # ENV=uat      — UAT backend, real OTP via MongoDB
npm run test:preprod   # ENV=preprod  — pre-production backend

# Run a single spec file
npx playwright test BusinessTestCases/Login/functional/LoginHappyPath.spec.ts

# Run everything in a feature folder
npx playwright test BusinessTestCases/Homepage/

# Run a single test by title (substring match)
npx playwright test --grep "should display the login form"

# Interactive UI mode
npx playwright test --ui

# View the HTML report from the last run
npx playwright show-report
```

`ENV` selects which `.env.<ENV>` file `playwright.config.ts` loads via `dotenv`. `cross-env` (used in the npm scripts) sets it cross-platform; when calling `npx playwright test` directly, prefix with `cross-env ENV=uat` (or set the variable however your shell supports it).

## Environments

| Variable | Used by |
|---|---|
| `BASE_URL` | every helper/page object |
| `MONGO_URI` | fetching real OTPs from MongoDB (UAT/preprod) |
| `UAT_COMPANY`, `UAT_MOBILE` | primary shared test account (homepage, bank transfer, login) |
| `UAT_SETUP_COMPANY` / `_MOBILE` / `_PASSWORD` | used once by `support/global-setup.ts` |
| `UAT_COMPANY_2`, `UAT_MOBILE_2`, ... `_3`, `_4` | additional homepage test accounts — the pool auto-extends as these are added, no code changes needed (see `Homepage/HomePageHelper.ts`) |

`support/global-setup.ts` runs once before the suite: it authenticates every account in the homepage account pool and saves a `storageState` per account under `playwright/.auth/`. `support/global-teardown.ts` cleans those up afterward. Any spec using `test.use({ storageState: ... })` or the `Homepage` worker fixture (see below) picks up a pre-authenticated session instead of logging in per test.

In `ENV=dev`, OTP is always `00000000` and MongoDB is skipped entirely — real-OTP lookups only happen against UAT/preprod.

## Project structure

```
BusinessTestCases/
  fixtures.ts                  Shared per-test page-object fixtures (test.extend over @playwright/test)
  toastMessages.ts              waitForToastClear, assertToast
  pageElements/                 Page-object locator classes — flat, 25 files, constructor-only locators + thin actions

  Login/                       Login flow
    LoginHelper.ts              Credentials, OTP helpers, shared constants
    api/                        API-level login flow
    functional/                 Business logic (happy path, OTP flow, security, validation)
    ui/                         Element-presence assertions

  Homepage/                     Post-login dashboard
    HomePageHelper.ts            Worker-indexed account pool + session helpers
    HomepageFixtures.ts          Worker-scoped fixtures — one shared login per worker (see Fixtures below)
    functional/
    ui/

  ForgotPassword/               Forgot-password flow (route-mocked)
  Registration/                  Multi-step business registration flow
    RegistrationHelper.ts        Asset pools (CRN/National ID/mobile), step navigation
    api/ · functional/ · ui/ · archive/

  BankTransfer/                 Cashout (bank transfer) flow
    BankTransferHelper.ts
    functional/                  Happy path, negative, edge cases, session/cancellation
    ui/                          Element-presence per step (Amount, Confirmation, OTP)

  PaymentLinks/ · Products/ · Topup/ · W2WTransfer/
    <Feature>Helper.ts           Each holds its own helper + functional/ and/or ui/
```

### Fixtures — the two session lifecycles

Most spec files get a fresh Playwright `page` per test. A handful (`BankTransfer`, some `Registration` flows, `Products`) instead run one login inline in their own `test.beforeAll`, because each encodes bespoke multi-step business logic — those still import straight from `@playwright/test`.

Everything else uses one of two fixture files that extend `test`/`expect`:

- **`BusinessTestCases/fixtures.ts`** — one lazy fixture per page object (`loginPage`, `dashboard`, `otp`, `homepageBalanceCard`, `registrationInfo`, ...). Import `{ test, expect }` from here instead of `@playwright/test` and destructure the fixtures you need in `beforeEach` — no more manual `new LoginPage(page)`.
- **`Homepage/HomepageFixtures.ts`** — worker-scoped: one authenticated homepage session is created per Playwright worker and reused across every Homepage spec file that worker runs, instead of each file logging in again in its own `beforeAll`. Three files that need a *specific* pinned account (transaction-history / empty-state fixtures) opt out and keep their own `beforeAll` — see `CLAUDE.md` for which ones.

### Conventions

- **Page Object Model** — locators are `readonly` properties set once in the constructor; spec files call action methods rather than raw `page.locator()`.
- **`functional/` vs `ui/`** — `functional/` covers business logic, interactions, and outcomes (does the flow complete, is the math right); `ui/` covers element/text presence only (does it render, with the right label). The same flow is often exercised in both, deliberately kept separate.
- **Serial mode** — every `test.describe` block uses `test.describe.configure({ mode: 'serial' })`; tests within a file frequently share session/page state or have a required order.
- **Toast guard** — `waitForToastClear` (in `BusinessTestCases/toastMessages.ts`) is called after every landing-page navigation to absorb transient background-API error banners before asserting anything.
- **Archive folders** — specs under `*/archive/` are retired but still discovered by Playwright; they carry `test.skip()` at the describe level.
- **Failure artifacts** — `playwright.config.ts` retains trace, screenshot, and video on failure; `npx playwright show-report` surfaces all three.

## Commands cheat sheet

```bash
npx playwright test <path> --list          # list discovered tests without running them
npx playwright test <path> --workers=1     # run single-worker (useful when specs share one account)
npx playwright test <path> --reporter=list # verbose console output per test
npx playwright show-trace <trace.zip>      # inspect a failed test's trace
```
