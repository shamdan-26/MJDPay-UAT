import { test, expect, type Page } from '../../fixtures';
import { LOGIN_URL, LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD } from '../LoginHelper';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';

// Regex, not the literal "Just a moment...": the app may render a Unicode ellipsis or different punctuation.
const validationCard = (page: Page) => page.getByText(/Just a moment/i);

/**
 * Submits the happy-path login and resolves to whichever of three outcomes
 * actually occurs:
 *   - 'card'     — the "Just a moment..." device-verification popup appeared
 *                  (the real UAT / preprod flow this spec targets).
 *   - 'bypassed' — login went straight to the authenticated dashboard (no popup).
 *                  The tests below treat that as a failure — they no longer skip.
 * A rejection alert (role="alert", language-agnostic) throws with its own text
 * so a broken login fails fast with the real reason instead of a bare timeout.
 */
async function submitAndDetect(page: Page, loginPage: LoginPage): Promise<'card' | 'bypassed'> {
    await loginPage.fill(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
    await loginPage.submit();

    const error = page.getByRole('alert');
    const outcome = await Promise.race([
        validationCard(page).waitFor({ state: 'visible', timeout: 15000 }).then(() => 'card' as const).catch(() => null),
        page.waitForURL(/\/business\/main\/home/, { timeout: 15000 }).then(() => 'bypassed' as const).catch(() => null),
        error.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'error' as const).catch(() => null),
    ]);

    if (outcome === 'error') {
        throw new Error(`Login was rejected before the validation card appeared: ${(await error.innerText()).trim()}`);
    }
    if (outcome === null) {
        throw new Error(`Neither the validation popup nor the dashboard appeared within 15 s (url: ${page.url()}; OTP dialog visible: ${await new OtpPage(page).isVisible()}).`);
    }
    return outcome;
}

/** Submits login and fails (instead of skipping) when the "Just a moment..." popup does not appear. */
async function submitAndShowCard(page: Page, loginPage: LoginPage): Promise<void> {
    const outcome = await submitAndDetect(page, loginPage);
    expect(outcome, 'the device-verification popup ("Just a moment...") should appear after login').toBe('card');
}

test.describe('Login Validation Popup — UI', { tag: ['@login', '@ui'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'ui' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let loginPage: LoginPage;

    test.beforeEach(async ({ page, loginPage: lp }) => {
        loginPage = lp;
        // On dev the three device/sign-in calls answer in a few hundred ms, so the "Just a moment..." card flashes
        // by before it can be asserted. Slow them (3 s each) so the popup stays on screen deterministically.
        await page.route(/\/(auth\/signin|devices\/uuid|devices\/ip-address)/, async route => {
            await new Promise(resolve => setTimeout(resolve, 3000));
            await route.continue();
        });
        await loginPage.goto(LOGIN_URL);
        // The app opens in Arabic (RTL); every popup string asserted below is English.
        await page.getByRole('button', { name: 'EN', exact: true }).click();
        await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    });

    test('should show the "Just a moment..." heading', { annotation: [{ type: 'testcase', description: "LG-54: \"Just a moment...\" heading appears on submit" }] }, async ({ page }) => {
        await submitAndShowCard(page, loginPage);
        await expect(validationCard(page)).toBeVisible();
    });

    test('should show the popup subtitle text', { annotation: [{ type: 'testcase', description: "LG-55: Subtitle text shown" }] }, async ({ page }) => {
        await submitAndShowCard(page, loginPage);
        await expect(page.getByText(/preparing a secure session for this device/i)).toBeVisible();
    });

    test('should display all three validation steps', { annotation: [{ type: 'testcase', description: "LG-56: All three step labels shown" }] }, async ({ page }) => {
        await submitAndShowCard(page, loginPage);
        await expect(page.getByText(/Verifying your credentials/i)).toBeVisible();
        await expect(page.getByText(/Preparing this device/i)).toBeVisible();
        await expect(page.getByText(/Securing your session/i)).toBeVisible();
    });

    test('should show step 1 "Verifying your credentials"', { annotation: [{ type: 'testcase', description: "LG-POP-01: Should show step 1 \"Verifying your credentials\"" }] }, async ({ page }) => {
        await submitAndShowCard(page, loginPage);
        await expect(page.getByText(/Verifying your credentials/i)).toBeVisible();
    });

    test('should show step 2 "Preparing this device"', { annotation: [{ type: 'testcase', description: "LG-POP-02: Should show step 2 \"Preparing this device\"" }] }, async ({ page }) => {
        await submitAndShowCard(page, loginPage);
        await expect(page.getByText(/Preparing this device/i)).toBeVisible();
    });

    test('should show step 3 "Securing your session"', { annotation: [{ type: 'testcase', description: "LG-POP-03: Should show step 3 \"Securing your session\"" }] }, async ({ page }) => {
        await submitAndShowCard(page, loginPage);
        await expect(page.getByText(/Securing your session/i)).toBeVisible();
    });

    test('should show the OTP dialog after the validation card completes (when OTP is enabled)', { annotation: [{ type: 'testcase', description: "LG-63: OTP dialog appears when OTP is enabled" }] }, async ({ page }) => {
        await submitAndShowCard(page, loginPage);
        await expect(validationCard(page)).not.toBeVisible({ timeout: 20000 });
        const otp = new OtpPage(page);
        const otpAppeared = await otp.isVisible();
        expect(otpAppeared, 'the OTP dialog should appear after the validation card completes').toBe(true);
        await expect(otp.heading).toBeVisible();
        await expect(otp.instructionText).toBeVisible();
        await expect(otp.inputs.first()).toBeVisible();
        await expect(otp.verifyButton).toBeVisible();
        await expect(otp.cancelButton).toBeVisible();
    });
});
