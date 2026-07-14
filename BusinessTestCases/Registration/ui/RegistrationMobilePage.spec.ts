import { test, expect } from '../../fixtures';
import { REGISTER_URL } from '../RegistrationHelper';
import { RegistrationMobilePage } from '../../pageElements/RegistrationMobilePage';

test.describe('Registration - Mobile Number Page', () => {
    test.describe.configure({ mode: 'serial' });

    let regPage: RegistrationMobilePage;

    test.beforeEach(async ({ page, registrationMobile }) => {
        regPage = registrationMobile;
        await regPage.goto(REGISTER_URL);
        await regPage.mobileInput.clear();
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

    test('should display the "Create Account" eyebrow text', async () => {
        await expect(regPage.createAccountEyebrow).toBeVisible();
    });

    test('should display the "Enter Phone Number" heading', async () => {
        await expect(regPage.enterPhoneHeading).toBeVisible();
    });

    test('should display the "Start your business registration" description', async () => {
        await expect(regPage.startRegistrationDescription).toBeVisible();
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

    test('should display the "Already have an account?" text', async () => {
        await expect(regPage.alreadyHaveAccountText).toBeVisible();
    });

    test('should display the Log In link', async () => {
        await expect(regPage.loginLink).toBeVisible();
    });
});
