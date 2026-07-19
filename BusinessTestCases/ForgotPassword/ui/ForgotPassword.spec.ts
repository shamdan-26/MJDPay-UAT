import { test, expect } from '../../fixtures';
import { FORGOT_URL, LOGIN_URL, mockOtpDisabled, gotoForgotPassword } from '../ForgotPasswordHelper';
import { ForgotPasswordPage } from '../../pageElements/ForgotPasswordPage';

test.describe('Forgot Password Page', () => {
    test.describe.configure({ mode: 'serial' });

    let forgotPassword: ForgotPasswordPage;

    test.beforeEach(async ({ page, forgotPassword: fp }) => {
        await mockOtpDisabled(page);
        await gotoForgotPassword(page);
        forgotPassword = fp;
    });

    // ── Page load ─────────────────────────────────────────────────────────────

    test('should open the Forgot Password URL', async ({ page }) => {
        await expect(page).toHaveURL(FORGOT_URL);
    });

    test('should have the correct page title', async ({ page }) => {
        await expect(page).toHaveTitle('EMI - Business');
    });

    // ── Logo ──────────────────────────────────────────────────────────────────

    test('should display the MJD Pay logo', async () => {
        await expect(forgotPassword.logoImage).toBeVisible();
    });

    test('should navigate away from forgot-password when logo is clicked', async ({ page }) => {
        await forgotPassword.logoLink.click();
        await expect(page).not.toHaveURL(FORGOT_URL);
    });

    // ── Language switcher ─────────────────────────────────────────────────────

    test('should display the EN language button', async () => {
        await expect(forgotPassword.enButton).toBeVisible();
    });

    test('should not have EN button active by default', async () => {
        await expect(forgotPassword.enButton).not.toHaveAttribute('aria-pressed', 'true');
    });

    test('should display the Arabic language button', async () => {
        await expect(forgotPassword.arabicButton).toBeVisible();
    });

    test('should have Arabic button active by default', async () => {
        await expect(forgotPassword.arabicButton).toHaveAttribute('aria-pressed', 'true');
    });

    // ── Theme toggle ──────────────────────────────────────────────────────────

    test('should display the theme toggle button', async () => {
        await expect(forgotPassword.themeToggle).toBeVisible();
    });

    test('should change the theme when theme toggle is clicked', async ({ page }) => {
        const html = page.locator('html');
        const before = await html.getAttribute('class');
        await forgotPassword.themeToggle.click();
        await expect(html).not.toHaveAttribute('class', before ?? '');
    });

    // ── Back button ───────────────────────────────────────────────────────────

    test('should display the back button', async () => {
        await expect(forgotPassword.backButton).toBeVisible();
    });

    test('should navigate to the login page when back button is clicked', async ({ page }) => {
        await forgotPassword.backButton.click();
        await expect(page).toHaveURL(LOGIN_URL);
    });

    // ── Eyebrow & title ───────────────────────────────────────────────────────

    test('should display the "Forgot password" eyebrow text', async ({ page }) => {
        await expect(page.getByText('Forgot password')).toBeVisible();
    });

    test('should display the "Welcome to MJD Pay" heading', async ({ page }) => {
        await expect(page.getByText('Welcome to MJD Pay')).toBeVisible();
    });

    // ── Company number field ──────────────────────────────────────────────────

    test('should display the Company number label', async ({ page }) => {
        await expect(page.getByText('Company number')).toBeVisible();
    });

    test('should have the Company number input visible and enabled', async () => {
        await expect(forgotPassword.companyInput).toBeVisible();
        await expect(forgotPassword.companyInput).toBeEnabled();
    });

    test('should display "Input here" placeholder in the Company number field', async () => {
        await expect(forgotPassword.companyInput).toHaveAttribute('placeholder', 'Input here');
    });

    // ── Mobile number field ───────────────────────────────────────────────────

    test('should display the Mobile number label', async ({ page }) => {
        await expect(page.getByText('Mobile number')).toBeVisible();
    });

    test('should display the Saudi flag icon in the mobile field', async ({ page }) => {
        await expect(page.locator('.floating-prefix img, .floating-prefix .flag, [class*="flag"]').first()).toBeVisible();
    });

    test('should display the country code (+966)', async ({ page }) => {
        await expect(page.locator('.floating-prefix')).toContainText('(+966)');
    });

    test('should have the Mobile number input visible and enabled', async () => {
        await expect(forgotPassword.mobileInput).toBeVisible();
        await expect(forgotPassword.mobileInput).toBeEnabled();
    });

    test('should display "Input here" placeholder in the Mobile number field', async () => {
        await expect(forgotPassword.mobileInput).toHaveAttribute('placeholder', 'Input here');
    });

    // ── Next button ───────────────────────────────────────────────────────────

    test('should display the Next button', async () => {
        await expect(forgotPassword.nextButton).toBeVisible();
    });

    test('should have Next button disabled when both fields are empty', async () => {
        await expect(forgotPassword.nextButton).toBeDisabled();
    });
});
