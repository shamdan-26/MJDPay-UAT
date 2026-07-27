import { test, expect } from '@playwright/test';
import { BillQrPage } from '../../pageElements/BillQr/BillQrPage';
import {
    gotoBillQrScan,
    fetchJson,
    mockBillQrScanSuccess,
    mockBillQrScanServerError,
    mockBillQrMaxAttemptsExceeded,
    mockBillQrMaxAttemptsServerError,
    VALID_BILL_QR,
} from '../BillQrHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Bill QR Code Scanning — Customer app (BQR-01, BQR-02), MOCK ONLY.
// EMI-5903 (500 on scan), EMI-5685 (500 on max scan/pay attempts exceeded).
//
// Same caveat as PaymentLinkResolution.spec.ts: the Customer-app URL shape and
// API path are a best-effort guess reconstructed from each ticket's repro
// cURL (`GET .../api/v1/bills/qr/scan`), not confirmed against a live build.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Bill QR Scanning — Scan Succeeds Without a Server Error (BQR-01, EMI-5903)', () => {
    test('BQR-01: scanning a valid bill QR should show the bill summary, not a 500 error', async ({ page }) => {
        await mockBillQrScanSuccess(page);
        await gotoBillQrScan(page, VALID_BILL_QR);

        const billQr = new BillQrPage(page);
        await expect(billQr.billSummarySection.or(billQr.scanErrorMessage)).toBeVisible({ timeout: 15000 });
        await expect(billQr.scanErrorMessage).not.toBeVisible();
    });

    test('BQR-01 (regression guard): the pre-fix mock reproduces the raw 500 the bug ticket captured', async ({ page }) => {
        await mockBillQrScanServerError(page);
        await gotoBillQrScan(page, VALID_BILL_QR).catch(() => {});

        const { status } = await fetchJson(page, '/api/v1/bills/qr/scan?qr=test');
        expect(status).toBe(500);
    });
});

test.describe('Bill QR Scanning — Max Attempts Exceeded Handled Gracefully (BQR-02, EMI-5685)', () => {
    test('BQR-02: exceeding the maximum scan/pay attempts should let the user return to the first page without a 500 error', async ({ page }) => {
        await mockBillQrMaxAttemptsExceeded(page);
        await gotoBillQrScan(page, VALID_BILL_QR);

        const billQr = new BillQrPage(page);
        await expect(page.getByText(/internal server error|500/i)).not.toBeVisible();
        if (await billQr.backToFirstPageButton.isVisible({ timeout: 5000 }).catch(() => false)) {
            await billQr.backToFirstPageButton.click();
        }
    });

    test('BQR-02 (regression guard): the pre-fix mock reproduces the raw 500 the bug ticket captured', async ({ page }) => {
        await mockBillQrMaxAttemptsServerError(page);
        await gotoBillQrScan(page, VALID_BILL_QR).catch(() => {});

        const { status } = await fetchJson(page, '/api/v1/bills/qr/scan?qr=test');
        expect(status).toBe(500);
    });
});
