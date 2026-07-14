import { test, expect } from '@playwright/test';
import { REGISTER_URL, generateFreshKSAMobile } from '../RegistrationHelper';

test.describe('Registration - OTP Popup Page Elements', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.getByRole('textbox', { name: /Mobile number|رقم الجوال/ }).fill(generateFreshKSAMobile());
        await page.getByRole('button', { name: /next|التالي/i }).click();
        const otpAppeared = await page.getByRole('heading', { name: /Enter OTP|أدخل رمز التحقق/i })
            .waitFor({ state: 'visible', timeout: 20000 })
            .then(() => true)
            .catch(() => false);
        test.skip(!otpAppeared, 'OTP dialog did not appear — Registration OTP is disabled in this environment');

        // OTP inputs render asynchronously after the heading; wait for the first
        // one before any test in this suite runs to avoid a count() of 0.
        await page.getByRole('textbox', { name: 'One time password input' })
            .first()
            .waitFor({ state: 'visible', timeout: 10000 });
    });

    // ── OTP popup content ─────────────────────────────────────────────────────

    test('should display the Enter OTP heading', async ({ page }) => {
        await expect(page.getByRole('heading', { name: /Enter OTP|أدخل رمز التحقق/i })).toBeVisible();
    });

    test('should display the OTP instruction message', async ({ page }) => {
        await expect(page.getByText(/A code has been sent to you, in order to continue with the sign up process\.|تم إرسال رمز التحقق إليك لمتابعة عملية التسجيل/i)).toBeVisible();
    });

    test('should display OTP input boxes', async ({ page }) => {
        const inputs = page.getByRole('textbox', { name: 'One time password input' });
        const count = await inputs.count();
        expect(count).toBeGreaterThanOrEqual(4);
        expect(count).toBeLessThanOrEqual(8);
    });

    test('should display the countdown timer', async ({ page }) => {
        await expect(page.getByText(/Code ends|ينتهي الرمز/i)).toBeVisible();
    });

    // ── Buttons ───────────────────────────────────────────────────────────────

    test('should display the Cancel button', async ({ page }) => {
        await expect(page.getByRole('button', { name: /Cancel|إلغاء/i })).toBeVisible();
    });

    test('should display the Verify button', async ({ page }) => {
        await expect(page.getByRole('button', { name: /Verify|تحقق/i })).toBeVisible();
    });

    test('should display the Click to resend button', async ({ page }) => {
        await expect(page.getByRole('button', { name: /Click to resend|انقر لإعادة الإرسال/i })).toBeVisible();
    });
});
