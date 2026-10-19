import { test, expect } from '@playwright/test';
import {
    API_BASE, ADMIN_ACH, ADMIN_ACH_RELEASE, ADMIN_ACH_REJECT,
    ADMIN_TOKEN, ADMIN_READONLY_TOKEN, ACH_STATUSES, TERMINAL_ID,
    ALLOW_ACH_MUTATIONS, ACH_MUTATION_GUARD, AWAITING_BATCH_REF, RELEASED_BATCH_REF,
    authHeaders, getBusinessToken, isSpringPage,
} from '../helpers/PosTransactionsHelper.ts';

// ─────────────────────────────────────────────────────────────────────────────
// POS – ACH Transfers  (admin settlement of aggregated POS ledger batches)
//
//   GET  /api/v1/admin/pos/ach-transfers          ADMIN_GET_POS_ACH_TRANSFERS
//   POST /api/v1/admin/pos/ach-transfers/release  ADMIN_RELEASE_POS_ACH_TRANSFERS
//   POST /api/v1/admin/pos/ach-transfers/reject   ADMIN_REJECT_POS_ACH_TRANSFERS
//
// Automates TC-050..TC-077.
//
// SAFETY: release instructs the bank to move money and reject permanently kills
// a settlement batch. Both are therefore gated behind
// POS_ACH_ALLOW_MUTATIONS=true and an explicit POS_ACH_AWAITING_BATCH_REF, so a
// routine `npm run test:pos` can never pay or cancel anything by accident.
// Read-only cases (validation rejects, unknown refs, privilege checks) run
// freely — they cannot change any transfer's state.
// ─────────────────────────────────────────────────────────────────────────────

const NO_ADMIN = 'no POS_ADMIN_TOKEN provided';
const MAX_BATCH_REFS = 100;
const MAX_REASON_LENGTH = 255;

test.describe('POS – ACH transfers: list', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-ACH-01 (TC-050): returns a page of AchTransferDto rows', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const res = await request.get(`${API_BASE}${ADMIN_ACH}?page=0&size=20`, { headers: authHeaders(ADMIN_TOKEN) });

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(isSpringPage(body)).toBe(true);

        if (body.content.length > 0) {
            for (const field of ['id', 'reconBatchRefNum', 'walletCode', 'terminalId', 'memberCount',
                'transferAmount', 'beneficiaryAccountIban', 'status', 'allowedActions']) {
                expect(body.content[0], `transfer should carry ${field}`).toHaveProperty(field);
            }
        }
    });

    test('POS-ACH-02 (TC-051): allowedActions is populated only for AWAITING_APPROVAL', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const res  = await request.get(`${API_BASE}${ADMIN_ACH}?size=100`, { headers: authHeaders(ADMIN_TOKEN) });
        const body = await res.json();
        test.skip(body.content.length === 0, 'no ACH transfers seeded');

        for (const transfer of body.content) {
            if (transfer.status === 'AWAITING_APPROVAL') {
                expect(transfer.allowedActions).toEqual(expect.arrayContaining(['RELEASE', 'REJECT']));
            } else {
                expect(transfer.allowedActions ?? [], `${transfer.status} must expose no actions`).toEqual([]);
            }
        }
    });

    test('POS-ACH-03 (TC-052): every AchTransferStatus is an accepted filter value', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        for (const status of ACH_STATUSES) {
            const res = await request.get(`${API_BASE}${ADMIN_ACH}?size=50&status=${status}`, {
                headers: authHeaders(ADMIN_TOKEN),
            });

            expect(res.status(), `status=${status} should be accepted`).toBe(200);
            for (const row of (await res.json()).content) {
                expect(row.status).toBe(status);
            }
        }
    });

    test('POS-ACH-04 (TC-053): batchRef and terminalId filters narrow correctly', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const seed = await (await request.get(`${API_BASE}${ADMIN_ACH}?size=1`, { headers: authHeaders(ADMIN_TOKEN) })).json();
        test.skip(seed.content.length === 0, 'no ACH transfers seeded');

        const batchRef = seed.content[0].reconBatchRefNum;
        const byRef = await request.get(`${API_BASE}${ADMIN_ACH}?batchRef=${encodeURIComponent(batchRef)}`, {
            headers: authHeaders(ADMIN_TOKEN),
        });

        expect(byRef.status()).toBe(200);
        const refBody = await byRef.json();
        expect(refBody.content.length).toBeGreaterThan(0);
        for (const row of refBody.content) {
            expect(row.reconBatchRefNum).toBe(batchRef);
        }

        const byTerminal = await request.get(`${API_BASE}${ADMIN_ACH}?size=50&terminalId=${TERMINAL_ID}`, {
            headers: authHeaders(ADMIN_TOKEN),
        });
        expect(byTerminal.status()).toBe(200);
        for (const row of (await byTerminal.json()).content) {
            expect(row.terminalId).toBe(TERMINAL_ID);
        }
    });

    test('POS-ACH-05 (TC-054): page size is capped at 100 server-side', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const res = await request.get(`${API_BASE}${ADMIN_ACH}?size=500`, { headers: authHeaders(ADMIN_TOKEN) });

        expect(res.status()).toBe(200);
        const body = await res.json();
        // AchTransferService.pageSize() caps silently rather than rejecting.
        expect(body.content.length).toBeLessThanOrEqual(100);
        expect(body.size).toBeLessThanOrEqual(100);
    });

    test('POS-ACH-06 (TC-055): a merchant token cannot list ACH transfers', async ({ request }) => {
        const businessToken = await getBusinessToken(request);
        test.skip(!businessToken, 'sign-in did not return a token');

        const res = await request.get(`${API_BASE}${ADMIN_ACH}`, { headers: authHeaders(businessToken) });

        expect(res.status()).toBe(403);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Request validation — these are refused before any transfer is touched, so
// they are safe to run without the mutation guard.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('POS – ACH transfers: request validation', () => {
    test.describe.configure({ mode: 'serial' });

    const invalidBodies: { name: string; tc: string; body: Record<string, unknown> }[] = [
        { name: 'empty batchRefs array',        tc: 'TC-063', body: { batchRefs: [], reason: 'x' } },
        { name: 'null batchRefs',               tc: 'TC-064', body: { batchRefs: null, reason: 'x' } },
        { name: 'missing batchRefs key',        tc: 'TC-064', body: { reason: 'x' } },
        { name: 'blank entry in batchRefs',     tc: 'TC-065', body: { batchRefs: [''], reason: 'x' } },
        { name: 'whitespace entry',             tc: 'TC-065', body: { batchRefs: ['   '], reason: 'x' } },
        { name: 'over 100 batchRefs',           tc: 'TC-066', body: { batchRefs: Array.from({ length: MAX_BATCH_REFS + 1 }, (_, i) => `BR-${i}`), reason: 'x' } },
        { name: 'reason over 255 characters',   tc: 'TC-067', body: { batchRefs: ['BR-VALIDATION-ONLY'], reason: 'x'.repeat(MAX_REASON_LENGTH + 1) } },
    ];

    for (const { name, tc, body } of invalidBodies) {
        test(`POS-ACH-07 (${tc}): release rejects ${name}`, async ({ request }) => {
            test.skip(!ADMIN_TOKEN, NO_ADMIN);

            const res = await request.post(`${API_BASE}${ADMIN_ACH_RELEASE}`, {
                data: body, headers: authHeaders(ADMIN_TOKEN),
            });

            expect(res.status(), `${name} should be a 400`).toBe(400);
        });

        test(`POS-ACH-08 (TC-075): reject rejects ${name} the same way`, async ({ request }) => {
            test.skip(!ADMIN_TOKEN, NO_ADMIN);

            const res = await request.post(`${API_BASE}${ADMIN_ACH_REJECT}`, {
                data: body, headers: authHeaders(ADMIN_TOKEN),
            });

            // Release and reject share AchTransferActionRequestValidator.
            expect(res.status(), `${name} should be a 400 on reject too`).toBe(400);
        });
    }

    test('POS-ACH-09 (TC-065): a valid ref alongside a blank one releases nothing', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);
        test.skip(!AWAITING_BATCH_REF, 'no POS_ACH_AWAITING_BATCH_REF provided');

        const res = await request.post(`${API_BASE}${ADMIN_ACH_RELEASE}`, {
            data: { batchRefs: [AWAITING_BATCH_REF, ''], reason: 'blank entry must abort the whole request' },
            headers: authHeaders(ADMIN_TOKEN),
        });

        expect(res.status()).toBe(400);

        // The valid ref must be untouched — validation runs before any processing.
        const check = await request.get(`${API_BASE}${ADMIN_ACH}?batchRef=${encodeURIComponent(AWAITING_BATCH_REF)}`, {
            headers: authHeaders(ADMIN_TOKEN),
        });
        const body = await check.json();
        expect(body.content[0]?.status, 'the valid batch must not have been released').toBe('AWAITING_APPROVAL');
    });

    test('POS-ACH-10 (TC-058): an unknown batchRef reports NOT_FOUND inside a 200', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const res = await request.post(`${API_BASE}${ADMIN_ACH_RELEASE}`, {
            data: { batchRefs: ['BR-DOES-NOT-EXIST-0001'], reason: 'unknown ref probe' },
            headers: authHeaders(ADMIN_TOKEN),
        });

        // Per-item failures are reported in the body, never as an HTTP error.
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.total).toBe(1);
        expect(body.skipped).toBe(1);
        expect(body.succeeded).toBe(0);
        expect(body.items[0].result).toBe('NOT_FOUND');
    });

    test('POS-ACH-11 (TC-073): reject also reports NOT_FOUND for an unknown ref', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const res = await request.post(`${API_BASE}${ADMIN_ACH_REJECT}`, {
            data: { batchRefs: ['BR-DOES-NOT-EXIST-0002'], reason: 'unknown ref probe' },
            headers: authHeaders(ADMIN_TOKEN),
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.items[0].result).toBe('NOT_FOUND');
        expect(body.skipped).toBe(1);
    });

    test('POS-ACH-12 (TC-070): a read-only admin token cannot release', async ({ request }) => {
        test.skip(!ADMIN_READONLY_TOKEN, 'no POS_ADMIN_READONLY_TOKEN provided');

        const res = await request.post(`${API_BASE}${ADMIN_ACH_RELEASE}`, {
            data: { batchRefs: ['BR-PRIVILEGE-PROBE'], reason: 'privilege probe' },
            headers: authHeaders(ADMIN_READONLY_TOKEN),
        });

        expect(res.status(), 'a read-only admin must not be able to move money').toBe(403);
    });

    test('POS-ACH-13 (TC-077): a read-only admin token cannot reject', async ({ request }) => {
        test.skip(!ADMIN_READONLY_TOKEN, 'no POS_ADMIN_READONLY_TOKEN provided');

        const res = await request.post(`${API_BASE}${ADMIN_ACH_REJECT}`, {
            data: { batchRefs: ['BR-PRIVILEGE-PROBE'], reason: 'privilege probe' },
            headers: authHeaders(ADMIN_READONLY_TOKEN),
        });

        expect(res.status()).toBe(403);
    });

    test('POS-ACH-14 (TC-070): a merchant token cannot release', async ({ request }) => {
        const businessToken = await getBusinessToken(request);
        test.skip(!businessToken, 'sign-in did not return a token');

        const res = await request.post(`${API_BASE}${ADMIN_ACH_RELEASE}`, {
            data: { batchRefs: ['BR-PRIVILEGE-PROBE'], reason: 'privilege probe' },
            headers: authHeaders(businessToken),
        });

        expect(res.status()).toBe(403);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// State-changing cases — money moves here. Off unless explicitly enabled.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('POS – ACH transfers: release and reject (state-changing)', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-ACH-15 (TC-056): releasing an AWAITING_APPROVAL batch settles it', async ({ request }) => {
        test.skip(!ALLOW_ACH_MUTATIONS, ACH_MUTATION_GUARD);
        test.skip(!ADMIN_TOKEN, NO_ADMIN);
        test.skip(!AWAITING_BATCH_REF, 'no POS_ACH_AWAITING_BATCH_REF provided');

        const before = await (await request.get(`${API_BASE}${ADMIN_ACH}?batchRef=${encodeURIComponent(AWAITING_BATCH_REF)}`, {
            headers: authHeaders(ADMIN_TOKEN),
        })).json();
        expect(before.content[0]?.status, 'seed batch must start in AWAITING_APPROVAL').toBe('AWAITING_APPROVAL');

        const res = await request.post(`${API_BASE}${ADMIN_ACH_RELEASE}`, {
            data: { batchRefs: [AWAITING_BATCH_REF], reason: 'Automated release — POS regression suite' },
            headers: authHeaders(ADMIN_TOKEN),
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.total).toBe(1);
        expect(body.items[0].result).toBe('RELEASED');
        expect(body.succeeded).toBe(1);

        const after = await (await request.get(`${API_BASE}${ADMIN_ACH}?batchRef=${encodeURIComponent(AWAITING_BATCH_REF)}`, {
            headers: authHeaders(ADMIN_TOKEN),
        })).json();
        const transfer = after.content[0];

        expect(['SUCCESSFUL', 'PENDING']).toContain(transfer.status);
        expect(transfer.releaseMode).toBe('MANUAL');
        expect(transfer.approvedBy).toBeTruthy();
        expect(transfer.approvedAt).toBeTruthy();
        expect(transfer.allowedActions ?? []).toEqual([]);
    });

    test('POS-ACH-16 (TC-057): re-releasing a settled batch is skipped, never repeated', async ({ request }) => {
        test.skip(!ALLOW_ACH_MUTATIONS, ACH_MUTATION_GUARD);
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const batchRef = RELEASED_BATCH_REF || AWAITING_BATCH_REF;
        test.skip(!batchRef, 'no released batch ref available');

        const before = await (await request.get(`${API_BASE}${ADMIN_ACH}?batchRef=${encodeURIComponent(batchRef)}`, {
            headers: authHeaders(ADMIN_TOKEN),
        })).json();
        const beforeTransfer = before.content[0];
        test.skip(beforeTransfer?.status !== 'SUCCESSFUL', 'batch is not in SUCCESSFUL — run POS-ACH-15 first');

        const res = await request.post(`${API_BASE}${ADMIN_ACH_RELEASE}`, {
            data: { batchRefs: [batchRef], reason: 'double-release guard check' },
            headers: authHeaders(ADMIN_TOKEN),
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.items[0].result).toBe('ALREADY_RELEASED');
        expect(body.skipped).toBe(1);
        expect(body.succeeded).toBe(0);

        // Critical: no second payment instruction and no field churn.
        const after = await (await request.get(`${API_BASE}${ADMIN_ACH}?batchRef=${encodeURIComponent(batchRef)}`, {
            headers: authHeaders(ADMIN_TOKEN),
        })).json();
        expect(after.content[0].bankInstructionRef).toBe(beforeTransfer.bankInstructionRef);
        expect(after.content[0].sentAt).toBe(beforeTransfer.sentAt);
        expect(after.content[0].status).toBe('SUCCESSFUL');
    });

    test('POS-ACH-17 (TC-059): a non-AWAITING_APPROVAL batch cannot be released', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const list = await (await request.get(`${API_BASE}${ADMIN_ACH}?size=100`, { headers: authHeaders(ADMIN_TOKEN) })).json();
        const terminal = list.content.find((t: { status: string }) =>
            ['REJECTED', 'REVERSED', 'APPROVED', 'PENDING'].includes(t.status));
        test.skip(!terminal, 'no batch in a non-releasable status to probe');

        const res = await request.post(`${API_BASE}${ADMIN_ACH_RELEASE}`, {
            data: { batchRefs: [terminal.reconBatchRefNum], reason: 'invalid status probe' },
            headers: authHeaders(ADMIN_TOKEN),
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(['INVALID_STATUS', 'ALREADY_RELEASED']).toContain(body.items[0].result);
        expect(body.succeeded).toBe(0);
    });

    test('POS-ACH-18 (TC-060): a mixed batch reports each ref independently', async ({ request }) => {
        test.skip(!ALLOW_ACH_MUTATIONS, ACH_MUTATION_GUARD);
        test.skip(!ADMIN_TOKEN, NO_ADMIN);
        test.skip(!AWAITING_BATCH_REF, 'no POS_ACH_AWAITING_BATCH_REF provided');

        const res = await request.post(`${API_BASE}${ADMIN_ACH_RELEASE}`, {
            data: {
                batchRefs: [AWAITING_BATCH_REF, 'BR-DOES-NOT-EXIST-0003'],
                reason: 'mixed batch — one valid, one unknown',
            },
            headers: authHeaders(ADMIN_TOKEN),
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.total).toBe(2);
        expect(body.items.length).toBe(2);
        expect(body.succeeded + body.failed + body.skipped).toBe(body.total);

        const byRef = Object.fromEntries(body.items.map((i: { batchRef: string; result: string }) => [i.batchRef, i.result]));
        expect(byRef['BR-DOES-NOT-EXIST-0003']).toBe('NOT_FOUND');
        // One bad ref must not abort the good one.
        expect(['RELEASED', 'ALREADY_RELEASED', 'INVALID_STATUS']).toContain(byRef[AWAITING_BATCH_REF]);
    });

    test('POS-ACH-19 (TC-068): the same ref listed twice pays only once', async ({ request }) => {
        test.skip(!ALLOW_ACH_MUTATIONS, ACH_MUTATION_GUARD);
        test.skip(!ADMIN_TOKEN, NO_ADMIN);
        test.skip(!AWAITING_BATCH_REF, 'no POS_ACH_AWAITING_BATCH_REF provided');

        const res = await request.post(`${API_BASE}${ADMIN_ACH_RELEASE}`, {
            data: { batchRefs: [AWAITING_BATCH_REF, AWAITING_BATCH_REF], reason: 'duplicate ref guard' },
            headers: authHeaders(ADMIN_TOKEN),
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        const released = body.items.filter((i: { result: string }) => i.result === 'RELEASED');

        // Two RELEASED results for one batch would mean a double payment.
        expect(released.length, 'a duplicated ref must not release twice').toBeLessThanOrEqual(1);
    });

    test('POS-ACH-20 (TC-071): rejecting an AWAITING_APPROVAL batch records the reason', async ({ request }) => {
        test.skip(!ALLOW_ACH_MUTATIONS, ACH_MUTATION_GUARD);
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const list = await (await request.get(`${API_BASE}${ADMIN_ACH}?size=100&status=AWAITING_APPROVAL`, {
            headers: authHeaders(ADMIN_TOKEN),
        })).json();
        const candidate = list.content.find((t: { reconBatchRefNum: string }) => t.reconBatchRefNum !== AWAITING_BATCH_REF);
        test.skip(!candidate, 'no spare AWAITING_APPROVAL batch to reject');

        const reason = 'Automated reject — beneficiary IBAN under review';
        const res = await request.post(`${API_BASE}${ADMIN_ACH_REJECT}`, {
            data: { batchRefs: [candidate.reconBatchRefNum], reason },
            headers: authHeaders(ADMIN_TOKEN),
        });

        expect(res.status()).toBe(200);
        expect((await res.json()).items[0].result).toBe('REJECTED');

        const after = await (await request.get(`${API_BASE}${ADMIN_ACH}?batchRef=${encodeURIComponent(candidate.reconBatchRefNum)}`, {
            headers: authHeaders(ADMIN_TOKEN),
        })).json();
        expect(after.content[0].status).toBe('REJECTED');
        expect(after.content[0].allowedActions ?? []).toEqual([]);
    });

    test('POS-ACH-21 (TC-072): a settled batch cannot be rejected after the fact', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const list = await (await request.get(`${API_BASE}${ADMIN_ACH}?size=100&status=SUCCESSFUL`, {
            headers: authHeaders(ADMIN_TOKEN),
        })).json();
        test.skip(list.content.length === 0, 'no SUCCESSFUL batch available to probe');

        const res = await request.post(`${API_BASE}${ADMIN_ACH_REJECT}`, {
            data: { batchRefs: [list.content[0].reconBatchRefNum], reason: 'post-settlement reject probe' },
            headers: authHeaders(ADMIN_TOKEN),
        });

        expect(res.status()).toBe(200);
        expect((await res.json()).items[0].result).toBe('INVALID_STATUS');
    });

    test('POS-ACH-22 (TC-074): reject never returns a release-only result code', async ({ request }) => {
        test.skip(!ADMIN_TOKEN, NO_ADMIN);

        const res = await request.post(`${API_BASE}${ADMIN_ACH_REJECT}`, {
            data: { batchRefs: ['BR-DOES-NOT-EXIST-0004'], reason: 'result-code surface check' },
            headers: authHeaders(ADMIN_TOKEN),
        });

        expect(res.status()).toBe(200);
        for (const item of (await res.json()).items) {
            expect(['REJECTED', 'NOT_FOUND', 'INVALID_STATUS']).toContain(item.result);
        }
    });

    test('POS-ACH-23 (TC-076): concurrent release and reject leave one consistent status', async ({ request }) => {
        test.skip(!ALLOW_ACH_MUTATIONS, ACH_MUTATION_GUARD);
        test.skip(!ADMIN_TOKEN, NO_ADMIN);
        test.skip(!AWAITING_BATCH_REF, 'no POS_ACH_AWAITING_BATCH_REF provided');

        const payload = { batchRefs: [AWAITING_BATCH_REF], reason: 'concurrency probe' };
        const [releaseRes, rejectRes] = await Promise.all([
            request.post(`${API_BASE}${ADMIN_ACH_RELEASE}`, { data: payload, headers: authHeaders(ADMIN_TOKEN) }),
            request.post(`${API_BASE}${ADMIN_ACH_REJECT}`,  { data: payload, headers: authHeaders(ADMIN_TOKEN) }),
        ]);

        expect(releaseRes.status()).toBe(200);
        expect(rejectRes.status()).toBe(200);

        const results = [
            (await releaseRes.json()).items[0].result,
            (await rejectRes.json()).items[0].result,
        ];
        const winners = results.filter(r => r === 'RELEASED' || r === 'REJECTED');

        // The atomic compare-and-set means exactly one action can win.
        expect(winners.length, `both actions succeeded: ${results.join(', ')}`).toBeLessThanOrEqual(1);

        const after = await (await request.get(`${API_BASE}${ADMIN_ACH}?batchRef=${encodeURIComponent(AWAITING_BATCH_REF)}`, {
            headers: authHeaders(ADMIN_TOKEN),
        })).json();
        expect(['SUCCESSFUL', 'PENDING', 'REJECTED', 'APPROVED', 'AWAITING_APPROVAL'])
            .toContain(after.content[0].status);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cases that need a stubbed bank or database — written up, not runnable here.
// Same rationale as Reconciliation/ and TransactionOperations/.
// ─────────────────────────────────────────────────────────────────────────────

const PENDING_STUB = 'pending a stubbed BankIntegrationClient — cannot be forced from the API surface';

test.describe('POS – ACH transfers: bank-failure paths', () => {
    test.describe.configure({ mode: 'serial' });

    test('POS-ACH-24 (TC-061): a bank rejection maps to REJECTED_BY_BANK', async () => {
        test.skip(true, `${PENDING_STUB} (TC-061)`);
    });

    test('POS-ACH-25 (TC-062): a bank exception leaves the transfer APPROVED with a statusReason', async () => {
        test.skip(true, `${PENDING_STUB} (TC-062)`);
    });

    test('POS-ACH-26 (TC-069): every release item is written to the POS ACH audit log', async () => {
        test.skip(true, 'pending audit-log read access (PosAchAuditLogService has no API surface) (TC-069)');
    });
});
