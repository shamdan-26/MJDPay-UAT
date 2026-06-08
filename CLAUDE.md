# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run all tests
npx playwright test

# Run a single test file
npx playwright test tests/LoginPage.spec.ts

# Run a single test by name (grep)
npx playwright test --grep "should have the login form"

# Run in headed mode (already the default config)
npx playwright test --headed

# Run in headless mode (override config)
npx playwright test --headed=false

# Open interactive UI mode
npx playwright test --ui

# Show HTML report after a run
npx playwright show-report

# Debug a test (step through with Playwright Inspector)
npx playwright test --debug

# Install browsers
npx playwright install
```

## Architecture

This is a Playwright end-to-end test suite targeting the **MJDPay UAT environment** (`https://uat.majdpay.com/business/auth/login`).

**Config** (`playwright.config.ts`): Only Chromium is enabled, running in **headed** mode (`headless: false`). Firefox and WebKit projects are commented out. The `baseURL` is not set — tests use full URLs directly. Retries and single-worker mode activate only on CI via `process.env.CI`.

**Tests** (`tests/`): Each spec file targets a specific page or feature. The current file `LoginPage.spec.ts` uses `test.describe` with a `beforeEach` that navigates to the login URL, then individual `test()` blocks assert UI elements (visibility, text, attributes, state, navigation).

**Locator conventions in use:**
- ID-based: `page.locator('#login-form-box')`
- ARIA roles: `page.getByRole('button', { name: '...' })`
- Text: `page.getByText('...')`
- CSS with text filter: `page.locator('label.floating-field-label', { hasText: '...' })`
- Attribute: `page.locator('input[aria-label="Password"]')`

**Test application**: MJDPay is an EMI (Electronic Money Institution) business portal. The login form requires Company number, Mobile number (Saudi prefix +966), and Password fields.
