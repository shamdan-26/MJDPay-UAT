import { test, expect } from '@playwright/test';

const LOGIN_URL    = 'https://dev.majdpay.com/business/auth/login';
const REGISTER_URL = 'https://dev.majdpay.com/business/auth/register';

// KSA mobile: starts with 5, exactly 9 digits
const VALID_KSA_MOBILE = '500318143';

test.describe('Registration – Mobile Number Page', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://dev.majdpay.com' });
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    });

    // ── Page load ─────────────────────────────────────────────────────────────

    test('should open the Registration URL', async ({ page }) => {
        await expect(page).toHaveURL(REGISTER_URL);
    });

    test('should have the correct page title', async ({ page }) => {
        await expect(page).toHaveTitle('EMI - Business');
    });

    // ── Logo ──────────────────────────────────────────────────────────────────

    test('should display the MJD Pay logo', async ({ page }) => {
        await expect(page.locator('img[alt="MJD Pay"]')).toBeVisible();
    });

    test('should navigate away from registration when the logo is clicked', async ({ page }) => {
        await page.locator('a').filter({ has: page.locator('img[alt="MJD Pay"]') }).click();
        await expect(page).not.toHaveURL(REGISTER_URL);
    });

    // ── Language switcher ─────────────────────────────────────────────────────

    test('should display the EN language button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'EN' })).toBeVisible();
    });

    test('should display the Arabic language button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'العربية' })).toBeVisible();
    });

    test('should switch to Arabic (RTL) when Arabic button is clicked', async ({ page }) => {
        await page.getByRole('button', { name: 'العربية' }).click();
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    });

    // ── Theme toggle ──────────────────────────────────────────────────────────

    test('should display the theme toggle button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Switch theme' })).toBeVisible();
    });

    // ── Page content ──────────────────────────────────────────────────────────

    test('should display the "Create Account" eyebrow text', async ({ page }) => {
        await expect(page.getByText('Create Account')).toBeVisible();
    });

    test('should display the "Enter Phone Number" heading', async ({ page }) => {
        await expect(page.getByText('Enter Phone Number')).toBeVisible();
    });

    test('should display the "Start your business registration" description', async ({ page }) => {
        await expect(page.getByText('Start your business registration')).toBeVisible();
    });

    // ── Mobile number field ───────────────────────────────────────────────────

    test('should display the Mobile Number label', async ({ page }) => {
        await expect(page.getByText('Mobile number')).toBeVisible();
    });

    test('should display the Mobile number input', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Mobile number' })).toBeVisible();
    });

    test('should have the correct placeholder for Mobile number', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Mobile number' }))
            .toHaveAttribute('placeholder', 'Eg. 522284484');
    });

    test('should accept input in the Mobile number field', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_KSA_MOBILE);
        await expect(page.getByRole('textbox', { name: 'Mobile number' })).toHaveValue(VALID_KSA_MOBILE);
    });

    // ── Next button ───────────────────────────────────────────────────────────

    test('should display the Next button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'next' })).toBeVisible();
    });

    test('should have Next button disabled when Mobile number is empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'next' })).toBeDisabled();
    });

    test('should enable Next button when a valid KSA mobile number is filled', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_KSA_MOBILE);
        await expect(page.getByRole('button', { name: 'next' })).toBeEnabled();
    });

    test('should disable Next button again after clearing the Mobile number field', async ({ page }) => {
        const input = page.getByRole('textbox', { name: 'Mobile number' });
        await input.fill(VALID_KSA_MOBILE);
        await expect(page.getByRole('button', { name: 'next' })).toBeEnabled();
        await input.clear();
        await expect(page.getByRole('button', { name: 'next' })).toBeDisabled();
    });

    // ── KSA format validation – invalid numbers ───────────────────────────────

    test('should reject a mobile number that does not start with 5', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('123456789');
        await expect(page.getByRole('button', { name: 'next' })).toBeDisabled();
    });

    test('should reject a mobile number shorter than 9 digits', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('5003181');
        await expect(page.getByRole('button', { name: 'next' })).toBeDisabled();
    });

    test('should reject a mobile number longer than 9 digits', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('5003181430');
        await expect(page.getByRole('button', { name: 'next' })).toBeDisabled();
    });

    // ── Log In link ───────────────────────────────────────────────────────────

    test('should display the "Already have an account?" text', async ({ page }) => {
        await expect(page.getByText('Already have an account?')).toBeVisible();
    });

    test('should display the Log In text', async ({ page }) => {
        await expect(page.getByText('Log In', { exact: true })).toBeVisible();
    });

    test('should navigate to the login page when Log In is clicked', async ({ page }) => {
        await page.getByText('Log In', { exact: true }).click();
        await expect(page).toHaveURL(LOGIN_URL, { timeout: 10000 });
    });

    // ── Sign Up trigger from Login page ───────────────────────────────────────

    test('should open the registration page when Sign Up is clicked on the login page', async ({ page }) => {
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.locator("//div//span[@class='text-primary fw-bold link']").click();
        await expect(page).toHaveURL(REGISTER_URL, { timeout: 15000 });
    });
});

test.describe('Registration – OTP Popup', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://dev.majdpay.com' });
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        // Fill valid mobile and submit to trigger OTP popup
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_KSA_MOBILE);
        await page.getByRole('button', { name: 'next' }).click();
        await page.getByRole('heading', { name: 'Enter OTP' }).waitFor({ state: 'visible', timeout: 15000 });
    });

    // ── OTP popup content ─────────────────────────────────────────────────────

    test('should display the Enter OTP heading', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Enter OTP' })).toBeVisible();
    });

    test('should display the OTP instruction message', async ({ page }) => {
        await expect(page.getByText('A code has been sent to you, in order to continue with the sign up process.')).toBeVisible();
    });

    test('should display the countdown timer', async ({ page }) => {
        await expect(page.getByText(/Code ends/)).toBeVisible();
    });

    // ── Buttons ───────────────────────────────────────────────────────────────

    test('should display the Cancel button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    });

    test('should display the Verify button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Verify' })).toBeVisible();
    });

    test('should display the Click to resend button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Click to resend' })).toBeVisible();
    });

    test('should have Verify button disabled when OTP inputs are empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Verify' })).toBeDisabled();
    });

    test('should have Click to resend button disabled initially', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Click to resend' })).toBeDisabled();
    });

    // ── OTP input behaviour ───────────────────────────────────────────────────


    test('should enable Verify button when all OTP inputs are filled', async ({ page }) => {
        const inputs = page.locator('[id^="ngx-otp-input"]');
        const count = await inputs.count();
        for (let i = 0; i < count; i++) {
            await inputs.nth(i).click();
            await inputs.nth(i).pressSequentially('0');
        }
        await expect(page.getByRole('button', { name: 'Verify' })).toBeEnabled();
    });

    test('should keep Verify disabled when fewer than all OTP digits are entered', async ({ page }) => {
        const inputs = page.locator('[id^="ngx-otp-input"]');
        const count = await inputs.count();
        for (let i = 0; i < count - 1; i++) {
            await inputs.nth(i).click();
            await inputs.nth(i).pressSequentially('0');
        }
        await expect(page.getByRole('button', { name: 'Verify' })).toBeDisabled();
    });

    // ── Cancel ────────────────────────────────────────────────────────────────

    test('should return to the mobile number page when Cancel is clicked', async ({ page }) => {
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(page.getByText('Enter Phone Number')).toBeVisible({ timeout: 10000 });
    });
});
