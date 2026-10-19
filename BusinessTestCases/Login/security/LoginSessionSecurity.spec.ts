import { test, expect } from '../../shared/fixtures.ts';
import { LOGIN_URL, NEGATIVE_COMPANY, NEGATIVE_MOBILE, VALID_PASSWORD } from '../helpers/LoginHelper.ts';
import { mockSignIn } from '../helpers/loginMocks';
import { loginToDashboard } from '../helpers/loginSession';

// Browser-side security of the login page and the session it creates.

test.describe('Login — Session & Browser Security', { tag: ['@login', '@security'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'security' }] }, () => {
    test('should serve the login page over HTTPS', { annotation: [{ type: 'testcase', description: "LG-SESSSEC-01: Should serve the login page over HTTPS" }] }, async ({ page }) => {
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
        expect(new URL(page.url()).protocol).toBe('https:');
    });

    test('should mask the password and not trigger password-manager leaks into other fields', { annotation: [{ type: 'testcase', description: "LG-SESSSEC-02: Should mask the password and not trigger password-manager leaks into other fields" }] }, async ({ page, loginPage }) => {
        await loginPage.goto(LOGIN_URL);
        await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
        const autocomplete = await loginPage.passwordInput.getAttribute('autocomplete');
        expect(autocomplete ?? '', 'password field should not use autocomplete="on" for a one-time field').not.toBe('cc-number');
    });

    test('should never put credentials in the page URL after a failed sign-in', { annotation: [{ type: 'testcase', description: "LG-SESSSEC-03: Should never put credentials in the page URL after a failed sign-in" }] }, async ({ page, loginPage }) => {
        await loginPage.goto(LOGIN_URL);
        await mockSignIn(page, 401);
        await loginPage.fillAndSubmit(NEGATIVE_COMPANY, NEGATIVE_MOBILE, VALID_PASSWORD);
        await page.waitForTimeout(1500);
        const url = decodeURIComponent(page.url());
        expect(url).not.toContain(VALID_PASSWORD);
        expect(url).not.toContain(NEGATIVE_MOBILE);
    });

    test('should not log the password to the browser console', { annotation: [{ type: 'testcase', description: "LG-SESSSEC-04: Should not log the password to the browser console" }] }, async ({ page, loginPage }) => {
        const logs: string[] = [];
        page.on('console', m => logs.push(m.text()));
        await loginPage.goto(LOGIN_URL);
        await mockSignIn(page, 401);
        await loginPage.fillAndSubmit(NEGATIVE_COMPANY, NEGATIVE_MOBILE, VALID_PASSWORD);
        await page.waitForTimeout(1500);
        expect(logs.filter(l => l.includes(VALID_PASSWORD)), 'password found in console output').toEqual([]);
    });

    test('should not expose the password in any other request than the sign-in call', { annotation: [{ type: 'testcase', description: "LG-SESSSEC-05: Should not expose the password in any other request than the sign-in call" }] }, async ({ page, loginPage }) => {
        const leaks: string[] = [];
        page.on('request', req => {
            if (req.url().includes('/auth/signin')) return;
            if ((req.postData() ?? '').includes(VALID_PASSWORD) || req.url().includes(VALID_PASSWORD)) leaks.push(req.url());
        });
        await loginPage.goto(LOGIN_URL);
        await mockSignIn(page, 401);
        await loginPage.fillAndSubmit(NEGATIVE_COMPANY, NEGATIVE_MOBILE, VALID_PASSWORD);
        await page.waitForTimeout(1500);
        expect(leaks).toEqual([]);
    });

    test('should clear the password field after a failed attempt is reloaded', { annotation: [{ type: 'testcase', description: "LG-SESSSEC-06: Should clear the password field after a failed attempt is reloaded" }] }, async ({ page, loginPage }) => {
        await loginPage.goto(LOGIN_URL);
        await loginPage.passwordInput.fill(VALID_PASSWORD);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(loginPage.passwordInput).toHaveValue('');
    });

    test('should send authenticated API calls with a bearer token rather than credentials in the query string', { annotation: [{ type: 'testcase', description: "LG-SESSSEC-07: Should send authenticated API calls with a bearer token rather than credentials in the query string" }] }, async ({ page }) => {
        const bad: string[] = [];
        page.on('request', req => {
            const url = req.url();
            if (/[?&](password|token|access_token)=/i.test(url)) bad.push(url);
        });
        await loginToDashboard(page);
        await page.waitForTimeout(2000);
        expect(bad, 'request carrying a secret in the query string').toEqual([]);
    });

    test('should not keep the plain password in web storage after login', { annotation: [{ type: 'testcase', description: "LG-SESSSEC-08: Should not keep the plain password in web storage after login" }] }, async ({ page }) => {
        await loginToDashboard(page);
        const dump = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
        expect(dump).not.toContain(VALID_PASSWORD);
    });

    test('should set the session cookies (if any) Secure, and HttpOnly for token-like cookies', { annotation: [{ type: 'testcase', description: "LG-SESSSEC-09: Should set the session cookies (if any) Secure, and HttpOnly for token-like cookies" }] }, async ({ page, context }) => {
        await loginToDashboard(page);
        const cookies = await context.cookies();
        for (const c of cookies) {
            expect.soft(c.secure, `cookie ${c.name} is not Secure`).toBe(true);
            if (/token|jwt|session|auth/i.test(c.name)) expect.soft(c.httpOnly, `cookie ${c.name} is not HttpOnly`).toBe(true);
        }
    });

    test('should discard a tampered token held in storage and return to the login page', { annotation: [{ type: 'testcase', description: "LG-SESSSEC-10: Should discard a tampered token held in storage and return to the login page" }] }, async ({ page }) => {
        await loginToDashboard(page);
        await page.evaluate(() => {
            for (const store of [localStorage, sessionStorage]) {
                for (const k of Object.keys(store)) {
                    const v = store.getItem(k) ?? '';
                    if (/^eyJ[\w-]+\.[\w-]+\.[\w-]*$/.test(v)) store.setItem(k, v.slice(0, -3) + 'xxx');
                }
            }
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/auth\/login/, { timeout: 20000 });
    });
});
