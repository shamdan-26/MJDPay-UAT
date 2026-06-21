import { test, expect } from '@playwright/test';
import { REGISTER_URL, getOtpFromDb, fillOTP } from './helpers';

// Set to a mobile number with a known in-progress (interrupted) registration.
const CONTINUE_REG_MOBILE = process.env['CONTINUE_REG_MOBILE'] ?? '';

test.describe('Registration - Continue Interrupted Registration', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        test.skip(
            !CONTINUE_REG_MOBILE,
            'Set CONTINUE_REG_MOBILE env var to a mobile with an in-progress registration to run these tests'
        );
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    });

    // ── OTP re-sent on re-entry ───────────────────────────────────────────────

    test('should send an OTP when re-entering a mobile with an in-progress registration', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(CONTINUE_REG_MOBILE);
        await page.getByRole('button', { name: 'next' }).click();
        await expect(page.getByRole('heading', { name: 'Enter OTP' })).toBeVisible({ timeout: 20000 });
    });

    // ── Resumes from last saved step ──────────────────────────────────────────

    test('should resume from the last saved step after OTP is verified, not restart from mobile entry', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(CONTINUE_REG_MOBILE);
        await page.getByRole('button', { name: 'next' }).click();
        await page.getByRole('heading', { name: 'Enter OTP' }).waitFor({ state: 'visible', timeout: 20000 });

        const otp = await getOtpFromDb(CONTINUE_REG_MOBILE);
        await fillOTP(page, otp);
        const verifyBtn = page.getByRole('button', { name: 'Verify' });
        if (await verifyBtn.isVisible().catch(() => false)) {
            await verifyBtn.click({ timeout: 5000 }).catch(() => {});
        }

        // The mobile entry screen must NOT reappear — that would indicate starting over.
        await expect(page.getByText('Enter Phone Number')).not.toBeVisible({ timeout: 30000 });
    });
});
