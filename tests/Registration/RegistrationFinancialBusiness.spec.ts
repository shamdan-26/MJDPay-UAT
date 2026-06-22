import { test, expect } from '@playwright/test';
import { generateFreshKSAMobile, fillOTP, getOtpFromDb, REGISTER_URL } from './helpers';

const BASE_URL = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';

async function goToFinancialStep(page: any, context: any) {
    await context.grantPermissions(['geolocation'], { origin: BASE_URL });
    await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Mobile number
    const mobileInput = page.getByRole('textbox', { name: /mobile number/i });
    await mobileInput.waitFor({ state: 'visible', timeout: 10000 });
    const freshMobile = generateFreshKSAMobile();
    await mobileInput.fill(freshMobile);
    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(3000);

    // OTP is optional based on system configuration
    const otpVisible = await page.getByRole('heading', { name: /enter otp/i })
        .waitFor({ state: 'visible', timeout: 15000 })
        .then(() => true)
        .catch(() => false);
    if (otpVisible) {
        await page.getByRole('textbox', { name: /one time password input/i }).first().waitFor({ state: 'visible', timeout: 10000 });
        const otp = await getOtpFromDb(freshMobile);
        await fillOTP(page, otp);
        const verifyBtn = page.getByRole('button', { name: 'Verify' });
        if (await verifyBtn.isVisible().catch(() => false)) {
            await verifyBtn.click();
        }
    }

    // Business Info (Tab 1) – fill all required fields and click Next
    await page.getByRole('textbox', { name: /email/i }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByRole('radio').filter({ hasText: /merchant/i }).click();
    await page.getByRole('textbox', { name: /unified number/i }).fill('1023456789');
    await page.getByRole('textbox', { name: /national id|iqama/i }).fill('1012345678');
    await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
    await page.getByRole('button', { name: /next/i }).click();

    // Wait for Financial & Business tab to become active
    await page.getByRole('textbox', { name: /monthly expected number/i }).waitFor({ state: 'visible', timeout: 15000 });
}

test.describe('Registration – Financial & Business Step (Tab 2 of 3)', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await goToFinancialStep(page, context);
    });

    // ── Step indicator ────────────────────────────────────────────────────────

    test('should show the Financial & Business tab as active', async ({ page }) => {
        await expect(page.getByRole('tab', { name: /financial/i })).toHaveAttribute('aria-selected', 'true');
    });

    test('should display the step indicator "Step 2 of 3" or highlight the second tab', async ({ page }) => {
        const step2 = page.getByText(/step 2 of 3/i).or(page.getByRole('tab', { name: /financial/i }));
        await expect(step2.first()).toBeVisible();
    });

    // ── Monthly Expected Number of Bills ──────────────────────────────────────

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

    test('should display the Banks dropdown', async ({ page }) => {
        await expect(page.getByRole('combobox', { name: /banks/i })).toBeVisible();
    });

    test('should show "Select Option" as the default for Banks', async ({ page }) => {
        await expect(page.getByRole('combobox', { name: /banks/i })).toContainText(/select option/i);
    });

    test('should open the Banks dropdown when clicked', async ({ page }) => {
        await page.getByRole('combobox', { name: /banks/i }).click();
        await expect(page.locator('[role="listbox"], [role="option"], [class*="option"]').first())
            .toBeVisible({ timeout: 5000 });
    });

    // ── Industries dropdown ───────────────────────────────────────────────────

    test('should display the Industries dropdown', async ({ page }) => {
        await expect(page.getByRole('combobox', { name: /industries/i })).toBeVisible();
    });

    test('should show "Select Option" as the default for Industries', async ({ page }) => {
        await expect(page.getByRole('combobox', { name: /industries/i })).toContainText(/select option/i);
    });

    test('should open the Industries dropdown when clicked', async ({ page }) => {
        await page.getByRole('combobox', { name: /industries/i }).click();
        await expect(page.locator('[role="listbox"], [role="option"], [class*="option"]').first())
            .toBeVisible({ timeout: 5000 });
    });

    // ── Annual Income dropdown ────────────────────────────────────────────────

    test('should display the Annual Income dropdown', async ({ page }) => {
        await expect(page.getByRole('combobox', { name: /annual income/i })).toBeVisible();
    });

    test('should show "Select Option" as the default for Annual Income', async ({ page }) => {
        await expect(page.getByRole('combobox', { name: /annual income/i })).toContainText(/select option/i);
    });

    test('should open the Annual Income dropdown when clicked', async ({ page }) => {
        await page.getByRole('combobox', { name: /annual income/i }).click();
        await expect(page.locator('[role="listbox"], [role="option"], [class*="option"]').first())
            .toBeVisible({ timeout: 5000 });
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
        await expect(page.getByRole('tab', { name: /business info/i }))
            .toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
    });

    test('should proceed to Verification & Uploads tab when Next is clicked with valid data', async ({ page }) => {
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
        await expect(page.getByText(/already have an account/i)).toBeVisible();
    });

    test('should display Terms & Conditions link', async ({ page }) => {
        await expect(page.getByText(/terms & conditions/i)).toBeVisible();
    });

    test('should display Privacy Policy link', async ({ page }) => {
        await expect(page.getByText(/privacy policy/i)).toBeVisible();
    });
});
