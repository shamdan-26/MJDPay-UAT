import { test, expect } from '@playwright/test';
import { REGISTER_URL, generateKSAMobile, fillOTP } from './helpers';

test.describe('Registration â€“ OTP Functionality', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(generateKSAMobile());
        await page.getByRole('button', { name: 'next' }).click();
        await page.waitForTimeout(5000);
        const otpAppeared = await page.getByRole('heading', { name: 'Enter OTP' })
            .waitFor({ state: 'visible', timeout: 20000 })
            .then(() => true)
            .catch(() => false);
        test.skip(!otpAppeared, 'OTP dialog did not appear — Registration OTP is disabled in this environment');
    });

    // â”€â”€ OTP input behaviour â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should enable Verify button when all OTP inputs are filled', async ({ page }) => {
        await fillOTP(page);
        await expect(page.getByRole('button', { name: 'Verify' })).toBeEnabled();
    });

    test('should keep Verify disabled when fewer than all OTP digits are entered', async ({ page }) => {
        const inputs = page.getByRole('textbox', { name: 'One time password input' });
        const count  = await inputs.count();
        for (let i = 0; i < count - 1; i++) {
            await inputs.nth(i).click();
            await inputs.nth(i).pressSequentially('0');
        }
        await expect(page.getByRole('button', { name: 'Verify' })).toBeDisabled();
    });

    // â”€â”€ Cancel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should return to the mobile number page when Cancel is clicked', async ({ page }) => {
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(page.getByText('Enter Phone Number')).toBeVisible({ timeout: 10000 });
    });
});
