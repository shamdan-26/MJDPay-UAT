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

test.describe('Login — Invalid Credentials', { tag: ['@login', '@functional', '@credentials'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let loginPage: LoginPage;

    test.beforeEach(async ({ page, loginPage: lp }) => {
        loginPage = lp;
        await loginPage.goto(LOGIN_URL);
    });

    test('should stay on the login page with a wrong password', async ({ page }) => {
        await loginPage.fill(NEGATIVE_COMPANY, NEGATIVE_MOBILE, WRONG_PASSWORD);
        await loginPage.submit();
        await expect(page).toHaveURL(LOGIN_URL);
    });

    test('should stay on the login page with a wrong company number', async ({ page }) => {
        await loginPage.fill('INVALID99', NEGATIVE_MOBILE, VALID_PASSWORD);
        await loginPage.submit();
        await expect(page).toHaveURL(LOGIN_URL);
    });

    test('should stay on the login page with a wrong mobile number', async ({ page }) => {
        await loginPage.fill(NEGATIVE_COMPANY, '500000000', VALID_PASSWORD);
        await loginPage.submit();
        await expect(page).toHaveURL(LOGIN_URL);
    });

    test('should stay on the login page when all three credentials are wrong', async ({ page }) => {
        await loginPage.fill('WRONG123', '500000000', WRONG_PASSWORD);
        await loginPage.submit();
        await expect(page).toHaveURL(LOGIN_URL);
    });

    test('should display an error toast after submitting wrong credentials', async ({ page }) => {
        await loginPage.fill('WRONG123', '500000000', WRONG_PASSWORD);
        await loginPage.submit();
        await assertToast(page);
    });
});
