import { test, expect } from '@playwright/test';
import {
    API_BASE, POS_CALLBACK, POS_TRANSACTIONS, TERMINAL_ID,
    CALLBACK_TOKEN, FULL_PAN, MASKED_PAN, MASKED_PAN_PATTERN,
    SETTLEMENT_PENDING_STATUS,
    authHeaders, commonHeaders, buildCallback, buildCallbackXml, callbackXmlHeaders,
    freshStan, freshRrn, idempotencyInputs, isFullPan, isClientError, firstError,
    getBusinessToken, hasPosAccess,
} from '../PosTransactionsHelper';

// ─────────────────────────────────────────────────────────────────────────────
// POS – Terminal callback defects (POS-CBD-01..POS-CBD-08)
//
// The EMI-5978..5984 / EMI-6045 / EMI-6046 sweep. PosTransactionCallback.spec.ts
// already covers the documented happy path and field validation (TC-078..109);
// this file covers what the callback got WRONG once it was exercised for real:
//
//   EMI-5978  a rejected callback is stored with an empty failed_reason
//   EMI-5979  the full unmasked PAN is persisted in pos_callback_entries
//   EMI-5980  malformed XML / an empty body answers 500 instead of a 4xx
//   EMI-5981  Content-Type is not validated, Accept-Language is — inconsistent
//   EMI-5982  the booked ledger row stays PENDING instead of AWAITING_SETTLEMENT
//   EMI-5984  a failed callback is never written to the base transaction table
//   EMI-6045  CardExpiryDate "2902" (YYMM) is stored as the year 2902
//   EMI-6046  the idempotency key is built from TID+RRN only, not +STAN+Date
//
// ── Observability limits, stated up front ────────────────────────────────
// Four of these tickets assert on DATABASE state (`pos_callback_entries`,
// `pos_callback_event`, the base transaction table). This suite has no DB
// connection — the repo dropped direct MongoDB access in 7e7b558 and never had
// a Postgres one. Each such case is therefore written against the closest
// black-box proxy the API does expose, and says so in a comment. Where no
// proxy exists at all the test is `test.skip(true, ...)` with the intended
// assertion left in place, the same convention BankTransferCommission.spec.ts
// and Reconciliation/ use for tooling-gated coverage.
//
// The callback endpoint needs POS_TRANSACTION_CALLBACK, which the business
// sign-in flow does not grant — so POS_CALLBACK_TOKEN gates the whole file.
// ─────────────────────────────────────────────────────────────────────────────

const NO_CALLBACK_TOKEN = 'no POS_CALLBACK_TOKEN provided — the callback privilege cannot be minted by the suite';
const NO_DB = 'asserts on database state; this suite has no DB connection — verify manually or expose a read API';

let readToken = '';
let canRead = false;

test.beforeAll(async ({ request }) => {
    readToken = await getBusinessToken(request);
    canRead = await hasPosAccess(request, readToken, POS_TRANSACTIONS);
});

test.describe('POS callback – Malformed And Empty Bodies (POS-CBD-01, EMI-5980)', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-CBD-01: malformed XML is rejected with a 4xx, not a generic 500', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        const res = await request.post(`${API_BASE}${POS_CALLBACK}`, {
            headers: callbackXmlHeaders(CALLBACK_TOKEN),
            data: '<madaArchives><madaTransactionResult><TerminalID>UNCLOSED',
        });

        expect(res.status(), 'malformed XML produced a 500').not.toBe(500);
        expect(isClientError(res.status()), `expected a 4xx, got ${res.status()}`).toBe(true);
    });

    test('POS-CBD-01b: an empty body is rejected with a 4xx and a meaningful code', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        const res = await request.post(`${API_BASE}${POS_CALLBACK}`, {
            headers: callbackXmlHeaders(CALLBACK_TOKEN),
            data: '',
        });

        expect(res.status()).not.toBe(500);
        expect(isClientError(res.status())).toBe(true);

        const error = firstError(await res.json().catch(() => null));
        const text = JSON.stringify(error);
        // EMI-5980: pre-fix the payload was a raw translation-service URL and
        // the words "Internal Server Error", with no messageCode at all.
        expect(text).not.toContain('Internal Server Error');
        expect(text).not.toContain('/errors/en/');
    });

    test('POS-CBD-01c: a rejected malformed callback persists no transaction', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);
        test.skip(!canRead, 'cannot read back POS transactions to confirm nothing was persisted');

        const before = await (await request.get(`${API_BASE}${POS_TRANSACTIONS}?page=0&size=1`, { headers: authHeaders(readToken) })).json();

        await request.post(`${API_BASE}${POS_CALLBACK}`, {
            headers: callbackXmlHeaders(CALLBACK_TOKEN),
            data: '<madaArchives><broken',
        });

        const after = await (await request.get(`${API_BASE}${POS_TRANSACTIONS}?page=0&size=1`, { headers: authHeaders(readToken) })).json();

        expect(after.totalElements, 'a malformed callback created a transaction').toBe(before.totalElements);
    });
});

test.describe('POS callback – Header Validation Consistency (POS-CBD-02, EMI-5981)', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-CBD-02: an unexpected Content-Type is rejected, the same way a bad Accept-Language is', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        const wrongContentType = await request.post(`${API_BASE}${POS_CALLBACK}`, {
            headers: callbackXmlHeaders(CALLBACK_TOKEN, { 'Content-Type': 'text/plain' }),
            data: buildCallbackXml(),
        });
        const wrongLanguage = await request.post(`${API_BASE}${POS_CALLBACK}`, {
            headers: callbackXmlHeaders(CALLBACK_TOKEN, { 'Accept-Language': 'zz_ZZ' }),
            data: buildCallbackXml(),
        });

        // EMI-5981 is specifically about INCONSISTENCY: Accept-Language raised
        // an exception while Content-Type sailed through. Both must land on the
        // same side of the 4xx line, whichever side the team settles on.
        const contentTypeRejected = isClientError(wrongContentType.status());
        const languageRejected    = isClientError(wrongLanguage.status());

        expect(contentTypeRejected,
            `Content-Type rejected=${contentTypeRejected} but Accept-Language rejected=${languageRejected} — header validation is inconsistent`)
            .toBe(languageRejected);
    });

    test('POS-CBD-02b: neither invalid header produces a 500', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        for (const headers of [
            callbackXmlHeaders(CALLBACK_TOKEN, { 'Content-Type': 'text/plain' }),
            callbackXmlHeaders(CALLBACK_TOKEN, { 'Accept-Language': 'zz_ZZ' }),
        ]) {
            const res = await request.post(`${API_BASE}${POS_CALLBACK}`, { headers, data: buildCallbackXml() });
            expect(res.status(), `header rejection produced a 500: ${JSON.stringify(headers)}`).not.toBe(500);
        }
    });
});

test.describe('POS callback – PAN Is Never Stored Unmasked (POS-CBD-03, EMI-5979)', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-CBD-03: a callback carrying a full PAN is rejected or stored masked, never echoed back in full', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        const res = await request.post(`${API_BASE}${POS_CALLBACK}`, {
            headers: callbackXmlHeaders(CALLBACK_TOKEN),
            data: buildCallbackXml({ pan: FULL_PAN }),
        });

        // Either outcome satisfies the AC: reject the unmasked PAN outright, or
        // accept it and mask before persisting. What must never happen is the
        // full PAN coming back out.
        const body = await res.text();
        expect(body, 'the response echoed the full unmasked PAN').not.toContain(FULL_PAN);
    });

    test('POS-CBD-03b: no readable POS transaction exposes a full PAN', async ({ request }) => {
        test.skip(!canRead, 'cannot read back POS transactions to inspect stored PANs');

        const res = await request.get(`${API_BASE}${POS_TRANSACTIONS}?page=0&size=100`, { headers: authHeaders(readToken) });
        const body = await res.json();
        test.skip(body.content.length === 0, 'no transactions to inspect');

        for (const row of body.content as Record<string, unknown>[]) {
            for (const [field, value] of Object.entries(row)) {
                expect(isFullPan(value), `field "${field}" looks like a full unmasked PAN`).toBe(false);
            }
        }
    });

    test('POS-CBD-03c: the masked PAN that IS returned matches the documented shape', async ({ request }) => {
        test.skip(!canRead, 'cannot read back POS transactions');

        const body = await (await request.get(`${API_BASE}${POS_TRANSACTIONS}?page=0&size=20`, { headers: authHeaders(readToken) })).json();
        const withPan = (body.content as { maskedPan?: string }[]).filter(r => typeof r.maskedPan === 'string');
        test.skip(withPan.length === 0, 'no maskedPan field on the returned rows');

        for (const row of withPan) {
            expect(row.maskedPan, `"${row.maskedPan}" is not a valid masked PAN`).toMatch(MASKED_PAN_PATTERN);
        }
    });
});

test.describe('POS callback – Card Expiry Parsing (POS-CBD-04, EMI-6045)', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-CBD-04: a YYMM CardExpiryDate is not read as a four-digit year', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        // "2902" is YYMM — February 2029. EMI-6045: it was stored as
        // 2902-01-01, i.e. the year 2902.
        const res = await request.post(`${API_BASE}${POS_CALLBACK}`, {
            headers: callbackXmlHeaders(CALLBACK_TOKEN),
            data: buildCallbackXml({ cardExpiryDate: '2902' }),
        });

        const body = await res.text();
        expect(body, 'the response echoes the year 2902 — YYMM was parsed as YYYY').not.toContain('2902-01-01');
    });

    test('POS-CBD-04b: the stored expiry date is verified in pos_callback_event', async () => {
        test.skip(true, NO_DB);

        // Intended assertion, once a DB connection or a read API exists:
        //   SELECT card_expiry_date FROM pos_callback_event WHERE rrn = <rrn>
        //   -> 2029-02-28 (or the last day of Feb 2029), never 2902-01-01.
        // EMI-6045 also notes that an explicit "12/29/2026" IS parsed correctly,
        // so the defect is specifically the two-digit-year branch.
    });
});

test.describe('POS callback – Idempotency Key Composition (POS-CBD-05, EMI-6046)', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-CBD-05: two callbacks differing only in STAN are two distinct transactions', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);
        test.skip(!canRead, 'cannot read back POS transactions to count what was created');

        const sharedRrn = freshRrn();
        const before = await (await request.get(`${API_BASE}${POS_TRANSACTIONS}?page=0&size=1`, { headers: authHeaders(readToken) })).json();

        // Same TID + RRN, different STAN. Under the pre-fix TID+RRN-only key
        // the second call was swallowed as a duplicate replay.
        for (const stan of [`STAN${freshStan()}`, `STAN${freshStan()}`]) {
            await request.post(`${API_BASE}${POS_CALLBACK}`, {
                headers: callbackXmlHeaders(CALLBACK_TOKEN),
                data: buildCallbackXml({ rrn: sharedRrn, stan }),
            });
        }

        const after = await (await request.get(`${API_BASE}${POS_TRANSACTIONS}?page=0&size=1`, { headers: authHeaders(readToken) })).json();

        expect(after.totalElements - before.totalElements,
            'TID+RRN+STAN+Date should make these two distinct transactions').toBe(2);
    });

    test('POS-CBD-05b: an exact replay (same TID, RRN, STAN and date) is still deduplicated', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);
        test.skip(!canRead, 'cannot read back POS transactions to count what was created');

        const rrn = freshRrn();
        const stan = `STAN${freshStan()}`;
        const payload = buildCallbackXml({ rrn, stan });

        const before = await (await request.get(`${API_BASE}${POS_TRANSACTIONS}?page=0&size=1`, { headers: authHeaders(readToken) })).json();
        await request.post(`${API_BASE}${POS_CALLBACK}`, { headers: callbackXmlHeaders(CALLBACK_TOKEN), data: payload });
        await request.post(`${API_BASE}${POS_CALLBACK}`, { headers: callbackXmlHeaders(CALLBACK_TOKEN), data: payload });
        const after = await (await request.get(`${API_BASE}${POS_TRANSACTIONS}?page=0&size=1`, { headers: authHeaders(readToken) })).json();

        expect(after.totalElements - before.totalElements, 'an exact replay was booked twice').toBe(1);
    });

    test('POS-CBD-05c: the key inputs are documented so a DB check can reproduce them', () => {
        // Not a gateway call — this pins the composition EMI-6046 specifies so
        // the expectation is version-controlled rather than living in the
        // ticket. TID + RRN alone is the fallback, never the primary key.
        const primary  = idempotencyInputs(TERMINAL_ID, '528505000057', 'STAN00057', '2026-08-28');
        const fallback = [TERMINAL_ID, '528505000057'].join(':');

        expect(primary.split(':')).toHaveLength(4);
        expect(primary).not.toBe(fallback);
    });
});

test.describe('POS callback – Failed Entries Carry A Reason (POS-CBD-06, EMI-5978 / EMI-5984)', () => {
    test.describe.configure({ mode: 'serial' });

    const REJECTED_CASES: { label: string; overrides: Parameters<typeof buildCallbackXml>[0] }[] = [
        { label: 'negative amount',   overrides: { amount: '-0.01' } },
        { label: 'zero amount',       overrides: { amount: '0.00' } },
        { label: 'unknown TerminalID', overrides: { terminalId: 'T0000000' } },
        { label: 'amount over the cap', overrides: { amount: '10000000.00' } },
    ];

    for (const { label, overrides } of REJECTED_CASES) {
        test(`POS-CBD-06 (${label}): the callback is rejected with a client error and a stated reason`, async ({ request }) => {
            test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

            const res = await request.post(`${API_BASE}${POS_CALLBACK}`, {
                headers: callbackXmlHeaders(CALLBACK_TOKEN),
                data: buildCallbackXml(overrides),
            });

            expect(isClientError(res.status()), `${label} produced ${res.status()}, expected a 4xx`).toBe(true);

            // The API-visible proxy for EMI-5978's `failed_reason` column: the
            // rejection response itself must name why, not just say "failed".
            const error = firstError(await res.json().catch(() => null));
            const text = JSON.stringify(error ?? {});
            expect(text.length, `${label} was rejected with an empty error body`).toBeGreaterThan(2);
            expect(text, `${label} rejection carries no messageCode`).toMatch(/messageCode|message/i);
        });
    }

    test('POS-CBD-06b: every failed row in pos_callback_entries carries a failed_reason', async () => {
        test.skip(true, NO_DB);

        // Intended assertion (EMI-5978), once DB or a read API is available:
        //   SELECT failed_reason FROM pos_callback_entries WHERE status = 'FAILED'
        //   -> no NULL and no empty string, and the reason matches the
        //      validation that actually rejected the callback.
    });

    test('POS-CBD-06c: a failed callback is also written to the base transaction table', async () => {
        test.skip(true, NO_DB);

        // Intended assertion (EMI-5984), once DB or a read API is available:
        //   a rejected callback (negative amount / over-cap amount / unknown
        //   TID) creates a row in pos_callback_entries AND a corresponding row
        //   in the base transaction table, so failures are reconcilable.
    });
});

test.describe('POS callback – Booked Ledger Status (POS-CBD-07, EMI-5982)', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-CBD-07: a valid callback books a transaction that leaves PENDING', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);
        test.skip(!canRead, 'cannot read back POS transactions to inspect the booked status');

        const rrn = freshRrn();
        const posted = await request.post(`${API_BASE}${POS_CALLBACK}`, {
            headers: callbackXmlHeaders(CALLBACK_TOKEN),
            data: buildCallbackXml({ rrn }),
        });
        test.skip(!posted.ok(), `callback was not accepted (${posted.status()}) — nothing booked to inspect`);

        const body = await (await request.get(`${API_BASE}${POS_TRANSACTIONS}?page=0&size=20`, { headers: authHeaders(readToken) })).json();
        const booked = (body.content as { rrn?: string; processingStatus?: string; status?: string }[]).find(r => r.rrn === rrn);
        test.skip(!booked, 'the booked transaction is not visible on the merchant transactions endpoint');

        const status = booked!.processingStatus ?? booked!.status;
        // EMI-5982: it stayed at PENDING and never reached AWAITING_SETTLEMENT.
        expect(status, `booked transaction is still ${status}`).not.toBe('PENDING');
    });

    test('POS-CBD-07b: the ledger row reaches AWAITING_SETTLEMENT with a populated reasons field', async () => {
        test.skip(true, NO_DB);

        // Intended assertion (EMI-5982), once DB or a ledger read API exposes
        // the base transaction row:
        //   status  -> AWAITING_SETTLEMENT (fees frozen, merchant wallet
        //              Pending Credit + net, commission/VAT pending entries)
        //   reasons -> non-empty, not the observed []
        expect(SETTLEMENT_PENDING_STATUS).toBe('AWAITING_SETTLEMENT');
    });
});

test.describe('POS callback – Unauthenticated Callback (POS-CBD-08, EMI-5980)', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-CBD-08: an unauthorised callback is refused with 401/403, not a 500', async ({ request }) => {
        const res = await request.post(`${API_BASE}${POS_CALLBACK}`, {
            headers: { 'Content-Type': 'application/xml', 'Accept-Language': 'en_uk' },
            data: buildCallbackXml(),
        });

        // EMI-5980's third case: unauthorised access also came back as a 500
        // wrapping a translation-service URL.
        expect(res.status(), 'unauthorised callback produced a 500').not.toBe(500);
        expect([401, 403]).toContain(res.status());
    });
});

test.describe('POS callback – JSON Shape Still Accepted (POS-CBD-09, regression)', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-CBD-09: the JSON payload used by the TC-078..109 suite is unaffected by the XML fixes', async ({ request }) => {
        test.skip(!CALLBACK_TOKEN, NO_CALLBACK_TOKEN);

        // Guards against the EMI-5980/5981 header work breaking the JSON path
        // PosTransactionCallback.spec.ts is written against.
        const res = await request.post(`${API_BASE}${POS_CALLBACK}`, {
            headers: authHeaders(CALLBACK_TOKEN),
            data: buildCallback({ Pan: MASKED_PAN }),
        });

        expect(res.status(), 'the JSON callback shape started failing').not.toBe(500);
    });
});
