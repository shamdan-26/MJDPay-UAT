import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { QRPaymentPage } from '../../pageElements/QRPayment/QRPaymentPage';
import { HOME_URL } from '../QRPaymentHelper';
import { LOGIN_URL, getOtpFromDb } from '../../Login/LoginHelper';
import topupData from '../../../data/topupData.json';

// Wallet-balance limit enforcement for Wallet Payment QR (EMI-659, EMI-1653,
// EMI-195 — epic EMI-2185). Gated on an Admin Portal risk-level/wallet-type
// configuration step with no automation yet — mirrors
// BankTransferWalletLimits.spec.ts. Maps to
// docs/manual-test-cases/B2B-Transactions.md section P (QR-WB01..08).

type LoginData = { companyNumber: string; mobileNumber: string; password: string };
const loginData = (topupData as LoginData[]).find(d => d.companyNumber) as LoginData;

const PENDING = 'pending Admin Portal "Manage Limits → Wallet Balance" automation (EMI-1653/EMI-195)';

test.describe('QR Payment – Wallet Balance Limits', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(150000);

    let page: Page;
    let loginPage: LoginPage;
    let otp: OtpPage;
    let quickActions: HomepageQuickActionsPage;
    let qr: QRPaymentPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();

        loginPage = new LoginPage(page);
        otp = new OtpPage(page);
        quickActions = new HomepageQuickActionsPage(page);
        qr = new QRPaymentPage(page);

        await loginPage.goto(LOGIN_URL);
        await loginPage.fillAndSubmit(loginData.companyNumber, loginData.mobileNumber, loginData.password);
        if (await otp.isVisible()) {
            await otp.fillAndVerify(await getOtpFromDb(loginData.mobileNumber));
        }
        await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });
    });

    test.beforeEach(async () => {
        await page.goto(HOME_URL);
        await page.waitForLoadState('domcontentloaded');
        await quickActions.quickActionReceivePaymentCard.click();
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('QR-WB01 — payer QR payment within min-balance floor succeeds (Merchant, Low risk)', async () => {
        test.skip(true, PENDING);
    });

    test('QR-WB02 — payer QR payment breaching min-balance floor is blocked (Merchant, Low risk)', async () => {
        test.skip(true, PENDING);
    });

    test('QR-WB03 — payee credit within max-balance ceiling succeeds (Biller, Low risk)', async () => {
        test.skip(true, PENDING);
    });

    test('QR-WB04 — payee credit breaching max-balance ceiling is blocked (Biller, Low risk)', async () => {
        test.skip(true, PENDING);
    });

    test('QR-WB05 — payer QR payment within min-balance floor succeeds (Merchant, Medium risk)', async () => {
        test.skip(true, PENDING);
    });

    test('QR-WB06 — payer QR payment breaching min-balance floor is blocked (Merchant, Medium risk)', async () => {
        test.skip(true, PENDING);
    });

    test('QR-WB07 — payee credit within max-balance ceiling succeeds (Biller, Medium risk)', async () => {
        test.skip(true, PENDING);
    });

    test('QR-WB08 — payee credit breaching max-balance ceiling is blocked (Biller, Medium risk)', async () => {
        test.skip(true, PENDING);
    });
});
