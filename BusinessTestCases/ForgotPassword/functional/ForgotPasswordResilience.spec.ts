import { test, expect } from '../../shared/fixtures.ts';
import {
    VALID_COMPANY,
    VALID_MOBILE,
    VALID_PASSWORD,
    mockOtpDisabled,
    mockForgetPasswordSuccess,
    abortUnmockedGatewayRequests,
    gotoForgotPassword,
    fillStep1AndProceed,
} from '../helpers/ForgotPasswordHelper.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Resilience — server errors and dropped connections at each step (all mocked).
// The user must see a friendly error, keep what they typed, and be able to retry.
// ─────────────────────────────────────────────────────────────────────────────

const tags = { tag: ['@forgotpassword', '@functional', '@resilience'], annotation: [{ type: 'feature', description: 'ForgotPassword' }, { type: 'layer', description: 'functional' }] };
const TECH_LEAK = /stack|exception|sql|database|null pointer|traceback|internal server error/i;

test.describe('Forgot Password — Resilience', tags, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await abortUnmockedGatewayRequests(page);
        await mockOtpDisabled(page);
    });

    test('step 1 server error (500) keeps the user on step 1 with their values and no technical text', { annotation: [{ type: 'testcase', description: 'FP-93: Step 1 server error is handled gracefully' }] }, async ({ page, forgotPassword }) => {
        await page.route('**/auth/passwords/forget', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Internal Server Error: NullPointerException at ...' }) }));
        await gotoForgotPassword(page);
        await forgotPassword.fillStep1(VALID_COMPANY, VALID_MOBILE);
        await forgotPassword.nextButton.click();

        await expect(forgotPassword.newPasswordInput).toBeHidden();
        await expect(forgotPassword.companyInput).toHaveValue(VALID_COMPANY);
        await expect(forgotPassword.mobileInput).toHaveValue(VALID_MOBILE);
        await expect(page.getByText(TECH_LEAK)).toBeHidden();
    });

    test('step 1 dropped connection keeps the form usable', { annotation: [{ type: 'testcase', description: 'FP-94: Step 1 network failure keeps the form usable' }] }, async ({ page, forgotPassword }) => {
        await page.route('**/auth/passwords/forget', route => route.abort('connectionreset'));
        await gotoForgotPassword(page);
        await forgotPassword.fillStep1(VALID_COMPANY, VALID_MOBILE);
        await forgotPassword.nextButton.click();

        await expect(forgotPassword.newPasswordInput).toBeHidden();
        await expect(forgotPassword.nextButton).toBeEnabled({ timeout: 15000 });
    });

    test('user can retry step 1 after a failure and then succeed', { annotation: [{ type: 'testcase', description: 'FP-95: Retry after a failed step 1 succeeds' }] }, async ({ page, forgotPassword }) => {
        let failNext = true;
        await page.route('**/auth/passwords/forget', route => {
            if (failNext) { failNext = false; return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }); }
            return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        });
        await gotoForgotPassword(page);
        await forgotPassword.fillStep1(VALID_COMPANY, VALID_MOBILE);
        await forgotPassword.nextButton.click();
        await expect(forgotPassword.nextButton).toBeEnabled({ timeout: 15000 });

        await forgotPassword.nextButton.click();
        await expect(forgotPassword.newPasswordInput).toBeVisible({ timeout: 30000 });
    });

    test('step 2 dropped connection keeps the entered passwords and re-enables submit', { annotation: [{ type: 'testcase', description: 'FP-96: Reset network failure keeps data and allows retry' }] }, async ({ page, forgotPassword }) => {
        await mockForgetPasswordSuccess(page);
        await page.route(/\/auth\/passwords\/(?!forget)/, route => route.abort('connectionreset'));
        await gotoForgotPassword(page);
        await fillStep1AndProceed(page);
        await forgotPassword.fillStep2(VALID_PASSWORD, VALID_PASSWORD);
        await forgotPassword.resetPasswordButton.click();

        await expect(page).toHaveURL(/change-password/);
        await expect(forgotPassword.newPasswordInput).toHaveValue(VALID_PASSWORD);
        await expect(forgotPassword.resetPasswordButton).toBeEnabled({ timeout: 15000 });
    });
});
