import { test, expect } from '../../fixtures';
import {
    LOGIN_URL,
    VALID_COMPANY,
    VALID_MOBILE,
    VALID_PASSWORD,
} from '../LoginHelper';
import { LoginPage } from '../../pageElements/LoginPage';

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON STATE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login — Button State', () => {
    test.describe.configure({ mode: 'serial' });

    let loginPage: LoginPage;

    test.beforeEach(async ({ page, loginPage: lp }) => {
        loginPage = lp;
        await loginPage.goto(LOGIN_URL);
    });

    test('should be disabled when all fields are empty', async () => {
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should be disabled when only company number is filled', async () => {
        await loginPage.companyInput.fill(VALID_COMPANY);
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should be disabled when only mobile number is filled', async () => {
        await loginPage.mobileInput.fill(VALID_MOBILE);
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should be disabled when only password is filled', async () => {
        await loginPage.passwordInput.fill(VALID_PASSWORD);
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should be disabled when company and mobile are filled but not password', async () => {
        await loginPage.companyInput.fill(VALID_COMPANY);
        await loginPage.mobileInput.fill(VALID_MOBILE);
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should be disabled when company and password are filled but not mobile', async () => {
        await loginPage.companyInput.fill(VALID_COMPANY);
        await loginPage.passwordInput.fill(VALID_PASSWORD);
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should be disabled when mobile and password are filled but not company', async () => {
        await loginPage.mobileInput.fill(VALID_MOBILE);
        await loginPage.passwordInput.fill(VALID_PASSWORD);
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should be enabled when all three fields are filled', async () => {
        await loginPage.fill(VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD);
        await expect(loginPage.loginButton).toBeEnabled();
    });

    test('should be disabled again after clearing the company number field', async () => {
        await loginPage.fill(VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD);
        await loginPage.companyInput.clear();
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should be disabled again after clearing the mobile number field', async () => {
        await loginPage.fill(VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD);
        await loginPage.mobileInput.clear();
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should be disabled again after clearing the password field', async () => {
        await loginPage.fill(VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD);
        await loginPage.passwordInput.clear();
        await expect(loginPage.loginButton).toBeDisabled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE NUMBER VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login — Mobile Number Validation', () => {
    test.describe.configure({ mode: 'serial' });

    let loginPage: LoginPage;

    test.beforeEach(async ({ page, loginPage: lp }) => {
        loginPage = lp;
        await loginPage.goto(LOGIN_URL);
        await loginPage.companyInput.fill(VALID_COMPANY);
        await loginPage.passwordInput.fill(VALID_PASSWORD);
    });

    test('should keep Log In button disabled when mobile is too short (4 digits)', async () => {
        await loginPage.mobileInput.fill('5123');
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should keep Log In button disabled when mobile is 8 digits (one short of minimum)', async () => {
        await loginPage.mobileInput.fill('50021788');
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should keep Log In button disabled when mobile has a leading zero', async () => {
        await loginPage.mobileInput.fill('0500021788');
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should trim the mobile field to 9 digits when more than 9 are entered', async () => {
        await loginPage.mobileInput.fill('5001234567');
        await expect(loginPage.mobileInput).toHaveValue('500123456');
    });

    test('should keep Log In button disabled when mobile does not start with 5', async () => {
        await loginPage.mobileInput.fill('600318143');
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should not accept alphabetic characters in the mobile field', async () => {
        await loginPage.mobileInput.pressSequentially('abc');
        await expect(loginPage.mobileInput).toHaveValue('');
    });

    test('should not accept special characters in the mobile field', async () => {
        await loginPage.mobileInput.pressSequentially('!@#');
        await expect(loginPage.mobileInput).toHaveValue('');
    });

    test('should enable the Log In button with a valid 9-digit mobile starting with 5', async () => {
        await loginPage.mobileInput.fill('500021788');
        await expect(loginPage.loginButton).toBeEnabled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD VISIBILITY
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login — Password Visibility', () => {
    test.describe.configure({ mode: 'serial' });

    let loginPage: LoginPage;

    test.beforeEach(async ({ page, loginPage: lp }) => {
        loginPage = lp;
        await loginPage.goto(LOGIN_URL);
    });

    test('should reveal password text when the show password toggle is clicked', async () => {
        await loginPage.passwordInput.fill(VALID_PASSWORD);
        await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
        await loginPage.showPasswordToggle.click();
        await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');
    });

    test('should re-mask password when the toggle is clicked a second time', async () => {
        await loginPage.passwordInput.fill(VALID_PASSWORD);
        await loginPage.showPasswordToggle.click();
        await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');
        await loginPage.showPasswordToggle.click();
        await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    });
});
