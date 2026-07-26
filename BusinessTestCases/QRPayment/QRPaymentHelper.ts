import type { Page } from '@playwright/test';

/**
 * Wallet Payment QR (EMI-590 QR payment, EMI-3545 Dynamic QR, EMI-922 QR
 * management). No page object/helper/testid existed for this screen anywhere
 * in the repo before this file — same MOCK ONLY / best-effort caveat as
 * PaymentLinkHelper.ts. A real camera can't be driven by Playwright, so the
 * "scan" step here mocks the QR-decode API call the app makes after a scan
 * (the same approach TopupPage.ts uses for the Hyperpay iframe and
 * PaymentLinkHelper.ts uses for the Customer-app payment-link flow) rather
 * than attempting to fake camera input.
 */

export const BASE_URL = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';
export const HOME_URL = `${BASE_URL}/business/main/home`;

export interface DecodedQr {
    type: 'DYNAMIC' | 'WALLET';
    walletName: string;
    amount?: number;   // present and fixed for DYNAMIC, absent/editable for WALLET
    reference?: string;
    expiresAt?: string; // ISO timestamp
}

/** Mocks the QR-decode call the app makes right after a (real or simulated) camera scan. */
export async function mockQrDecode(page: Page, qr: DecodedQr): Promise<void> {
    await page.route('**/qr/**/decode', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(qr) })
    );
}

/** Mocks a decode call for an invalid/expired/already-used QR (EMI-3545 QR-expiry rule). */
export async function mockQrDecodeInvalid(page: Page): Promise<void> {
    await page.route('**/qr/**/decode', route =>
        route.fulfill({ status: 410, contentType: 'application/json', body: JSON.stringify({ message: 'Invalid or Expired QR' }) })
    );
}

/** Mocks a tampered/signature-invalid QR payload (EMI-922 encryption/integrity rule). */
export async function mockQrDecodeTampered(page: Page): Promise<void> {
    await page.route('**/qr/**/decode', route =>
        route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'QR signature validation failed' }) })
    );
}

export const SAMPLE_DYNAMIC_QR: DecodedQr = {
    type: 'DYNAMIC',
    walletName: 'Merchant L',
    amount: 50,
    reference: 'MOCK-DYN-QR-001',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
};

export const SAMPLE_WALLET_QR: DecodedQr = {
    type: 'WALLET',
    walletName: 'Merchant L',
    reference: 'MOCK-WALLET-QR-001',
};
