import { test, expect } from '@playwright/test';
import {
    API_BASE, POS_LEDGER_TERMINALS, POS_LEDGER_WALLETS, ADMIN_ACH,
    TERMINAL_ID, WALLET_REFERENCE, OTHER_TERMINAL_ID, OTHER_WALLET_REFERENCE,
    LEDGER_STATUSES, LEDGER_ENTRY_TYPES, ADMIN_TOKEN, NO_PRIVILEGE_TOKEN,
    authHeaders, getBusinessToken, hasPosAccess, isSpringPage, isClientError, firstError,
} from '../helpers/PosTransactionsHelper.ts';

// ─────────────────────────────────────────────────────────────────────────────
// POS – Business Ledger API  (tenant-scoped, GET_POS_LEDGER)
//
//   GET /api/v1/pos/ledger/terminals/{terminalId}
//   GET /api/v1/pos/ledger/wallets/{walletReference}
//
// Automates TC-026..TC-038. Ownership is enforced server-side by
// deviceService.getByProfileCodeAndTerminalId / existsByProfileCodeAndWalletCode,
// which raises PosDeviceNotFoundException rather than a 403 — so the
// cross-tenant tests assert "refused with a 4xx", not a specific code.
// ─────────────────────────────────────────────────────────────────────────────

let token = '';
let granted = false;

const NO_ACCESS = 'business test account has no GET_POS_LEDGER privilege — grant it or set POS_MERCHANT_TOKEN';

test.beforeAll(async ({ request }) => {
    token = await getBusinessToken(request);
    granted = await hasPosAccess(request, token, `${POS_LEDGER_TERMINALS}/${TERMINAL_ID}`);
});

test.describe('POS – Ledger by terminal', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-LDG-01 (TC-026): returns 200 with the documented PosLedgerEntryDto fields', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const res = await request.get(`${API_BASE}${POS_LEDGER_TERMINALS}/${TERMINAL_ID}?page=0&size=20`, {
            headers: authHeaders(token),
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(isSpringPage(body)).toBe(true);

        if (body.content.length > 0) {
            const entry = body.content[0];
            for (const field of ['id', 'terminalId', 'amount', 'currency', 'direction',
                'posTransactionType', 'entryType', 'status', 'createdAt']) {
                expect(entry, `ledger entry should carry ${field}`).toHaveProperty(field);
            }
            expect(['CREDIT', 'DEBIT']).toContain(entry.direction);
            expect(entry.terminalId).toBe(TERMINAL_ID);
        }
    });

    test('POS-LDG-02 (TC-027): status filter returns only that status', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        for (const status of LEDGER_STATUSES) {
            const res = await request.get(`${API_BASE}${POS_LEDGER_TERMINALS}/${TERMINAL_ID}?size=50&status=${status}`, {
                headers: authHeaders(token),
            });

            expect(res.status(), `status=${status} should be accepted`).toBe(200);
            const body = await res.json();
            for (const row of body.content) {
                expect(row.status, `row returned under status=${status}`).toBe(status);
            }
        }
    });

    test('POS-LDG-03 (TC-028): entryType filter returns only that type', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        for (const entryType of LEDGER_ENTRY_TYPES) {
            const res = await request.get(`${API_BASE}${POS_LEDGER_TERMINALS}/${TERMINAL_ID}?size=50&entryType=${entryType}`, {
                headers: authHeaders(token),
            });

            expect(res.status(), `entryType=${entryType} should be accepted`).toBe(200);
            const body = await res.json();
            for (const row of body.content) {
                expect(row.entryType, `row returned under entryType=${entryType}`).toBe(entryType);
            }
        }
    });

    test('POS-LDG-04 (TC-029): status and entryType combine with AND, not OR', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const res = await request.get(
            `${API_BASE}${POS_LEDGER_TERMINALS}/${TERMINAL_ID}?size=50&status=SUCCESS&entryType=POS_CASH_IN`,
            { headers: authHeaders(token) },
        );

        expect(res.status()).toBe(200);
        const body = await res.json();
        for (const row of body.content) {
            expect(row.status).toBe('SUCCESS');
            expect(row.entryType).toBe('POS_CASH_IN');
        }
    });

    test('POS-LDG-05 (TC-030): out-of-enum status or entryType is rejected', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        for (const query of ['status=DONE', 'entryType=CASH_OUT']) {
            const res = await request.get(`${API_BASE}${POS_LEDGER_TERMINALS}/${TERMINAL_ID}?${query}`, {
                headers: authHeaders(token),
            });

            expect(res.status(), `${query} should be a 400`).toBe(400);
            expect(await res.text()).not.toMatch(/stack|exception|sql|traceback/i);
        }
    });

    test('POS-LDG-06 (TC-031): the date filter applies to createdAt', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const seed = await (await request.get(`${API_BASE}${POS_LEDGER_TERMINALS}/${TERMINAL_ID}?size=1`, {
            headers: authHeaders(token),
        })).json();
        test.skip(seed.content.length === 0, 'no ledger entry available to bound the date filter');

        const createdAt = new Date(seed.content[0].createdAt).toISOString();
        const res = await request.get(
            `${API_BASE}${POS_LEDGER_TERMINALS}/${TERMINAL_ID}?size=50&dateFrom=${encodeURIComponent(createdAt)}&dateTo=${encodeURIComponent(createdAt)}`,
            { headers: authHeaders(token) },
        );

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.content.some((e: { id: number }) => e.id === seed.content[0].id)).toBe(true);
    });

    test('POS-LDG-07 (TC-032): a terminal owned by another merchant is not readable', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);
        test.skip(!OTHER_TERMINAL_ID, 'no POS_OTHER_TERMINAL_ID provided — cannot test cross-tenant access');

        const res = await request.get(`${API_BASE}${POS_LEDGER_TERMINALS}/${OTHER_TERMINAL_ID}`, {
            headers: authHeaders(token),
        });

        expect(res.status()).not.toBe(200);
        expect(isClientError(res.status())).toBe(true);
    });

    test('POS-LDG-08 (TC-033): a token without GET_POS_LEDGER gets 403 UNAUTHORIZED_USER', async ({ request }) => {
        test.skip(!NO_PRIVILEGE_TOKEN, 'no POS_NO_PRIVILEGE_TOKEN provided');

        const res = await request.get(`${API_BASE}${POS_LEDGER_TERMINALS}/${TERMINAL_ID}`, {
            headers: authHeaders(NO_PRIVILEGE_TOKEN),
        });
        const err = firstError(await res.json().catch(() => null));

        expect(res.status()).toBe(403);
        expect((err?.['message'] as Record<string, unknown> | undefined)?.['messageCode']).toBe('UNAUTHORIZED_USER');
    });
});

test.describe('POS – Ledger by wallet', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-LDG-09 (TC-034): every row carries the requested wallet reference', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const res = await request.get(`${API_BASE}${POS_LEDGER_WALLETS}/${WALLET_REFERENCE}?size=50`, {
            headers: authHeaders(token),
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(isSpringPage(body)).toBe(true);
        for (const row of body.content) {
            expect(row.walletReference).toBe(WALLET_REFERENCE);
        }
    });

    test('POS-LDG-10 (TC-037): wallet ledger honours filters and page size', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const res = await request.get(`${API_BASE}${POS_LEDGER_WALLETS}/${WALLET_REFERENCE}?size=5&status=SUCCESS`, {
            headers: authHeaders(token),
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.size).toBe(5);
        expect(body.content.length).toBeLessThanOrEqual(5);
        for (const row of body.content) {
            expect(row.status).toBe('SUCCESS');
        }
    });

    test('POS-LDG-11 (TC-036): an unknown wallet reference is refused with a client error', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const res = await request.get(`${API_BASE}${POS_LEDGER_WALLETS}/WLT-000000`, { headers: authHeaders(token) });

        expect(isClientError(res.status()), `expected 4xx, got ${res.status()}`).toBe(true);
    });

    test('POS-LDG-12 (TC-035): a wallet belonging to another merchant is not readable', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);
        test.skip(!OTHER_WALLET_REFERENCE, 'no POS_OTHER_WALLET_REFERENCE provided');

        const res = await request.get(`${API_BASE}${POS_LEDGER_WALLETS}/${OTHER_WALLET_REFERENCE}`, {
            headers: authHeaders(token),
        });

        expect(res.status()).not.toBe(200);
        expect(isClientError(res.status())).toBe(true);
    });

    test('POS-LDG-13 (TC-038): reconBatchRefNum resolves to a real ACH transfer', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);
        test.skip(!ADMIN_TOKEN, 'no POS_ADMIN_TOKEN provided — cannot cross-check the ACH batch');

        const ledger = await (await request.get(`${API_BASE}${POS_LEDGER_TERMINALS}/${TERMINAL_ID}?size=50`, {
            headers: authHeaders(token),
        })).json();

        const withBatch = ledger.content.find((e: { reconBatchRefNum?: string }) => !!e.reconBatchRefNum);
        test.skip(!withBatch, 'no ledger entry has been aggregated into a batch yet');

        const ach = await request.get(`${API_BASE}${ADMIN_ACH}?batchRef=${encodeURIComponent(withBatch.reconBatchRefNum)}`, {
            headers: authHeaders(ADMIN_TOKEN),
        });

        expect(ach.status()).toBe(200);
        const body = await ach.json();
        expect(body.content.length).toBeGreaterThan(0);
        expect(body.content[0].reconBatchRefNum).toBe(withBatch.reconBatchRefNum);
    });
});
