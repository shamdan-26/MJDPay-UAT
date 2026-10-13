import { test, expect } from '../../../fixtures';
import { assertToast } from '../../../toastMessages';
import {
    LOGIN_URL,
    NEGATIVE_COMPANY,
    NEGATIVE_MOBILE,
    VALID_PASSWORD,
    WRONG_PASSWORD,
} from '../../LoginHelper';
import { LoginPage } from '../../../pageElements/Shared/LoginPage';

test.describe('Login — Edge Cases', { tag: ['@login', '@functional', '@credentials'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let loginPage: LoginPage;

    test.beforeEach(async ({ page, loginPage: lp }) => {
        loginPage = lp;
        await loginPage.goto(LOGIN_URL);
    });

    test('should keep Log In button disabled when company number contains only whitespace', async () => {
        await loginPage.companyInput.fill('   ');
        await loginPage.mobileInput.fill(NEGATIVE_MOBILE);
        await loginPage.passwordInput.fill(VALID_PASSWORD);
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test.skip('should keep Log In button disabled when password contains only whitespace', async () => {
        await loginPage.companyInput.fill(NEGATIVE_COMPANY);
        await loginPage.mobileInput.fill(NEGATIVE_MOBILE);
        await loginPage.passwordInput.fill('   ');
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should stay on the login page when correct company is paired with wrong mobile and wrong password', async ({ page }) => {
        await loginPage.fill(NEGATIVE_COMPANY, '500000001', WRONG_PASSWORD);
        await loginPage.submit();
        await expect(page).toHaveURL(LOGIN_URL);
    });

    test('should display an error toast and remain on the login page when the server returns a 500', async ({ page }) => {
        await page.route('**/auth/signin**', route =>
            route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Internal Server Error' }) })
        );
        await loginPage.fill(NEGATIVE_COMPANY, NEGATIVE_MOBILE, VALID_PASSWORD);
        await loginPage.submit();
        await assertToast(page);
        await expect(page).toHaveURL(LOGIN_URL);
    });

    test('should allow re-submitting the form immediately after a failed login attempt', async ({ page }) => {
        await loginPage.fill(NEGATIVE_COMPANY, NEGATIVE_MOBILE, WRONG_PASSWORD);
        await loginPage.submit();
        await assertToast(page);
        await expect(loginPage.loginButton).toBeVisible();
        await expect(loginPage.loginButton).toBeEnabled();
    });

    test('should preserve field values after a failed login attempt', async ({ page }) => {
        await loginPage.fill(NEGATIVE_COMPANY, NEGATIVE_MOBILE, WRONG_PASSWORD);
        await loginPage.submit();
        await assertToast(page);
        await expect(loginPage.companyInput).toHaveValue(NEGATIVE_COMPANY);
        await expect(loginPage.mobileInput).toHaveValue(NEGATIVE_MOBILE);
    });
});
