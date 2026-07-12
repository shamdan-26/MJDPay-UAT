import { test, expect } from '@playwright/test';
import { LOGIN_URL, REGISTER_URL, generateKSAMobile } from '../RegistrationHelper';

test.describe('Registration - Mobile Number Functionality', () => {
    test.describe.configure({ mode: 'serial' });

    let mobile: string;

    test.beforeEach(async ({ page, context }) => {
        mobile = generateKSAMobile();
        await context.grantPermissions(['geolocation'], { origin: new URL(REGISTER_URL).origin });
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    });

    // ── Logo navigation ───────────────────────────────────────────────────────

    test('should navigate away from registration when the logo is clicked', async ({ page }) => {
        await page.locator('a').filter({ has: page.locator('img[alt="MJD Pay"]') }).click();
        await expect(page).not.toHaveURL(REGISTER_URL);
    });

    // ── Language switcher ─────────────────────────────────────────────────────

    test('should switch to Arabic (RTL) when Arabic button is clicked', async ({ page }) => {
        await page.getByRole('button', { name: 'العربية' }).click();
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    });

    // ── Mobile number field ───────────────────────────────────────────────────

    test('should accept input in the Mobile number field', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(mobile);
        await expect(page.getByRole('textbox', { name: 'Mobile number' })).toHaveValue(mobile);
    });

    // ── Character filtering ───────────────────────────────────────────────────

    test('should not accept alphabetic characters in the mobile field', async ({ page }) => {
        const mobileInput = page.getByRole('textbox', { name: 'Mobile number' });
        await mobileInput.pressSequentially('abc');
        await expect(mobileInput).toHaveValue('');
    });

    test('should not accept special characters in the mobile field', async ({ page }) => {
        const mobileInput = page.getByRole('textbox', { name: 'Mobile number' });
        await mobileInput.pressSequentially('!@#');
        await expect(mobileInput).toHaveValue('');
    });

    // ── Next button state ─────────────────────────────────────────────────────

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

    // ── KSA format validation ─────────────────────────────────────────────────

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

    // ── Security ──────────────────────────────────────────────────────────────

    test('should not execute an XSS payload entered in the Mobile number field', async ({ page }) => {
        let alertFired = false;
        page.once('dialog', dialog => { alertFired = true; dialog.dismiss(); });
        const input = page.getByRole('textbox', { name: 'Mobile number' });
        await input.fill('<script>alert("xss")</script>');
        await page.waitForTimeout(500);
        expect(alertFired).toBe(false);
        await expect(page.getByRole('button', { name: 'next' })).toBeDisabled();
    });

    test('should not accept a SQL injection pattern in the Mobile number field', async ({ page }) => {
        const input = page.getByRole('textbox', { name: 'Mobile number' });
        await input.pressSequentially("' OR '1'='1");
        const value = await input.inputValue();
        expect(/[^0-9]/.test(value)).toBe(false);
    });

    // ── Navigation ────────────────────────────────────────────────────────────

    test('should navigate to the login page when Log In is clicked', async ({ page }) => {
        await page.getByText('Log In', { exact: true }).click();
        await expect(page).toHaveURL(LOGIN_URL, { timeout: 10000 });
    });

    test('should open the registration page when Sign Up is clicked on the login page', async ({ page }) => {
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.getByText('Sign Up').click();
        await expect(page).toHaveURL(REGISTER_URL, { timeout: 15000 });
    });
});
