import { test, expect } from '@playwright/test';
import {
    API_BASE, POS_TRANSACTIONS, POS_TRANSACTION_TERMS, TERMINAL_ID, OTHER_TERMINAL_ID,
    PROCESSING_STATUSES, MERCHANT_2_TOKEN, NO_PRIVILEGE_TOKEN, EXPIRED_TOKEN,
    authHeaders, headersWithout, commonHeaders, getBusinessToken, hasPosAccess,
    isSpringPage, isClientError, firstError,
} from '../helpers/PosTransactionsHelper.ts';

// ─────────────────────────────────────────────────────────────────────────────
// POS – Business Transactions API  (tenant-scoped, GET_POS_TRANSACTIONS)
//
//   GET /api/v1/pos/transactions
//   GET /api/v1/pos/transactions/terminals/{terminalId}
//
// Automates TC-001..TC-025 from POS-API-Manual-Test-Cases.xlsx.
// The caller's profileCode is resolved server-side from the JWT, so every
// result is scoped to the signed-in merchant without any filter being sent.
// ─────────────────────────────────────────────────────────────────────────────

let token = '';
let granted = false;

const NO_ACCESS = 'business test account has no GET_POS_TRANSACTIONS privilege — set POS_MERCHANT_TOKEN or grant it';

test.beforeAll(async ({ request }) => {
    token = await getBusinessToken(request);
    granted = await hasPosAccess(request, token, POS_TRANSACTIONS);
});

test.describe('POS – Business Transactions: GET /api/v1/pos/transactions', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-BUS-01 (TC-001): returns 200 with a Spring Page envelope', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const res = await request.get(`${API_BASE}${POS_TRANSACTIONS}?page=0&size=20`, {
            headers: authHeaders(token),
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(isSpringPage(body)).toBe(true);
        expect(Array.isArray(body.content)).toBe(true);
    });

    test('POS-BUS-02 (TC-002): every row belongs to the calling merchant only', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const res = await request.get(`${API_BASE}${POS_TRANSACTIONS}?page=0&size=100`, {
            headers: authHeaders(token),
        });
        const body = await res.json();
        test.skip(body.content.length === 0, 'no transactions on the test account to scope-check');

        const profiles = new Set(body.content.map((t: { profileCode: string }) => t.profileCode));
        expect(profiles.size).toBe(1);
    });

    test('POS-BUS-03 (TC-003): omitting page and size applies the documented defaults', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const res = await request.get(`${API_BASE}${POS_TRANSACTIONS}`, { headers: authHeaders(token) });
        const body = await res.json();

        expect(res.status()).toBe(200);
        expect(body.number).toBe(0);
        expect(body.size).toBe(20);
        expect(body.content.length).toBeLessThanOrEqual(20);
    });

    test('POS-BUS-04 (TC-004): consecutive pages return different rows', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const first = await (await request.get(`${API_BASE}${POS_TRANSACTIONS}?page=0&size=5`, { headers: authHeaders(token) })).json();
        test.skip(first.totalElements <= 5, 'fewer than 6 transactions — cannot compare two pages');

        const second = await (await request.get(`${API_BASE}${POS_TRANSACTIONS}?page=1&size=5`, { headers: authHeaders(token) })).json();

        const idsA = first.content.map((t: { id: number }) => t.id);
        const idsB = second.content.map((t: { id: number }) => t.id);

        expect(second.number).toBe(1);
        expect(idsB.some((id: number) => idsA.includes(id))).toBe(false);
        expect(first.first).toBe(true);
    });

    test('POS-BUS-05 (TC-005): processingStatus filter returns only that status', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        for (const status of PROCESSING_STATUSES) {
            const res = await request.get(`${API_BASE}${POS_TRANSACTIONS}?size=50&processingStatus=${status}`, {
                headers: authHeaders(token),
            });

            expect(res.status(), `status filter ${status} should be accepted`).toBe(200);
            const body = await res.json();
            for (const row of body.content) {
                expect(row.processingStatus, `row returned under filter ${status}`).toBe(status);
            }
        }
    });

    test('POS-BUS-06 (TC-006): date range bounds are inclusive', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const seed = await (await request.get(`${API_BASE}${POS_TRANSACTIONS}?size=1`, { headers: authHeaders(token) })).json();
        test.skip(seed.content.length === 0, 'no transaction available to bound the date filter');

        const occurredAt = seed.content[0].occurredAt ?? seed.content[0].receivedAt;
        test.skip(!occurredAt, 'seed transaction carries no timestamp');

        const inWindow = await request.get(
            `${API_BASE}${POS_TRANSACTIONS}?size=50&dateFrom=${encodeURIComponent(occurredAt)}&dateTo=${encodeURIComponent(occurredAt)}`,
            { headers: authHeaders(token) },
        );

        expect(inWindow.status()).toBe(200);
        const body = await inWindow.json();
        expect(body.content.some((t: { id: number }) => t.id === seed.content[0].id)).toBe(true);
    });

    test('POS-BUS-07 (TC-007): dateFrom after dateTo returns an empty page, not an error', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const res = await request.get(
            `${API_BASE}${POS_TRANSACTIONS}?dateFrom=2026-08-31T00:00:00Z&dateTo=2026-08-01T00:00:00Z`,
            { headers: authHeaders(token) },
        );

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.content).toEqual([]);
        expect(body.empty).toBe(true);
        expect(body.totalElements).toBe(0);
    });

    test('POS-BUS-08 (TC-008): an out-of-enum processingStatus is rejected', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const res = await request.get(`${API_BASE}${POS_TRANSACTIONS}?processingStatus=NOT_A_STATUS`, {
            headers: authHeaders(token),
        });

        expect(res.status()).toBe(400);
        expect(await res.text()).not.toMatch(/stack|exception|sql|traceback|JDBC/i);
    });

    test('POS-BUS-09 (TC-009): a non-ISO date is rejected', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const res = await request.get(`${API_BASE}${POS_TRANSACTIONS}?dateFrom=30-08-2026`, {
            headers: authHeaders(token),
        });

        expect(res.status()).toBe(400);
    });

    test('POS-BUS-10 (TC-010): a page beyond the last returns an empty page', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const res = await request.get(`${API_BASE}${POS_TRANSACTIONS}?page=999&size=20`, {
            headers: authHeaders(token),
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.content).toEqual([]);
        expect(body.numberOfElements).toBe(0);
    });

    test('POS-BUS-11 (TC-012): no unmasked card number appears anywhere in the response', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const res  = await request.get(`${API_BASE}${POS_TRANSACTIONS}?size=100`, { headers: authHeaders(token) });
        const text = await res.text();
        const body = JSON.parse(text);
        test.skip(body.content.length === 0, 'no transactions to inspect for PAN masking');

        for (const row of body.content) {
            if (row.maskedPan) expect(String(row.maskedPan)).not.toMatch(/^\d{13,19}$/);
        }
        // A bare 13-19 digit run anywhere in the payload would be an unmasked PAN leak.
        expect(text.replace(/"(id|totalElements|callbackEventId|posDeviceId)":\s*\d+/g, '')).not.toMatch(/\b\d{13,19}\b/);
    });

    test('POS-BUS-12 (TC-020): negative page or size never returns a server error', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        // Behaviour is undocumented — this asserts only that it degrades safely.
        for (const query of ['page=-1', 'size=-5', 'size=0']) {
            const res = await request.get(`${API_BASE}${POS_TRANSACTIONS}?${query}`, { headers: authHeaders(token) });
            expect(res.status(), `${query} must not 5xx`).toBeLessThan(500);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Authentication and privilege — these need no POS privilege to be meaningful.
//
// These assert the contract as documented in pos-api-reference-business.md.
// A live probe of gateway-dev on 2026-09-01 returned something different — see
// the deviation table in ../README.md. The assertions below deliberately stay
// with the documented behaviour so the mismatch surfaces as a finding rather
// than being silently baked in; flip them only once the team confirms which
// side is wrong.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('POS – Business Transactions: auth and privilege', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-BUS-13 (TC-014): missing device-finger-print is rejected at the gateway', async ({ request }) => {
        test.skip(!token, 'sign-in did not return a token');

        const res = await request.get(`${API_BASE}${POS_TRANSACTIONS}`, {
            headers: headersWithout(token, 'device-finger-print'),
        });

        expect(res.status()).toBe(401);
    });

    test('POS-BUS-14 (TC-015): an empty device-finger-print is treated as missing', async ({ request }) => {
        test.skip(!token, 'sign-in did not return a token');

        const res = await request.get(`${API_BASE}${POS_TRANSACTIONS}`, {
            headers: authHeaders(token, { 'device-finger-print': '' }),
        });

        expect(res.status()).toBe(401);
    });

    test('POS-BUS-15 (TC-016): missing platform header is rejected', async ({ request }) => {
        test.skip(!token, 'sign-in did not return a token');

        const res = await request.get(`${API_BASE}${POS_TRANSACTIONS}`, {
            headers: headersWithout(token, 'platform'),
        });

        expect(res.status()).toBe(401);
    });

    test('POS-BUS-16 (TC-017): missing Authorization is rejected', async ({ request }) => {
        const res = await request.get(`${API_BASE}${POS_TRANSACTIONS}`, { headers: commonHeaders() });

        expect(res.status()).toBe(401);
    });

    test('POS-BUS-17 (TC-019): a tampered token signature is rejected', async ({ request }) => {
        test.skip(!token, 'sign-in did not return a token');

        const parts = token.split('.');
        test.skip(parts.length !== 3, 'access token is not a three-part JWT — cannot tamper with the signature');

        const lastChar = parts[2].slice(-1);
        parts[2] = parts[2].slice(0, -1) + (lastChar === 'A' ? 'B' : 'A');

        const res = await request.get(`${API_BASE}${POS_TRANSACTIONS}`, {
            headers: authHeaders(parts.join('.')),
        });

        expect(res.status()).toBe(401);
    });

    test('POS-BUS-18 (TC-018): an expired token is rejected', async ({ request }) => {
        test.skip(!EXPIRED_TOKEN, 'no POS_EXPIRED_TOKEN provided');

        const res = await request.get(`${API_BASE}${POS_TRANSACTIONS}`, { headers: authHeaders(EXPIRED_TOKEN) });

        expect(res.status()).toBe(401);
    });

    test('POS-BUS-19 (TC-013): a token without GET_POS_TRANSACTIONS gets 403 UNAUTHORIZED_USER', async ({ request }) => {
        test.skip(!NO_PRIVILEGE_TOKEN, 'no POS_NO_PRIVILEGE_TOKEN provided');

        const res  = await request.get(`${API_BASE}${POS_TRANSACTIONS}`, { headers: authHeaders(NO_PRIVILEGE_TOKEN) });
        const err  = firstError(await res.json().catch(() => null));

        expect(res.status()).toBe(403);
        expect((err?.['message'] as Record<string, unknown> | undefined)?.['messageCode']).toBe('UNAUTHORIZED_USER');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/pos/transactions/terminals/{terminalId}
// ─────────────────────────────────────────────────────────────────────────────

test.describe('POS – Business Transactions by terminal', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-BUS-20 (TC-021): every row is for the requested terminal', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const res = await request.get(`${API_BASE}${POS_TRANSACTION_TERMS}/${TERMINAL_ID}?size=50`, {
            headers: authHeaders(token),
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        for (const row of body.content) {
            expect(row.terminalId).toBe(TERMINAL_ID);
        }
    });

    test('POS-BUS-21 (TC-024): filters combine with the terminal path scope', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const res = await request.get(
            `${API_BASE}${POS_TRANSACTION_TERMS}/${TERMINAL_ID}?size=50&processingStatus=SETTLED`,
            { headers: authHeaders(token) },
        );

        expect(res.status()).toBe(200);
        const body = await res.json();
        for (const row of body.content) {
            expect(row.terminalId).toBe(TERMINAL_ID);
            expect(row.processingStatus).toBe('SETTLED');
        }
    });

    test('POS-BUS-22 (TC-023): an unknown terminal is refused with a client error', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const res = await request.get(`${API_BASE}${POS_TRANSACTION_TERMS}/T9999999?size=10`, {
            headers: authHeaders(token),
        });

        // PosDeviceNotFoundException — the reference does not pin the status, so
        // this asserts a client error rather than a 5xx, and no data leaking out.
        expect(isClientError(res.status()), `expected 4xx, got ${res.status()}`).toBe(true);
    });

    test('POS-BUS-23 (TC-022): a terminal owned by another merchant is not readable', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);
        test.skip(!OTHER_TERMINAL_ID, 'no POS_OTHER_TERMINAL_ID provided — cannot test cross-tenant access');

        const res = await request.get(`${API_BASE}${POS_TRANSACTION_TERMS}/${OTHER_TERMINAL_ID}?size=50`, {
            headers: authHeaders(token),
        });

        expect(res.status()).not.toBe(200);
        expect(isClientError(res.status())).toBe(true);
    });

    test('POS-BUS-24 (TC-023): unknown and other-merchant terminals are indistinguishable', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);
        test.skip(!OTHER_TERMINAL_ID, 'no POS_OTHER_TERMINAL_ID provided');

        const unknown = await request.get(`${API_BASE}${POS_TRANSACTION_TERMS}/T9999999`, { headers: authHeaders(token) });
        const foreign = await request.get(`${API_BASE}${POS_TRANSACTION_TERMS}/${OTHER_TERMINAL_ID}`, { headers: authHeaders(token) });

        // Different responses would let an attacker enumerate real terminal IDs.
        expect(foreign.status()).toBe(unknown.status());
    });

    test('POS-BUS-25 (TC-025): a SQL-injection payload in terminalId leaks nothing', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const res  = await request.get(`${API_BASE}${POS_TRANSACTION_TERMS}/${encodeURIComponent("T001' OR '1'='1")}`, {
            headers: authHeaders(token),
        });
        const text = await res.text();

        expect(res.status(), 'injection payload must not reach the database').toBeLessThan(500);
        expect(text).not.toMatch(/sql|syntax|JDBC|ORA-|SQLSTATE/i);
    });
});
