// DRAFT — unverified, not run by the suite. Promote by renaming to .spec.ts and moving to Registration/security/.
//
// Browser-visible security posture of the registration page and the gateway: response headers, cookie flags,
// CORS preflight behaviour and mixed content. These are fast, deterministic checks that complement the ZAP baseline.
//
// Assumptions : the required policy values below are a typical baseline — adjust to what the platform team decides.
//               The gateway answers preflight with Access-Control-* headers.
// Prerequisites: none.
import { test, expect } from '@playwright/test';
import { REGISTER_URL } from '../../helpers/RegistrationHelper';
import { REGISTRATION_API } from '../../helpers/registrationApi';

test.describe('Registration – web security posture (DRAFT)', { tag: ['@registration', '@security'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'security' }] }, () => {
    test('the registration page is served with the expected security headers', async ({ request }) => {
        const res = await request.get(REGISTER_URL);
        const h = res.headers();
        expect(h['strict-transport-security'], 'HSTS missing').toMatch(/max-age=\d{6,}/);
        expect(h['x-content-type-options'], 'nosniff missing').toBe('nosniff');
        expect(h['x-frame-options'] ?? h['content-security-policy'], 'clickjacking protection missing').toMatch(/DENY|SAMEORIGIN|frame-ancestors/i);
        expect(h['content-security-policy'], 'CSP missing').toBeTruthy();
        expect(h['referrer-policy'], 'Referrer-Policy missing').toBeTruthy();
    });

    test('the CSP does not allow unsafe-eval or wildcard script sources', async ({ request }) => {
        const csp = (await request.get(REGISTER_URL)).headers()['content-security-policy'] ?? '';
        test.skip(!csp, 'No CSP header to inspect');
        expect(csp).not.toMatch(/script-src[^;]*'unsafe-eval'/);
        expect(csp).not.toMatch(/script-src[^;]*\s\*(\s|;|$)/);
    });

    test('no cookie set by the page is missing Secure/SameSite, and session cookies are HttpOnly', async ({ page, context }) => {
        await page.goto(REGISTER_URL, { waitUntil: 'networkidle' });
        const cookies = await context.cookies();
        for (const c of cookies) {
            expect(c.secure, `${c.name} not Secure`).toBe(true);
            expect(c.sameSite, `${c.name} SameSite=None without need`).not.toBe('None');
            if (/session|token|auth/i.test(c.name)) expect(c.httpOnly, `${c.name} not HttpOnly`).toBe(true);
        }
    });

    test('the page loads no http:// (mixed content) resources', async ({ page }) => {
        const insecure: string[] = [];
        page.on('request', r => { if (r.url().startsWith('http://')) insecure.push(r.url()); });
        await page.goto(REGISTER_URL, { waitUntil: 'networkidle' });
        expect(insecure).toEqual([]);
    });

    test('the gateway rejects a CORS preflight from an unknown origin', async ({ request }) => {
        const res = await request.fetch(`${REGISTRATION_API}/register/mobile/otp`, {
            method: 'OPTIONS',
            headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
        });
        const allow = res.headers()['access-control-allow-origin'];
        expect(allow === undefined || (allow !== '*' && allow !== 'https://evil.example'), `Allowed origin: ${allow}`).toBe(true);
    });

    test('the gateway does not echo stack traces or internal hostnames in error bodies', async ({ request }) => {
        const res = await request.post(`${REGISTRATION_API}/register/verify/otp`, { data: '{not json', headers: { 'Content-Type': 'application/json' } });
        const text = await res.text();
        expect(text).not.toMatch(/at [\w.$]+\(.+:\d+\)|Exception|\.java:\d+|stack ?trace|10\.\d+\.\d+\.\d+/i);
    });

    test('responses carrying personal data are not cacheable', async ({ request }) => {
        const res = await request.post(`${REGISTRATION_API}/register/mobile/otp`, { data: { mobileNumber: '+966500000000' } });
        const cc = res.headers()['cache-control'] ?? '';
        expect(cc, 'Cache-Control should contain no-store for API responses').toMatch(/no-store|no-cache|private/i);
    });
});
