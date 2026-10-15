import { test, expect } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

const API_BASE = process.env['API_BASE_URL'] ?? 'https://gateway-dev-emi.dg-cash.app';
const HEADERS = { 'Content-Type': 'application/json' };

// ─────────────────────────────────────────────────────────────────────────────
// API performance budgets for the forgot-password endpoints.
// Budgets are generous (dev environment variance) and catch order-of-magnitude regressions, not benchmark.
// Only rejected/unknown identities are timed under load so no OTP is generated for a real account.
// ─────────────────────────────────────────────────────────────────────────────

const BUDGET = { otpSettingsMs: 2_000, rejectedP95Ms: 3_000, concurrentTotalMs: 12_000 };
const SAMPLES = 10;
const CONCURRENCY = 5;

const tags = { tag: ['@forgotpassword', '@api', '@performance'], annotation: [{ type: 'feature', description: 'ForgotPassword' }, { type: 'layer', description: 'non-functional' }] };
const p95 = (values: number[]) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.ceil(values.length * 0.95) - 1)];

test.describe('Forgot Password – API Performance', tags, () => {
    test(`GET /otp/otp-settings/q should answer within ${BUDGET.otpSettingsMs}ms`, { annotation: [{ type: 'testcase', description: 'FP-PERF-01: OTP settings should answer within …ms' }] }, async ({ request }) => {
        const start = Date.now();
        const res = await request.get(`${API_BASE}/otp/otp-settings/q?operationCode=FORGET_PASSWORD`);
        const ms = Date.now() - start;
        expect(res.status()).toBe(200);
        expect(ms).toBeLessThan(BUDGET.otpSettingsMs);
    });

    test(`rejected POST /auth/passwords/forget p95 over ${SAMPLES} calls should stay under ${BUDGET.rejectedP95Ms}ms`, { annotation: [{ type: 'testcase', description: 'FP-PERF-02: Rejected forget request p95 should stay under …ms' }] }, async ({ request }) => {
        const times: number[] = [];
        for (let i = 0; i < SAMPLES; i++) {
            const start = Date.now();
            const res = await request.post(`${API_BASE}/auth/passwords/forget`, { data: { companyNumber: `Z${8000 + i}`, mobileNumber: '+966511111111' }, headers: HEADERS });
            times.push(Date.now() - start);
            expect(res.status()).toBeLessThan(500);
        }
        expect(p95(times)).toBeLessThan(BUDGET.rejectedP95Ms);
    });

    test(`${CONCURRENCY} concurrent rejected requests all finish within ${BUDGET.concurrentTotalMs}ms with no server errors`, { annotation: [{ type: 'testcase', description: 'FP-PERF-03: Concurrent rejected requests finish within …ms without 5xx' }] }, async ({ request }) => {
        const start = Date.now();
        const responses = await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) =>
            request.post(`${API_BASE}/auth/passwords/forget`, { data: { companyNumber: `Z${7000 + i}`, mobileNumber: `+96651111111${i}` }, headers: HEADERS })));
        expect(Date.now() - start).toBeLessThan(BUDGET.concurrentTotalMs);
        for (const r of responses) expect(r.status()).toBeLessThan(500);
    });
});
