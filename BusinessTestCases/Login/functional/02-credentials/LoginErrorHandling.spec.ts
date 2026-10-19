import { test, expect } from '../../../shared/fixtures.ts';
import { assertToast } from '../../../shared/toastMessages.ts';
import {
    LOGIN_URL,
    NEGATIVE_COMPANY,
    NEGATIVE_MOBILE,
    VALID_PASSWORD,
} from '../../helpers/LoginHelper.ts';
import { mockSignIn, mockSlowSignIn, mockSignInNetworkFailure, SIGNIN_GLOB } from '../../helpers/loginMocks';

// How the login form reacts to gateway failures. /auth/signin is mocked everywhere, so no real
// account is used, nothing can lock, and the failure modes are deterministic.

test.describe('Login — Error Handling (mocked gateway)', { tag: ['@login', '@functional', '@credentials'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'functional' }] }, () => {
    test.beforeEach(async ({ loginPage }) => {
        await loginPage.goto(LOGIN_URL);
        await loginPage.fill(NEGATIVE_COMPANY, NEGATIVE_MOBILE, VALID_PASSWORD);
    });

    for (const status of [400, 401, 403, 423, 429, 500, 502, 503]) {
        test(`should show an error toast and stay on the login page when the gateway answers ${status}`, { annotation: [{ type: 'testcase', description: "LG-ERR-01: Should show an error toast and stay on the login page when the gateway answers …" }] }, async ({ page, loginPage }) => {
            await mockSignIn(page, status);
            await loginPage.submit();
            await assertToast(page);
            await expect(page).toHaveURL(LOGIN_URL);
            await expect(loginPage.loginButton).toBeEnabled();
        });
    }

    test('should show an error toast when the request fails at the network level', { annotation: [{ type: 'testcase', description: "LG-ERR-02: Should show an error toast when the request fails at the network level" }] }, async ({ page, loginPage }) => {
        await mockSignInNetworkFailure(page);
        await loginPage.submit();
        await assertToast(page);
        await expect(page).toHaveURL(LOGIN_URL);
    });

    test('should survive a non-JSON response body without breaking the page', { annotation: [{ type: 'testcase', description: "LG-ERR-03: Should survive a non-JSON response body without breaking the page" }] }, async ({ page, loginPage }) => {
        await page.route(SIGNIN_GLOB, route => route.fulfill({ status: 500, contentType: 'text/html', body: '<html>Bad gateway</html>' }));
        await loginPage.submit();
        await assertToast(page);
        await expect(loginPage.formBox).toBeVisible();
        await expect(page.locator('body')).not.toContainText('<html>');
    });

    test('should send exactly one request when Log In is double-clicked', { annotation: [{ type: 'testcase', description: "LG-ERR-04: Should send exactly one request when Log In is double-clicked" }] }, async ({ page, loginPage }) => {
        const signIn = await mockSlowSignIn(page, 1500);
        await loginPage.loginButton.dblclick();
        await page.waitForTimeout(2500);
        expect(signIn.count()).toBe(1);
    });

    test('should not leave the form stuck in a loading state after a failed request', { annotation: [{ type: 'testcase', description: "LG-ERR-05: Should not leave the form stuck in a loading state after a failed request" }] }, async ({ page, loginPage }) => {
        await mockSignIn(page, 500);
        await loginPage.submit();
        await assertToast(page);
        await expect(loginPage.loginButton).toBeEnabled({ timeout: 10000 });
        await expect(loginPage.companyInput).toHaveValue(NEGATIVE_COMPANY);
    });

    test('should show the error toast in Arabic when the page language is Arabic', { annotation: [{ type: 'testcase', description: "LG-ERR-06: Should show the error toast in Arabic when the page language is Arabic" }] }, async ({ page, loginPage }) => {
        await loginPage.arabicButton.click();
        await mockSignIn(page, 401, { message: 'Invalid credentials' });
        await loginPage.submit();
        await assertToast(page);
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    });

    test('should recover and show the next attempt’s result after a network failure', { annotation: [{ type: 'testcase', description: "LG-ERR-07: Should recover and show the next attempt’s result after a network failure" }] }, async ({ page, loginPage }) => {
        await mockSignInNetworkFailure(page);
        await loginPage.submit();
        await assertToast(page);
        await page.unroute(SIGNIN_GLOB);
        const signIn = await mockSignIn(page, 401);
        await loginPage.submit();
        await expect.poll(() => signIn.count(), { timeout: 10000 }).toBe(1);
    });
});

test.describe('Login — Hostile input does not break the form', { tag: ['@login', '@functional', '@credentials'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'functional' }] }, () => {
    const PAYLOADS: Record<string, string> = {
        'a 500-character company number': 'A'.repeat(500),
        'SQL injection text': `' OR '1'='1' --`,
        'unicode / emoji text': 'شركة😀テスト',
        'HTML tags': '<img src=x onerror=alert(1)>',
    };

    for (const [label, payload] of Object.entries(PAYLOADS)) {
        test(`should handle ${label} in the company field without a client error`, { annotation: [{ type: 'testcase', description: "LG-ERR-08: Should handle … in the company field without a client error" }] }, async ({ page, loginPage }) => {
            const errors: string[] = [];
            page.on('pageerror', e => errors.push(e.message));
            await loginPage.goto(LOGIN_URL);
            const signIn = await mockSignIn(page, 401);
            await loginPage.fill(payload, NEGATIVE_MOBILE, VALID_PASSWORD);
            if (await loginPage.loginButton.isEnabled()) {
                await loginPage.submit();
                await expect.poll(() => signIn.count(), { timeout: 10000 }).toBe(1);
            }
            expect(errors, 'uncaught page errors').toEqual([]);
            await expect(loginPage.formBox).toBeVisible();
        });
    }
});
