import { test, expect } from '@playwright/test';

const URL = 'https://dev.majdpay.com/business/auth/forgot-password';
const LOGIN_URL = 'https://dev.majdpay.com/business/auth/login';

test.describe('Forgot Password Page', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://dev.majdpay.com' });
        await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    });

    // â”€â”€ Page load â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should open the Forgot Password URL', async ({ page }) => {
        await expect(page).toHaveURL(URL);
    });

    test('should have the correct page title', async ({ page }) => {
        await expect(page).toHaveTitle('EMI - Business');
    });

    // â”€â”€ Logo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the MJD Pay logo', async ({ page }) => {
        await expect(page.locator('img[alt="MJD Pay"]')).toBeVisible();
    });

    test('should navigate to login when the logo is clicked', async ({ page }) => {
        await page.locator('a').filter({ has: page.locator('img[alt="MJD Pay"]') }).click();
        await expect(page).not.toHaveURL(URL);
    });

    // â”€â”€ Language switcher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the EN language button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'EN' })).toBeVisible();
    });

    test('should display the Arabic language button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©' })).toBeVisible();
    });

    test('should switch to Arabic (RTL) when Arabic button is clicked', async ({ page }) => {
        await page.getByRole('button', { name: 'Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©' }).click();
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    });

    // â”€â”€ Theme toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the theme toggle button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Switch theme' })).toBeVisible();
    });

    // â”€â”€ Back button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the back button', async ({ page }) => {
        await expect(page.locator('main button').first()).toBeVisible();
    });

    test('should navigate back to the login page when back button is clicked', async ({ page }) => {
        await page.locator('main button').first().click();
        await expect(page).toHaveURL(LOGIN_URL);
    });

    // â”€â”€ Eyebrow & title â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the "Forgot password" eyebrow text', async ({ page }) => {
        await expect(page.getByText('Forgot password')).toBeVisible();
    });

    test('should display the "Welcome to MJD Pay" heading', async ({ page }) => {
        await expect(page.getByText('Welcome to MJD Pay')).toBeVisible();
    });

    // â”€â”€ Company number field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the Company number label', async ({ page }) => {
        await expect(page.getByText('Company number')).toBeVisible();
    });

    test('should display the Company number input', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Company number' })).toBeVisible();
    });

    test('should have the correct placeholder for Company number', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Company number' }))
            .toHaveAttribute('placeholder', 'Input here');
    });

    test('should accept input in the Company number field', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('L3999');
        await expect(page.getByRole('textbox', { name: 'Company number' })).toHaveValue('L3999');
    });

    // â”€â”€ Mobile number field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the Mobile number label', async ({ page }) => {
        await expect(page.getByText('Mobile number')).toBeVisible();
    });

    test('should display the country code (+966)', async ({ page }) => {
        await expect(page.locator('.floating-prefix')).toContainText('(+966)');
    });

    test('should display the Mobile number input', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Mobile number' })).toBeVisible();
    });

    test('should have the correct placeholder for Mobile number', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Mobile number' }))
            .toHaveAttribute('placeholder', 'Input here');
    });

    test('should accept input in the Mobile number field', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500318143');
        await expect(page.getByRole('textbox', { name: 'Mobile number' })).toHaveValue('500318143');
    });

    // â”€â”€ Next button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the Next button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
    });

    test('should have Next button disabled when both fields are empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    test('should have Next button disabled when only Company number is filled', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('L3999');
        await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    test('should have Next button disabled when only Mobile number is filled', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500318143');
        await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    test('should enable Next button when both fields are filled', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('L3999');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500318143');
        await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled();
    });

    test('should disable Next button again after clearing a filled field', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('L3999');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500318143');
        await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled();
        await page.getByRole('textbox', { name: 'Mobile number' }).clear();
        await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    // â”€â”€ Form submission â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should proceed when Next is clicked with valid company and mobile number', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('L3999');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500318143');
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page).not.toHaveURL(URL);
    });

    test('should show an error when Next is clicked with invalid credentials', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('INVALID');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page).toHaveURL(URL);
    });

});
