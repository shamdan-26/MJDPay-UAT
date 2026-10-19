import { test, expect } from '@playwright/test';
import {
    API_BASE, POS_TRANSACTIONS, ADMIN_TRANSACTIONS, ADMIN_LEDGER,
    POS_LEDGER_TERMINAL_PATH, POS_LEDGER_WALLET_PATH, POS_TRANSACTIONS_TERMINAL_PATH,
    TERMINAL_ID, UNKNOWN_TERMINAL_ID, UNRELATED_WALLET_CODE,
    ADMIN_TOKEN, EXPIRED_TOKEN,
    authHeaders, commonHeaders, localeHeaders, getBusinessToken, hasPosAccess,
    isSpringPage, isClientError, firstError, ARABIC_SCRIPT,
} from '../helpers/PosTransactionsHelper.ts';

// ─────────────────────────────────────────────────────────────────────────────
// POS – API contract defects (POS-DEF-01..POS-DEF-08)
//
// The EMI-60xx sweep against the live gateway. Unlike PosBusinessTransactions /
// PosAdminTransactions (which assert the documented happy-path contract), every
// case here is a specific reported defect where the API answered with the wrong
// STATUS or a null FIELD:
//
//   EMI-6047  no token           -> 404, should be 401
//   EMI-6048  expired token      -> 200 with data, should be 401
//   EMI-6049  size=0             -> 500, should be a validation error
//   EMI-6050  Accept-Language    -> ignored until the session is replaced
//   EMI-6051  dateFrom filter    -> 500 on ledger-by-terminal
//   EMI-6052  foreign walletCode -> POS_DEVICE_NOT_FOUND, should say "not yours"
//   EMI-6053  posDeviceId        -> null on every admin transaction row
//   EMI-6055  currency           -> null on every admin ledger entry
//
// These run against the REAL gateway (no page.route here — this folder is
// API-only), so each skips cleanly when the token or privilege is unavailable
// rather than reporting a wall of 403s.
//
// EMI-6048 and EMI-6051 are still open (To Do / In Progress) at time of
// writing: their assertions are expected to fail until the fix lands, which is
// the point of writing them now.
// ─────────────────────────────────────────────────────────────────────────────

let token = '';
let granted = false;

const NO_ACCESS = 'business test account has no GET_POS_TRANSACTIONS privilege — set POS_MERCHANT_TOKEN or grant it';
const NO_ADMIN  = 'no POS_ADMIN_TOKEN provided';
const NO_EXPIRED = 'no POS_EXPIRED_TOKEN provided — an expired JWT cannot be minted by the suite';

test.beforeAll(async ({ request }) => {
    token = await getBusinessToken(request);
    granted = await hasPosAccess(request, token, POS_TRANSACTIONS);
});

test.describe('POS defects – Authentication (POS-DEF-01, EMI-6047 / EMI-6048)', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-DEF-01 (EMI-6047): a request with no Authorization header is refused with 401, not 404', async ({ request }) => {
        const res = await request.get(`${API_BASE}${POS_TRANSACTIONS}?page=1&size=5`, {
            headers: commonHeaders(),
        });

        // The defect: the gateway had no route match for the unauthenticated
        // call and answered 404, hiding the real (auth) problem.
        expect(res.status(), 'missing token should surface as 401, not 404').toBe(401);
    });

    test('POS-DEF-01b (EMI-6047): the 404 specifically must not be the answer', async ({ request }) => {
        const res = await request.get(`${API_BASE}${POS_TRANSACTIONS}?page=1&size=5`, {
            headers: commonHeaders(),
        });

        expect(res.status()).not.toBe(404);
    });

    test('POS-DEF-02 (EMI-6048): an expired token is refused with 401 and returns no data', async ({ request }) => {
        test.skip(!EXPIRED_TOKEN, NO_EXPIRED);

        const res = await request.get(`${API_BASE}${POS_TRANSACTIONS}?page=1&size=5`, {
            headers: authHeaders(EXPIRED_TOKEN),
        });

        expect(res.status(), 'an expired token still returned a result').toBe(401);

        const body = await res.json().catch(() => null);
        // Belt and braces: even a wrong status must not leak transaction rows.
        if (body && isSpringPage(body)) {
            expect(body.content.length, 'expired token returned transaction rows').toBe(0);
        }
    });
});

test.describe('POS defects – Pagination Validation (POS-DEF-03, EMI-6049)', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-DEF-03: size=0 is rejected as a client validation error, not a 500', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const res = await request.get(`${API_BASE}${POS_TRANSACTIONS}?page=1&size=0`, {
            headers: authHeaders(token),
        });

        expect(res.status(), 'size=0 produced a server error instead of a validation error').not.toBe(500);
        expect(isClientError(res.status()), `expected a 4xx, got ${res.status()}`).toBe(true);
    });

    test('POS-DEF-03b: the size=0 rejection carries a meaningful message, not a bare stack', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const res = await request.get(`${API_BASE}${POS_TRANSACTIONS}?page=1&size=0`, {
            headers: authHeaders(token),
        });
        test.skip(res.status() === 200, 'gateway accepted size=0 — nothing to inspect');

        const error = firstError(await res.json().catch(() => null));
        expect(error, 'no error body returned for size=0').not.toBeNull();
        const text = JSON.stringify(error);
        expect(text).not.toContain('Internal Server Error');
    });
});

test.describe('POS defects – Locale Applies Immediately (POS-DEF-04, EMI-6050)', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-DEF-04: switching to ar_sa changes the error language on the SAME session token', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const path = `${API_BASE}${POS_TRANSACTIONS_TERMINAL_PATH(UNKNOWN_TERMINAL_ID)}?size=40`;

        // An unknown terminal is used deliberately: it guarantees an error
        // message to compare, without needing seeded data.
        const english = await request.get(path, { headers: localeHeaders(token, 'en_uk') });
        const arabic  = await request.get(path, { headers: localeHeaders(token, 'ar_sa') });

        test.skip(english.status() < 400, 'terminal resolved successfully — no error message to compare');

        const englishText = JSON.stringify(await english.json().catch(() => ({})));
        const arabicText  = JSON.stringify(await arabic.json().catch(() => ({})));

        // EMI-6050: pre-fix both calls came back in whatever locale the session
        // was created with, so the two payloads were identical.
        expect(arabicText, 'the ar_sa response is byte-identical to the en_uk one').not.toBe(englishText);
        expect(arabicText, 'the ar_sa response contains no Arabic script').toMatch(ARABIC_SCRIPT);
    });
});

test.describe('POS defects – Ledger Date Filter (POS-DEF-05, EMI-6051)', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-DEF-05: ledger-by-terminal with a dateFrom filter returns data, not a 500', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const dateFrom = encodeURIComponent('2026-08-31T00:00:00Z');
        const res = await request.get(
            `${API_BASE}${POS_LEDGER_TERMINAL_PATH(TERMINAL_ID)}?page=0&size=20&dateFrom=${dateFrom}`,
            { headers: authHeaders(token) }
        );

        expect(res.status(), 'dateFrom filter produced a 500').not.toBe(500);
    });

    test('POS-DEF-05b: an accepted dateFrom filter returns a well-formed page', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const dateFrom = encodeURIComponent('2026-08-31T00:00:00Z');
        const res = await request.get(
            `${API_BASE}${POS_LEDGER_TERMINAL_PATH(TERMINAL_ID)}?page=0&size=20&dateFrom=${dateFrom}`,
            { headers: authHeaders(token) }
        );
        test.skip(res.status() !== 200, `ledger filter returned ${res.status()} — POS-DEF-05 covers the failure case`);

        expect(isSpringPage(await res.json())).toBe(true);
    });
});

test.describe('POS defects – Cross-Tenant Wallet Code (POS-DEF-06, EMI-6052)', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-DEF-06: a wallet code the token does not own is refused with an ownership error', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const res = await request.get(
            `${API_BASE}${POS_LEDGER_WALLET_PATH(UNRELATED_WALLET_CODE)}?page=0&size=20`,
            { headers: authHeaders(token) }
        );

        expect(isClientError(res.status()), `expected a 4xx, got ${res.status()}`).toBe(true);

        const error = firstError(await res.json().catch(() => null));
        const messageCode = JSON.stringify(error);
        // EMI-6052: the wallet exists — it just belongs to someone else — so
        // "device not found" is the wrong story to tell the caller.
        expect(messageCode, 'a foreign wallet code still reports POS_DEVICE_NOT_FOUND').not.toContain('POS_DEVICE_NOT_FOUND');
    });

    test('POS-DEF-06b: the foreign wallet returns no ledger rows regardless of the message', async ({ request }) => {
        test.skip(!granted, NO_ACCESS);

        const res = await request.get(
            `${API_BASE}${POS_LEDGER_WALLET_PATH(UNRELATED_WALLET_CODE)}?page=0&size=20`,
            { headers: authHeaders(token) }
        );
        const body = await res.json().catch(() => null);

        if (body && isSpringPage(body)) {
            expect(body.content.length, 'ledger for a foreign wallet leaked rows').toBe(0);
        }
    });
});

test.describe('POS defects – Admin Row Completeness (POS-DEF-07, EMI-6053 / EMI-6055)', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-DEF-07 (EMI-6053): every admin transaction row carries a non-null posDeviceId', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const res = await request.get(`${API_BASE}${ADMIN_TRANSACTIONS}?page=0&size=20`, {
            headers: authHeaders(ADMIN_TOKEN),
        });
        expect(res.status()).toBe(200);

        const body = await res.json();
        test.skip(body.content.length === 0, 'no admin transactions to inspect');

        const nulls = body.content.filter((row: { posDeviceId: unknown }) => row.posDeviceId === null || row.posDeviceId === undefined);
        expect(nulls.length, `${nulls.length}/${body.content.length} admin rows have a null posDeviceId`).toBe(0);
    });

    test('POS-DEF-08 (EMI-6055): every admin ledger entry carries a non-null currency', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const res = await request.get(`${API_BASE}${ADMIN_LEDGER}?page=0&size=20`, {
            headers: authHeaders(ADMIN_TOKEN),
        });
        expect(res.status()).toBe(200);

        const body = await res.json();
        test.skip(body.content.length === 0, 'no admin ledger entries to inspect');

        const nulls = body.content.filter((row: { currency: unknown }) => row.currency === null || row.currency === undefined);
        expect(nulls.length, `${nulls.length}/${body.content.length} ledger entries have a null currency`).toBe(0);
    });
});
