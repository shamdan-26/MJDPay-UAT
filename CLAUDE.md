# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run all tests against UAT
npm run test:uat

# Run all tests against preprod
npm run test:preprod

# Run a single spec file
npx playwright test tests/login/LoginPage.spec.ts

# Run a single test by title (substring match)
npx playwright test --grep "should display the login form"

# Run tests in a specific folder
npx playwright test tests/login/

# Open the HTML report after a run
npx playwright show-report

# Show the interactive UI mode
npx playwright test --ui
```

The `ENV` variable selects the environment config (`.env.uat`, `.env.preprod`, `.env.dev`). `cross-env` injects it for you via the npm scripts; when calling `npx playwright test` directly, prefix with `cross-env ENV=uat`.

## Architecture

### Environment & configuration

`playwright.config.ts` loads `.env.<ENV>` via `dotenv` before test discovery. Required env vars:

| Variable | Used by |
|---|---|
| `BASE_URL` | all helpers |
| `MONGO_URI` | OTP fetching from MongoDB |
| `UAT_COMPANY`, `UAT_MOBILE` | homepage / login helpers |
| `UAT_SETUP_COMPANY/MOBILE/PASSWORD` | `support/global-setup.ts` |

`support/global-setup.ts` runs once before the suite: it logs in, then saves `session.json` (cookies + localStorage). `support/global-teardown.ts` wipes `session.json` afterwards. Tests that need a pre-authenticated session use `test.use({ storageState: 'session.json' })`.

### OTP handling

All real-OTP flows query MongoDB directly (`notification-log` / `notifications` collection, sorted by `createdAt` desc, regex-matched on `recipient` and `Use this OTP` in the message). The `getOtpFromDb` helpers in both `tests/Registration/helpers.ts` and `tests/login/helpers.ts` implement this with retry logic. In `ENV=dev` the OTP is always `00000000` and MongoDB is skipped.

### Toast / snackbar guard

Every landing-page navigation calls `waitForToastClear` (from `tests/shared.ts`) immediately after the page settles. This waits up to 3 s for a `mat-snack-bar-container` / `[class*="snack"]` / `[class*="toast"]` to appear, then up to 8 s for it to clear. It is a no-op when no toast appears. This is necessary because Angular fires background API calls on load that can produce transient error banners in the UAT environment.

### Page Object Model

All UI interactions are encapsulated in page objects under `tests/pages/`. Tests import and instantiate them; raw `page.locator()` calls belong in page objects, not in spec files.

```
tests/pages/
  LoginPage.ts               ← login form locators + fill/submit actions
  OtpPage.ts                 ← OTP popup shared across login, registration, forgot-password
  ForgotPasswordPage.ts      ← forgot-password steps 1 & 2
  DashboardPage.ts           ← post-login dashboard (sidebar, widgets, profile menu)
  registration/
    RegistrationMobilePage.ts   ← mobile-entry step
    RegistrationInfoPage.ts     ← Business Info form (Tab 1)
    RegistrationFinancialPage.ts ← Financial form (Tab 2)
    RegistrationNafathPage.ts   ← NAFATH step
    RegistrationVerificationPage.ts ← IBAN / document uploads
```

**Conventions:**
- Locators are `readonly` Locator properties set in the constructor — never re-queried per-test.
- Action methods (`fill`, `submit`, `next`, `waitForLoad`) hide Playwright implementation details from spec files.
- When a `beforeAll` creates its own browser context (registration tests), the helper returns `{ page, <PageObject> }` so both are available in the block.
- Spec files that use Playwright `page` fixtures instantiate the page object in `beforeEach`:
  ```typescript
  let loginPage: LoginPage;
  test.beforeEach(async ({ page }) => { loginPage = new LoginPage(page); await loginPage.goto(LOGIN_URL); });
  ```

### Test organisation

```
tests/
  shared.ts                  ← waitForToastClear utility
  login/                     ← Login flow
    helpers.ts               ← gotoLogin, fillAndSubmitLogin, test data
    LoginPage.spec.ts        ← UI/element assertions
    LoginFunctionality.spec.ts
    LoginOtpPopup.spec.ts
    LoginOtpFunctionality.spec.ts
    LoginMobileValidation.spec.ts
    LoginAccountStatus.spec.ts
    LoginLockout.spec.ts
    LoginValidationPopup.spec.ts
  forgot-password/           ← Forgot-password flow (mocks API routes)
    helpers.ts               ← mockOtpDisabled, mockForgetPasswordSuccess/Failure, gotoForgotPassword
    ForgotPasswordPage.spec.ts
    ForgotPasswordStep2Page.spec.ts
    ForgotPasswordFunctionality.spec.ts
    ForgotPasswordOtpFunctionality.spec.ts
    ForgotPasswordMobileValidation.spec.ts
  homepage/                  ← Post-login dashboard
    helpers.ts               ← loginAsMerchant, loginAsBiller, openProfileMenu
    HomepagePage.spec.ts
    HomepageFunctionality.spec.ts
    archive/                 ← Biller-specific specs (disabled / archived)
  Registration/
    helpers.ts               ← goToInfoStep, goToFinancialStep, goToVerificationStep, asset pools
    ui/                      ← Element/visual assertions per step
    functional/              ← Business-logic and form-validation assertions
    api/                     ← API-level registration flow
    archive/                 ← Retired biller-specific specs
```

### Key conventions

- **Serial mode** — every `test.describe` block uses `test.describe.configure({ mode: 'serial' })` because tests within a file often share session state or have a prescribed order (logout must be last, etc.).
- **Registration asset pools** — `CITIZEN_ASSETS` and `RESIDENT_ASSETS` in `Registration/helpers.ts` are fixed CRN/National-ID/mobile tuples from `Assets.xlsx`. Round-robin helpers (`nextCitizenAsset`, `nextResidentAsset`) cycle through them to avoid duplicate-registration rejections.
- **UAT OTP assets** — `UAT_OTP_ASSETS` (from `phone numbers.xlsx`) are dedicated test mobiles that always accept `00000000`. Use `nextUatOtpAsset()` for registration flows that need an OTP; use `getOtpFromDb()` for login flows against real accounts.
- **Forgot-password tests use route mocking** — `abortUnmockedGatewayRequests` is registered first (LIFO ensures targeted mocks take priority) so tests don't hang on unmocked gateway traffic.
- **Archive folder** — specs moved to `*/archive/` are retired but kept for reference. They are still discovered by Playwright; add `test.skip()` at the describe level if they should not run.
