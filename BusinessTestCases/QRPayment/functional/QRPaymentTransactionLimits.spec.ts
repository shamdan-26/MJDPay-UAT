import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { QRPaymentPage } from '../../pageElements/QRPayment/QRPaymentPage';
import { HOME_URL } from '../QRPaymentHelper';
import { LOGIN_URL, getOtpFromDb } from '../../Login/LoginHelper';
import topupData from '../../../data/topupData.json';

// Transaction amount/count limit enforcement for Wallet Payment QR (EMI-87
// Transaction Limitations, EMI-1653, EMI-195 — epic EMI-2185), by Risk Level ×
// Wallet Tier × Platform × Period. Gated on an Admin Portal configuration step
// with no automation yet — mirrors BankTransferTransactionLimits.spec.ts.
// Maps to docs/manual-test-cases/B2B-Transactions.md section Q (QR-TL01..12).

type LoginData = { companyNumber: string; mobileNumber: string; password: string };
const loginData = (topupData as LoginData[]).find(d => d.companyNumber) as LoginData;

const PENDING = 'pending Admin Portal "Manage Limits → Transaction" automation (EMI-87/EMI-1653/EMI-195)';

test.describe('QR Payment – Transaction Limits', () => {
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

    // ---- Amount limits ----

    test('QR-TL01 — QR payments within the daily amount limit succeed (App)', async () => {
        test.skip(true, PENDING);
    });

    test('QR-TL02 — cumulative QR payments exceeding the daily amount limit are blocked (App)', async () => {
        test.skip(true, PENDING);
    });

    test('QR-TL03 — QR payments within the weekly amount limit succeed', async () => {
        test.skip(true, PENDING);
    });

    test('QR-TL04 — cumulative QR payments exceeding the weekly amount limit are blocked', async () => {
        test.skip(true, PENDING);
    });

    test('QR-TL05 — QR payments within the monthly amount limit succeed (Web)', async () => {
        test.skip(true, PENDING);
    });

    test('QR-TL06 — cumulative QR payments exceeding the monthly amount limit are blocked (Web)', async () => {
        test.skip(true, PENDING);
    });

    // ---- Count limits ----

    test('QR-TL07 — QR payments within the daily count limit succeed', async () => {
        test.skip(true, PENDING);
    });

    test('QR-TL08 — QR payment once the daily count limit is exceeded is blocked', async () => {
        test.skip(true, PENDING);
    });

    test('QR-TL09 — QR payments within the weekly count limit succeed', async () => {
        test.skip(true, PENDING);
    });

    test('QR-TL10 — QR payment once the weekly count limit is exceeded is blocked', async () => {
        test.skip(true, PENDING);
    });

    test('QR-TL11 — QR payments within the monthly count limit succeed', async () => {
        test.skip(true, PENDING);
    });

    test('QR-TL12 — QR payment once the monthly count limit is exceeded is blocked', async () => {
        test.skip(true, PENDING);
    });
});
