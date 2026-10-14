import { test, expect } from '../../../fixtures';
import { assertToast } from '../../../toastMessages';
import { LOGIN_MOBILE, LOGIN_URL, gotoLogin, fillAndSubmitLogin, getOtpFromDb } from '../../LoginHelper';
import { loginToDashboard } from '../../helpers/loginSession';

// Token and session rules (EMI-2042 / EMI-2043, EMI-4625). These sign in through the real login page and read the
// /auth/signin response from the browser. These cases are about what the web app does with the tokens (498 sign-out,
// the OTP step), so the real page is the right driver; a direct signIn() call now works too (see helpers/loginApi.ts)
// but would not exercise the app.

const SIGNIN = (r: { request(): { method(): string }; url(): string }) => r.request().method() === 'POST' && /\/auth\/signin$/.test(r.url());

/** Payload of a JWT (no signature check — only the claims are read). */
function jwtClaims(token: string): { iat: number; exp: number } {
    return JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'));
}

function tokenOf(value: unknown): string {
    return typeof value === 'string' ? value : String((value as { token?: string })?.token ?? '');
}

test.describe('Login — Token and session lifecycle', { tag: ['@login', '@functional', '@session'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'functional' }] }, () => {
    test('should end the session and return to login when an API call answers HTTP 498 (invalid token)', { annotation: [{ type: 'testcase', description: 'LG-TOK-01: HTTP 498 logs the user out with a session-expired message (EMI-2042)' }] }, async ({ page }) => {
        test.slow();
        await loginToDashboard(page);

        // Every gateway call except sign-in/OTP now reports an invalid token, as the backend does for an expired or revoked one.
        const gateway = (url: URL) => /^gateway/.test(url.hostname) && !/\/auth\/(signin|verify)/.test(url.pathname);
        await page.route(gateway, route => route.fulfill({ status: 498, contentType: 'application/json', body: JSON.stringify({ message: 'Invalid token' }) }));
        await page.reload();

        await expect(page).toHaveURL(/\/business\/auth\/login/, { timeout: 30000 });
        // Business rule text: "Session expired. Please log in again."
        await assertToast(page, /session|الجلسة|جلسة/i, 15000);

        await page.unroute(gateway);
        await page.goto(new URL('/business/main/home', LOGIN_URL).toString());
        await expect(page, 'the dead session must not open a protected page').toHaveURL(/\/business\/auth\/login/, { timeout: 15000 });
    });

    test('should issue a refresh token that lives exactly 1 minute longer than the access token', { annotation: [{ type: 'testcase', description: 'LG-TOK-02: Refresh token TTL = access token TTL + 1 minute (EMI-2042)' }] }, async ({ page }) => {
        const signin = page.waitForResponse(SIGNIN);
        await gotoLogin(page);
        await fillAndSubmitLogin(page);
        const body = await (await signin).json();

        const access  = jwtClaims(tokenOf(body.accessToken));
        const refresh = jwtClaims(tokenOf(body.refreshToken));
        const accessTtl  = access.exp - access.iat;
        const refreshTtl = refresh.exp - refresh.iat;
        test.info().annotations.push({ type: 'ttl-seconds', description: `access ${accessTtl}, refresh ${refreshTtl}` });

        expect(accessTtl, 'access token must have a positive lifetime').toBeGreaterThan(0);
        expect(refreshTtl - accessTtl, 'refresh TTL must be access TTL + 60 s').toBe(60);
    });

    test('should ask for the OTP on every web sign-in, even right after a previous successful one', { annotation: [{ type: 'testcase', description: 'LG-TOK-03: Web login always requires OTP, no trusted-device skip (EMI-4625)' }] }, async ({ page, dashboard, otp }) => {
        test.slow();
        for (const round of [1, 2]) {
            const signin = page.waitForResponse(SIGNIN);
            await gotoLogin(page);
            await fillAndSubmitLogin(page);
            const body = await (await signin).json();
            expect(body.otpRequired, `sign-in #${round}: otpRequired`).toBe(true);
            await expect(otp.heading, `sign-in #${round}: OTP step`).toBeVisible({ timeout: 30000 });
            await otp.fillAndVerify(await getOtpFromDb(LOGIN_MOBILE));
            await expect(page).toHaveURL(/\/business\/main\/home/, { timeout: 30000 });
            await dashboard.logout();
        }
    });
});
