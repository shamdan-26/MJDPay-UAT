import type { Page } from '@playwright/test';
import { waitForToastClear } from '../toastMessages';
import paymentLinkMocks from '../../data/paymentLinkMocks.json';

/**
 * Payment Links — MOCK ONLY helper (EMI-5463, EMI-5791–5794, EMI-5774/5775/5814).
 *
 * This flow lives in the Customer app per the ticket text ("Open a payment
 * link URL in the Customer app"), which has no existing page objects, helper,
 * or documented URL pattern anywhere in this Business Portal repo. The URL
 * shape and every endpoint path below are therefore best-effort guesses
 * following this app's `/emi-profile/api/v1/...` and route-per-token
 * conventions seen elsewhere — reconcile against the real app on first live
 * run, same caveat as PaymentLinkPage.ts.
 */

export const BASE_URL = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';

export function paymentLinkUrl(token: string): string {
    return `${BASE_URL}/customer/payment-link/${token}`;
}

export const VALID_BILL_TOKEN   = paymentLinkMocks.validBillToken;
export const VALID_WALLET_TOKEN = paymentLinkMocks.validWalletToken;
export const EXPIRED_TOKEN      = paymentLinkMocks.expiredToken;

export interface MockLinkSummary {
    type: 'BILL' | 'WALLET';
    amount?: number;
    minAmount?: number;
    maxAmount?: number;
    ownerProfileComplete?: boolean;
}

const DEFAULT_BILL_SUMMARY: MockLinkSummary   = paymentLinkMocks.defaultBillSummary as MockLinkSummary;
const DEFAULT_WALLET_SUMMARY: MockLinkSummary = paymentLinkMocks.defaultWalletSummary as MockLinkSummary;

/** Mocks the link-token resolution/validation call for a valid token. */
export async function mockValidLink(page: Page, token: string, summary: MockLinkSummary): Promise<void> {
    await page.route(`**/emi-profile/api/v1/payment-links/${token}`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(summary) })
    );
}

/** Mocks an invalid/expired/disabled token response. */
export async function mockInvalidLink(page: Page, token: string): Promise<void> {
    await page.route(`**/emi-profile/api/v1/payment-links/${token}`, route =>
        route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Link is invalid, expired, or disabled' }) })
    );
}

/** Mocks an owner profile that's missing required info (EMI-5791..5794). */
export async function mockIncompleteOwnerProfile(page: Page, token: string, type: 'BILL' | 'WALLET' = 'BILL'): Promise<void> {
    await page.route(`**/emi-profile/api/v1/payment-links/${token}`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ type, ownerProfileComplete: false }) })
    );
}

export async function mockPayerInfoSubmitSuccess(page: Page): Promise<void> {
    await page.route('**/emi-profile/api/v1/payment-links/**/payer', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    );
}

export async function mockOtpDisabled(page: Page): Promise<void> {
    await page.route('**/otp/otp-settings/**', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: false }) })
    );
}

export async function mockUpdateStatusSuccess(page: Page): Promise<void> {
    await page.route('**/bank-transaction/**/update-status', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'COMPLETED' }) })
    );
}

export async function mockUpdateStatusServerError(page: Page): Promise<void> {
    await page.route('**/bank-transaction/**/update-status', route =>
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Internal Server Error' }) })
    );
}

export const mockValidBillLink   = (page: Page) => mockValidLink(page, VALID_BILL_TOKEN, DEFAULT_BILL_SUMMARY);
export const mockValidWalletLink = (page: Page) => mockValidLink(page, VALID_WALLET_TOKEN, DEFAULT_WALLET_SUMMARY);

export async function gotoPaymentLink(page: Page, token: string): Promise<void> {
    await page.goto(paymentLinkUrl(token), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForToastClear(page);
}

/**
 * Issues a same-origin fetch *from inside the page* so it goes through
 * `page.route()` interception. `page.request.*` is a separate API context that
 * does NOT respect `page.route()` mocks — it would hit the real network
 * instead — so every bug-repro test below that needs a raw API call (rather
 * than a full UI flow) uses this instead. Requires the page to have already
 * navigated somewhere (any same-origin URL) so `fetch()` has a document to run in.
 */
export async function fetchJson(
    page: Page,
    path: string,
    options: { method?: string; body?: unknown } = {}
): Promise<{ status: number; body: unknown }> {
    const url = `${BASE_URL}${path}`;
    return page.evaluate(
        async ({ url, method, body }) => {
            const res = await fetch(url, {
                method: method ?? 'GET',
                headers: { 'Content-Type': 'application/json' },
                body: body !== undefined ? JSON.stringify(body) : undefined,
            });
            const parsedBody = await res.json().catch(() => null);
            return { status: res.status, body: parsedBody };
        },
        { url, method: options.method, body: options.body }
    );
}

/**
 * Guest-flow mocks (EMI-5424 payment-link resolution & guest session, EMI-5446
 * guest JWT generation, EMI-5523 guest bill payment processing, EMI-5551/5640/
 * 5653/5860 guest wallet-QR regressions) — same MOCK ONLY / best-effort-guess
 * caveat as the rest of this file. These target the *current* guest-flow
 * tickets, distinct from the earlier EMI-5463/5791-5794/5774-5814 set already
 * covered by mockValidLink/mockPayerInfoSubmitSuccess above.
 */

export const GUEST_WALLET_QR_TOKEN = paymentLinkMocks.validWalletToken;

/** Mocks a successful guest JWT issuance on link/QR resolution (EMI-5446). */
export async function mockGuestSessionJwt(page: Page, token: string): Promise<void> {
    await page.route(`**/emi-profile/api/v1/payment-links/${token}/guest-session`, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ jwt: `mock-guest-jwt-${token}`, expiresInSeconds: 600 }),
        })
    );
}

/** Mocks the guest wallet-payment submit call succeeding (regression baseline for EMI-5640/5860). */
export async function mockGuestWalletPaymentSuccess(page: Page): Promise<void> {
    await page.route('**/emi-profile/api/v1/payment-links/**/pay', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'SUCCESS' }) })
    );
}

/** Mocks the guest bill-payment submit call succeeding (EMI-5523). */
export async function mockGuestBillPaymentSuccess(page: Page): Promise<void> {
    await page.route('**/emi-profile/api/v1/payment-links/**/pay', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'SUCCESS', reference: 'MOCK-BILL-PAY-REF' }) })
    );
}

/** Mocks an "invalid wallet code" payment failure — used to assert the regression (EMI-5860) does NOT reproduce once fixed. */
export async function mockGuestWalletPaymentInvalidCode(page: Page): Promise<void> {
    await page.route('**/emi-profile/api/v1/payment-links/**/pay', route =>
        route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Payment failed (invalid wallet code)' }) })
    );
}

/** Mocks a guest JWT rejected because it was issued for a different link (EMI-5446 cross-link reuse). */
export async function mockGuestJwtWrongLink(page: Page): Promise<void> {
    await page.route('**/emi-profile/api/v1/payment-links/**/pay', route =>
        route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Unauthorized' }) })
    );
}

/**
 * Bill Payment Link regression set — bugs found in UAT for the bill-payment-link
 * feature (EMI-5684, EMI-5822, EMI-5830, EMI-5633, EMI-5527, EMI-5526, EMI-5513,
 * EMI-5630, EMI-5634, EMI-5619) plus the underlying "Done" generation/resolution
 * subtasks whose AC these regressions map back to (EMI-5438, EMI-5443, EMI-5474).
 * Same MOCK ONLY / best-effort-guess caveat as the rest of this file.
 */

export const MERCHANT_TO_MERCHANT_BILL_TOKEN = 'mock-m2m-bill-token'; // allowlist-secret: mock fixture, not a real token
export const UNAPPROVED_BILL_REF = 'QA-UNAPPROVED-BILL';
export const PAID_BILL_REF = 'QA-PAID-BILL';

/** EMI-5684: OTP verify should fail gracefully (not 500) once max attempts are exceeded. */
export async function mockOtpMaxAttemptsExceeded(page: Page): Promise<void> {
    await page.route('**/bills/payment-links/pay/**/submit/verify', route =>
        route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ messageCode: 'OTP_MAX_ATTEMPTS_EXCEEDED', message: 'Maximum OTP attempts exceeded' }),
        })
    );
}

/** Pre-fix regression guard for EMI-5684 — reproduces the raw 500 the bug ticket captured. */
export async function mockOtpMaxAttemptsServerError(page: Page): Promise<void> {
    await page.route('**/bills/payment-links/pay/**/submit/verify', route =>
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) })
    );
}

/** EMI-5822: a merchant-to-merchant bill link should resolve (not 500) for both a guest and a merchant payer. */
export async function mockMerchantToMerchantBillLink(page: Page): Promise<void> {
    await mockValidLink(page, MERCHANT_TO_MERCHANT_BILL_TOKEN, { type: 'BILL', amount: 300, ownerProfileComplete: true });
}

/** EMI-5830: the payer summary should offer every configured payment method, not just Mada. */
export async function mockAllPaymentMethods(page: Page): Promise<void> {
    await page.route('**/emi-profile/api/v1/payment-links/*/payment-methods', route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ methods: ['MADA', 'VISA', 'MASTERCARD', 'APPLE_PAY'] }),
        })
    );
}

/** Pre-fix regression guard for EMI-5830 — only Mada offered. */
export async function mockOnlyMadaPaymentMethod(page: Page): Promise<void> {
    await page.route('**/emi-profile/api/v1/payment-links/*/payment-methods', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ methods: ['MADA'] }) })
    );
}

/** EMI-5633: submitting payment on a bill payment link should succeed, not 500. */
export async function mockBillLinkSubmitSuccess(page: Page): Promise<void> {
    await page.route('**/bills/payment-links/pay/**/submit', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'SUCCESS' }) })
    );
}

/** Pre-fix regression guard for EMI-5633. */
export async function mockBillLinkSubmitServerError(page: Page): Promise<void> {
    await page.route('**/bills/payment-links/pay/**/submit', route =>
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) })
    );
}

/** EMI-5526: creating a payment link for an unapproved bill should return a friendly rejection, not a 500. */
export async function mockCreateLinkRejectedUnapprovedBill(page: Page): Promise<void> {
    await page.route('**/bills/payment-links', route =>
        route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ messageCode: 'BILL_NOT_APPROVED', message: 'A payment link cannot be generated for an unapproved bill' }),
        })
    );
}

/** Pre-fix regression guard for EMI-5526. */
export async function mockCreateLinkServerErrorUnapprovedBill(page: Page): Promise<void> {
    await page.route('**/bills/payment-links', route =>
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) })
    );
}

/** EMI-5527 / EMI-5474: the create-payment-link action should not be offered for an already-paid bill. */
export async function mockPaidBillDetails(page: Page, billRef: string): Promise<void> {
    await page.route(`**/bills/${billRef}`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ referenceNumber: billRef, status: 'PAID' }) })
    );
}

/** EMI-5513: paying a bill via wallet/W2W-style transfer should not 404 with WALLET_TYPE_NOT_FOUND. */
export async function mockTransferDraftSuccess(page: Page): Promise<void> {
    await page.route('**/transactions/transfer-draft', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'DRAFT_CREATED' }) })
    );
}

/** Pre-fix regression guard for EMI-5513. */
export async function mockTransferDraftWalletTypeNotFound(page: Page): Promise<void> {
    await page.route('**/transactions/transfer-draft', route =>
        route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify([{ httpStatusCode: 404, message: { messageCode: 'WALLET_TYPE_NOT_FOUND', plainText: 'The wallet type could not be found.' } }]),
        })
    );
}

/** EMI-5630 / EMI-5634: after returning from a payment-link result, the biller's own Bill nav/details
 *  should still resolve normally rather than 403 "unauthorized" or render an empty page. */
export async function mockBillDetailsAuthorized(page: Page, billId: string | number): Promise<void> {
    await page.route(`**/bills/${billId}`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: billId, referenceNumber: `BILL-${billId}`, status: 'APPROVED', amount: 120 }) })
    );
}

/** Pre-fix regression guard for EMI-5630 — 403 despite the biller having full privileges. */
export async function mockBillDetailsUnauthorized(page: Page, billId: string | number): Promise<void> {
    await page.route(`**/bills/${billId}`, route =>
        route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify([{ httpStatusCode: 403, message: { messageCode: 'BILL_NOT_FOUND_OR_UNAUTHORIZED_ACCESS', plainText: 'The bill could not be found, or you do not have the necessary permissions.' } }]),
        })
    );
}

/** EMI-5619: the bill payment summary must include the payable amount, not leave it blank. */
export async function mockBillLinkSummaryWithAmount(page: Page, token: string, amount: number): Promise<void> {
    await mockValidLink(page, token, { type: 'BILL', amount, ownerProfileComplete: true });
}
