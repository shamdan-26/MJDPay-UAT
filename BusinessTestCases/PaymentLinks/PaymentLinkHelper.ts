import type { Page } from '@playwright/test';
import { waitForToastClear } from '../shared';
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

const BASE_URL = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';

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
