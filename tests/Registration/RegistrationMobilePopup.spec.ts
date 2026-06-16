import { test, expect } from '@playwright/test';

const LOGIN_URL    = 'https://dev.majdpay.com/business/auth/login';
const REGISTER_URL = 'https://dev.majdpay.com/business/auth/register';

// KSA mobile: starts with 5, exactly 9 digits
const VALID_KSA_MOBILE = '500318143';

// Registration Info form test data
// Saudi CRN: 10 digits, starts with 1
const VALID_CRN   = '1010234567';
// Iqama (Resident ID): 10 digits, starts with 2
const VALID_IQAMA = '2123456789';
const VALID_EMAIL  = 's.hamdan@dg-cash.com';

// ── Shared helper: fill OTP with all-zero digit ───────────────────────────────

async function fillOTP(page: any) {
    const inputs = page.getByRole('textbox', { name: 'One time password input' });
    const count  = await inputs.count();
    for (let i = 0; i < count; i++) {
        await inputs.nth(i).click();
        await inputs.nth(i).pressSequentially('0');
    }
}

// ── Shared helper: select a random option from any dropdown ───────────────────

async function selectRandomOption(page: any, dropdownLocator: any) {
    const tag = await dropdownLocator.evaluate((el: Element) => el.tagName.toLowerCase());
    if (tag === 'select') {
        const options   = await dropdownLocator.locator('option').all();
        const selectable = options.slice(1); // skip empty placeholder
        const pick      = selectable[Math.floor(Math.random() * selectable.length)];
        await dropdownLocator.selectOption(await pick.getAttribute('value'));
    } else {
        await dropdownLocator.click();
        const items = page.locator('[role="option"]:visible, .dropdown-item:visible, .ng-option:visible');
        await items.first().waitFor({ state: 'visible', timeout: 5000 });
        const count = await items.count();
        await items.nth(Math.floor(Math.random() * count)).click();
    }
}

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

    test('should not allow more than 9 digits in the Mobile number field', async ({ page }) => {
        const input = page.getByRole('textbox', { name: 'Mobile number' });
        await input.pressSequentially('5003181430');
        const value = await input.inputValue();
        expect(value.length).toBeLessThanOrEqual(9);
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
        await fillOTP(page);
        await expect(page.getByRole('button', { name: 'Verify' })).toBeEnabled();
    });

    test('should keep Verify disabled when fewer than all OTP digits are entered', async ({ page }) => {
        const inputs = page.getByRole('textbox', { name: 'One time password input' });
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

test.describe('Registration – Info Page', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://dev.majdpay.com' });
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Step 1 – mobile number
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_KSA_MOBILE);
        await page.getByRole('button', { name: 'next' }).click();

        // Step 2 – OTP (test env uses all-zero OTP)
        await page.getByRole('heading', { name: 'Enter OTP' }).waitFor({ state: 'visible', timeout: 15000 });
        await page.getByRole('textbox', { name: 'One time password input' }).first()
            .waitFor({ state: 'visible', timeout: 10000 });
        await fillOTP(page);
        const verifyBtn = page.getByRole('button', { name: 'Verify' });
        await expect(verifyBtn).toBeEnabled({ timeout: 10000 });
        await verifyBtn.click();

        // Step 3 – wait for Registration Info form
        await page.getByRole('heading', { name: 'Tell us about your business' })
            .waitFor({ state: 'visible', timeout: 20000 });
    });

    // ── Page content ──────────────────────────────────────────────────────────

    test('should display the registration info form heading', async ({ page }) => {
        await expect(
            page.getByRole('heading', { name: 'Tell us about your business' })
        ).toBeVisible();
    });

    // ── CRN field ─────────────────────────────────────────────────────────────

    test('should display the CRN field label', async ({ page }) => {
        await expect(page.getByText(/CRN|Commercial Registration/i).first()).toBeVisible();
    });

    test('should display the CRN input', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /CRN|Commercial Registration/i })).toBeVisible();
    });

    test('should accept a valid Saudi CRN', async ({ page }) => {
        const input = page.getByRole('textbox', { name: /CRN|Commercial Registration/i });
        await input.fill(VALID_CRN);
        await expect(input).toHaveValue(VALID_CRN);
    });

    test('should reject a CRN shorter than 10 digits', async ({ page }) => {
        const input = page.getByRole('textbox', { name: /CRN|Commercial Registration/i });
        await input.fill('101023456');
        await input.blur();
        await expect(page.locator('[class*="error"], [class*="invalid"], [id*="error"]').first())
            .toBeVisible({ timeout: 5000 });
    });

    test('should not allow more than 10 digits in the CRN field', async ({ page }) => {
        const input = page.getByRole('textbox', { name: /CRN|Commercial Registration/i });
        await input.pressSequentially('10102345678');
        const value = await input.inputValue();
        expect(value.length).toBeLessThanOrEqual(10);
    });

    // ── Iqama field ───────────────────────────────────────────────────────────

    test('should display the Iqama field label', async ({ page }) => {
        await expect(page.getByText(/Iqama|Iqāma|Residence/i).first()).toBeVisible();
    });

    test('should display the Iqama input', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /Iqama|Iqāma|Residence/i })).toBeVisible();
    });

    test('should accept a valid Iqama number', async ({ page }) => {
        const input = page.getByRole('textbox', { name: /Iqama|Iqāma|Residence/i });
        await input.fill(VALID_IQAMA);
        await expect(input).toHaveValue(VALID_IQAMA);
    });

    test('should reject an Iqama shorter than 10 digits', async ({ page }) => {
        const input = page.getByRole('textbox', { name: /Iqama|Iqāma|Residence/i });
        await input.fill('212345678');
        await input.blur();
        await expect(page.locator('[class*="error"], [class*="invalid"], [id*="error"]').first())
            .toBeVisible({ timeout: 5000 });
    });

    test('should not allow more than 10 digits in the Iqama field', async ({ page }) => {
        const input = page.getByRole('textbox', { name: /Iqama|Iqāma|Residence/i });
        await input.pressSequentially('21234567890');
        const value = await input.inputValue();
        expect(value.length).toBeLessThanOrEqual(10);
    });

    // ── Email field ───────────────────────────────────────────────────────────

    test('should display the Email field label', async ({ page }) => {
        await expect(page.getByText(/Email/i).first()).toBeVisible();
    });

    test('should display the Email input', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /Email/i })).toBeVisible();
    });

    test('should accept a valid email address', async ({ page }) => {
        const input = page.getByRole('textbox', { name: /Email/i });
        await input.fill(VALID_EMAIL);
        await expect(input).toHaveValue(VALID_EMAIL);
    });

    test('should reject an invalid email format', async ({ page }) => {
        const input = page.getByRole('textbox', { name: /Email/i });
        await input.fill('not-an-email');
        await input.blur();
        await expect(page.locator('[class*="error"], [class*="invalid"], [id*="error"]').first())
            .toBeVisible({ timeout: 5000 });
    });

    // ── Profile Type dropdown ─────────────────────────────────────────────────

    test('should display the Profile Type dropdown', async ({ page }) => {
        await expect(
            page.getByRole('combobox', { name: /Profile Type|Profile/i })
                .or(page.locator('[id*="profile"], [name*="profile"], [placeholder*="profile" i]').first())
        ).toBeVisible({ timeout: 5000 });
    });

    test('should be able to select a Profile Type option', async ({ page }) => {
        const dropdown = page.getByRole('combobox', { name: /Profile Type|Profile/i })
            .or(page.locator('[id*="profile"], [name*="profile"]').first());
        await selectRandomOption(page, dropdown);
        const value = await dropdown.inputValue().catch(() => dropdown.locator('..').innerText());
        expect(value.trim().length).toBeGreaterThan(0);
    });

    // ── Next / Submit button ──────────────────────────────────────────────────

    test('should display the Next button', async ({ page }) => {
        await expect(
            page.getByRole('button', { name: /next|submit|continue/i }).first()
        ).toBeVisible();
    });

    test('should have the Next button disabled when required fields are empty', async ({ page }) => {
        await expect(
            page.getByRole('button', { name: /next|submit|continue/i }).first()
        ).toBeDisabled();
    });

    test('should enable Next button when all required fields are filled', async ({ page }) => {
        await page.getByRole('textbox', { name: /CRN|Commercial Registration/i }).fill(VALID_CRN);
        await page.getByRole('textbox', { name: /Iqama|Iqāma|Residence/i }).fill(VALID_IQAMA);
        await page.getByRole('textbox', { name: /Email/i }).fill(VALID_EMAIL);
        const dropdown = page.getByRole('combobox', { name: /Profile Type|Profile/i })
            .or(page.locator('[id*="profile"], [name*="profile"]').first());
        await selectRandomOption(page, dropdown);
        await expect(
            page.getByRole('button', { name: /next|submit|continue/i }).first()
        ).toBeEnabled({ timeout: 5000 });
    });
});
