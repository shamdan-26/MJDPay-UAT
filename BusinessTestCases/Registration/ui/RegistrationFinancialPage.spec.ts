import { test, expect } from '@playwright/test';
import { REGISTER_URL, goToFinancialStep } from '../helpers';

test.describe('Registration – Financial & Business Step (Tab 2 of 3)', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: new URL(REGISTER_URL).origin });
        await goToFinancialStep(page);
    });

    test('should show the Financial & Business step fields on arrival', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /monthly expected number/i })).toBeVisible();
        await expect(page.getByRole('textbox', { name: /monthly expected sum/i })).toBeVisible();
        await expect(page.getByRole('textbox', { name: /monthly withdrawal/i })).toBeVisible();
        await expect(page.getByRole('textbox', { name: /monthly deposit/i })).toBeVisible();
        await expect(page.locator('#mat-select-value-0.mat-mdc-select-value')).toBeVisible();
        await expect(page.locator('#mat-select-value-1.mat-mdc-select-value')).toBeVisible();
        await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /next/i })).toBeVisible();
        await expect(page.locator('.mp-step.is-active .mp-step-meta .mp-step-num')).toContainText('1');
    });

    // ── Step indicator ────────────────────────────────────────────────────────

    test('should show the Financial & Business tab as active', async ({ page }) => {
        await expect(page.locator('#register-form-title.form-title')).toContainText(/financial/i);
    });

    test('should mark the Financial & Business inner tab as active (is-active)', async ({ page }) => {
        await expect(page.locator('.mp-step-bar .mp-step.is-active')).toBeDisabled
    });

    test('should display all four step indicators', async ({ page }) => {
        await expect(page.getByText(/business info/i).first()).toBeVisible();
        await expect(page.getByText(/nafath/i).first()).toBeVisible();
        await expect(page.getByText(/products/i).first()).toBeVisible();
        await expect(page.getByText(/contract/i).first()).toBeVisible();
    });

    // ── Monthly Expected Number of Bills ──────────────────────────────────────

    test('should display the Monthly Expected Number Of Bills label', async ({ page }) => {
        await expect(page.getByText(/monthly expected number of bills/i).first()).toBeVisible();
    });

    test('should display the Monthly Expected Number Of Bills field', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /monthly expected number/i })).toBeVisible();
    });

    test('should show the correct placeholder for Monthly Expected Number Of Bills', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /monthly expected number/i }))
            .toHaveAttribute('placeholder', /2000/i);
    });

    test('should accept numeric input for Monthly Expected Number Of Bills', async ({ page }) => {
        await page.getByRole('textbox', { name: /monthly expected number/i }).fill('1500');
        await expect(page.getByRole('textbox', { name: /monthly expected number/i })).toHaveValue('1500');
    });

    // ── Monthly Expected Sum of Bills ─────────────────────────────────────────

    test('should display the Monthly Expected Sum Of Bills label', async ({ page }) => {
        await expect(page.getByText(/monthly expected sum of bills/i).first()).toBeVisible();
    });

    test('should display the Monthly Expected Sum Of Bills field', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /monthly expected sum/i })).toBeVisible();
    });

    test('should show the correct placeholder for Monthly Expected Sum Of Bills', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /monthly expected sum/i }))
            .toHaveAttribute('placeholder', /2000/i);
    });

    test('should accept numeric input for Monthly Expected Sum Of Bills', async ({ page }) => {
        await page.getByRole('textbox', { name: /monthly expected sum/i }).fill('50000');
        await expect(page.getByRole('textbox', { name: /monthly expected sum/i })).toHaveValue('50000');
    });

    // ── Expected Monthly Withdrawal ───────────────────────────────────────────

    test('should display the Expected Monthly Withdrawal label', async ({ page }) => {
        await expect(page.getByText(/expected monthly withdrawal/i).first()).toBeVisible();
    });

    test('should display the Expected Monthly Withdrawal field', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /monthly withdrawal/i })).toBeVisible();
    });

    test('should show the correct placeholder for Expected Monthly Withdrawal', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /monthly withdrawal/i }))
            .toHaveAttribute('placeholder', /2000/i);
    });

    test('should accept numeric input for Expected Monthly Withdrawal', async ({ page }) => {
        await page.getByRole('textbox', { name: /monthly withdrawal/i }).fill('10000');
        await expect(page.getByRole('textbox', { name: /monthly withdrawal/i })).toHaveValue('10000');
    });

    // ── Expected Monthly Deposit ──────────────────────────────────────────────

    test('should display the Expected Monthly Deposit label', async ({ page }) => {
        await expect(page.getByText(/expected monthly deposit/i).first()).toBeVisible();
    });

    test('should display the Expected Monthly Deposit field', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /monthly deposit/i })).toBeVisible();
    });

    test('should show the correct placeholder for Expected Monthly Deposit', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /monthly deposit/i }))
            .toHaveAttribute('placeholder', /2000/i);
    });

    test('should accept numeric input for Expected Monthly Deposit', async ({ page }) => {
        await page.getByRole('textbox', { name: /monthly deposit/i }).fill('20000');
        await expect(page.getByRole('textbox', { name: /monthly deposit/i })).toHaveValue('20000');
    });

    // ── Banks dropdown ────────────────────────────────────────────────────────

    test('should display the Banks dropdown label', async ({ page }) => {
        // Banks/Industries only render after Section 1 is completed and the
        // internal stepper "Next" (#btn_signup, class="mat-stepper-next ...") is
        // clicked — they are not present on arrival.
        await page.getByRole('textbox', { name: /monthly expected number/i }).fill('1500');
        await page.getByRole('textbox', { name: /monthly expected sum/i }).fill('50000');
        await page.getByRole('textbox', { name: /monthly withdrawal/i }).fill('10000');
        await page.getByRole('textbox', { name: /monthly deposit/i }).fill('20000');
        await page.locator('.mat-stepper-next').click();

        await expect(page.getByText(/banks/i).first()).toBeVisible();
    });

    test('should display the Banks dropdown', async ({ page }) => {
        await expect(page.locator('#mat-select-value-0.mat-mdc-select-value')).toBeVisible();
    });

    test('should show "Select Option" as the default for Banks', async ({ page }) => {
        await expect(page.locator('#mat-select-value-0 .mat-mdc-select-placeholder.mat-mdc-select-min-line')).toContainText(/select option/i);
    });

    test('should open the Banks dropdown when clicked', async ({ page }) => {
        await page.locator('#mat-select-value-0.mat-mdc-select-value').click();
        await expect(page.locator('mat-option').first()).toBeVisible({ timeout: 5000 });
    });

    // ── Industries dropdown ───────────────────────────────────────────────────

    test('should display the Industries dropdown label', async ({ page }) => {
        await expect(page.getByText(/industries/i).first()).toBeVisible();
    });

    test('should display the Industries dropdown', async ({ page }) => {
        await expect(page.locator('#mat-select-value-1.mat-mdc-select-value')).toBeVisible();
    });

    test('should show "Select Option" as the default for Industries', async ({ page }) => {
        await expect(page.locator('#mat-select-value-1 .mat-mdc-select-placeholder.mat-mdc-select-min-line.ng-star-inserted')).toContainText(/select option/i);
    });

    test('should open the Industries dropdown when clicked', async ({ page }) => {
        await page.locator('#mat-select-value-1.mat-mdc-select-value').click();
        await expect(page.locator('mat-option').first()).toBeVisible({ timeout: 5000 });
    });

    // ── Annual Income dropdown ────────────────────────────────────────────────

    test('should display the Annual Income dropdown label', async ({ page }) => {
        await expect(page.getByText(/annual income/i).first()).toBeVisible();
    });

    test('should display the Annual Income dropdown', async ({ page }) => {
        await expect(page.locator('.mat-mdc-select.mat-mdc-select-empty').nth(2)).toBeVisible();
    });

    test('should show "Select Option" as the default for Annual Income', async ({ page }) => {
        await expect(page.locator('#mat-select-value-2 .mat-mdc-select-placeholder.mat-mdc-select-min-line.ng-star-inserted')).toContainText(/select option/i);
    });

    test('should open the Annual Income dropdown when clicked', async ({ page }) => {
        await page.locator('#mat-select-value-2.mat-mdc-select-value').click();
        await expect(page.locator('mat-option').first()).toBeVisible({ timeout: 5000 });
    });

    // ── Navigation buttons ────────────────────────────────────────────────────

    test('should display the Back button', async ({ page }) => {
        await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
    });

    test('should display the Next button', async ({ page }) => {
        await expect(page.getByRole('button', { name: /next/i })).toBeVisible();
    });

    test('should keep Next disabled when required fields are empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: /next/i })).toBeDisabled();
    });

    test('should return to Business Info tab when Back is clicked', async ({ page }) => {
        await page.getByRole('button', { name: /back/i }).click();
        await expect(page.locator('.mp-step.is-active .mp-step-num')).toContainText('1', { timeout: 10000 });
    });

    test.skip('should proceed to Verification & Uploads tab when Next is clicked with valid data', async ({ page }) => {
        await page.getByRole('textbox', { name: /monthly expected number/i }).fill('1500');
        await page.getByRole('textbox', { name: /monthly expected sum/i }).fill('50000');
        await page.getByRole('textbox', { name: /monthly withdrawal/i }).fill('10000');
        await page.getByRole('textbox', { name: /monthly deposit/i }).fill('20000');

        // Select first option from each dropdown
        await page.getByRole('combobox', { name: /banks/i }).click();
        await page.locator('[role="option"], [class*="option"]').first().click();
        await page.getByRole('combobox', { name: /industries/i }).click();
        await page.locator('[role="option"], [class*="option"]').first().click();
        await page.getByRole('combobox', { name: /annual income/i }).click();
        await page.locator('[role="option"], [class*="option"]').first().click();

        await page.getByRole('button', { name: /next/i }).click();
        await expect(page.getByRole('tab', { name: /verification/i }))
            .toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
    });

    // ── Footer ────────────────────────────────────────────────────────────────

    test('should display "Already have an account?" text', async ({ page }) => {
        await expect(page.locator('#login-line.new-user span').filter({ visible: true }).first()).toBeVisible();
    });

    test('should display Terms & Conditions link', async ({ page }) => {
        await expect(page.locator('span.text-primary.link').filter({ hasText: /terms & conditions/i }).filter({ visible: true }).first()).toBeVisible();
    });

    test('should display Privacy Policy link', async ({ page }) => {
        await expect(page.locator('span.text-primary.link').filter({ hasText: /privacy policy/i }).filter({ visible: true }).first()).toBeVisible();
    });
});
