import { test, expect, Page } from '@playwright/test';
import {
    VALID_EMAIL,
    goToFinancialStep,
    fillFinancialForm,
    selectRandomOption,
    REGISTER_URL,
} from '../RegistrationHelper';

test.describe('Registration - Financial & Business Functionality', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(120_000);

    let page: Page;

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        await context.grantPermissions(['geolocation'], { origin: new URL(REGISTER_URL).origin });
        page = await context.newPage();
        await goToFinancialStep(page, { profileType: 'merchant', email: VALID_EMAIL });
    });

    test.afterAll(async () => {
        await page.close();
    });

    // ── Monthly Expected Number Of Bills ──────────────────────────────────────

    test('should accept numeric input for Monthly Expected Number Of Bills', async () => {
        const input = page.getByRole('textbox', { name: /monthly expected number/i });
        await input.fill('1500');
        await expect(input).toHaveValue(/^\d+$/);
    });

    // ── Monthly Expected Sum Of Bills ─────────────────────────────────────────

    test('should accept numeric input for Monthly Expected Sum Of Bills', async () => {
        const input = page.getByRole('textbox', { name: /monthly expected sum/i });
        await input.fill('50000');
        await expect(input).toHaveValue('50000');
    });

    // ── Expected Monthly Withdrawal ───────────────────────────────────────────

    test('should accept numeric input for Expected Monthly Withdrawal', async () => {
        const input = page.getByRole('textbox', { name: /monthly withdrawal/i });
        await input.fill('10000');
        await expect(input).toHaveValue('10000');
    });

    // ── Expected Monthly Deposit ──────────────────────────────────────────────

    test('should accept numeric input for Expected Monthly Deposit', async () => {
        const input = page.getByRole('textbox', { name: /monthly deposit/i });
        await input.fill('20000');
        await expect(input).toHaveValue('20000');
    });

    // ── Input validation – character filtering (all four fields) ─────────────

    test('should not accept alphabetic characters in the Monthly Expected Number field', async () => {
        const input = page.getByRole('textbox', { name: /monthly expected number/i });
        await input.clear();
        await input.pressSequentially('abc');
        await expect(input).toHaveValue('');
    });

    test('should not accept special characters in the Monthly Expected Sum field', async () => {
        const input = page.getByRole('textbox', { name: /monthly expected sum/i });
        await input.clear();
        await input.pressSequentially('!@#');
        await expect(input).toHaveValue('');
    });

    test('should not accept alphabetic characters in the Expected Monthly Withdrawal field', async () => {
        const input = page.getByRole('textbox', { name: /monthly withdrawal/i });
        await input.clear();
        await input.pressSequentially('xyz');
        await expect(input).toHaveValue('');
    });

    test('should not accept special characters in the Expected Monthly Deposit field', async () => {
        const input = page.getByRole('textbox', { name: /monthly deposit/i });
        await input.clear();
        await input.pressSequentially('$%^');
        await expect(input).toHaveValue('');
    });

    // ── Boundary values ────────────────────────────────────────────────────────

    test('should not retain a negative number in the Monthly Expected Number field', async () => {
        const input = page.getByRole('textbox', { name: /monthly expected number/i });
        await input.clear();
        await input.pressSequentially('-500');
        const value = await input.inputValue();
        expect(/^-/.test(value)).toBe(false);
    });

    test('should not retain a decimal point in the Monthly Expected Sum field', async () => {
        const input = page.getByRole('textbox', { name: /monthly expected sum/i });
        await input.clear();
        await input.pressSequentially('12.5');
        const value = await input.inputValue();
        expect(value).not.toContain('.');
    });

    test('should handle a very large value (15 digits) in the Expected Monthly Withdrawal field without crashing', async () => {
        const input = page.getByRole('textbox', { name: /monthly withdrawal/i });
        await input.clear();
        await input.fill('999999999999999');
        await expect(input).toBeVisible();
    });

    test('should treat a zero value in the Expected Monthly Deposit field as valid input', async () => {
        const input = page.getByRole('textbox', { name: /monthly deposit/i });
        await input.fill('0');
        await expect(input).toHaveValue('0');
    });

    // ── Security ───────────────────────────────────────────────────────────────

    test('should not execute an XSS payload entered in the Monthly Expected Number field', async () => {
        let alertFired = false;
        page.once('dialog', dialog => { alertFired = true; dialog.dismiss(); });
        const input = page.getByRole('textbox', { name: /monthly expected number/i });
        await input.fill('<script>alert("xss")</script>');
        await page.waitForTimeout(500);
        expect(alertFired).toBe(false);
    });

    test('should not execute an XSS payload entered in the Monthly Expected Sum field', async () => {
        let alertFired = false;
        page.once('dialog', dialog => { alertFired = true; dialog.dismiss(); });
        const input = page.getByRole('textbox', { name: /monthly expected sum/i });
        await input.fill('<img src=x onerror=alert(1)>');
        await page.waitForTimeout(500);
        expect(alertFired).toBe(false);
    });

    test('should not accept a SQL injection pattern in the Expected Monthly Withdrawal field', async () => {
        const input = page.getByRole('textbox', { name: /monthly withdrawal/i });
        await input.clear();
        await input.pressSequentially("1' OR '1'='1");
        const value = await input.inputValue();
        expect(/[^0-9]/.test(value)).toBe(false);
    });

    test('should not accept a SQL injection pattern in the Expected Monthly Deposit field', async () => {
        const input = page.getByRole('textbox', { name: /monthly deposit/i });
        await input.clear();
        await input.pressSequentially("1; DROP TABLE users;--");
        const value = await input.inputValue();
        expect(/[^0-9]/.test(value)).toBe(false);
    });

    // Documented spec (EMI Validation confluence page): "Expected number of bills" and
    // "Expected sum of bills" must be > 0 and must not start with 0.
    test.skip('should keep Next disabled when Monthly Expected Number Of Bills is 0', async () => {
        await page.pause();
        await fillFinancialForm(page);
        await page.getByRole('textbox', { name: /monthly expected number/i }).fill('0');
        await expect(page.getByRole('button', { name: /next/i })).toBeDisabled({ timeout: 5000 });
    });

    test.skip('should keep Next disabled when Monthly Expected Sum Of Bills has a leading zero', async () => {
        await fillFinancialForm(page);
        await page.getByRole('textbox', { name: /monthly expected sum/i }).fill('0500');
        await expect(page.getByRole('button', { name: /next/i })).toBeDisabled({ timeout: 5000 });
    });

    // Restore valid values before continuing with dropdown / navigation tests
    test('should restore valid values to all four fields after boundary/security probing', async () => {
        await page.getByRole('textbox', { name: /monthly expected number/i }).fill('1500');
        await page.getByRole('textbox', { name: /monthly expected sum/i }).fill('50000');
        await page.getByRole('textbox', { name: /monthly withdrawal/i }).fill('10000');
        await page.getByRole('textbox', { name: /monthly deposit/i }).fill('20000');
        await expect(page.getByRole('textbox', { name: /monthly deposit/i })).toHaveValue('20000');
    });

    // ── Industries dropdown ───────────────────────────────────────────────────
    // Only Industries (index 0) and Annual Income (index 1) render on this step
    // — see RegistrationHelper.ts goToVerificationStep(). There is no Banks select.

    test('should open the Industries dropdown when clicked', async () => {
        await selectRandomOption(page, page.locator('#mat-select-value-0'));
    });

    test('should reflect the selected industry in the Industries dropdown', async () => {
        const dropdown = page.locator('#mat-select-value-0');
        const selected = await dropdown.textContent();
        expect(selected?.trim()).not.toMatch(/select option/i);
    });

    // ── Annual Income dropdown ────────────────────────────────────────────────

    test('should open the Annual Income dropdown when clicked', async () => {
        await selectRandomOption(page, page.locator('#mat-select-value-1'));
    });

    test('should reflect the selected income in the Annual Income dropdown', async () => {
        const dropdown = page.locator('#mat-select-value-1');
        const selected = await dropdown.textContent();
        expect(selected?.trim()).not.toMatch(/select option/i);
    });

    // ── Dropdown search filtering ─────────────────────────────────────────────
    // The mat-select panel embeds a search box (#floating-select-search-input)
    // inside a disabled placeholder option (id="floating-select-search-option",
    // aria-disabled="true" — see the exclusion filter in RegistrationHelper.ts's
    // selectRandomOption()). Angular re-enables pointer-events on the nested
    // input via CSS so a real user can still type there, but Playwright's
    // actionability check propagates the ancestor's aria-disabled and treats
    // the input as not enabled — hence { force: true } to bypass that check.

    test('should filter the Industries options when typing in the dropdown search field', async () => {
        await page.locator('#mat-select-value-0').click();
        const searchInput = page.locator('#floating-select-search-input');
        await expect(searchInput).toBeVisible({ timeout: 5000 });

        const options = page.locator('[role="option"]:visible:not([aria-disabled="true"]):not([disabled])');
        await expect(options.first()).toBeVisible({ timeout: 5000 });
        const fullText = (await options.first().textContent())?.trim() ?? '';
        const query = fullText.slice(0, 3);

        await searchInput.fill(query, { force: true });
        await expect(options.first()).toBeVisible({ timeout: 5000 });
        expect((await options.first().textContent())?.toLowerCase()).toContain(query.toLowerCase());

        await options.first().click();
    });

    test('should filter the Annual Income options when typing in the dropdown search field', async () => {
        await page.locator('#mat-select-value-1').click();
        const searchInput = page.locator('#floating-select-search-input');
        await expect(searchInput).toBeVisible({ timeout: 5000 });

        const options = page.locator('[role="option"]:visible:not([aria-disabled="true"]):not([disabled])');
        await expect(options.first()).toBeVisible({ timeout: 5000 });
        const fullText = (await options.first().textContent())?.trim() ?? '';
        const query = fullText.slice(0, 3);

        await searchInput.fill(query, { force: true });
        await expect(options.first()).toBeVisible({ timeout: 5000 });
        expect((await options.first().textContent())?.toLowerCase()).toContain(query.toLowerCase());

        await options.first().click();
    });

    // ── Next button state — partial completion ────────────────────────────────

    test('should keep Next disabled when only the numeric fields are filled and no dropdown is selected', async ({ browser }) => {
        const context = await browser.newContext();
        await context.grantPermissions(['geolocation'], { origin: new URL(REGISTER_URL).origin });
        const freshPage = await context.newPage();
        await goToFinancialStep(freshPage, { profileType: 'merchant' });
        await freshPage.getByRole('textbox', { name: /monthly expected number/i }).fill('1500');
        await freshPage.getByRole('textbox', { name: /monthly expected sum/i }).fill('50000');
        await freshPage.getByRole('textbox', { name: /monthly withdrawal/i }).fill('10000');
        await freshPage.getByRole('textbox', { name: /monthly deposit/i }).fill('20000');
        await expect(freshPage.getByRole('button', { name: /next/i })).toBeDisabled();
        await context.close();
    });

    test('should enable Next when all required fields and dropdowns are filled', async () => {
        await fillFinancialForm(page);
        await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 });
    });

    // ── Back navigation ───────────────────────────────────────────────────────

    test('should return to the Business Info step when Back is clicked', async () => {
        await page.getByRole('button', { name: /back/i }).click();
        await expect(page.getByRole('textbox', { name: /Email/i }))
            .toBeVisible({ timeout: 10000 });
    });

    test('should preserve the email on Business Info step after navigating back', async () => {
        await expect(page.getByRole('textbox', { name: /Email/i })).toHaveValue(VALID_EMAIL);
    });

    test('should allow re-advancing to Financial step after going back to Info step', async () => {
        await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 });
        await page.getByRole('button', { name: /next/i }).click();
        await expect(page.getByRole('textbox', { name: /monthly expected number/i }))
            .toBeVisible({ timeout: 10000 });
    });

    // ── Forward navigation to Verification ───────────────────────────────────

    test('should advance to Verification & Uploads step when Next is clicked with valid data', async () => {
        await fillFinancialForm(page);
        await page.getByRole('button', { name: /next/i }).click();
        await expect(page.getByRole('textbox', { name: /iban/i }))
            .toBeVisible({ timeout: 10000 });
    });
});
