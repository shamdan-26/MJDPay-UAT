import type { Page } from '@playwright/test';

/**
 * Transactions — summary display, validation, and OTP handling.
 *
 * Covers EMI-5699/5621/5544 (commission & VAT on the summary), EMI-5558/5495
 * (standardised transaction summary payload), EMI-5525 (empty idempotency key),
 * EMI-5570 (wallet-configuration restrictions), EMI-5803 (wrong limit error),
 * EMI-5087/5076/5080 (B2B transfer errors), EMI-5560/5627 (transaction OTP).
 *
 * The transactions list URL and the `#transactions-reports-list` table are real
 * (already used by pageElements/Shared/TransactionsPage.ts). Endpoint paths are
 * best-effort apart from `/api/v1/transaction-otp-configurations/{id}`, which
 * comes from the EMI-5627 curl repro.
 */

export const BASE_URL          = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';
export const TRANSACTIONS_URL  = `${BASE_URL}/business/main/transactions`;

export const TRANSACTIONS_API  = '**/api/v1/transactions**';
export const TRANSFER_API      = '**/api/v1/**transfer**';
export const OTP_CONFIG_API    = '**/api/v1/transaction-otp-configurations/*';

/** Mirrors the standardised summary payload from EMI-5482/5495/5558. */
export interface TransactionSummary {
    transactionId?: string;
    amount: number;
    status?: 'SUCCESS' | 'PENDING' | 'FAILED';
    transactionTypeCode?: string;
    sourceCommission?: number;
    sourceVat?: number;
    destinationCommission?: number;
    destinationVat?: number;
}

export const W2W_WITH_COMMISSION: TransactionSummary = {
    transactionId: 'TXN-MOCK-0001',
    amount: 100,
    status: 'SUCCESS',
    transactionTypeCode: '101003',
    sourceCommission: 5,
    sourceVat: 0.75,
    destinationCommission: 3,
    destinationVat: 0.45,
};

export const TOPUP_WITH_COMMISSION: TransactionSummary = {
    transactionId: 'TXN-MOCK-0002',
    amount: 250,
    status: 'SUCCESS',
    transactionTypeCode: '102001',
    sourceCommission: 7,
    sourceVat: 1.05,
    destinationCommission: 0,
    destinationVat: 0,
};

/**
 * Issues a request from inside the page so page.route() mocks apply.
 * page.request.* is a separate API context that bypasses routing and would hit
 * the real gateway — same reason PaymentLinkHelper.ts has this.
 */
export async function fetchJson(
    page: Page,
    path: string,
    options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
): Promise<{ status: number; body: unknown }> {
    const url = `${BASE_URL}${path}`;
    return page.evaluate(
        async ({ url, method, body, headers }) => {
            const res = await fetch(url, {
                method: method ?? 'GET',
                headers: { 'Content-Type': 'application/json', ...(headers ?? {}) },
                body: body !== undefined ? JSON.stringify(body) : undefined,
            });
            const parsedBody = await res.json().catch(() => null);
            return { status: res.status, body: parsedBody };
        },
        { url, method: options.method, body: options.body, headers: options.headers }
    );
}

export async function gotoTransactions(page: Page): Promise<void> {
    await page.goto(TRANSACTIONS_URL);
    await page.waitForLoadState('domcontentloaded');
}

export async function mockTransactionList(page: Page, summaries: TransactionSummary[]): Promise<void> {
    await page.route(TRANSACTIONS_API, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: summaries, totalElements: summaries.length }) })
    );
}

/** EMI-5699/5621/5544 pre-fix state: commission and VAT fields absent entirely. */
export async function mockTransactionListWithoutCommission(page: Page, summary: TransactionSummary): Promise<void> {
    const { sourceCommission, sourceVat, destinationCommission, destinationVat, ...stripped } = summary;
    void sourceCommission; void sourceVat; void destinationCommission; void destinationVat;

    await page.route(TRANSACTIONS_API, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [stripped], totalElements: 1 }) })
    );
}

/** EMI-5525: an empty idempotency key must be refused. */
export async function mockTransferRejectsEmptyIdempotencyKey(page: Page): Promise<void> {
    await page.route(TRANSFER_API, async route => {
        const key = route.request().headers()['idempotencykey'] ?? route.request().headers()['idempotency-key'] ?? '';
        if (key.trim() === '') {
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({ messageCode: 'IDEMPOTENCY_KEY_REQUIRED', plainText: 'Idempotency key is required' }),
            });
            return;
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'SUCCESS' }) });
    });
}

/** EMI-5525 pre-fix state: processed regardless of the missing key. */
export async function mockTransferAcceptsEmptyIdempotencyKey(page: Page): Promise<void> {
    await page.route(TRANSFER_API, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'SUCCESS' }) })
    );
}

/** EMI-5570: a transaction type the wallet config disallows must be blocked. */
export async function mockTransferBlockedByWalletConfig(page: Page): Promise<void> {
    await page.route(TRANSFER_API, route =>
        route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
                messageCode: 'TRANSACTION_TYPE_NOT_ALLOWED',
                plainText: 'This transaction type is not allowed for this wallet configuration',
            }),
        })
    );
}

/** EMI-5570 pre-fix state: the restricted transaction went through. */
export async function mockTransferIgnoresWalletConfig(page: Page): Promise<void> {
    await page.route(TRANSFER_API, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'SUCCESS' }) })
    );
}

/** EMI-5803: low balance must read as insufficient funds, not an hourly-limit error. */
export async function mockTransferInsufficientFunds(page: Page): Promise<void> {
    await page.route(TRANSFER_API, route =>
        route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ messageCode: 'INSUFFICIENT_FUNDS', plainText: 'Insufficient funds' }),
        })
    );
}

/** EMI-5803 pre-fix state. */
export async function mockTransferHourlyLimitError(page: Page): Promise<void> {
    await page.route(TRANSFER_API, route =>
        route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ messageCode: 'HOURLY_TRANSACTION_LIMITS_EXCEEDED', plainText: 'HOURLY_TRANSACTION_LIMITS_EXCEEDED' }),
        })
    );
}

/** EMI-5087: an inactive recipient must say so, not "profile could not be found". */
export async function mockTransferInactiveRecipient(page: Page): Promise<void> {
    await page.route(TRANSFER_API, route =>
        route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ messageCode: 'RECIPIENT_INACTIVE', plainText: 'Recipient account is inactive' }),
        })
    );
}

/** EMI-5087 pre-fix state. */
export async function mockTransferProfileNotFound(page: Page): Promise<void> {
    await page.route(TRANSFER_API, route =>
        route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ messageCode: 'PROFILE_NOT_FOUND', plainText: 'The profile could not be found.' }),
        })
    );
}

/** EMI-5627: the payload uses `required`, and the update must persist it. */
export async function mockOtpConfigUpdateSuccess(page: Page): Promise<void> {
    await page.route(OTP_CONFIG_API, async route => {
        const payload = route.request().postDataJSON() as { required?: boolean } | null;
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ id: 5, required: payload?.required ?? false, code: '102', minimumAmount: 10, maxAttempts: 3 }),
        });
    });
}

/** EMI-5627 pre-fix state: `required` was ignored, so the value never changed. */
export async function mockOtpConfigUpdateIgnoresRequired(page: Page): Promise<void> {
    await page.route(OTP_CONFIG_API, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ id: 5, required: false, code: '102', minimumAmount: 10, maxAttempts: 3 }),
        })
    );
}

/** EMI-5560: exceeding max OTP attempts restarts the flow rather than dead-ending. */
export async function mockOtpMaxAttemptsExceeded(page: Page): Promise<void> {
    await page.route('**/otp/**verify**', route =>
        route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ messageCode: 'OTP_MAX_ATTEMPTS_EXCEEDED', plainText: 'Maximum OTP attempts exceeded' }),
        })
    );
}
