import { test, expect } from '../../fixtures';
import { LOGIN_URL } from '../LoginHelper';
import { LoginPage } from '../../pageElements/Shared/LoginPage';

test.describe('Login Page', { tag: ['@login', '@ui'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'ui' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let loginPage: LoginPage;

    test.beforeEach(async ({ page, loginPage: lp }) => {
        loginPage = lp;
        await loginPage.goto(LOGIN_URL);
    });

    // ── URL & title ───────────────────────────────────────────────────────────

    test('should open the login URL', { annotation: [{ type: 'testcase', description: "LG-01: Login URL loads" }] }, async ({ page }) => {
        await expect(page).toHaveURL(LOGIN_URL);
    });

    test('should have the correct page title', { annotation: [{ type: 'testcase', description: "LG-02: Page title correct" }] }, async ({ page }) => {
        await expect(page).toHaveTitle('EMI - Business');
    });

    test('should display the login form container', { annotation: [{ type: 'testcase', description: "LG-03: Login form container visible" }] }, async () => {
        await expect(loginPage.formBox).toBeVisible();
    });

    test('should display the Login eyebrow text', { annotation: [{ type: 'testcase', description: "LG-04: \"Login\" eyebrow text" }] }, async () => {
        await loginPage.useEnglish(); // UAT defaults to Arabic; assert English copy explicitly
        await expect(loginPage.formEyebrow).toHaveText('Login');
    });

    test('should display the Welcome heading', { annotation: [{ type: 'testcase', description: "LG-05: Welcome heading" }] }, async () => {
        await loginPage.useEnglish();
        await expect(loginPage.formTitle).toHaveText('Welcome to MJD Pay');
    });

    test('should display the tagline description', { annotation: [{ type: 'testcase', description: "LG-06: Tagline text visible" }] }, async () => {
        await expect(loginPage.taglineText).toBeVisible();
    });

    // ── Logo ──────────────────────────────────────────────────────────────────

    test('should display the MJD Pay logo image', { annotation: [{ type: 'testcase', description: "LG-07: MJD Pay logo visible" }] }, async () => {
        await expect(loginPage.logoImage).toBeVisible();
    });

    test('should display the MJD Pay logo as a clickable link', { annotation: [{ type: 'testcase', description: "LG-08: Logo is a clickable link" }] }, async () => {
        await expect(loginPage.logoLink).toBeVisible();
    });

    // ── Language switcher ─────────────────────────────────────────────────────

    test('should display the EN language button', { annotation: [{ type: 'testcase', description: "LG-09: EN language button visible and active by default" }] }, async () => {
        await expect(loginPage.enButton).toBeVisible();
    });

    test('should not have EN as the active language by default', { annotation: [{ type: 'testcase', description: "LG-PAGE-01: Should not have EN as the active language by default" }] }, async () => {
        await expect(loginPage.enButton).not.toHaveAttribute('aria-pressed', 'true');
    });

    test('should display the Arabic language button', { annotation: [{ type: 'testcase', description: "LG-PAGE-02: Should display the Arabic language button" }] }, async () => {
        await expect(loginPage.arabicButton).toBeVisible();
    });

    test('should have Arabic as the active language by default', { annotation: [{ type: 'testcase', description: "LG-PAGE-03: Should have Arabic as the active language by default" }] }, async () => {
        await expect(loginPage.arabicButton).toHaveAttribute('aria-pressed', 'true');
    });

    test('should activate the Arabic button when clicked', { annotation: [{ type: 'testcase', description: "LG-11: Switching to Arabic activates it" }] }, async () => {
        await loginPage.arabicButton.click();
        await expect(loginPage.arabicButton).toHaveAttribute('aria-pressed', 'true');
    });

    test('should switch back to EN when EN button is clicked after Arabic', { annotation: [{ type: 'testcase', description: "LG-12: Switching back to EN" }] }, async () => {
        await loginPage.arabicButton.click();
        await loginPage.enButton.click();
        await expect(loginPage.enButton).toHaveAttribute('aria-pressed', 'true');
    });

    // ── Theme toggle ──────────────────────────────────────────────────────────

    test('should display the theme toggle button', { annotation: [{ type: 'testcase', description: "LG-13: Theme toggle visible" }] }, async () => {
        await expect(loginPage.themeToggle).toBeVisible();
    });

    // ── Company number field ──────────────────────────────────────────────────

    test('should display the Company Number label', { annotation: [{ type: 'testcase', description: "LG-15: Company Number label visible" }] }, async () => {
        await expect(loginPage.companyLabel).toBeVisible();
    });

    test('should display the Company number input as visible and enabled', { annotation: [{ type: 'testcase', description: "LG-16: Company Number input enabled" }] }, async () => {
        await expect(loginPage.companyInput).toBeVisible();
        await expect(loginPage.companyInput).toBeEnabled();
    });

    test('should display the Company number input with the correct placeholder', { annotation: [{ type: 'testcase', description: "LG-17: Company Number placeholder" }] }, async () => {
        // Placeholder is "Eg. Z9246" (en) / "مثال: Z9246" (ar) — assert the locale-stable
        // example token rather than the product-tweakable prefix.
        await expect(loginPage.companyInput).toHaveAttribute('placeholder', /Z9246/);
    });

    test('should display the clear button on the Company Number field when filled', { annotation: [{ type: 'testcase', description: "LG-18: Company Number clear button appears when filled" }] }, async () => {
        await loginPage.companyInput.fill('A2316');
        await expect(loginPage.companyClearButton).toBeVisible();
    });

    test('should clear the Company Number field when the clear button is clicked', { annotation: [{ type: 'testcase', description: "LG-19: Company Number clear button empties the field" }] }, async () => {
        await loginPage.companyInput.fill('A2316');
        await loginPage.companyClearButton.click();
        await expect(loginPage.companyInput).toHaveValue('');
    });

    // ── Mobile number field ───────────────────────────────────────────────────

    test('should display the Mobile Number label', { annotation: [{ type: 'testcase', description: "LG-20: Mobile Number label visible" }] }, async () => {
        await expect(loginPage.mobileLabel).toBeVisible();
    });

    test('should display the country flag in the mobile number field', { annotation: [{ type: 'testcase', description: "LG-21: Country flag shown" }] }, async () => {
        await expect(loginPage.countryFlag).toBeVisible();
    });

    test('should display the country code (+966)', { annotation: [{ type: 'testcase', description: "LG-22: Country code shown" }] }, async () => {
        await expect(loginPage.countryCode).toContainText('(+966)');
    });

    test('should display the Mobile number input as visible and enabled', { annotation: [{ type: 'testcase', description: "LG-23: Mobile Number input enabled" }] }, async () => {
        await expect(loginPage.mobileInput).toBeVisible();
        await expect(loginPage.mobileInput).toBeEnabled();
    });

    // ── Password field ────────────────────────────────────────────────────────

    test('should display the Password label', { annotation: [{ type: 'testcase', description: "LG-24: Password label visible" }] }, async () => {
        await expect(loginPage.passwordLabel).toBeVisible();
    });

    test('should display the Password input masked by default', { annotation: [{ type: 'testcase', description: "LG-25: Password masked by default" }] }, async () => {
        await expect(loginPage.passwordInput).toBeVisible();
        await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    });

    test('should display the Show password toggle button', { annotation: [{ type: 'testcase', description: "LG-26: Show-password toggle visible" }] }, async () => {
        await expect(loginPage.showPasswordToggle).toBeVisible();
    });

    // ── Forgot Password ───────────────────────────────────────────────────────

    test('should display the Forgot Password link', { annotation: [{ type: 'testcase', description: "LG-27: Forgot Password link visible" }] }, async () => {
        await expect(loginPage.forgotPasswordLink).toBeVisible();
    });

    // ── Log In button ─────────────────────────────────────────────────────────

    test('should display the Log In button', { annotation: [{ type: 'testcase', description: "LG-28: Log In button visible" }] }, async () => {
        await expect(loginPage.loginButton).toBeVisible();
    });

    test('should have the Log In button disabled on page load', { annotation: [{ type: 'testcase', description: "LG-29: Log In button disabled on load" }] }, async () => {
        await expect(loginPage.loginButton).toBeDisabled();
    });

    // ── Sign Up ───────────────────────────────────────────────────────────────

    test('should display the "New to MJD PAY?" text', { annotation: [{ type: 'testcase', description: "LG-30: \"New to MJD PAY?\" text visible" }] }, async () => {
        await expect(loginPage.newToMjdText).toBeVisible();
    });

    test('should display the Sign Up link', { annotation: [{ type: 'testcase', description: "LG-31: Sign Up link visible" }] }, async () => {
        await expect(loginPage.signUpLink).toBeVisible();
    });
});
