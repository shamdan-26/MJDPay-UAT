import type { Page } from '@playwright/test';
import { test, expect } from '../../shared/fixtures.ts';
import { assertToast } from '../../shared/toastMessages.ts';
import {
    LOGIN_URL,
    NEGATIVE_COMPANY,
    NEGATIVE_MOBILE,
    VALID_PASSWORD,
    WRONG_PASSWORD,
    LOCKOUT_COMPANY,
    LOCKOUT_MOBILE,
} from '../helpers/LoginHelper.ts';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { AdminOtpConfigPage, createAdminContext } from '../../pageElements/Shared/AdminOtpConfigPage';
import { AdminBusinessAccountsPage } from '../../pageElements/UserManagement/AdminBusinessAccountsPage';

const tags = { tag: ['@login', '@security'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'security' }] };

/** Submits the form and returns the real /auth/signin response the UI received. */
async function submitAndCaptureSignIn(page: Page, loginPage: LoginPage, company: string, mobile: string, password: string) {
    await loginPage.fill(company, mobile, password);
    const [response] = await Promise.all([
        page.waitForResponse(r => r.url().includes('/auth/signin'), { timeout: 15000 }),
        loginPage.submit(),
    ]);
    return response;
}

test.describe('Login — Security', tags, () => {
    test.describe.configure({ mode: 'serial' });

    let loginPage: LoginPage;

    test.beforeEach(async ({ loginPage: lp }) => {
        loginPage = lp;
        await loginPage.goto(LOGIN_URL);
    });

    test('should return the same error response for a wrong company number and a wrong mobile number (prevents user enumeration)', { annotation: [{ type: 'testcase', description: "LG-106: Wrong company vs. wrong mobile give identical response" }] }, async ({ page }) => {
        const wrongCompany = await submitAndCaptureSignIn(page, loginPage, 'WRONGCMPNY', NEGATIVE_MOBILE, VALID_PASSWORD);
        const wrongCompanyBody = await wrongCompany.json().catch(() => ({}));
        await assertToast(page);

        await loginPage.goto(LOGIN_URL);
        const wrongMobile = await submitAndCaptureSignIn(page, loginPage, NEGATIVE_COMPANY, '500000001', VALID_PASSWORD);
        const wrongMobileBody = await wrongMobile.json().catch(() => ({}));
        await assertToast(page);

        expect(wrongMobile.status()).toBe(wrongCompany.status());
        expect(wrongMobileBody.message ?? wrongMobileBody.error).toEqual(wrongCompanyBody.message ?? wrongCompanyBody.error);
        await expect(page).toHaveURL(LOGIN_URL);
    });

    test('should not execute a script payload entered in the company number field (XSS)', { annotation: [{ type: 'testcase', description: "LG-107: Script injection in Company field is inert" }] }, async ({ page }) => {
        let dialogTriggered = false;
        page.on('dialog', async dialog => { dialogTriggered = true; await dialog.dismiss(); });
        await loginPage.companyInput.fill('<script>alert(1)</script>');
        await loginPage.mobileInput.fill(NEGATIVE_MOBILE);
        await loginPage.passwordInput.fill(VALID_PASSWORD);
        await expect(page.locator('body')).not.toContainText('<script>');
        expect(dialogTriggered).toBe(false);
    });

    test('should not execute a script payload entered in the password field (XSS)', { annotation: [{ type: 'testcase', description: "LG-108: Script injection in Password field is inert" }] }, async ({ page }) => {
        let dialogTriggered = false;
        page.on('dialog', async dialog => { dialogTriggered = true; await dialog.dismiss(); });
        await loginPage.companyInput.fill(NEGATIVE_COMPANY);
        await loginPage.mobileInput.fill(NEGATIVE_MOBILE);
        await loginPage.passwordInput.fill('<script>alert(1)</script>');
        expect(dialogTriggered).toBe(false);
    });

    test('should send the login request via POST — credentials must not appear in the URL', { annotation: [{ type: 'testcase', description: "LG-109: Login request uses POST, not URL parameters" }] }, async ({ page }) => {
        const response = await submitAndCaptureSignIn(page, loginPage, NEGATIVE_COMPANY, NEGATIVE_MOBILE, VALID_PASSWORD);
        const request = response.request();
        expect(request.method()).toBe('POST');
        expect(request.url()).not.toContain(VALID_PASSWORD);
        expect(request.url()).not.toContain(NEGATIVE_COMPANY);
        expect(request.url()).not.toContain(NEGATIVE_MOBILE);
    });

    test('should not expose stack traces or database details in failed login error responses', { annotation: [{ type: 'testcase', description: "LG-110: Failed-login error has no internal details" }] }, async ({ page }) => {
        const response = await submitAndCaptureSignIn(page, loginPage, 'WRONG', '500000000', WRONG_PASSWORD);
        expect(response.ok()).toBe(false);
        const text = await response.text();
        expect(text).not.toMatch(/stack|exception|sql|database|null pointer|traceback|ORA-|JDBC/i);
    });
});

// Destructive: genuinely locks the account. Uses the dedicated LOCKOUT_* account so it cannot
// interfere with the NEGATIVE_* tests running in parallel files. afterAll unlocks it again through
// Admin Portal → Accounts → Business → account details → Users tab, so no manual unblock is needed.
test.describe('Login — Security: account lockout', tags, () => {
    test.describe.configure({ mode: 'serial' });

    test.skip(!LOCKOUT_COMPANY || !LOCKOUT_MOBILE, 'Set LOCKOUT_COMPANY and LOCKOUT_MOBILE (a dedicated, disposable account) to run the lockout test');

    let accountLocked = false;

    test.afterAll(async ({ browser }) => {
        if (!accountLocked) return;
        test.setTimeout(120_000);
        const context = await createAdminContext(browser);
        try {
            const admin = await context.newPage();
            await new AdminOtpConfigPage(admin).login();
            const accounts = new AdminBusinessAccountsPage(admin);
            await accounts.goto();
            const details = await accounts.openAccountDetails(LOCKOUT_MOBILE);
            await details.openUsersTab();
            await details.unlockUser(LOCKOUT_MOBILE);
        } finally {
            await context.close();
        }
    });

    test('should lock the account after 3 consecutive failed login attempts', { annotation: [{ type: 'testcase', description: "LG-105: Account locks after repeated failed attempts" }] }, async ({ page, loginPage }) => {
        accountLocked = true; // set before the attempts: even a half-failed run may have locked it
        for (let attempt = 1; attempt <= 3; attempt++) {
            await loginPage.goto(LOGIN_URL);
            await loginPage.fill(LOCKOUT_COMPANY, LOCKOUT_MOBILE, WRONG_PASSWORD);
            await loginPage.submit();
            await assertToast(page);
        }
        await loginPage.goto(LOGIN_URL);
        await loginPage.fill(LOCKOUT_COMPANY, LOCKOUT_MOBILE, VALID_PASSWORD);
        await loginPage.submit();
        await assertToast(page);
        await expect(page.getByRole('heading', { name: /Enter OTP|أدخل رمز التحقق/i })).not.toBeVisible();
    });
});
