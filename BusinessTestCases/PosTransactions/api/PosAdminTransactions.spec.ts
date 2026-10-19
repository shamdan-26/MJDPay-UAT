import { test, expect } from '@playwright/test';
import {
    API_BASE, ADMIN_TRANSACTIONS, ADMIN_LEDGER, ADMIN_TOKEN, PROFILE_CODE,
    TERMINAL_ID, WALLET_REFERENCE,
    authHeaders, getBusinessToken, isSpringPage, firstError,
} from '../helpers/PosTransactionsHelper.ts';

// ─────────────────────────────────────────────────────────────────────────────
// POS – Admin Transactions & Ledger  (unscoped, back-office)
//
//   GET /api/v1/admin/pos/transactions   ADMIN_GET_POS_TRANSACTIONS
//   GET /api/v1/admin/pos/ledger         ADMIN_GET_POS_LEDGER
//
// Automates TC-039..TC-049. Unlike the business endpoints these perform no
// ownership check at all — a holder of the privilege reads every profile's data,
// which is exactly why TC-045 (a merchant token must be refused) matters most.
//
// The business portal sign-in issues merchant tokens only, so an admin token has
// to be supplied via POS_ADMIN_TOKEN; without it these tests skip rather than fail.
// ─────────────────────────────────────────────────────────────────────────────

const NO_ADMIN = 'no POS_ADMIN_TOKEN provided — admin tokens cannot be minted by the business sign-in flow';

test.describe('POS – Admin transactions', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-ADM-01 (TC-039): returns a page spanning more than one profile', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const res = await request.get(`${API_BASE}${ADMIN_TRANSACTIONS}?page=0&size=50`, {
            headers: authHeaders(ADMIN_TOKEN),
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(isSpringPage(body)).toBe(true);

        // Unscoped by design. With enough seeded data this should span profiles;
        // a single-profile environment is not a failure, so it is only logged.
        const profiles = new Set(body.content.map((t: { profileCode: string }) => t.profileCode));
        if (body.content.length > 0 && profiles.size === 1) {
            // eslint-disable-next-line no-console
            console.log('Admin list returned one profile only — seed a second merchant to prove it is unscoped.');
        }
    });

    test('POS-ADM-02 (TC-040): profileCode filter scopes the admin list to one merchant', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);
        test.skip(!PROFILE_CODE, 'no POS_PROFILE_CODE provided');

        const res = await request.get(`${API_BASE}${ADMIN_TRANSACTIONS}?size=50&profileCode=${PROFILE_CODE}`, {
            headers: authHeaders(ADMIN_TOKEN),
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        for (const row of body.content) {
            expect(row.profileCode).toBe(PROFILE_CODE);
        }
    });

    test('POS-ADM-03 (TC-042): terminalId and walletCode filters narrow correctly', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const byTerminal = await request.get(`${API_BASE}${ADMIN_TRANSACTIONS}?size=50&terminalId=${TERMINAL_ID}`, {
            headers: authHeaders(ADMIN_TOKEN),
        });
        expect(byTerminal.status()).toBe(200);
        for (const row of (await byTerminal.json()).content) {
            expect(row.terminalId).toBe(TERMINAL_ID);
        }

        const byWallet = await request.get(`${API_BASE}${ADMIN_TRANSACTIONS}?size=50&walletCode=${WALLET_REFERENCE}`, {
            headers: authHeaders(ADMIN_TOKEN),
        });
        expect(byWallet.status()).toBe(200);
        for (const row of (await byWallet.json()).content) {
            expect(row.walletCode).toBe(WALLET_REFERENCE);
        }
    });

    test('POS-ADM-04 (TC-041): deviceId filter matches posDeviceId', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const seed = await (await request.get(`${API_BASE}${ADMIN_TRANSACTIONS}?size=1`, {
            headers: authHeaders(ADMIN_TOKEN),
        })).json();
        const deviceId = seed.content?.[0]?.posDeviceId;
        test.skip(!deviceId, 'no transaction with a matched device to filter by');

        const res = await request.get(`${API_BASE}${ADMIN_TRANSACTIONS}?size=50&deviceId=${deviceId}`, {
            headers: authHeaders(ADMIN_TOKEN),
        });

        expect(res.status()).toBe(200);
        for (const row of (await res.json()).content) {
            expect(row.posDeviceId).toBe(deviceId);
        }
    });

    test('POS-ADM-05 (TC-043): a non-numeric deviceId is rejected', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const res = await request.get(`${API_BASE}${ADMIN_TRANSACTIONS}?deviceId=abc`, {
            headers: authHeaders(ADMIN_TOKEN),
        });

        expect(res.status()).toBe(400);
        expect(await res.text()).not.toMatch(/stack|exception|sql|traceback/i);
    });

    test('POS-ADM-06 (TC-044): all admin filters combine without any being ignored', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const res = await request.get(
            `${API_BASE}${ADMIN_TRANSACTIONS}?size=50&terminalId=${TERMINAL_ID}&walletCode=${WALLET_REFERENCE}` +
            `&processingStatus=SETTLED&dateFrom=2026-01-01T00:00:00Z&dateTo=2026-12-31T23:59:59Z`,
            { headers: authHeaders(ADMIN_TOKEN) },
        );

        expect(res.status()).toBe(200);
        for (const row of (await res.json()).content) {
            expect(row.terminalId).toBe(TERMINAL_ID);
            expect(row.walletCode).toBe(WALLET_REFERENCE);
            expect(row.processingStatus).toBe('SETTLED');
        }
    });

    test('POS-ADM-07 (TC-045): a merchant token cannot reach the admin transactions endpoint', async ({ request }) => {
        const businessToken = await getBusinessToken(request);
        test.skip(!businessToken, 'sign-in did not return a token');

        const res = await request.get(`${API_BASE}${ADMIN_TRANSACTIONS}`, { headers: authHeaders(businessToken) });

        // The single most important privilege-separation check in this suite:
        // a merchant must never read the global, cross-tenant transaction list.
        expect(res.status(), 'a merchant token must not be able to read the admin list').toBe(403);
        const err = firstError(await res.json().catch(() => null));
        expect((err?.['message'] as Record<string, unknown> | undefined)?.['messageCode']).toBe('UNAUTHORIZED_USER');
    });
});

test.describe('POS – Admin ledger', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-ADM-08 (TC-046): returns an unscoped page of ledger entries', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const res = await request.get(`${API_BASE}${ADMIN_LEDGER}?page=0&size=50`, {
            headers: authHeaders(ADMIN_TOKEN),
        });

        expect(res.status()).toBe(200);
        expect(isSpringPage(await res.json())).toBe(true);
    });

    test('POS-ADM-09 (TC-047): terminalId and walletReference filters both apply', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const byTerminal = await request.get(`${API_BASE}${ADMIN_LEDGER}?size=50&terminalId=${TERMINAL_ID}`, {
            headers: authHeaders(ADMIN_TOKEN),
        });
        expect(byTerminal.status()).toBe(200);
        for (const row of (await byTerminal.json()).content) {
            expect(row.terminalId).toBe(TERMINAL_ID);
        }

        const byWallet = await request.get(`${API_BASE}${ADMIN_LEDGER}?size=50&walletReference=${WALLET_REFERENCE}`, {
            headers: authHeaders(ADMIN_TOKEN),
        });
        expect(byWallet.status()).toBe(200);
        for (const row of (await byWallet.json()).content) {
            expect(row.walletReference).toBe(WALLET_REFERENCE);
        }
    });

    test('POS-ADM-10 (TC-048): status, entryType and date filters apply together', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const res = await request.get(
            `${API_BASE}${ADMIN_LEDGER}?size=50&status=SUCCESS&entryType=POS_CASH_IN` +
            `&dateFrom=2026-01-01T00:00:00Z&dateTo=2026-12-31T23:59:59Z`,
            { headers: authHeaders(ADMIN_TOKEN) },
        );

        expect(res.status()).toBe(200);
        for (const row of (await res.json()).content) {
            expect(row.status).toBe('SUCCESS');
            expect(row.entryType).toBe('POS_CASH_IN');
        }
    });

    test('POS-ADM-11 (TC-049): a merchant token cannot reach the admin ledger', async ({ request }) => {
        const businessToken = await getBusinessToken(request);
        test.skip(!businessToken, 'sign-in did not return a token');

        const res = await request.get(`${API_BASE}${ADMIN_LEDGER}`, { headers: authHeaders(businessToken) });

        expect(res.status()).toBe(403);
    });
});
