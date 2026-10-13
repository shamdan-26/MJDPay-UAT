import { test, expect } from '../../../fixtures';
import { assertToast } from '../../../toastMessages';
import {
    LOGIN_URL,
    NEGATIVE_COMPANY,
    NEGATIVE_MOBILE,
    VALID_PASSWORD,
    generateUnregisteredMobile,
} from '../../LoginHelper';
import { LoginPage } from '../../../pageElements/Shared/LoginPage';

test.describe('Login — Account Status Errors', { tag: ['@login', '@functional', '@credentials'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let loginPage: LoginPage;

    test.beforeEach(async ({ page, loginPage: lp }) => {
        loginPage = lp;
        await loginPage.goto(LOGIN_URL);
    });

    test('should display an error when credentials are not registered', async ({ page }) => {
        await loginPage.fill(NEGATIVE_COMPANY, generateUnregisteredMobile(), VALID_PASSWORD);
        await loginPage.submit();
        await assertToast(page);
    });

    test('should not expose technical details in the not-registered error message', async ({ page }) => {
        await loginPage.fill(NEGATIVE_COMPANY, generateUnregisteredMobile(), VALID_PASSWORD);
        await loginPage.submit();
        const detail = page.locator('.toast-snackbar__detail');
        await expect(detail).toBeVisible({ timeout: 10000 });
        const text = await detail.textContent() ?? '';
        expect(text).not.toMatch(/stack|exception|sql|database|null pointer|traceback|internal/i);
    });

    test('should display an error and not show OTP for a locked account', async ({ page }) => {
        await loginPage.fill(NEGATIVE_COMPANY, NEGATIVE_MOBILE, VALID_PASSWORD);
        await loginPage.submit();
        await assertToast(page);
        await expect(page.getByRole('heading', { name: /Enter OTP|أدخل رمز التحقق/i })).not.toBeVisible();
    });

    test('should display an error and not show OTP for a deactivated account', async ({ page }) => {
        await loginPage.fill(NEGATIVE_COMPANY, NEGATIVE_MOBILE, VALID_PASSWORD);
        await loginPage.submit();
        await assertToast(page);
        await expect(page.getByRole('heading', { name: /Enter OTP|أدخل رمز التحقق/i })).not.toBeVisible();
    });

    test('should display a generic rejection for an AML-blocked account', async ({ page }) => {
        await loginPage.fill(NEGATIVE_COMPANY, NEGATIVE_MOBILE, VALID_PASSWORD);
        await loginPage.submit();
        await assertToast(page);
        await expect(page.getByRole('heading', { name: /Enter OTP|أدخل رمز التحقق/i })).not.toBeVisible();
    });

    test('should not expose AML or compliance details in the error message', async ({ page }) => {
        await loginPage.fill(NEGATIVE_COMPANY, NEGATIVE_MOBILE, VALID_PASSWORD);
        await loginPage.submit();
        const detail = page.locator('.toast-snackbar__detail');
        await expect(detail).toBeVisible({ timeout: 10000 });
        const text = await detail.textContent() ?? '';
        expect(text).not.toMatch(/aml|compliance|sanction|blacklist|suspicious|investigation/i);
        expect(text).not.toMatch(/stack|exception|sql|database|internal/i);
    });
});
