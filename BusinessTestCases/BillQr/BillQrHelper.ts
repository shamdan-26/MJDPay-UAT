import type { Page } from '@playwright/test';
import { waitForToastClear } from '../toastMessages';

/**
 * Bill QR Code scanning — Customer app (EMI-5903, EMI-5685). MOCK ONLY, same
 * caveat as PaymentLinks/PaymentLinkHelper.ts: this flow lives in the Customer
 * app per each ticket's steps ("Open the customer app... Scan the QR code"),
 * which has no existing page object, helper, or documented URL pattern
 * anywhere in this Business Portal repo. The URL shape and endpoint path below
 * are therefore a best-effort guess following the `/api/v1/bills/qr/scan`
 * endpoint captured in both tickets' repro cURLs — reconcile against the real
 * app on first live run.
 */

export const BASE_URL = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';

export function billQrScanUrl(qr: string): string {
    return `${BASE_URL}/customer/bills/qr-scan?qr=${encodeURIComponent(qr)}`;
}

export const VALID_BILL_QR = 'mock-valid-bill-qr-payload';

export interface BillQrSummary {
    referenceNumber: string;
    amount: number;
    status: 'APPROVED' | 'PAID' | 'EXPIRED';
}

const DEFAULT_BILL_QR_SUMMARY: BillQrSummary = { referenceNumber: 'QA-QR-BILL', amount: 90, status: 'APPROVED' };

/** Mocks a successful bill-QR scan/decode (`GET .../bills/qr/scan`). */
export async function mockBillQrScanSuccess(page: Page, summary: BillQrSummary = DEFAULT_BILL_QR_SUMMARY): Promise<void> {
    await page.route('**/bills/qr/scan**', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(summary) })
    );
}

/** EMI-5903 pre-fix regression guard — reproduces the raw 500 the bug ticket captured. */
export async function mockBillQrScanServerError(page: Page): Promise<void> {
    await page.route('**/bills/qr/scan**', route =>
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) })
    );
}

/** EMI-5685: exceeding max scan/pay attempts should return a handled error, not a 500. */
export async function mockBillQrMaxAttemptsExceeded(page: Page): Promise<void> {
    await page.route('**/bills/qr/scan**', route =>
        route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ messageCode: 'MAX_ATTEMPTS_EXCEEDED', message: 'Maximum attempts exceeded' }),
        })
    );
}

/** Pre-fix regression guard for EMI-5685. */
export async function mockBillQrMaxAttemptsServerError(page: Page): Promise<void> {
    await page.route('**/bills/qr/scan**', route =>
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) })
    );
}

export async function gotoBillQrScan(page: Page, qr: string): Promise<void> {
    await page.goto(billQrScanUrl(qr), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForToastClear(page);
}

/**
 * Issues a same-origin fetch *from inside the page* so it goes through
 * `page.route()`. `page.request.*` is a separate API context that does NOT
 * respect `page.route()` mocks — it would hit the real network instead — so
 * the regression-guard tests that need a raw API call use this. Requires the
 * page to have already navigated somewhere same-origin first.
 */
export async function fetchJson(page: Page, path: string): Promise<{ status: number }> {
    const url = `${BASE_URL}${path}`;
    return page.evaluate(async (url) => {
        const res = await fetch(url);
        return { status: res.status };
    }, url);
}
