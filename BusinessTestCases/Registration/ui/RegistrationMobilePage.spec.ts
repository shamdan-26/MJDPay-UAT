import { test, expect } from '@playwright/test';
import { REGISTER_URL } from '../helpers';
import { RegistrationMobilePage } from '../../pageElements/registration/RegistrationMobilePage';

test.describe('Registration - Mobile Number Page', () => {
    test.describe.configure({ mode: 'serial' });

    let regPage: RegistrationMobilePage;

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: new URL(REGISTER_URL).origin });
        regPage = new RegistrationMobilePage(page);
        await regPage.goto(REGISTER_URL);
    });

    // ── Page load ─────────────────────────────────────────────────────────────

    test('should open the Registration URL', async ({ page }) => {
        
        await expect(page).toHaveURL(REGISTER_URL);
    });

    test('should have the correct page title', async ({ page }) => {
        await expect(page).toHaveTitle('EMI - Business');
    });

    // ── Logo ──────────────────────────────────────────────────────────────────

    test('should display the MJD Pay logo', async () => {
        await expect(regPage.logoImage).toBeVisible();
    });

    test('should display the MJD Pay logo as a clickable link', async () => {
        await expect(regPage.logoLink).toBeVisible();
    });

    test('should navigate to a valid page when the logo link is clicked', async ({ page }) => {
        await regPage.logoLink.click();
        await expect(page).toHaveURL(/majdpay\.com/, { timeout: 10000 });
    });

    // ── Language switcher ─────────────────────────────────────────────────────

    test('should display the EN language button', async () => {
        await expect(regPage.enButton).toBeVisible();
    });

    test('should have EN as the active language by default', async () => {
        await expect(regPage.enButton).toHaveAttribute('aria-pressed', 'true');
    });

    test('should display the Arabic language button', async () => {
        await expect(regPage.arabicButton).toBeVisible();
    });

    test('should not have Arabic as the active language by default', async () => {
        await expect(regPage.arabicButton).not.toHaveAttribute('aria-pressed', 'true');
    });

    // ── Theme toggle ──────────────────────────────────────────────────────────

    test('should display the theme toggle button', async () => {
        await expect(regPage.themeToggle).toBeVisible();
    });

    test('should change the theme when the toggle is clicked', async ({ page }) => {
        const body = page.locator('body');
        const before = await body.getAttribute('class');
        await regPage.themeToggle.click();
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

    test('should display the Mobile number input', async () => {
        await expect(regPage.mobileInput).toBeVisible();
    });

    test('should have the correct placeholder for Mobile number', async () => {
        await expect(regPage.mobileInput).toHaveAttribute('placeholder', 'Eg. 522284484');
    });

    // ── Next button ───────────────────────────────────────────────────────────

    test('should display the Next button', async () => {
        await expect(regPage.nextButton).toBeVisible();
    });

    test('should have Next button disabled when Mobile number is empty', async () => {
        await expect(regPage.nextButton).toBeDisabled();
    });

    // ── Log In link ───────────────────────────────────────────────────────────

    test('should display the "Already have an account?" text', async ({ page }) => {
        await expect(page.getByText('Already have an account?')).toBeVisible();
    });

    test('should display the Log In text', async ({ page }) => {
        await expect(page.getByText('Log In', { exact: true })).toBeVisible();
    });
});
