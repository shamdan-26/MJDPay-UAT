# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run all tests against UAT
npm run test:uat

# Run all tests against preprod
npm run test:preprod

# Run a single spec file
npx playwright test BusinessTestCases/Login/ui/LoginPage.spec.ts

# Run a single test by title (substring match)
npx playwright test --grep "should display the login form"

# Run tests in a specific feature folder
npx playwright test BusinessTestCases/Login/

# Open the HTML report after a run
npx playwright show-report

# Show the interactive UI mode
npx playwright test --ui
```

The `ENV` variable selects the environment config (`.env.uat`, `.env.preprod`, `.env.dev`). `cross-env` injects it for you via the npm scripts; when calling `npx playwright test` directly, prefix with `cross-env ENV=uat`.

## Architecture

### Environment & configuration

`playwright.config.ts` loads `.env.<ENV>` via `dotenv` before test discovery, and is the **only** Playwright config in the repo (`testDir: './BusinessTestCases'`). Required env vars:

| Variable | Used by |
|---|---|
| `BASE_URL` | every helper/page object |
| `MONGO_URI` | OTP fetching from MongoDB |
| `UAT_COMPANY`, `UAT_MOBILE` | primary shared test account (homepage, bank transfer, login) |
| `UAT_COMPANY_2`, `UAT_MOBILE_2`, ... `_3`, `_4` | additional homepage test accounts — the pool auto-extends as these are added, no code changes needed (see `Homepage/HomePageHelper.ts`) |
| `UAT_SETUP_COMPANY/MOBILE/PASSWORD` | `support/global-setup.ts` |

`support/global-setup.ts` runs once before the suite: it logs in and saves `session.json` (cookies + localStorage), then separately pre-authenticates every account in the homepage account pool into `playwright/.auth/homepage-account<N>.json`. `support/global-teardown.ts` wipes `session.json` afterwards. Tests that need a pre-authenticated session use `test.use({ storageState: 'session.json' })` or `test.use({ storageState: ACCOUNT_1_STORAGE_STATE })`.

### OTP handling

All real-OTP flows query MongoDB directly (`notification-log` / `notifications` collection, sorted by `createdAt` desc, regex-matched on `recipient` and `Use this OTP` in the message). `getOtpFromDb` is implemented in `Registration/RegistrationHelper.ts` and `Login/LoginHelper.ts` with retry logic. In `ENV=dev` the OTP is always `00000000` and MongoDB is skipped.

### Toast / snackbar guard

`waitForToastClear` and `assertToast` live in `BusinessTestCases/toastMessages.ts`. `waitForToastClear` is called after every landing-page navigation immediately once the page settles — it waits up to 3 s for a `mat-snack-bar-container` / `[class*="snack"]` / `[class*="toast"]` to appear, then up to 8 s for it to clear, and is a no-op when no toast appears. `assertToast` asserts a toast is visible and optionally contains expected text — used in negative-scenario tests that expect an error/warning toast. This exists because Angular fires background API calls on load that can produce transient error banners in the UAT environment.

### Page Object Model

All UI interactions are encapsulated in page objects under `BusinessTestCases/pageElements/`, grouped into one subfolder per feature (`Registration/`, `Homepage/`, `Topup/`, `W2WTransfer/`, `PaymentLinks/`, `Products/`, `PayBill/`, `ForgotPassword/`) plus a `Shared/` folder for page objects used across multiple features (`DashboardPage`, `HomePage`, `OtpPage`, `TransactionsPage`, `LoginPage`, `BankTransferPage`, `HomepageQuickActionsPage`, `HomepageSidebarPage`). Tests never call raw `page.locator()`; that belongs in a page object.

A page object lives in `Shared/` only once it's actually consumed by more than one feature folder — a page object still owned by a single feature belongs in that feature's subfolder even if the class itself is generic in shape. When a feature's last remaining page object moves to `Shared/` this way, its `pageElements/<Feature>/` subfolder disappears entirely (e.g. `Login/` and `BankTransfer/` no longer have a `pageElements/` mirror — `LoginPage` and `BankTransferPage` outgrew single-feature ownership and moved to `Shared/`); the `BusinessTestCases/<Feature>/` test folder itself is unaffected.

**Conventions:**
- Locators are `readonly` Locator properties set once in the constructor — never re-queried per-test.
- Every page object's constructor takes a single `page: Page` argument.
- Action methods (`fill`, `submit`, `next`, `waitForLoad`) hide Playwright implementation details from spec files.

### Fixtures — how page objects get into tests

The suite has **two session lifecycles**, and each has its own fixtures file extending `@playwright/test`'s `test`/`expect`:

1. **`BusinessTestCases/fixtures.ts`** — for specs that get a fresh `page` per test (the common case). Defines one lazy fixture per page object (all 25 classes), keyed by name (`loginPage`, `dashboard`, `otp`, `homepageBalanceCard`, `registrationInfo`, etc. — see the file for the full list). It also re-exports everything else from `@playwright/test` (`Page`, `Browser`, `expect`, ...), so a spec file only has to change its import source, not add a second import line for types:
   ```typescript
   import { test, expect, type Page } from '../../fixtures'; // was '@playwright/test'

   let loginPage: LoginPage;
   test.beforeEach(async ({ page, loginPage: lp }) => {
       loginPage = lp;
       await loginPage.goto(LOGIN_URL);
   });
   ```
   Fixtures are lazy — only the ones a test actually destructures get constructed, so bundling all of them in one file costs nothing per-test.

2. **`Homepage/HomepageFixtures.ts`** — for the Homepage suite, which shares one authenticated session across every test file a given worker runs (cheaper than re-logging-in per file). This is a **worker-scoped** fixture (`{ scope: 'worker' }`), Playwright's documented pattern for expensive shared setup, built on top of `createHomepageSession`/`refreshHomepage` in `Homepage/HomePageHelper.ts`:
   ```typescript
   import { test, expect, Page } from '../HomepageFixtures'; // was '@playwright/test'

   let page: Page;
   let dashboard: DashboardPage;
   test.beforeEach(async ({ homepagePage, dashboard: d }) => {
       page = homepagePage;
       dashboard = d;
       await refreshHomepage(page);
   });
   ```
   **Exception**: three Homepage files need a *specific* account rather than whichever one the worker was assigned (transaction-history / empty-state fixtures) — `ui/HomepageTransactionsPage.spec.ts`, `functional/HomepageTransactions.spec.ts`, `functional/HomepageTransactionsEmptyState.spec.ts`. These still call `createHomepageSession(browser, 'ACCOUNT_1' | 'ACCOUNT_2')` directly in their own `beforeAll`/`afterAll`, importing straight from `@playwright/test`. Don't migrate them to the worker fixture — that would silently swap their pinned account for whatever the worker's default is.

When adding a new page object, add its fixture to `fixtures.ts` (or `HomepageFixtures.ts` if it's a Homepage widget) rather than instantiating it manually in a spec file.

### Test organisation

```
BusinessTestCases/
  fixtures.ts                 ← shared per-test page-object fixtures (see above)
  toastMessages.ts            ← waitForToastClear, assertToast
  pageElements/
    Shared/                    ← page objects used by more than one feature (DashboardPage, HomePage, OtpPage, TransactionsPage, LoginPage, BankTransferPage, HomepageQuickActionsPage, HomepageSidebarPage)
    Registration/ · Homepage/ · Topup/ · W2WTransfer/
    PaymentLinks/ · Products/ · PayBill/ · ForgotPassword/
                                 ← one subfolder per feature, holding that feature's page-object class(es);
                                   no Login/ or BankTransfer/ subfolder — their only page objects moved to Shared/
  Login/
    LoginHelper.ts             ← credentials, OTP helpers, shared constants
    api/ · functional/ · ui/
  Homepage/
    HomePageHelper.ts          ← account pool, createHomepageSession, refreshHomepage
    HomepageFixtures.ts        ← worker-scoped fixtures (see above)
    functional/ · ui/
  ForgotPassword/
    ForgotPasswordHelper.ts    ← mockOtpDisabled, mockForgetPasswordSuccess/Failure, gotoForgotPassword
    api/ · functional/ · ui/
  Registration/
    RegistrationHelper.ts      ← asset pools, step-navigation helpers (goToInfoStep, etc.)
    api/ · functional/ · ui/ · archive/
  BankTransfer/
    BankTransferHelper.ts
    functional/ · ui/
  PaymentLinks/
    PaymentLinkHelper.ts
    functional/
  Products/
    ProductsPoSHelper.ts
    functional/ · ui/
  Topup/
    TopupHelper.ts
    functional/ · ui/
  W2WTransfer/
    W2WTransferHelper.ts
    functional/
  PayBill/
    PayBillHelper.ts
    functional/
```

Every feature folder under `BusinessTestCases/` (and its mirror under `pageElements/`, where one still exists) is PascalCase. Each `BusinessTestCases/<Feature>/` folder holds one `<Feature>Helper.ts` plus a subset of `api/`, `functional/`, `ui/`, `archive/`; each `pageElements/<Feature>/` folder holds that feature's page-object class(es), named `<Feature>Page.ts` or split further where a feature has multiple distinct pages (e.g. `Registration/`, `Homepage/`). A `pageElements/<Feature>/` mirror only exists while at least one page object is still single-feature — see the `Shared/` promotion rule above.

### Key conventions

- **Serial mode** — every `test.describe` block uses `test.describe.configure({ mode: 'serial' })` because tests within a file often share session state or have a prescribed order (logout must be last, etc.).
- **`functional/` vs `ui/`** — `functional/` covers business logic, interactions, and outcomes; `ui/` covers element/text presence only. The same flow is often exercised in both, deliberately kept separate.
- **Registration asset pools** — `CITIZEN_ASSETS` and `RESIDENT_ASSETS` in `Registration/RegistrationHelper.ts` are fixed CRN/National-ID/mobile tuples. Round-robin helpers (`nextCitizenAsset`, `nextResidentAsset`) cycle through them to avoid duplicate-registration rejections.
- **BankTransfer, Products, and some Registration files** log in once via their own `test.beforeAll`/`browser.newPage()` (not the fixtures above) because each encodes bespoke multi-step login/OTP business logic inline. This is intentional — don't force these onto `fixtures.ts`, which assumes the default per-test `page`.
- **Forgot-password tests use route mocking** — `abortUnmockedGatewayRequests` is registered first (LIFO ensures targeted mocks take priority) so tests don't hang on unmocked gateway traffic.
- **Archive folder** — specs moved to `*/archive/` are retired but kept for reference. They are still discovered by Playwright; add `test.skip()` at the describe level if they should not run.
- **Failure artifacts** — `playwright.config.ts` captures `trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`, and `video: 'retain-on-failure'`; `npx playwright show-report` surfaces all three for a failed run.
