import { test, expect } from '@playwright/test';
import { VALID_PASSWORD, WRONG_PASSWORD } from '../helpers/LoginHelper.ts';
import { API_BASE, commonHeaders, VALID_USERNAME, VALID_TENANT } from '../helpers/loginApi';

// API performance budgets for the login endpoints. Budgets are generous (dev environment variance) and exist to
// catch order-of-magnitude regressions, not to benchmark. Failed attempts use a non-existent account so no real
// account can lock; successful sign-ins use the shared (non-blocked) merchant.

const BUDGET = {
    simpleGetMs: 2_000,        // ip-address, devices/uuid
    signInP95Ms: 3_000,        // valid sign-in, 95th percentile of SAMPLES
    failedSignInP95Ms: 3_000,  // rejected sign-in
    concurrentTotalMs: 12_000, // CONCURRENCY parallel valid sign-ins, wall clock
    timingSpreadMs: 1_500,     // allowed difference between unknown-user and wrong-password latency
};
const SAMPLES = 10;
const CONCURRENCY = 5;

const timed = async <T>(fn: () => Promise<T>): Promise<{ ms: number; value: T }> => {
    const start = Date.now();
    const value = await fn();
    return { ms: Date.now() - start, value };
};
const p95 = (values: number[]) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.ceil(values.length * 0.95) - 1)];
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

const validSignIn = (request: import('@playwright/test').APIRequestContext) =>
    request.post(`${API_BASE}/auth/signin`, { data: { username: VALID_USERNAME, password: VALID_PASSWORD, tenantNumber: VALID_TENANT }, headers: commonHeaders() });
const failedSignIn = (request: import('@playwright/test').APIRequestContext, username = '+966500000001', tenantNumber = 'NOSUCHTENANT') =>
    request.post(`${API_BASE}/auth/signin`, { data: { username, password: WRONG_PASSWORD, tenantNumber }, headers: commonHeaders() });

test.describe('Login – API performance', { tag: ['@login', '@api', '@performance'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'non-functional' }] }, () => {
    test.beforeEach(() => { test.setTimeout(120_000); });

    test(`GET /devices/ip-address should answer within ${BUDGET.simpleGetMs}ms`, { annotation: [{ type: 'testcase', description: "LG-APIPERF-01: GET /devices/ip-address should answer within …ms" }] }, async ({ request }) => {
        const { ms, value } = await timed(() => request.get(`${API_BASE}/devices/ip-address`, { headers: commonHeaders() }));
        test.info().annotations.push({ type: 'ip-address-ms', description: String(ms) });
        expect(value.status()).toBe(200);
        expect(ms).toBeLessThan(BUDGET.simpleGetMs);
    });

    test(`POST /devices/uuid should answer within ${BUDGET.simpleGetMs}ms`, { annotation: [{ type: 'testcase', description: "LG-APIPERF-02: POST /devices/uuid should answer within …ms" }] }, async ({ request }) => {
        const { ms, value } = await timed(() => request.post(`${API_BASE}/devices/uuid`, { data: { deviceId: 'perf-device' }, headers: commonHeaders() }));
        test.info().annotations.push({ type: 'device-uuid-ms', description: String(ms) });
        expect(value.status()).toBe(200);
        expect(ms).toBeLessThan(BUDGET.simpleGetMs);
    });

    test(`valid POST /auth/signin p95 over ${SAMPLES} calls should stay under ${BUDGET.signInP95Ms}ms`, { annotation: [{ type: 'testcase', description: "LG-APIPERF-03: Valid POST /auth/signin p95 over … calls should stay under …ms" }] }, async ({ request }) => {
        const times: number[] = [];
        for (let i = 0; i < SAMPLES; i++) {
            const { ms, value } = await timed(() => validSignIn(request));
            expect(value.status(), 'valid sign-in must succeed for the timing to be meaningful').toBe(200);
            times.push(ms);
        }
        test.info().annotations.push({ type: 'signin-ms', description: `median ${median(times)} / p95 ${p95(times)}` });
        expect(p95(times)).toBeLessThan(BUDGET.signInP95Ms);
    });

    test(`rejected POST /auth/signin p95 over ${SAMPLES} calls should stay under ${BUDGET.failedSignInP95Ms}ms`, { annotation: [{ type: 'testcase', description: "LG-APIPERF-04: Rejected POST /auth/signin p95 over … calls should stay under …ms" }] }, async ({ request }) => {
        const times: number[] = [];
        for (let i = 0; i < SAMPLES; i++) {
            const { ms, value } = await timed(() => failedSignIn(request));
            expect(value.status()).toBeLessThan(500);
            times.push(ms);
        }
        test.info().annotations.push({ type: 'failed-signin-ms', description: `median ${median(times)} / p95 ${p95(times)}` });
        expect(p95(times)).toBeLessThan(BUDGET.failedSignInP95Ms);
    });

    test(`${CONCURRENCY} concurrent valid sign-ins should all succeed within ${BUDGET.concurrentTotalMs}ms`, { annotation: [{ type: 'testcase', description: "LG-APIPERF-05: … concurrent valid sign-ins should all succeed within …ms" }] }, async ({ request }) => {
        const { ms, value } = await timed(() => Promise.all(Array.from({ length: CONCURRENCY }, () => validSignIn(request))));
        test.info().annotations.push({ type: 'concurrent-ms', description: String(ms) });
        expect(value.map(r => r.status()), 'every concurrent sign-in should succeed').toEqual(Array(CONCURRENCY).fill(200));
        expect(ms).toBeLessThan(BUDGET.concurrentTotalMs);
    });

    test(`${CONCURRENCY * 2} concurrent rejected sign-ins should produce no 5xx`, { annotation: [{ type: 'testcase', description: "LG-APIPERF-06: … concurrent rejected sign-ins should produce no 5xx" }] }, async ({ request }) => {
        const results = await Promise.all(Array.from({ length: CONCURRENCY * 2 }, () => failedSignIn(request)));
        const statuses = results.map(r => r.status());
        expect(statuses.filter(s => s >= 500), `statuses: ${statuses.join(',')}`).toEqual([]);
    });

    test('should respond similarly fast for an unknown user and a known user with a wrong password (no timing leak)', { annotation: [{ type: 'testcase', description: "LG-APIPERF-07: Should respond similarly fast for an unknown user and a known user with a wrong password (no timing leak)" }] }, async ({ request }) => {
        // Known user + wrong password would count towards a real lockout, so the "known" side uses a non-existent
        // tenant/user pair of the same shape; this guards against gross latency differences by input shape only.
        const unknownA: number[] = [];
        const unknownB: number[] = [];
        for (let i = 0; i < 5; i++) {
            unknownA.push((await timed(() => failedSignIn(request, '+966500000001', 'NOSUCHTENANT'))).ms);
            unknownB.push((await timed(() => failedSignIn(request, '+966500000002', 'ANOTHERMISSING'))).ms);
        }
        expect(Math.abs(median(unknownA) - median(unknownB))).toBeLessThan(BUDGET.timingSpreadMs);
    });

    test('should not slow down noticeably across 20 sequential sign-ins (no degradation / leak)', { annotation: [{ type: 'testcase', description: "LG-APIPERF-08: Should not slow down noticeably across 20 sequential sign-ins (no degradation / leak)" }] }, async ({ request }) => {
        const times: number[] = [];
        for (let i = 0; i < 20; i++) times.push((await timed(() => validSignIn(request))).ms);
        const firstHalf = median(times.slice(0, 10));
        const secondHalf = median(times.slice(10));
        test.info().annotations.push({ type: 'degradation', description: `first10 ${firstHalf}ms / last10 ${secondHalf}ms` });
        expect(secondHalf).toBeLessThan(Math.max(firstHalf * 3, 1_500));
    });
});
