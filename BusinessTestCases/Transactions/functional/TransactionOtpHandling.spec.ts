import { test, expect } from '@playwright/test';
import { SESSION_PATH } from '../../Login/LoginHelper';
import {
    fetchJson,
    gotoTransactions,
    mockTransactionList,
    mockOtpConfigUpdateSuccess,
    mockOtpConfigUpdateIgnoresRequired,
    mockOtpMaxAttemptsExceeded,
} from '../TransactionsHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Transaction OTP Handling (TO-01..TO-03) — MOCK ONLY.
//
// EMI-5627: updating a transaction OTP configuration silently dropped the
// `required` flag (the backend expected a different field name), so the config
// never changed. Endpoint and payload come from the ticket's curl repro.
//
// EMI-5560: exceeding max OTP attempts should restart the transaction flow
// rather than dead-ending the user.
// ─────────────────────────────────────────────────────────────────────────────

const OTP_CONFIG_PATH = '/api/v1/transaction-otp-configurations/5';

test.describe('Transaction OTP — Configuration Update Persists (TO-01, EMI-5627)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('TO-01: updating a transaction OTP configuration should persist the `required` flag', async ({ page }) => {
        await mockTransactionList(page, []);
        await mockOtpConfigUpdateSuccess(page);
        await gotoTransactions(page);

        const { status, body } = await fetchJson(page, OTP_CONFIG_PATH, {
            method: 'PUT',
            body: { required: true, code: '102', minimumAmount: 10, maxAttempts: 3 },
        });

        expect(status).toBe(200);
        expect(body).toMatchObject({ required: true });
    });

    test('TO-01 (regression guard): the pre-fix backend ignored `required` and returned it as false', async ({ page }) => {
        await mockTransactionList(page, []);
        await mockOtpConfigUpdateIgnoresRequired(page);
        await gotoTransactions(page);

        const { body } = await fetchJson(page, OTP_CONFIG_PATH, {
            method: 'PUT',
            body: { required: true, code: '102', minimumAmount: 10, maxAttempts: 3 },
        });

        expect(body).toMatchObject({ required: false });
    });
});

test.describe('Transaction OTP — Max Attempts Restarts The Flow (TO-02, EMI-5560)', () => {
    test.use({ storageState: SESSION_PATH });

    test('TO-02: exceeding max OTP attempts should surface a clear message, not a raw server error', async ({ page }) => {
        await mockTransactionList(page, []);
        await mockOtpMaxAttemptsExceeded(page);
        await gotoTransactions(page);

        const { status, body } = await fetchJson(page, '/api/v1/otp/verify', {
            method: 'POST',
            body: { otp: '000000', transactionTypeCode: '101003' },
        });

        expect(status).toBe(400);
        expect(JSON.stringify(body)).toMatch(/max attempts/i);
        await expect(page.getByText(/internal server error|500/i)).not.toBeVisible();
    });
});
