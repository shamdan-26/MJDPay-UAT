import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { QRPaymentPage } from '../../pageElements/QRPayment/QRPaymentPage';
import {
    HOME_URL,
    mockQrDecode,
    mockQrDecodeInvalid,
    mockQrDecodeTampered,
    SAMPLE_DYNAMIC_QR,
    SAMPLE_WALLET_QR,
} from '../QRPaymentHelper';
import { LOGIN_URL, getOtpFromDb } from '../../Login/LoginHelper';
import topupData from '../../../data/topupData.json';

// Wallet Payment QR (EMI-590 QR payment, EMI-3545 Dynamic QR, EMI-922 QR
// management). No prior automation existed for this screen — see
// QRPaymentPage.ts / QRPaymentHelper.ts for the locator/mock caveat. Maps to
// docs/manual-test-cases/B2B-Transactions.md section E (QR-01..QR-17).
//
// Real camera input can't be driven by Playwright, so every "scan" here mocks
// the app's post-scan QR-decode API call rather than faking camera frames —
// same approach PaymentLinkHelper.ts uses for the guest-flow Customer app.

type LoginData = { companyNumber: string; mobileNumber: string; password: string };
const loginData = (topupData as LoginData[]).find(d => d.companyNumber) as LoginData;

async function loginAndOpenQrScanner(page: Page): Promise<QRPaymentPage> {
    const loginPage = new LoginPage(page);
    const otp = new OtpPage(page);

    await loginPage.goto(LOGIN_URL);
    await loginPage.fillAndSubmit(loginData.companyNumber, loginData.mobileNumber, loginData.password);
    if (await otp.isVisible()) {
        await otp.fillAndVerify(await getOtpFromDb(loginData.mobileNumber));
    }
    await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });

    await page.goto(HOME_URL);
    await page.waitForLoadState('domcontentloaded');

    const quickActions = new HomepageQuickActionsPage(page);
    await quickActions.quickActionReceivePaymentCard.click();

    return new QRPaymentPage(page);
}

test.describe('QR Payment — Dynamic QR Locks the Amount (QR-01, QR-02, QR-04)', () => {
    test('QR-02 / QR-04: scanning a Dynamic QR should populate and disable the amount field', async ({ page }) => {
        await mockQrDecode(page, SAMPLE_DYNAMIC_QR);
        const qr = await loginAndOpenQrScanner(page);

        await qr.selectDynamicQrMode();
        await qr.waitForPostScanScreen();

        await expect(qr.amountInput).toHaveValue(String(SAMPLE_DYNAMIC_QR.amount));
        await qr.assertAmountFieldDisabled();
    });
});

test.describe('QR Payment — Wallet QR Leaves the Amount Editable (QR-03, QR-04)', () => {
    test('QR-03 / QR-04: scanning a Wallet QR should leave the amount field editable for manual entry', async ({ page }) => {
        await mockQrDecode(page, SAMPLE_WALLET_QR);
        const qr = await loginAndOpenQrScanner(page);

        await qr.selectWalletQrMode();
        await qr.waitForPostScanScreen();

        await qr.assertAmountFieldEditable();
        await qr.enterAmount('75');
        await expect(qr.amountInput).toHaveValue('75');
    });
});

test.describe('QR Payment — Successful Payment (QR-06, QR-08)', () => {
    test('QR-08: a valid QR payment should complete via OTP and show a success confirmation', async ({ page }) => {
        await mockQrDecode(page, SAMPLE_WALLET_QR);
        const qr = await loginAndOpenQrScanner(page);

        await qr.selectWalletQrMode();
        await qr.waitForPostScanScreen();
        await qr.enterAmount('30');
        await qr.clickProceed();

        const otp = new OtpPage(page);
        if (await otp.isVisible()) {
            await otp.fillAndVerify(await getOtpFromDb(loginData.mobileNumber));
        }

        await qr.assertPaymentSucceeded();
    });
});

test.describe('QR Payment — Regression: Expired / Reused QR Rejected (QR-12, QR-13)', () => {
    test('QR-12 / QR-13: scanning an expired or already-used QR should show "Invalid or Expired QR"', async ({ page }) => {
        await mockQrDecodeInvalid(page);
        const qr = await loginAndOpenQrScanner(page);

        await qr.selectDynamicQrMode();
        await qr.assertInvalidOrExpiredQr();
    });
});

test.describe('QR Payment — Tampered QR Payload Rejected (QR-15)', () => {
    test('QR-15: a QR with a tampered/invalid signature should be rejected with a generic error', async ({ page }) => {
        await mockQrDecodeTampered(page);
        const qr = await loginAndOpenQrScanner(page);

        await qr.selectWalletQrMode();
        await expect(page.getByText(/signature|invalid qr/i)).toBeVisible({ timeout: 15000 });
    });
});

test.describe('QR Payment — Insufficient Balance Blocks Payment (QR-05)', () => {
    test('QR-05: an amount exceeding the payer\'s balance should be rejected before OTP', async ({ page }) => {
        await mockQrDecode(page, SAMPLE_WALLET_QR);
        const qr = await loginAndOpenQrScanner(page);

        await qr.selectWalletQrMode();
        await qr.waitForPostScanScreen();
        await qr.enterAmount('999999999');
        await qr.clickProceed();

        await expect(qr.toastMessage.or(page.getByText(/insufficient/i))).toBeVisible({ timeout: 15000 });
    });
});
