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
npx playwright test tests/login/functional/LoginHappyPath.spec.ts

# Run everything in a suite folder
npx playwright test tests/homepage/

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
| `UAT_COMPANY_2`, `UAT_MOBILE_2`, ... `_3`, `_4` | additional homepage test accounts — the pool auto-extends as these are added, no code changes needed (see `tests/homepage/HomePageHelper.ts`) |

`support/global-setup.ts` runs once before the suite: it authenticates every account in the homepage account pool and saves a `storageState` per account under `playwright/.auth/`. `support/global-teardown.ts` cleans those up afterward. Any spec using `test.use({ storageState: ... })` or `createHomepageSession()` picks up a pre-authenticated session instead of logging in per test.

In `ENV=dev`, OTP is always `00000000` and MongoDB is skipped entirely — real-OTP lookups only happen against UAT/preprod.

## Project structure

```
tests/
  shared.ts                  Cross-suite helpers (e.g. waitForToastClear)
  pageElements/               Page-object locator classes (constructor-only locators + thin actions)
    homepage/                 Dashboard, balance card, sidebar, quick actions, etc.
    registration/
  Helpers/                    Heavier page objects that also encapsulate assertions/business logic
    common/

  login/                      Login flow
    LoginHelper.ts             Credentials, OTP helpers, shared constants
    api/                       API-level login flow
    functional/                Business logic (happy path, OTP flow, security, validation)
    ui/                        Element-presence assertions

  homepage/                    Post-login dashboard
    HomePageHelper.ts           Worker-indexed account pool + session helpers
    functional/
    ui/

  forgot-password/              Forgot-password flow (route-mocked)
  Registration/                 Multi-step business registration flow
    helpers.ts                  Asset pools (CRN/National ID/mobile), step navigation
    api/ · functional/ · ui/ · archive/

  BankTransfer/                 Cashout (bank transfer) flow
    BankTransferHelper.ts
    functional/                 Happy path, negative, edge cases, session/cancellation
    ui/                         Element-presence per step (Amount, Confirmation, OTP)
```

### Conventions

- **Page Object Model** — locators are `readonly` properties set once in the constructor; spec files call action methods rather than raw `page.locator()`.
- **`functional/` vs `ui/`** — `functional/` covers business logic, interactions, and outcomes (does the flow complete, is the math right); `ui/` covers element/text presence only (does it render, with the right label). The same flow is often exercised in both, deliberately kept separate.
- **Serial mode** — every `test.describe` block uses `test.describe.configure({ mode: 'serial' })`; tests within a file frequently share session/page state or have a required order.
- **Toast guard** — `waitForToastClear` (in `tests/shared.ts`) is called after every landing-page navigation to absorb transient background-API error banners before asserting anything.
- **Archive folders** — specs under `*/archive/` are retired but still discovered by Playwright; they carry `test.skip()` at the describe level.

## Commands cheat sheet

```bash
npx playwright test <path> --list          # list discovered tests without running them
npx playwright test <path> --workers=1     # run single-worker (useful when specs share one account)
npx playwright test <path> --reporter=list # verbose console output per test
npx playwright show-trace <trace.zip>      # inspect a failed test's trace
```
