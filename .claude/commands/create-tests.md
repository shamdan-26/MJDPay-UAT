# Create Playwright Test Cases

Generate Playwright test cases for the MJDPay UAT application (`https://uat.majdpay.com`).

## Instructions

Given a description of the page or feature to test (provided as `$ARGUMENTS`), create a new spec file in `tests/` following the conventions established in `tests/LoginPage.spec.ts`:

1. **File naming**: Use `<PageName>.spec.ts` (PascalCase, descriptive).
2. **Structure**:
   - Import `{ test, expect }` from `'@playwright/test'`
   - Wrap all tests in a `test.describe('Verify <Page/Feature> page', () => { ... })`
   - Use `test.beforeEach` to navigate to the target URL via `page.goto('...')`
3. **Locator conventions** (prefer in this order):
   - ARIA roles: `page.getByRole('button', { name: '...' })`
   - Text: `page.getByText('...')`
   - ID-based: `page.locator('#element-id')`
   - CSS with text filter: `page.locator('label.class', { hasText: '...' })`
   - Attribute: `page.locator('input[aria-label="..."]')`
4. **Test categories to cover** (as applicable to the page):
   - URL / navigation
   - Page title
   - Visibility of key UI elements (headings, logos, labels, buttons)
   - Input fields: label visible, placeholder correct, accepts input
   - Interactive behaviors: button states (enabled/disabled), toggles, clicks
   - Validation / error states
   - Links that navigate away
5. **Comments**: Use section separator comments (`// ── Section ──`) to group related tests, as done in `LoginPage.spec.ts`.
6. **No page object model** — keep it flat, consistent with the existing codebase.

After creating the file, display the full path and a summary of the test groups created.

## Input

Feature or page to test: $ARGUMENTS
