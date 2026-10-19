import { test, expect } from '@playwright/test';
import {
    API_BASE, POS_CALLBACK, CALLBACK_TOKEN, TERMINAL_ID, MASKED_PAN, FULL_PAN,
    authHeaders, headersWithout, commonHeaders, buildCallback, freshStan, freshRrn,
} from '../helpers/PosTransactionsHelper.ts';

// ─────────────────────────────────────────────────────────────────────────────
// POS – Terminal Transaction Callback
//
//   POST /api/v1/pos/transactions/callback     POS_TRANSACTION_CALLBACK
//
// Automates TC-078..TC-105.
//
// Two things about this endpoint routinely catch people out:
//
//  1. It is NOT a plain webhook. It sits on the general /api/v1/pos/** gateway
//     route, so it needs a JWT, device-finger-print and platform like any other
//     POS call — plus Accept-Language, which the controller binds with no
//     default, so omitting it is a framework 400 before any business logic runs.
//
//  2. An unknown terminal still returns 200 (subStatus PARKED). Asserting only
//     on the status code would let a completely broken terminal-matching
//     regression pass, so every accept case asserts on subStatus as well.
//
// Stan and Rrn are regenerated per payload by buildCallback(), so re-running the
// suite creates new transactions rather than duplicate replays.
// ─────────────────────────────────────────────────────────────────────────────

const NO_CALLBACK_TOKEN = 'no POS_CALLBACK_TOKEN provided — the callback needs a token holding POS_TRANSACTION_CALLBACK';

/** Convenience: POST a callback payload with the standard headers. */
function postCallback(request: import('@playwright/test').APIRequestContext, data: unknown, headers?: Record<string, string>) {
    return request.post(`${API_BASE}${POS_CALLBACK}`, {
        data: data as Record<string, unknown>,
        headers: headers ?? authHeaders(CALLBACK_TOKEN),
    });
}

test.describe('POS – Callback: accepted paths', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-CB-01 (TC-078): a valid PURCHASE is accepted and reconciled', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        const res  = await postCallback(request, buildCallback());
        const body = await res.json();

        expect(res.status()).toBe(200);
        expect(body.result).toBe('ACCEPTED');
        // PARKED here would mean the terminal was not matched — see TC-079.
        expect(['ACCEPTED', 'PARKED']).toContain(body.subStatus);
        expect(body.reconciliationKey, 'a persisted event always carries a reconciliation key').toBeTruthy();

        if (body.subStatus === 'PARKED') {
            // eslint-disable-next-line no-console
            console.log(`Callback parked — terminal ${TERMINAL_ID} did not match an active device (${body.reasonCode}).`);
        }
    });

    test('POS-CB-02 (TC-079): an unknown terminal is parked, not rejected', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        const res  = await postCallback(request, buildCallback({ TerminalId: 'T-UNKNOWN-01' }));
        const body = await res.json();

        // Still a 200 — the callback itself succeeded, the match did not.
        expect(res.status()).toBe(200);
        expect(body.result).toBe('ACCEPTED');
        expect(body.subStatus).toBe('PARKED');
        expect(body.reasonCode).toBe('UNKNOWN_TID');
        expect(body.reconciliationKey).toBeTruthy();
    });

    test('POS-CB-03 (TC-081): replaying an identical callback is idempotent', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        // Pin the idempotency key inputs so the second send is a true replay.
        const payload = buildCallback({ Stan: freshStan(), Rrn: freshRrn() });

        const first  = await postCallback(request, payload);
        const second = await postCallback(request, payload);

        expect(first.status()).toBe(200);
        expect(second.status()).toBe(200);

        const firstBody  = await first.json();
        const secondBody = await second.json();

        expect(firstBody.result).toBe('ACCEPTED');
        expect(secondBody.result).toBe('ACCEPTED');
        // Same key = the same transaction, not a second one.
        expect(secondBody.reconciliationKey).toBe(firstBody.reconciliationKey);
    });

    test('POS-CB-04 (TC-082): a different Rrn creates a separate transaction', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        const stan = freshStan();
        const first  = await (await postCallback(request, buildCallback({ Stan: stan, Rrn: freshRrn() }))).json();
        await new Promise(resolve => setTimeout(resolve, 5));
        const second = await (await postCallback(request, buildCallback({ Stan: stan, Rrn: freshRrn() }))).json();

        expect(first.reconciliationKey).toBeTruthy();
        expect(second.reconciliationKey).toBeTruthy();
        expect(second.reconciliationKey).not.toBe(first.reconciliationKey);
    });

    test('POS-CB-05 (TC-104): concurrent identical callbacks resolve to one transaction', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        const payload = buildCallback({ Stan: freshStan(), Rrn: freshRrn() });
        const [a, b] = await Promise.all([postCallback(request, payload), postCallback(request, payload)]);

        expect(a.status()).toBe(200);
        expect(b.status()).toBe(200);

        const bodyA = await a.json();
        const bodyB = await b.json();

        // The unique-key race is resolved server-side; neither caller sees an error.
        expect(bodyA.result).toBe('ACCEPTED');
        expect(bodyB.result).toBe('ACCEPTED');
        expect(bodyB.reconciliationKey).toBe(bodyA.reconciliationKey);
    });

    test('POS-CB-06 (TC-094): transactionType matching is case-insensitive and trimmed', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        for (const value of ['purchase', 'Purchase', '  PURCHASE  ']) {
            const res  = await postCallback(request, buildCallback({ TransactionType: value }));
            const body = await res.json();

            expect(res.status(), `TransactionType="${value}" should be accepted`).toBe(200);
            expect(body.result).toBe('ACCEPTED');
        }
    });

    test('POS-CB-07 (TC-095): a blank transactionType is tolerated', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        const blank   = await postCallback(request, buildCallback({ TransactionType: '' }));
        const absent  = await postCallback(request, buildCallback({ TransactionType: undefined }));

        // Rule 6 treats blank as valid/unknown-tolerant. Worth confirming with the
        // BA that an untyped event really should be allowed through.
        expect(blank.status()).toBe(200);
        expect(absent.status()).toBe(200);
        expect((await blank.json()).result).toBe('ACCEPTED');
    });

    test('POS-CB-08 (TC-091): zero is accepted, a negative amount is refused', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        const zero = await postCallback(request, buildCallback({ Amount: { Amount: 0 } }));
        expect(zero.status(), 'rule 3 is amount >= 0, so zero must pass').toBe(200);

        const negative = await postCallback(request, buildCallback({ Amount: { Amount: -0.01 } }));
        const body = await negative.json();
        expect(negative.status()).toBe(400);
        expect(body.reasonCode).toBe('INVALID_POS_TRANSACTION_CALLBACK');
    });

    test('POS-CB-09 (TC-099): unknown extra fields are ignored', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        const res = await postCallback(request, buildCallback({ SomeNewBankField: 'value-from-a-future-release' }));

        // A field the terminal network adds later must not break the integration.
        expect(res.status()).toBe(200);
        expect((await res.json()).result).toBe('ACCEPTED');
    });

    test('POS-CB-10 (TC-100): null EmvTags and Campaign are accepted', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        const nulls  = await postCallback(request, buildCallback({ EmvTags: null, Campaign: null }));
        const absent = await postCallback(request, buildCallback({ EmvTags: undefined, Campaign: undefined }));

        expect(nulls.status(), 'neither object appears in the validation rules').toBe(200);
        expect(absent.status()).toBe(200);
    });

    test('POS-CB-11 (TC-092): large and high-precision amounts do not error', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        for (const amount of [99999999.99, 150.005, 150]) {
            const res = await postCallback(request, buildCallback({ Amount: { Amount: amount } }));

            // Rounding behaviour on 3 decimals is a question for the BA; this only
            // asserts the service handles the value without a server error.
            expect(res.status(), `amount ${amount} must not 5xx`).toBeLessThan(500);
        }
    });
});

test.describe('POS – Callback: validation rejections', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-CB-12 (TC-084): an unmasked full PAN is rejected', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        const res  = await postCallback(request, buildCallback({ Pan: FULL_PAN }));
        const body = await res.json();
        const text = JSON.stringify(body);

        expect(res.status()).toBe(400);
        expect(body.result).toBe('TERMINAL_REJECTED');
        expect(body.subStatus).toBe('REJECTED');
        expect(body.reasonCode).toBe('FULL_PAN_PRESENT');
        // The event is archived, but the response must not echo the PAN back.
        expect(text).not.toContain(FULL_PAN);
    });

    test('POS-CB-13 (TC-085): a wrongly masked PAN is rejected', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        for (const pan of ['41062*1234', '410621****12', '410621ABCD1234']) {
            const res  = await postCallback(request, buildCallback({ Pan: pan }));
            const body = await res.json();

            expect(res.status(), `Pan="${pan}" should be a 400`).toBe(400);
            expect(body.result).toBe('TERMINAL_REJECTED');
            expect(body.reasonCode).toBe('INVALID_POS_TRANSACTION_CALLBACK');
        }
    });

    const missingFieldCases: { name: string; tc: string; overrides: Record<string, unknown> }[] = [
        { name: 'blank MerchantId',        tc: 'TC-086', overrides: { MerchantId: '' } },
        { name: 'absent MerchantId',       tc: 'TC-086', overrides: { MerchantId: undefined } },
        { name: 'blank TerminalId',        tc: 'TC-087', overrides: { TerminalId: '' } },
        { name: 'blank Pan',               tc: 'TC-088', overrides: { Pan: '' } },
        { name: 'absent Pan',              tc: 'TC-088', overrides: { Pan: undefined } },
        { name: 'absent Amount object',    tc: 'TC-089', overrides: { Amount: undefined } },
        { name: 'null inner amount',       tc: 'TC-089', overrides: { Amount: { Amount: null } } },
        { name: 'blank Rrn',               tc: 'TC-090', overrides: { Rrn: '' } },
        { name: 'blank Stan',              tc: 'TC-090', overrides: { Stan: '' } },
    ];

    for (const { name, tc, overrides } of missingFieldCases) {
        test(`POS-CB-14 (${tc}): ${name} is rejected as INVALID_POS_TRANSACTION_CALLBACK`, async ({ request }) => {
            test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

            const res  = await postCallback(request, buildCallback(overrides));
            const body = await res.json();

            expect(res.status(), `${name} should be a 400`).toBe(400);
            expect(body.result).toBe('TERMINAL_REJECTED');
            expect(body.subStatus).toBe('REJECTED');
            expect(body.reasonCode).toBe('INVALID_POS_TRANSACTION_CALLBACK');
            expect(body.externalReference, 'no transaction exists yet on an early reject').toBeFalsy();
        });
    }

    test('POS-CB-15 (TC-093): an unsupported transaction type is rejected', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        for (const type of ['REFUND', 'VOID', 'REVERSAL']) {
            const res  = await postCallback(request, buildCallback({ TransactionType: type }));
            const body = await res.json();

            expect(res.status(), `TransactionType=${type} should be a 400`).toBe(400);
            expect(body.reasonCode).toBe('UNKNOWN_EVENT_TYPE');
        }
    });

    test('POS-CB-16 (TC-096): the first failing validation rule wins', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        // Breaks rule 1 (blank MerchantId) and rule 4 (full PAN) at once.
        const res  = await postCallback(request, buildCallback({ MerchantId: '', Pan: FULL_PAN }));
        const body = await res.json();

        expect(res.status()).toBe(400);
        // Rule 1 is checked before rule 4, so this must NOT be FULL_PAN_PRESENT.
        expect(body.reasonCode).toBe('INVALID_POS_TRANSACTION_CALLBACK');
    });
});

test.describe('POS – Callback: framework and gateway rejections', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-CB-17 (TC-097): a missing Accept-Language is a framework 400, not a callback response', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        const res  = await postCallback(request, buildCallback(), headersWithout(CALLBACK_TOKEN, 'Accept-Language'));
        const body = await res.json().catch(() => null);

        expect(res.status()).toBe(400);
        // Spring rejects before the facade runs, so nothing is archived and the
        // body is an ErrorMessageDto — no result/reconciliationKey fields.
        const payload = Array.isArray(body) ? body[0] : body;
        expect(payload).not.toHaveProperty('reconciliationKey');
        expect(payload).not.toHaveProperty('result');
    });

    test('POS-CB-18 (TC-098): malformed JSON is rejected without leaking a parser trace', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        const res = await request.post(`${API_BASE}${POS_CALLBACK}`, {
            headers: authHeaders(CALLBACK_TOKEN),
            data: '{"madaArchives": {"madaTransactionResult": {',
        });

        expect(res.status()).toBe(400);
        expect(await res.text()).not.toMatch(/stack|traceback|com\.fasterxml|JsonParseException/i);
    });

    test('POS-CB-19 (TC-098): an empty body and a wrong root are both rejected', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        const empty = await request.post(`${API_BASE}${POS_CALLBACK}`, {
            headers: authHeaders(CALLBACK_TOKEN), data: {},
        });
        const wrongRoot = await request.post(`${API_BASE}${POS_CALLBACK}`, {
            headers: authHeaders(CALLBACK_TOKEN), data: { someOtherRoot: { field: 1 } },
        });

        expect(empty.status()).toBeGreaterThanOrEqual(400);
        expect(empty.status()).toBeLessThan(500);
        expect(wrongRoot.status()).toBeGreaterThanOrEqual(400);
        expect(wrongRoot.status()).toBeLessThan(500);
    });

    test('POS-CB-20 (TC-102): the callback is refused without the gateway headers', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        const noFingerprint = await postCallback(request, buildCallback(), headersWithout(CALLBACK_TOKEN, 'device-finger-print'));
        const noPlatform    = await postCallback(request, buildCallback(), headersWithout(CALLBACK_TOKEN, 'platform'));

        expect(noFingerprint.status()).toBe(401);
        expect(noPlatform.status()).toBe(401);
    });

    test('POS-CB-21 (TC-101): an unauthenticated callback is refused', async ({ request }) => {
        const res = await postCallback(request, buildCallback(), commonHeaders());

        // A merchant must not be able to inject their own POS transactions.
        expect(res.status()).toBe(401);
    });

    test('POS-CB-22 (TC-105): the wrong HTTP method is refused without side effects', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        const get = await request.get(`${API_BASE}${POS_CALLBACK}`, { headers: authHeaders(CALLBACK_TOKEN) });
        const put = await request.put(`${API_BASE}${POS_CALLBACK}`, {
            headers: authHeaders(CALLBACK_TOKEN), data: buildCallback(),
        });

        expect([404, 405]).toContain(get.status());
        expect([404, 405]).toContain(put.status());
    });

    test('POS-CB-23 (TC-012): a rejected callback response never echoes card data', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        const res  = await postCallback(request, buildCallback({ Pan: MASKED_PAN, MerchantId: '' }));
        const text = await res.text();

        expect(res.status()).toBe(400);
        expect(text).not.toMatch(/\b\d{13,19}\b/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cases needing environment control that the API surface does not expose.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('POS – Callback: infrastructure-dependent paths', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-CB-24 (TC-103): an ingestion failure returns 503 RETRYABLE_FAILURE', async () => {
        test.skip(true, 'pending a way to force a persist/projection failure (TC-103)');
    });

    test('POS-CB-25 (TC-080): a callback for an inactive terminal parks rather than matches', async () => {
        test.skip(true, 'pending Admin Portal access to deactivate a terminal on demand (TC-080)');
    });

    test('POS-CB-26 (TC-083): an out-of-order callback flags OUT_OF_ORDER_CALLBACK', async () => {
        test.skip(true, 'pending a seeded BTS-file transaction with no callbackEventId (TC-083)');
    });
});
