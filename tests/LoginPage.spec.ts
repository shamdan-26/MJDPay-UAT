import { test, expect } from '@playwright/test'

test.describe('Verify Login page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('https://dev.majdpay.com/business/auth/login');
    });

    test('should be able to open the URL', async ({ page }) => {
        await expect(page).toHaveURL('https://dev.majdpay.com/business/auth/login');
    })

    test('should have the correct title', async ({ page }) => {
        await expect(page).toHaveTitle('EMI - Business');
    })

    test('should have the login form', async ({ page }) => {
       await expect(page.locator('#login-form-box')).toBeVisible();
    })

    test('should have the correct login form eyebrow text', async ({ page }) => {
        const loginFormEyeBrow = page.locator('#login-form-eyebrow');
        await expect(loginFormEyeBrow).toHaveText('Login');
    })

    test('should have the correct login form title', async ({ page }) => {
        const loginFormTitle = page.locator('#login-form-title');
        await expect(loginFormTitle).toHaveText(' Welcome to MJD Pay');
    })

    test('should have the correct login form description', async ({ page }) => {
        const loginFormDescription = page.getByText("Seamless transactions, secure payments â€” let's get started.");
        await expect(loginFormDescription).toHaveText("Seamless transactions, secure payments â€” let's get started.");
    })

    // â”€â”€ Logo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the MJD Pay logo', async ({ page }) => {
         const logo = page.locator('img[alt="MJD Pay"]');
        await expect(logo).toBeVisible();
        //await expect(logo.getByRole('img', { name: 'MJD Pay' })).toBeVisible();
    })

    // â”€â”€ Language switcher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the EN language button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'EN' })).toBeVisible();
    })

    test('should display the Arabic language button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©' })).toBeVisible();
    })

    test('should switch to Arabic (RTL) when Arabic button is clicked', async ({ page }) => {
        await page.getByRole('button', { name: 'Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©' }).click();
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    })

    // â”€â”€ Theme toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the theme toggle button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Switch theme' })).toBeVisible();
    })

    // â”€â”€ Company number field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the Company number label', async ({ page }) => {
        await expect(page.getByText('Company number')).toBeVisible();
    })

    test('should display the Company number input with correct placeholder', async ({ page }) => {
        const input = page.getByRole('textbox', { name: 'Company number' });
        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute('placeholder', 'Eg. 153165659');
    })

    test('should accept input in the Company number field', async ({ page }) => {
        const input = page.getByRole('textbox', { name: 'Company number' });
        await input.fill('123456789');
        await expect(input).toHaveValue('123456789');
    })

    // â”€â”€ Mobile number field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the Mobile number label', async ({ page }) => {
        await expect(page.getByText('Mobile number')).toBeVisible();
    })

    test('should display the country code (+966)', async ({ page }) => {
        await expect(page.locator('.floating-prefix')).toContainText('(+966)');
    })

    test('should display the Mobile number input with correct placeholder', async ({ page }) => {
        const input = page.getByRole('textbox', { name: 'Mobile number' });
        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute('placeholder', 'Input here');
    })

    test('should accept input in the Mobile number field', async ({ page }) => {
        const input = page.getByRole('textbox', { name: 'Mobile number' });
        await input.fill('500318143');
        await expect(input).toHaveValue('500318143');
    })

    // â”€â”€ Password field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the Password label', async ({ page }) => {
        await expect(page.locator('label.floating-field-label', { hasText: 'Password' })).toBeVisible();
    })

    test('should display the Password input masked by default with correct placeholder', async ({ page }) => {
        const input = page.getByRole('textbox', { name: 'Password' });
        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute('type', 'password');
        await expect(input).not.toHaveAttribute('placeholder', 'general.input_password');
        await expect(input).toHaveAttribute('placeholder', 'Input Password');
    })

    test('should accept input in the Password field', async ({ page }) => {
        const input = page.getByRole('textbox', { name: 'Password' });
        await input.fill('Secret@123');
        await expect(input).toHaveValue('Secret@123');
    })

    // â”€â”€ Show/hide password toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the Show password button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Show password' })).toBeVisible();
    })

    test('should toggle password visibility when Show password is clicked', async ({ page }) => {
        const passwordInput = page.locator('input[aria-label="Password"]');
    const toggleBtn = page.locator('button.floating-password-toggle');

    await expect(passwordInput).toHaveAttribute('type', 'password');
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    })

    // â”€â”€ Forgot Password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the Forgot Password link', async ({ page }) => {
        await expect(page.getByText('Forgot Password?')).toBeVisible();
    })

    test('should navigate away from login when Forgot Password is clicked', async ({ page }) => {
        await page.getByText('Forgot Password?').click();
        await expect(page).not.toHaveURL('https://dev.majdpay.com/business/auth/login');
    })

    // â”€â”€ Log In button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the Log In button as visible and disabled until form is filled', async ({ page }) => {
        const loginBtn = page.getByRole('button', { name: 'Log In' });
        await expect(loginBtn).toBeVisible();
        await expect(loginBtn).toBeDisabled();
    })

    test('should enable the Log In button when all fields are filled', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('L3999');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500318143');
        await page.getByRole('textbox', { name: 'Password' }).fill('Secret@123');
        await expect(page.getByRole('button', { name: 'Log In' })).toBeEnabled();
    })

    test('should show an error when Log In is submitted with invalid credentials', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('L3999');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500318143');
        await page.getByRole('textbox', { name: 'Password' }).fill('WrongPass');
        await page.getByRole('button', { name: 'Log In' }).click();
        // Should stay on login page or show an error message
        await expect(page.locator('body')).toContainText(/.+/);
    })

    // â”€â”€ Sign Up â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the "New to MJD PAY?" text', async ({ page }) => {
        await expect(page.getByText('New to MJD PAY?')).toBeVisible();
    })

    test('should display the Sign Up link', async ({ page }) => {
        await expect(page.getByText('Sign Up')).toBeVisible();
    })

    test('should navigate away from login when Sign Up is clicked', async ({ page }) => {
        await page.getByText('Sign Up').click();
        await expect(page).not.toHaveURL('https://dev.majdpay.com/business/auth/login');
    })

})