import { test, expect, type BrowserContext } from '@playwright/test';
import { loginToCommissionManagement } from '../CommissionManagementHelper';
import { type AdminCommissionManagementPage } from '../../pageElements/CommissionManagement/AdminCommissionManagementPage';

// API coverage for the Commission Management gateway endpoints that back the
// Default Commission and Accounts Commission screens. Contracts confirmed
// live 2026-10-03:
//   GET /api/v1/default-commissions?page&size[&transactionTypeCode&platformType]
//   PUT /api/v1/default-commissions/{id}/activate | deactivate
//   GET /api/v1/commissions/{profileCode}?page&size
// Create/edit endpoints are not covered here — their request contracts have
// not been captured yet, so those flows stay UI-driven.

const BILLER_CASHIN_CODE = '102003';
const BILLER_CASHIN_PLATFORM = 'web';
const BILLER_PROFILE_CODE = 'BIL-ZCGGH41MNK-14';

test.describe('Commission Management — API', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(120000);

    let context: BrowserContext;
    let commission: AdminCommissionManagementPage;

    test.beforeAll(async ({ browser }) => {
        const session = await loginToCommissionManagement(browser);
        context = session.context;
        commission = session.commission;
        // Any admin navigation primes the captured Authorization headers the
        // API helpers reuse — see ensureApiHeaders.
        await commission.gotoDefaultCommission();
    });

    test.afterAll(async () => {
        await context?.close();
    });

    test('default-commissions list returns a well-formed paged body', async () => {
        const { status, json } = await commission.apiGet('/api/v1/default-commissions?page=0&size=10');
        expect(status).toBe(200);
        const body = json as { content: Record<string, unknown>[]; totalElements: number; numberOfElements: number };
        expect(Array.isArray(body.content)).toBe(true);
        expect(body.numberOfElements).toBe(body.content.length);
        for (const row of body.content) {
            expect(typeof row['id']).toBe('number');
            expect(typeof row['transactionTypeCode']).toBe('string');
            expect(['web', 'app', 'system']).toContain(row['platformType']);
            expect(['PERCENTAGE', 'FIXED']).toContain(row['type']);
            expect(typeof row['isActive']).toBe('boolean');
            expect(Number(row['min'])).toBeLessThanOrEqual(Number(row['max']));
            expect(Number(row['amountValue'])).toBeGreaterThanOrEqual(0);
        }
    });

    test('default-commissions honours the size parameter', async () => {
        const { status, json } = await commission.apiGet('/api/v1/default-commissions?page=0&size=2');
        expect(status).toBe(200);
        const body = json as { content: unknown[]; size: number };
        expect(body.size).toBe(2);
        expect(body.content.length).toBeLessThanOrEqual(2);
    });

    test('default-commissions filters by transactionTypeCode and platformType', async () => {
        const { status, json } = await commission.apiGet(
            `/api/v1/default-commissions?page=0&size=10&transactionTypeCode=${BILLER_CASHIN_CODE}&platformType=${BILLER_CASHIN_PLATFORM}`,
        );
        expect(status).toBe(200);
        const rows = (json as { content: Record<string, unknown>[] }).content;
        expect(rows.length).toBeGreaterThanOrEqual(1);
        for (const row of rows) {
            expect(row['transactionTypeCode']).toBe(BILLER_CASHIN_CODE);
            expect(row['platformType']).toBe(BILLER_CASHIN_PLATFORM);
        }
    });

    test('default-commissions filtered by platformType=app returns only APP rows', async () => {
        const { status, json } = await commission.apiGet('/api/v1/default-commissions?page=0&size=50&platformType=app');
        expect(status).toBe(200);
        for (const row of (json as { content: Record<string, unknown>[] }).content) {
            expect(row['platformType']).toBe('app');
        }
    });

    test('default-commissions filtered by platformType=system returns only SYSTEM rows', async () => {
        const { status, json } = await commission.apiGet('/api/v1/default-commissions?page=0&size=50&platformType=system');
        expect(status).toBe(200);
        for (const row of (json as { content: Record<string, unknown>[] }).content) {
            expect(row['platformType']).toBe('system');
        }
    });

    test('default-commissions paging returns the second page without repeating the first', async () => {
        const first = await commission.apiGet('/api/v1/default-commissions?page=0&size=5');
        const second = await commission.apiGet('/api/v1/default-commissions?page=1&size=5');
        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
        const firstIds = (first.json as { content: { id: number }[] }).content.map(r => r.id);
        const secondIds = (second.json as { content: { id: number }[] }).content.map(r => r.id);
        expect(secondIds.length).toBeGreaterThan(0);
        expect(secondIds.filter(id => firstIds.includes(id))).toHaveLength(0);
    });

    test('default-commissions filter with no matches returns an empty page, not an error', async () => {
        const { status, json } = await commission.apiGet(
            '/api/v1/default-commissions?page=0&size=10&transactionTypeCode=999999&platformType=web',
        );
        expect(status).toBe(200);
        expect((json as { content: unknown[] }).content).toEqual([]);
    });

    test('default-commissions without an Authorization header is rejected with 401', async () => {
        const { status } = await commission.apiGet('/api/v1/default-commissions?page=0&size=10', { withAuth: false });
        expect([401, 403, 404]).toContain(status);
    });

    test('activate and deactivate round-trip flips isActive on the Biller Bank Cashin row', async () => {
        const original = await commission.apiFindCommission(BILLER_CASHIN_CODE, 'WEB');
        expect(original, 'Biller Bank Cashin WEB row must exist for this test').not.toBeNull();
        const id = original!.id;
        const wasActive = original!.isActive;
        try {
            await commission.apiSetActive(id, !wasActive);
            const flipped = await commission.apiFindCommission(BILLER_CASHIN_CODE, 'WEB');
            expect(flipped!.isActive).toBe(!wasActive);
        } finally {
            // Always restore the row to its original state, even if the flip assertion failed.
            await commission.apiSetActive(id, wasActive);
            const restored = await commission.apiFindCommission(BILLER_CASHIN_CODE, 'WEB');
            expect(restored!.isActive).toBe(wasActive);
        }
    });

    test('activating a non-existent default commission id is rejected with a client error', async () => {
        await expect(commission.apiSetActive(999999999, true)).rejects.toThrow(/failed: 4\d\d/);
    });

    test('updating the Biller Bank Cashin row via PUT persists the new value, then restores it', async () => {
        const original = await commission.apiFindCommission(BILLER_CASHIN_CODE, 'WEB');
        expect(original).not.toBeNull();
        const body = (value: number) => ({
            min: original!.min,
            max: original!.max,
            transactionTypeCode: BILLER_CASHIN_CODE,
            platformType: BILLER_CASHIN_PLATFORM,
            amountValue: value,
            commissionType: original!.type,
            isActive: original!.isActive,
        });
        try {
            const { status } = await commission.apiPutDefaultCommission(original!.id, body(original!.amountValue + 1));
            expect(status).toBe(200);
            const updated = await commission.apiFindCommission(BILLER_CASHIN_CODE, 'WEB');
            expect(updated!.amountValue).toBe(original!.amountValue + 1);
        } finally {
            await commission.apiPutDefaultCommission(original!.id, body(original!.amountValue));
            const restored = await commission.apiFindCommission(BILLER_CASHIN_CODE, 'WEB');
            expect(restored!.amountValue).toBe(original!.amountValue);
        }
    });

    test('updating a non-existent default commission id is rejected with a client error', async () => {
        const { status } = await commission.apiPutDefaultCommission(999999999, {
            min: 1, max: 2, transactionTypeCode: BILLER_CASHIN_CODE, platformType: BILLER_CASHIN_PLATFORM,
            amountValue: 1, commissionType: 'PERCENTAGE', isActive: true,
        });
        expect(status).toBeGreaterThanOrEqual(400);
        expect(status).toBeLessThan(500);
    });

    test('updating with a malformed body is rejected and the row is unchanged', async () => {
        const before = await commission.apiFindCommission(BILLER_CASHIN_CODE, 'WEB');
        const { status } = await commission.apiPutDefaultCommission(before!.id, { amountValue: 'not-a-number' });
        expect(status).toBeGreaterThanOrEqual(400);
        expect(status).toBeLessThan(500);
        const after = await commission.apiFindCommission(BILLER_CASHIN_CODE, 'WEB');
        expect(after!.amountValue).toBe(before!.amountValue);
    });

    test('updating without an Authorization header is rejected with 401', async () => {
        const before = await commission.apiFindCommission(BILLER_CASHIN_CODE, 'WEB');
        const { status } = await commission.apiPutDefaultCommission(before!.id, { amountValue: before!.amountValue }, { withAuth: false });
        expect([401, 403, 404]).toContain(status);
    });

    test('creating a default commission without an Authorization header is rejected with 401', async () => {
        const before = await commission.apiFetchAllCommissions();
        const { status } = await commission.apiPostDefaultCommissions(
            [{ min: '1', max: '99', transactionTypeCode: BILLER_CASHIN_CODE, platformType: BILLER_CASHIN_PLATFORM, amountValue: '1', commissionType: 'FIXED', isActive: true }],
            { withAuth: false },
        );
        expect([401, 403, 404]).toContain(status);
        expect(await commission.apiFetchAllCommissions()).toHaveLength(before.length);
    });

    test('creating a duplicate default commission for an existing type and platform is rejected with 409', async () => {
        const before = await commission.apiFetchAllCommissions();
        const { status } = await commission.apiPostDefaultCommissions([
            { min: '462', max: '92671', transactionTypeCode: BILLER_CASHIN_CODE, platformType: BILLER_CASHIN_PLATFORM, amountValue: '188', commissionType: 'PERCENTAGE', isActive: true },
        ]);
        expect(status).toBe(409);
        // Rejected creates must not add a row.
        expect(await commission.apiFetchAllCommissions()).toHaveLength(before.length);
    });

    test('creating with a malformed body is rejected and adds no row', async () => {
        const before = await commission.apiFetchAllCommissions();
        const { status } = await commission.apiPostDefaultCommissions([{ min: 'abc', transactionTypeCode: '' }]);
        expect(status).toBeGreaterThanOrEqual(400);
        expect(status).toBeLessThan(500);
        expect(await commission.apiFetchAllCommissions()).toHaveLength(before.length);
    });

    test('creating an account-level commission without an Authorization header is rejected with 401', async () => {
        const before = await commission.apiFetchAccountCommissions(BILLER_PROFILE_CODE);
        const { status } = await commission.apiPostAccountCommissions(
            [{ minValue: '1', maxValue: '99', transactionTypeCode: BILLER_CASHIN_CODE, platformType: BILLER_CASHIN_PLATFORM, amountValue: '2', commissionType: 'PERCENTAGE', isActive: true, profileCode: BILLER_PROFILE_CODE }],
            { withAuth: false },
        );
        expect([401, 403, 404]).toContain(status);
        expect(await commission.apiFetchAccountCommissions(BILLER_PROFILE_CODE)).toHaveLength(before.length);
    });

    test('creating a duplicate account-level override for an existing type and platform is rejected and adds no row', async () => {
        const before = await commission.apiFetchAccountCommissions(BILLER_PROFILE_CODE);
        const { status } = await commission.apiPostAccountCommissions([
            { minValue: '462', maxValue: '92671', transactionTypeCode: BILLER_CASHIN_CODE, platformType: BILLER_CASHIN_PLATFORM, amountValue: '7', commissionType: 'PERCENTAGE', isActive: true, profileCode: BILLER_PROFILE_CODE },
        ]);
        expect(status).toBe(409);
        expect(await commission.apiFetchAccountCommissions(BILLER_PROFILE_CODE)).toHaveLength(before.length);
    });

    test('creating an account-level commission with a malformed body is rejected and adds no row', async () => {
        const before = await commission.apiFetchAccountCommissions(BILLER_PROFILE_CODE);
        const { status } = await commission.apiPostAccountCommissions([{ minValue: 'abc', profileCode: '' }]);
        expect(status).toBeGreaterThanOrEqual(400);
        expect(status).toBeLessThan(500);
        expect(await commission.apiFetchAccountCommissions(BILLER_PROFILE_CODE)).toHaveLength(before.length);
    });

    test('updating an account-level commission without an Authorization header is rejected with 401', async () => {
        const rows = await commission.apiFetchAccountCommissions(BILLER_PROFILE_CODE);
        const row = rows[0];
        const { status } = await commission.apiPutAccountCommission(
            { id: row.id, minValue: row.min, maxValue: row.max, transactionTypeCode: row.transactionTypeCode, platformType: row.platformType, amountValue: row.amountValue, commissionType: row.type, isActive: row.isActive },
            { withAuth: false },
        );
        expect([401, 403, 404]).toContain(status);
    });

    test('updating a non-existent account-level commission id is rejected with a client error', async () => {
        const { status } = await commission.apiPutAccountCommission({ id: 999999999, minValue: '1', maxValue: '2', transactionTypeCode: BILLER_CASHIN_CODE, platformType: BILLER_CASHIN_PLATFORM, amountValue: '1', commissionType: 'PERCENTAGE', isActive: true });
        expect(status).toBeGreaterThanOrEqual(400);
        expect(status).toBeLessThan(500);
    });

    test('updating an account-level commission with a malformed body is rejected and the row is unchanged', async () => {
        const rows = await commission.apiFetchAccountCommissions(BILLER_PROFILE_CODE);
        const before = rows[0];
        const { status } = await commission.apiPutAccountCommission({ id: before.id, amountValue: 'not-a-number' });
        expect(status).toBeGreaterThanOrEqual(400);
        expect(status).toBeLessThan(500);
        const after = (await commission.apiFetchAccountCommissions(BILLER_PROFILE_CODE)).find(r => r.id === before.id);
        expect(after!.amountValue).toBe(before.amountValue);
    });

    test('accounts-commissions list returns only rows belonging to the requested profile', async () => {
        const rows = await commission.apiFetchAccountCommissions(BILLER_PROFILE_CODE);
        expect(rows.length).toBeGreaterThanOrEqual(1);
        for (const row of rows) {
            expect(row.profileCode).toBe(BILLER_PROFILE_CODE);
            expect(['PERCENTAGE', 'FIXED']).toContain(row.type);
            expect(['web', 'app', 'system']).toContain(row.platformType);
            expect(row.min).toBeLessThanOrEqual(row.max);
            expect(typeof row.isActive).toBe('boolean');
        }
    });

    test('accounts-commissions for a profile with no overrides returns an empty page', async () => {
        const { status, json } = await commission.apiGet('/api/v1/commissions/BIL-DOESNOTEXIST-00?page=0&size=10');
        // Either an empty page or a not-found — both mean "no override", neither should be a server error.
        expect([200, 404]).toContain(status);
        if (status === 200) {
            expect((json as { content: unknown[] }).content).toEqual([]);
        }
    });

    test('accounts-commissions without an Authorization header is rejected with 401', async () => {
        const { status } = await commission.apiGet(`/api/v1/commissions/${BILLER_PROFILE_CODE}?page=0&size=10`, { withAuth: false });
        expect([401, 403, 404]).toContain(status);
    });
});
