import { test, expect, type Page } from '@playwright/test';
import { assertToast } from '../../toastMessages';
import {
    SUBMIT_BUTTON,
    VALID_PASSWORD,
    mockOtpDisabled,
    mockForgetPasswordSuccess,
    mockAllPasswordsSuccess,
    gotoForgotPassword,
    fillStep1AndProceed,
} from '../ForgotPasswordHelper';

interface ForgotPasswordPageContext {
    page: Page;
}

// ─────────────────────────────────────────────────────────────────────────────
// END-TO-END FLOW
// ─────────────────────────────────────────────────────────────────────────────

async function prepareForgotPasswordPage({ page }: ForgotPasswordPageContext): Promise<void> {
    await mockOtpDisabled(page);
    await mockForgetPasswordSuccess(page);
    await gotoForgotPassword(page);
    await fillStep1AndProceed(page);
}

test('should complete the full forgot-password flow and redirect to the login page', async ({ page }: ForgotPasswordPageContext) => {
    await prepareForgotPasswordPage({ page });
    await mockAllPasswordsSuccess(page);
    await page.getByRole('textbox', { name: /New Password|كلمة المرور الجديدة/ }).fill(VALID_PASSWORD);
    await page.getByRole('textbox', { name: /Confirm password|تأكيد كلمة المرور/i }).fill(VALID_PASSWORD);
    await page.getByRole('button', { name: new RegExp(`${SUBMIT_BUTTON}|إعادة تعيين كلمة المرور`, 'i') }).click();
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
});

test('should not redirect to login when reset is submitted with mismatched passwords', async ({ page }: ForgotPasswordPageContext) => {
    await prepareForgotPasswordPage({ page });
    await page.getByRole('textbox', { name: /New Password|كلمة المرور الجديدة/ }).fill(VALID_PASSWORD);
    await page.getByRole('textbox', { name: /Confirm password|تأكيد كلمة المرور/i }).fill('DifferentPass#1');
    await expect(page.getByRole('button', { name: new RegExp(`${SUBMIT_BUTTON}|إعادة تعيين كلمة المرور`, 'i') })).toBeDisabled();
    await expect(page).not.toHaveURL(/login/);
});

test('should display an error and remain on the page when the reset API fails', async ({ page }: ForgotPasswordPageContext) => {
    await prepareForgotPasswordPage({ page });
    await page.route('**/auth/passwords/**', route =>
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Server error' }) })
    );
    await page.getByRole('textbox', { name: /New Password|كلمة المرور الجديدة/ }).fill(VALID_PASSWORD);
    await page.getByRole('textbox', { name: /Confirm password|تأكيد كلمة المرور/i }).fill(VALID_PASSWORD);
    await page.getByRole('button', { name: new RegExp(`${SUBMIT_BUTTON}|إعادة تعيين كلمة المرور`, 'i') }).click();
    await expect(page).not.toHaveURL(/login/, { timeout: 10000 });
    await assertToast(page);
});
