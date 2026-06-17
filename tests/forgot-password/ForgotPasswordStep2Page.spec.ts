import { test, expect } from '@playwright/test';
import { FORGOT_URL, SUBMIT_BUTTON } from './helpers';

const VALID_COMPANY = 'L3999';
const VALID_MOBILE  = '500318143';

test.describe('Forgot Password â€“ Step 2 Page', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
        await page.route('**/otp/otp-settings/**', route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: false }) })
        );
        await page.route('**/auth/passwords/forget', route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
        );
        await page.goto(FORGOT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        await page.getByRole('textbox', { name: 'New Password' }).waitFor({ state: 'visible', timeout: 15000 });
    });

    // â”€â”€ Page elements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the New Password field', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'New Password' })).toBeVisible();
    });

    test('should display the Confirm Password field', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Confirm password' })).toBeVisible();
    });

    test('should have New Password field masked by default', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'New Password' })).toHaveAttribute('type', 'password');
    });

    test('should have Confirm Password field masked by default', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Confirm password' })).toHaveAttribute('type', 'password');
    });

    test('should display the submit button', async ({ page }) => {
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeVisible();
    });

    test('should have submit button disabled when both fields are empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeDisabled();
    });
});
