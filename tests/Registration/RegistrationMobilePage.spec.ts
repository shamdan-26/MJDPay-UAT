import { test, expect } from '@playwright/test';
import { LOGIN_URL, REGISTER_URL, generateKSAMobile } from './helpers';

test.describe('Registration – Mobile Number Page', () => {
    test.describe.configure({ mode: 'serial' });

    let mobile: string;

    test.beforeEach(async ({ page, context }) => {
        mobile = generateKSAMobile();
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
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(mobile);
        await expect(page.getByRole('textbox', { name: 'Mobile number' })).toHaveValue(mobile);
    });

    // ── Next button ───────────────────────────────────────────────────────────

    test('should display the Next button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'next' })).toBeVisible();
    });

    test('should have Next button disabled when Mobile number is empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'next' })).toBeDisabled();
    });

    test('should enable Next button when a valid KSA mobile number is filled', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(mobile);
        await expect(page.getByRole('button', { name: 'next' })).toBeEnabled();
    });

    test('should disable Next button again after clearing the Mobile number field', async ({ page }) => {
        const input = page.getByRole('textbox', { name: 'Mobile number' });
        await input.fill(mobile);
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
