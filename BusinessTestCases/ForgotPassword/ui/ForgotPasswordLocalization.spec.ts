import { test, expect } from '../../shared/fixtures.ts';
import {
    mockOtpDisabled,
    mockForgetPasswordSuccess,
    gotoForgotPassword,
    fillStep1AndProceed,
    VALID_COMPANY,
    VALID_MOBILE,
} from '../helpers/ForgotPasswordHelper.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Arabic / RTL on the forgot-password screens (mocked).
// ─────────────────────────────────────────────────────────────────────────────

const tags = { tag: ['@forgotpassword', '@ui', '@localization'], annotation: [{ type: 'feature', description: 'ForgotPassword' }, { type: 'layer', description: 'ui' }] };

test.describe('Forgot Password — Localization', tags, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
    });

    test('Arabic switches step 1 to right-to-left with Arabic labels', { annotation: [{ type: 'testcase', description: 'FP-103: Step 1 renders RTL in Arabic' }] }, async ({ page, forgotPassword }) => {
        await forgotPassword.arabicButton.click();
        await expect(page.locator('[dir="rtl"]').first()).toBeAttached({ timeout: 10000 });
        await expect(page.getByRole('textbox', { name: /رقم الشركة/ })).toBeVisible();
        await expect(page.getByRole('textbox', { name: /رقم الجوال/ })).toBeVisible();
        await expect(page.getByRole('button', { name: /التالي/ })).toBeVisible();
    });

    test('the chosen Arabic language carries over to step 2', { annotation: [{ type: 'testcase', description: 'FP-104: Arabic persists from step 1 to step 2' }] }, async ({ page, forgotPassword }) => {
        await forgotPassword.arabicButton.click();
        await forgotPassword.fillStep1(VALID_COMPANY, VALID_MOBILE);
        await forgotPassword.nextButton.click();
        await expect(forgotPassword.newPasswordInput).toBeVisible({ timeout: 30000 });
        await expect(page.getByRole('textbox', { name: /كلمة المرور الجديدة/ })).toBeVisible();
        await expect(page.getByRole('button', { name: /إعادة تعيين كلمة المرور/ })).toBeVisible();
    });

    test('switching back to English restores left-to-right labels', { annotation: [{ type: 'testcase', description: 'FP-105: English can be restored after Arabic' }] }, async ({ page, forgotPassword }) => {
        await forgotPassword.arabicButton.click();
        await expect(page.getByRole('button', { name: /التالي/ })).toBeVisible();
        await forgotPassword.enButton.click();
        await expect(page.getByRole('button', { name: /Next/ })).toBeVisible();
        await expect(page.locator('[dir="rtl"]')).toHaveCount(0);
    });
});
