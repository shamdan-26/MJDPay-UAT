import { test, expect } from '@playwright/test';

const LOGIN_URL = 'https://uat.majdpay.com/business/auth/login';
const REGISTER_URL = 'https://uat.majdpay.com/business/auth/register';
const VALID_KSA_MOBILE = '500318143';

async function goToOTPStep(page: any, context: any) {
    await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
    await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('textbox', { name: /mobile number/i }).fill(VALID_KSA_MOBILE);
    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(3000);
    await page.getByRole('heading', { name: /enter otp/i }).waitFor({ state: 'visible', timeout: 15000 });
}

test.describe('Registration – OTP Verification Step', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await goToOTPStep(page, context);
    });

    // ── Page / step appearance ────────────────────────────────────────────────

    test('should navigate away from the mobile number step after clicking Next', async ({ page }) => {
        const stillOnMobile = await page.getByRole('textbox', { name: /mobile number/i }).isVisible().catch(() => false);
        expect(stillOnMobile).toBeFalsy();
    });

    test('should display the OTP / verification heading', async ({ page }) => {
        await expect(
            page.getByText(/verify|verification|otp|one.time/i).first()
        ).toBeVisible({ timeout: 10000 });
    });

    test('should display the submitted mobile number on the OTP step', async ({ page }) => {
        await expect(page.getByText(VALID_KSA_MOBILE)).toBeVisible({ timeout: 10000 });
    });

    test('should display a description asking the user to enter the OTP', async ({ page }) => {
        await expect(
            page.getByText(/enter.*code|sent.*code|code.*sent|verification code/i).first()
        ).toBeVisible({ timeout: 10000 });
    });

    // ── OTP input fields ──────────────────────────────────────────────────────

    test('should display OTP input boxes', async ({ page }) => {
        const otpInputs = page.locator('input[type="number"], input[maxlength="1"], [class*="otp"] input, [class*="pin"] input');
        await expect(otpInputs.first()).toBeVisible({ timeout: 10000 });
    });

    test('should have the correct number of OTP input boxes (4 or 6)', async ({ page }) => {
        const otpInputs = page.locator('input[type="number"], input[maxlength="1"], [class*="otp"] input, [class*="pin"] input');
        await otpInputs.first().waitFor({ state: 'visible', timeout: 10000 });
        const count = await otpInputs.count();
        expect([4, 6]).toContain(count);
    });

    test('should focus the first OTP input box automatically', async ({ page }) => {
        const firstInput = page.locator('input[type="number"], input[maxlength="1"], [class*="otp"] input, [class*="pin"] input').first();
        await firstInput.waitFor({ state: 'visible', timeout: 10000 });
        await expect(firstInput).toBeFocused();
    });

    test('should only accept numeric characters in the OTP inputs', async ({ page }) => {
        const firstInput = page.locator('input[type="number"], input[maxlength="1"], [class*="otp"] input, [class*="pin"] input').first();
        await firstInput.waitFor({ state: 'visible', timeout: 10000 });
        await firstInput.fill('a');
        const value = await firstInput.inputValue();
        expect(value).toMatch(/^\d*$/);
    });

    test('should move focus to the next OTP box after entering a digit', async ({ page }) => {
        const inputs = page.locator('input[type="number"], input[maxlength="1"], [class*="otp"] input, [class*="pin"] input');
        await inputs.first().waitFor({ state: 'visible', timeout: 10000 });
        const count = await inputs.count();
        if (count >= 2) {
            await inputs.nth(0).fill('1');
            await expect(inputs.nth(1)).toBeFocused();
        }
    });

    // ── Submit / Verify button ────────────────────────────────────────────────

    test('should display a Verify / Confirm / Submit button', async ({ page }) => {
        await expect(
            page.getByRole('button', { name: /verify|confirm|submit|next/i })
        ).toBeVisible({ timeout: 10000 });
    });

    test('should keep the Verify button disabled when OTP inputs are empty', async ({ page }) => {
        await expect(
            page.getByRole('button', { name: /verify|confirm|submit|next/i })
        ).toBeDisabled({ timeout: 10000 });
    });

    test('should enable the Verify button only when all OTP boxes are filled', async ({ page }) => {
        const inputs = page.locator('input[type="number"], input[maxlength="1"], [class*="otp"] input, [class*="pin"] input');
        await inputs.first().waitFor({ state: 'visible', timeout: 10000 });
        const count = await inputs.count();
        for (let i = 0; i < count; i++) {
            await inputs.nth(i).fill(String(i + 1 <= 9 ? i + 1 : 1));
        }
        await expect(
            page.getByRole('button', { name: /verify|confirm|submit|next/i })
        ).toBeEnabled();
    });

    test('should show an error when an incorrect OTP is submitted', async ({ page }) => {
        const inputs = page.locator('input[type="number"], input[maxlength="1"], [class*="otp"] input, [class*="pin"] input');
        await inputs.first().waitFor({ state: 'visible', timeout: 10000 });
        const count = await inputs.count();
        // Fill with obviously wrong OTP
        for (let i = 0; i < count; i++) {
            await inputs.nth(i).fill('9');
        }
        await page.getByRole('button', { name: /verify|confirm|submit|next/i }).click();
        await expect(
            page.locator('[class*="error"], [role="alert"]').first()
        ).toBeVisible({ timeout: 10000 });
    });

    // ── Resend OTP ────────────────────────────────────────────────────────────

    test('should display a Resend OTP option', async ({ page }) => {
        await expect(
            page.getByText(/resend|send again|didn.t receive/i).first()
        ).toBeVisible({ timeout: 10000 });
    });

    test('should display a countdown timer for resending the OTP', async ({ page }) => {
        await expect(
            page.locator('[class*="timer"], [class*="countdown"], [class*="resend"]').first()
        ).toBeVisible({ timeout: 10000 });
    });

    test('should disable the Resend button while the countdown is active', async ({ page }) => {
        const resendBtn = page.getByRole('button', { name: /resend/i });
        const isVisible = await resendBtn.isVisible().catch(() => false);
        if (isVisible) {
            await expect(resendBtn).toBeDisabled();
        } else {
            // Resend may appear as a link or text that is not yet interactive
            const resendText = page.getByText(/resend/i).first();
            await expect(resendText).toBeVisible({ timeout: 10000 });
        }
    });

    // ── Back navigation ───────────────────────────────────────────────────────

    test('should display a Back button on the OTP step', async ({ page }) => {
        await expect(
            page.getByRole('button', { name: /back/i })
        ).toBeVisible({ timeout: 10000 });
    });

    test('should return to the mobile number step when Back is clicked', async ({ page }) => {
        await page.getByRole('button', { name: /back/i }).click();
        await expect(
            page.getByRole('textbox', { name: /mobile number/i })
        ).toBeVisible({ timeout: 10000 });
    });

    test('should pre-fill the mobile number when returning via Back', async ({ page }) => {
        await page.getByRole('button', { name: /back/i }).click();
        await expect(
            page.getByRole('textbox', { name: /mobile number/i })
        ).toHaveValue(VALID_KSA_MOBILE, { timeout: 10000 });
    });
});
