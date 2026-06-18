import { test, expect } from '@playwright/test';
import { REGISTER_URL } from './helpers';

test.describe('Registration - Mobile Number Page', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
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

    test('should display the MJD Pay logo as a clickable link', async ({ page }) => {
        await expect(page.locator('a:has(img[alt="MJD Pay"])')).toBeVisible();
    });

    test('should navigate to a valid page when the logo link is clicked', async ({ page }) => {
        await page.locator('a:has(img[alt="MJD Pay"])').click();
        await expect(page).toHaveURL(/majdpay\.com/, { timeout: 10000 });
    });

    // ── Language switcher ─────────────────────────────────────────────────────

    test('should display the EN language button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'EN' })).toBeVisible();
    });

    test('should have EN as the active language by default', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
    });

    test('should display the Arabic language button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'العربية' })).toBeVisible();
    });

    test('should not have Arabic as the active language by default', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'العربية' })).not.toHaveAttribute('aria-pressed', 'true');
    });

    // ── Theme toggle ──────────────────────────────────────────────────────────

    test('should display the theme toggle button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Switch theme' })).toBeVisible();
    });

    test('should change the theme when the toggle is clicked', async ({ page }) => {
        const body = page.locator('body');
        const before = await body.getAttribute('class');
        await page.getByRole('button', { name: 'Switch theme' }).click();
        const after = await body.getAttribute('class');
        expect(after).not.toEqual(before);
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

    // ── Next button ───────────────────────────────────────────────────────────

    test('should display the Next button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'next' })).toBeVisible();
    });

    test('should have Next button disabled when Mobile number is empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'next' })).toBeDisabled();
    });

    // ── Log In link ───────────────────────────────────────────────────────────

    test('should display the "Already have an account?" text', async ({ page }) => {
        await expect(page.getByText('Already have an account?')).toBeVisible();
    });

    test('should display the Log In text', async ({ page }) => {
        await expect(page.getByText('Log In', { exact: true })).toBeVisible();
    });
});
