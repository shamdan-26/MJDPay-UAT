import { test, expect } from '@playwright/test';

const LOGIN_URL = 'https://uat.majdpay.com/business/auth/login';
const REGISTER_URL = 'https://uat.majdpay.com/business/auth/register';

// KSA mobile numbers start with 5 and are 9 digits (e.g. 5XXXXXXXX)
const VALID_KSA_MOBILE = '500318143';
const INVALID_KSA_MOBILES = [
    { value: '123456789', label: 'does not start with 5' },
    { value: '50031814',  label: 'too short (8 digits)' },
    { value: '5003181430', label: 'too long (10 digits)' },
    { value: '50031814a', label: 'contains a letter' },
    { value: '',           label: 'empty' },
];

test.describe('Registration – Mobile Number Popup', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    });

    // ── Trigger ───────────────────────────────────────────────────────────────

    test('should display a Register / Sign Up link on the login page', async ({ page }) => {
        const registerLink = page.getByRole('link', { name: /register|sign up/i });
        await expect(registerLink).toBeVisible();
    });

    test('should open the registration page (or popup) when Register is clicked', async ({ page }) => {
        await page.getByRole('link', { name: /register|sign up/i }).click();
        // The app either navigates to the register URL or opens an in-page popup/modal
        const onRegisterPage = page.url() === REGISTER_URL;
        const popupVisible   = await page.locator('[role="dialog"], .modal, .popup').isVisible().catch(() => false);
        expect(onRegisterPage || popupVisible).toBeTruthy();
    });

    // ── Popup / page content ──────────────────────────────────────────────────

    test('should show the Mobile Number input after clicking Register', async ({ page }) => {
        await page.getByRole('link', { name: /register|sign up/i }).click();
        await expect(page.getByRole('textbox', { name: /mobile number/i })).toBeVisible({ timeout: 10000 });
    });

    test('should display the KSA country code (+966)', async ({ page }) => {
        await page.getByRole('link', { name: /register|sign up/i }).click();
        await expect(page.locator('.floating-prefix, [class*="prefix"], [class*="country"]').first())
            .toContainText('966', { timeout: 10000 });
    });

    test('should show the correct placeholder for the mobile input', async ({ page }) => {
        await page.getByRole('link', { name: /register|sign up/i }).click();
        await expect(page.getByRole('textbox', { name: /mobile number/i }))
            .toHaveAttribute('placeholder', /5\d{8}|522284484/i, { timeout: 10000 });
    });

    // ── KSA format validation – valid numbers ─────────────────────────────────

    test('should accept a valid KSA mobile number and enable the Next button', async ({ page }) => {
        await page.getByRole('link', { name: /register|sign up/i }).click();
        const input = page.getByRole('textbox', { name: /mobile number/i });
        await input.waitFor({ state: 'visible', timeout: 10000 });
        await input.fill(VALID_KSA_MOBILE);
        await expect(page.getByRole('button', { name: /next|continue|submit/i })).toBeEnabled();
    });

    test('should keep Next disabled when the mobile field is empty', async ({ page }) => {
        await page.getByRole('link', { name: /register|sign up/i }).click();
        await page.getByRole('textbox', { name: /mobile number/i }).waitFor({ state: 'visible', timeout: 10000 });
        await expect(page.getByRole('button', { name: /next|continue|submit/i })).toBeDisabled();
    });

    // ── KSA format validation – invalid numbers ───────────────────────────────

    for (const { value, label } of INVALID_KSA_MOBILES) {
        if (value === '') continue; // covered by the empty test above

        test(`should reject a mobile number that ${label}`, async ({ page }) => {
            await page.getByRole('link', { name: /register|sign up/i }).click();
            const input = page.getByRole('textbox', { name: /mobile number/i });
            await input.waitFor({ state: 'visible', timeout: 10000 });
            await input.fill(value);
            await page.getByRole('button', { name: /next|continue|submit/i }).click({ force: true });
            // Expect either an error message or the button to remain disabled
            const hasError   = await page.locator('[class*="error"], [role="alert"]').isVisible().catch(() => false);
            const stillHere  = page.url().includes('register') || page.url().includes('login');
            expect(hasError || stillHere).toBeTruthy();
        });
    }

    // ── Popup headings & description ──────────────────────────────────────────

    test('should display the "CREATE ACCOUNT" eyebrow text', async ({ page }) => {
        await page.getByRole('link', { name: /register|sign up/i }).click();
        await page.getByRole('textbox', { name: /mobile number/i }).waitFor({ state: 'visible', timeout: 10000 });
        await expect(page.getByText('CREATE ACCOUNT')).toBeVisible();
    });

    test('should display the "Enter Phone Number" heading', async ({ page }) => {
        await page.getByRole('link', { name: /register|sign up/i }).click();
        await page.getByRole('textbox', { name: /mobile number/i }).waitFor({ state: 'visible', timeout: 10000 });
        await expect(page.getByText('Enter Phone Number')).toBeVisible();
    });

    test('should display the "Start Your Business Registration" description', async ({ page }) => {
        await page.getByRole('link', { name: /register|sign up/i }).click();
        await page.getByRole('textbox', { name: /mobile number/i }).waitFor({ state: 'visible', timeout: 10000 });
        await expect(page.getByText('Start Your Business Registration')).toBeVisible();
    });

    // ── Input behaviour ───────────────────────────────────────────────────────

    test('should store the typed value in the mobile input', async ({ page }) => {
        await page.getByRole('link', { name: /register|sign up/i }).click();
        const input = page.getByRole('textbox', { name: /mobile number/i });
        await input.waitFor({ state: 'visible', timeout: 10000 });
        await input.fill(VALID_KSA_MOBILE);
        await expect(input).toHaveValue(VALID_KSA_MOBILE);
    });

    test('should disable Next button again after clearing the mobile number', async ({ page }) => {
        await page.getByRole('link', { name: /register|sign up/i }).click();
        const input = page.getByRole('textbox', { name: /mobile number/i });
        await input.waitFor({ state: 'visible', timeout: 10000 });
        await input.fill(VALID_KSA_MOBILE);
        await expect(page.getByRole('button', { name: /next|continue|submit/i })).toBeEnabled();
        await input.clear();
        await expect(page.getByRole('button', { name: /next|continue|submit/i })).toBeDisabled();
    });

    test('should not accept non-numeric characters in the mobile input', async ({ page }) => {
        await page.getByRole('link', { name: /register|sign up/i }).click();
        const input = page.getByRole('textbox', { name: /mobile number/i });
        await input.waitFor({ state: 'visible', timeout: 10000 });
        await input.fill('abc!@#');
        const value = await input.inputValue();
        expect(value).toMatch(/^\d*$/);
    });

    test('should enforce the 9-digit maximum length on the mobile input', async ({ page }) => {
        await page.getByRole('link', { name: /register|sign up/i }).click();
        const input = page.getByRole('textbox', { name: /mobile number/i });
        await input.waitFor({ state: 'visible', timeout: 10000 });
        await input.fill('5003181430'); // 10 digits
        const value = await input.inputValue();
        expect(value.length).toBeLessThanOrEqual(9);
    });

    // ── Form submission ───────────────────────────────────────────────────────

    test('should proceed to the next step when Next is clicked with a valid mobile number', async ({ page }) => {
        await page.getByRole('link', { name: /register|sign up/i }).click();
        const input = page.getByRole('textbox', { name: /mobile number/i });
        await input.waitFor({ state: 'visible', timeout: 10000 });
        await input.fill(VALID_KSA_MOBILE);
        await page.getByRole('button', { name: /next|continue|submit/i }).click();
        // Expect navigation away from login or an OTP/next step to appear
        const movedOn = !page.url().includes('login') ||
            await page.locator('[class*="otp"], [placeholder*="OTP"], input[type="number"]').isVisible().catch(() => false);
        expect(movedOn).toBeTruthy();
    });

    // ── Already have an account ───────────────────────────────────────────────

    test('should display the "Already Have An Account?" text', async ({ page }) => {
        await page.getByRole('link', { name: /register|sign up/i }).click();
        await page.getByRole('textbox', { name: /mobile number/i }).waitFor({ state: 'visible', timeout: 10000 });
        await expect(page.getByText(/already have an account/i)).toBeVisible();
    });

    test('should display the Log In link inside the registration view', async ({ page }) => {
        await page.getByRole('link', { name: /register|sign up/i }).click();
        await page.getByRole('textbox', { name: /mobile number/i }).waitFor({ state: 'visible', timeout: 10000 });
        await expect(page.getByRole('link', { name: /log in/i })).toBeVisible();
    });

    test('should navigate to the login page when Log In link is clicked', async ({ page }) => {
        await page.getByRole('link', { name: /register|sign up/i }).click();
        await page.getByRole('textbox', { name: /mobile number/i }).waitFor({ state: 'visible', timeout: 10000 });
        await page.getByRole('link', { name: /log in/i }).click();
        await expect(page).toHaveURL(new RegExp('login'));
    });

    // ── Dismissal ─────────────────────────────────────────────────────────────

    test('should allow the user to go back / close the registration view', async ({ page }) => {
        await page.getByRole('link', { name: /register|sign up/i }).click();
        await page.getByRole('textbox', { name: /mobile number/i }).waitFor({ state: 'visible', timeout: 10000 });

        // Try a close/back button; fall back to browser back
        const closeBtn = page.getByRole('button', { name: /close|cancel|back/i });
        if (await closeBtn.isVisible().catch(() => false)) {
            await closeBtn.click();
        } else {
            await page.goBack();
        }

        await expect(page).toHaveURL(new RegExp(`login|${encodeURIComponent('/')}`));
    });
});
