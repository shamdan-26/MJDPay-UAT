import { test, expect, type Page } from '../../fixtures';
import { LOGIN_URL, LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD } from '../LoginHelper';
import { LoginPage } from '../../pageElements/LoginPage';
import { OtpPage } from '../../pageElements/OtpPage';

async function submitAndCatchCard(page: Page, loginPage: LoginPage): Promise<void> {
    await loginPage.fill(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
    await Promise.all([
        loginPage.submit(),
        page.getByText('Just a moment...').waitFor({ state: 'visible', timeout: 15000 }),
    ]);
}

test.describe('Login Validation Popup — UI', () => {
    test.describe.configure({ mode: 'serial' });

    let loginPage: LoginPage;

    test.beforeEach(async ({ page, loginPage: lp }) => {
        loginPage = lp;
        await loginPage.goto(LOGIN_URL);
    });

    test('should show the "Just a moment..." heading', async ({ page }) => {
        await submitAndCatchCard(page, loginPage);
        await expect(page.getByText('Just a moment...')).toBeVisible();
    });

    test('should show the popup subtitle text', async ({ page }) => {
        await submitAndCatchCard(page, loginPage);
        await expect(page.getByText("We're preparing a secure session for this device.")).toBeVisible();
    });

    test('should display all three validation steps', async ({ page }) => {
        await submitAndCatchCard(page, loginPage);
        await expect(page.getByText('Verifying your credentials')).toBeVisible();
        await expect(page.getByText('Preparing this device')).toBeVisible();
        await expect(page.getByText('Securing your session')).toBeVisible();
    });

    test('should show step 1 "Verifying your credentials"', async ({ page }) => {
        await submitAndCatchCard(page, loginPage);
        await expect(page.getByText('Verifying your credentials')).toBeVisible();
    });

    test('should show step 2 "Preparing this device"', async ({ page }) => {
        await submitAndCatchCard(page, loginPage);
        await expect(page.getByText('Preparing this device')).toBeVisible();
    });

    test('should show step 3 "Securing your session"', async ({ page }) => {
        await submitAndCatchCard(page, loginPage);
        await expect(page.getByText('Securing your session')).toBeVisible();
    });

    test('should show the OTP dialog after the validation card completes (when OTP is enabled)', async ({ page }) => {
        await submitAndCatchCard(page, loginPage);
        await expect(page.getByText('Just a moment...')).not.toBeVisible({ timeout: 20000 });
        const otp = new OtpPage(page);
        const otpAppeared = await otp.isVisible();
        test.skip(!otpAppeared, 'OTP is disabled in this environment — dialog does not appear');
        await expect(otp.heading).toBeVisible();
        await expect(otp.instructionText).toBeVisible();
        await expect(otp.inputs.first()).toBeVisible();
        await expect(otp.verifyButton).toBeVisible();
        await expect(otp.cancelButton).toBeVisible();
    });
});
