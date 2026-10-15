import { test, expect } from '@playwright/test';
import { VALID_COMPANY, VALID_MOBILE } from '../ForgotPasswordHelper';

declare const process: { env: Record<string, string | undefined> };

const API_BASE = process.env['API_BASE_URL'] ?? 'https://gateway-dev-emi.dg-cash.app';
const URL_FORGET = `${API_BASE}/auth/passwords/forget`;
const HEADERS = { 'Content-Type': 'application/json' };
const TECH_LEAK = /stack|exception|sql|database|null pointer|traceback|internal server error/i;

// ─────────────────────────────────────────────────────────────────────────────
// API security for POST /auth/passwords/forget. Uses unknown identities only, so no real account is affected.
// ─────────────────────────────────────────────────────────────────────────────

const tags = { tag: ['@forgotpassword', '@security', '@api'], annotation: [{ type: 'feature', description: 'ForgotPassword' }, { type: 'layer', description: 'security' }] };

test.describe('Forgot Password — API Security', tags, () => {
    test('only POST is accepted on the forget endpoint (PUT, PATCH, DELETE refused)', { annotation: [{ type: 'testcase', description: 'FP-98: Non-POST methods are refused' }] }, async ({ request }) => {
        for (const method of ['put', 'patch', 'delete'] as const) {
            const res = await request[method](URL_FORGET, { data: { companyNumber: VALID_COMPANY, mobileNumber: `+966${VALID_MOBILE}` }, headers: HEADERS });
            expect(res.status(), method).not.toBe(200);
            expect(res.status(), method).toBeLessThan(500);
        }
    });

    test('injection payloads in company and mobile are rejected without server errors or leaks', { annotation: [{ type: 'testcase', description: 'FP-99: Injection payloads are rejected cleanly' }] }, async ({ request }) => {
        const payloads = ["' OR '1'='1", '{"$ne": null}', '<script>alert(1)</script>', '../../etc/passwd', '${7*7}'];
        for (const p of payloads) {
            const res = await request.post(URL_FORGET, { data: { companyNumber: p, mobileNumber: p }, headers: HEADERS });
            expect(res.status(), p).not.toBe(200);
            expect(res.status(), p).toBeLessThan(500);
            expect(await res.text(), p).not.toMatch(TECH_LEAK);
        }
    });

    test('wrong data types are rejected with a client error', { annotation: [{ type: 'testcase', description: 'FP-100: Wrong data types return a 4xx' }] }, async ({ request }) => {
        const bodies = [{ companyNumber: 123, mobileNumber: 456 }, { companyNumber: [VALID_COMPANY], mobileNumber: {} }, { companyNumber: null, mobileNumber: null }];
        for (const data of bodies) {
            const res = await request.post(URL_FORGET, { data, headers: HEADERS });
            expect(res.status(), JSON.stringify(data)).toBeGreaterThanOrEqual(400);
            expect(res.status(), JSON.stringify(data)).toBeLessThan(500);
        }
    });

    test('unknown-identity requests cannot be used for unlimited guessing (throttling or consistent refusal)', { annotation: [{ type: 'testcase', description: 'FP-101: Rapid repeated requests are throttled or consistently refused' }] }, async ({ request }) => {
        const statuses: number[] = [];
        for (let i = 0; i < 15; i++) {
            const res = await request.post(URL_FORGET, { data: { companyNumber: `Z${9000 + i}`, mobileNumber: '+966511111111' }, headers: HEADERS });
            statuses.push(res.status());
        }
        await test.info().attach('statuses', { body: statuses.join(','), contentType: 'text/plain' });
        expect(statuses.every(s => s < 500), 'no server errors under rapid requests').toBe(true);
        expect(statuses.every(s => s !== 200), 'unknown identities are never accepted').toBe(true);
    });

    test('responses do not echo the submitted identity or set tokens', { annotation: [{ type: 'testcase', description: 'FP-102: Rejection response does not echo input or issue credentials' }] }, async ({ request }) => {
        const res = await request.post(URL_FORGET, { data: { companyNumber: 'Z9998', mobileNumber: '+966522222222' }, headers: HEADERS });
        const body = await res.text();
        expect(body).not.toContain('Z9998');
        expect(body).not.toContain('522222222');
        expect(res.headers()['set-cookie'] ?? '').toBe('');
    });
});
