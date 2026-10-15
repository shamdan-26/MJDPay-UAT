import { test, expect } from '@playwright/test';
import {
    API_BASE, ADMIN_ACH, ADMIN_ACH_RELEASE,
    ADMIN_TOKEN, ALLOW_ACH_MUTATIONS, ACH_MUTATION_GUARD,
    AWAITING_BATCH_REF, RELEASED_BATCH_REF,
    ACH_REASON_MAX_LENGTH, ACH_RELEASE_RESULTS,
    authHeaders, isSpringPage, isClientError, firstError,
} from '../PosTransactionsHelper';

// ─────────────────────────────────────────────────────────────────────────────
// POS – ACH batch release semantics (POS-ACHB-01..POS-ACHB-05)
//
// EMI-6060 (a mixed batch answers MALFORMED_REQUEST_BODY instead of processing
// each ref independently), EMI-6062 (a reason over 255 chars answers a bare
// INVALID_POS_ACH_ACTION_REQUEST with no usable message), EMI-6036 (beneficiary
// IBAN and name must be populated on AchTransfer rows), EMI-6008 (ACH records
// settlement + POS operations APIs, re-opened).
//
// EMI-6060 defines the exact contract a mixed release must honour, and it is
// worth restating because it is the whole point of this file:
//
//   batchRefs = [awaiting, successful, unknown, rejected]
//   -> 200 OK, total=4, items.length=4
//   -> results RELEASED, ALREADY_RELEASED, NOT_FOUND, INVALID_STATUS
//   -> succeeded=1, failed=0, skipped=3, and succeeded+failed+skipped == total
//   -> one bad ref does not abort the others
//
// SAFETY: this file inherits PosAchTransfers.spec.ts's guard. Release instructs
// the bank to move money, so anything that could actually release is gated
// behind POS_ACH_ALLOW_MUTATIONS=true plus an explicit batch ref. The
// validation cases (over-long reason, empty list, unknown-ref-only) cannot
// change any transfer's state and run freely.
// ─────────────────────────────────────────────────────────────────────────────

const NO_ADMIN = 'no POS_ADMIN_TOKEN provided';
const NO_BATCHES = 'set POS_ACH_AWAITING_BATCH_REF and POS_ACH_RELEASED_BATCH_REF to exercise a mixed batch';

const UNKNOWN_BATCH_REF = 'BATCH-DOES-NOT-EXIST-0000';

interface ReleaseItem { batchRef?: string; reconBatchRefNum?: string; result: string }
interface ReleaseResponse {
    total: number;
    succeeded: number;
    failed: number;
    skipped: number;
    items: ReleaseItem[];
}

test.describe('POS ACH – Over-Long Reason (POS-ACHB-01, EMI-6062)', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-ACHB-01: a reason longer than 255 characters is rejected with a readable message', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const res = await request.post(`${API_BASE}${ADMIN_ACH_RELEASE}`, {
            headers: authHeaders(ADMIN_TOKEN),
            data: { batchRefs: [UNKNOWN_BATCH_REF], reason: 'x'.repeat(ACH_REASON_MAX_LENGTH + 1) },
        });

        expect(isClientError(res.status()), `expected a 4xx, got ${res.status()}`).toBe(true);

        const error = firstError(await res.json().catch(() => null));
        const text = JSON.stringify(error ?? {});
        // EMI-6062: the caller got only the code INVALID_POS_ACH_ACTION_REQUEST
        // with nothing saying the reason was too long or what the cap is.
        expect(text, 'the rejection names no cause and no field').toMatch(/reason|255|length|character/i);
    });

    test('POS-ACHB-01b: a reason of exactly 255 characters is accepted by validation', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const res = await request.post(`${API_BASE}${ADMIN_ACH_RELEASE}`, {
            headers: authHeaders(ADMIN_TOKEN),
            data: { batchRefs: [UNKNOWN_BATCH_REF], reason: 'x'.repeat(ACH_REASON_MAX_LENGTH) },
        });

        // The ref is unknown, so this can never release anything — the point is
        // that the boundary length itself is not what gets rejected.
        const error = JSON.stringify(firstError(await res.json().catch(() => null)) ?? {});
        expect(error, 'a 255-character reason was rejected as invalid').not.toContain('INVALID_POS_ACH_ACTION_REQUEST');
    });
});

test.describe('POS ACH – Mixed Batch Release (POS-ACHB-02, EMI-6060)', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-ACHB-02: a mixed batch is processed per-ref, not rejected wholesale', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);
        test.skip(!ALLOW_ACH_MUTATIONS, ACH_MUTATION_GUARD);
        test.skip(!AWAITING_BATCH_REF || !RELEASED_BATCH_REF, NO_BATCHES);

        const batchRefs = [AWAITING_BATCH_REF, RELEASED_BATCH_REF, UNKNOWN_BATCH_REF];

        const res = await request.post(`${API_BASE}${ADMIN_ACH_RELEASE}`, {
            headers: authHeaders(ADMIN_TOKEN),
            data: { batchRefs, reason: 'QA mixed-batch release check (EMI-6060)' },
        });

        expect(res.status(), 'a mixed batch was rejected outright').toBe(200);

        const body = (await res.json()) as ReleaseResponse;
        expect(body.total).toBe(batchRefs.length);
        expect(body.items).toHaveLength(batchRefs.length);
        // One bad ref must not abort the others — the core EMI-6060 assertion.
        expect(body.succeeded + body.failed + body.skipped).toBe(body.total);
    });

    test('POS-ACHB-02b: an unknown ref alone comes back NOT_FOUND inside a 200, not MALFORMED_REQUEST_BODY', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        // Safe without the mutation guard: the ref does not exist, so nothing
        // can be released.
        const res = await request.post(`${API_BASE}${ADMIN_ACH_RELEASE}`, {
            headers: authHeaders(ADMIN_TOKEN),
            data: { batchRefs: [UNKNOWN_BATCH_REF], reason: 'QA unknown-ref check (EMI-6060)' },
        });

        const text = await res.text();
        expect(text, 'a well-formed body was reported as MALFORMED_REQUEST_BODY').not.toContain('MALFORMED_REQUEST_BODY');

        if (res.status() === 200) {
            const body = JSON.parse(text) as ReleaseResponse;
            expect(body.items[0]?.result).toBe('NOT_FOUND');
            expect(body.skipped).toBe(1);
            expect(body.succeeded).toBe(0);
        }
    });

    test('POS-ACHB-02c: every per-item result is one of the four documented codes', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const res = await request.post(`${API_BASE}${ADMIN_ACH_RELEASE}`, {
            headers: authHeaders(ADMIN_TOKEN),
            data: { batchRefs: [UNKNOWN_BATCH_REF], reason: 'QA result-code check (EMI-6060)' },
        });
        test.skip(res.status() !== 200, `release returned ${res.status()} — POS-ACHB-02b covers the failure case`);

        const body = (await res.json()) as ReleaseResponse;
        for (const item of body.items) {
            expect(ACH_RELEASE_RESULTS, `unexpected result code "${item.result}"`).toContain(item.result);
        }
    });

    test('POS-ACHB-02d: an empty batchRefs list is a validation error, not a 500', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const res = await request.post(`${API_BASE}${ADMIN_ACH_RELEASE}`, {
            headers: authHeaders(ADMIN_TOKEN),
            data: { batchRefs: [], reason: 'QA empty-list check' },
        });

        expect(res.status()).not.toBe(500);
        expect(isClientError(res.status()), `expected a 4xx, got ${res.status()}`).toBe(true);
    });
});

test.describe('POS ACH – Beneficiary Details On Transfers (POS-ACHB-03, EMI-6036)', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-ACHB-03: every AchTransfer row carries a beneficiary IBAN and name', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const res = await request.get(`${API_BASE}${ADMIN_ACH}?page=0&size=20`, { headers: authHeaders(ADMIN_TOKEN) });
        expect(res.status()).toBe(200);

        const body = await res.json();
        expect(isSpringPage(body)).toBe(true);
        test.skip(body.content.length === 0, 'no ACH transfers to inspect');

        for (const row of body.content as Record<string, unknown>[]) {
            expect(row['beneficiaryAccountIban'], 'ACH transfer has no beneficiary IBAN').toBeTruthy();
            expect(row['beneficiaryName'], 'ACH transfer has no beneficiary name').toBeTruthy();
        }
    });

    test('POS-ACHB-03b: the beneficiary IBAN is a well-formed Saudi IBAN', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const body = await (await request.get(`${API_BASE}${ADMIN_ACH}?page=0&size=20`, { headers: authHeaders(ADMIN_TOKEN) })).json();
        const ibans = (body.content as { beneficiaryAccountIban?: string }[])
            .map(r => r.beneficiaryAccountIban)
            .filter((v): v is string => typeof v === 'string' && v.length > 0);
        test.skip(ibans.length === 0, 'no populated IBANs to validate');

        for (const iban of ibans) {
            expect(iban, `"${iban}" is not a 24-character SA IBAN`).toMatch(/^SA\d{22}$/);
        }
    });
});

test.describe('POS ACH – Records Listing Contract (POS-ACHB-04, EMI-6008)', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-ACHB-04: the ACH records listing exposes the fields the Admin screen needs', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const res = await request.get(`${API_BASE}${ADMIN_ACH}?page=0&size=20`, { headers: authHeaders(ADMIN_TOKEN) });
        const body = await res.json();
        test.skip(body.content.length === 0, 'no ACH transfers to inspect');

        // walletCode is EMI-6064's missing column; the date fields are the ones
        // EMI-6065 asks to move into a details view.
        for (const field of ['reconBatchRefNum', 'walletCode', 'terminalId', 'status', 'allowedActions', 'matchedAt']) {
            expect(body.content[0], `ACH record is missing ${field}`).toHaveProperty(field);
        }
    });

    test('POS-ACHB-04b: allowedActions only ever contains actions the backend supports', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const body = await (await request.get(`${API_BASE}${ADMIN_ACH}?page=0&size=20`, { headers: authHeaders(ADMIN_TOKEN) })).json();
        test.skip(body.content.length === 0, 'no ACH transfers to inspect');

        for (const row of body.content as { allowedActions?: string[] }[]) {
            for (const action of row.allowedActions ?? []) {
                expect(['RELEASE', 'REJECT'], `unexpected allowed action "${action}"`).toContain(action);
            }
        }
    });
});
