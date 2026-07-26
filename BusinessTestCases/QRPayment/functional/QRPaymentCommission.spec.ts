import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { QRPaymentPage } from '../../pageElements/QRPayment/QRPaymentPage';
import { HOME_URL } from '../QRPaymentHelper';
import { LOGIN_URL, getOtpFromDb } from '../../Login/LoginHelper';
import topupData from '../../../data/topupData.json';

// Fixed/percentage commission, Default-vs-Custom schema, and validation rules
// for Wallet Payment QR (EMI-2031 Commission management — epic EMI-2186),
// consistent with EMI-590's own AC ("applicable commission fees applied
// automatically"). Gated on an Admin Portal configuration step with no
// automation yet — mirrors BankTransferCommission.spec.ts. Maps to
// docs/manual-test-cases/B2B-Transactions.md section R (QR-CM01..18).

type LoginData = { companyNumber: string; mobileNumber: string; password: string };
const loginData = (topupData as LoginData[]).find(d => d.companyNumber) as LoginData;

const PENDING = 'pending Admin Portal "Commission Management" automation (EMI-2031)';

test.describe('QR Payment – Commission', () => {
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

    test('QR-CM01 — default schema applies when no custom commission exists', async () => {
        test.skip(true, PENDING);
    });

    test('QR-CM02 — custom per-account schema overrides the default', async () => {
        test.skip(true, PENDING);
    });

    // ---- Fixed commission ----

    test('QR-CM03 — fixed commission deducted on a standard QR payment', async () => {
        test.skip(true, PENDING);
    });

    test('QR-CM04 — fixed commission applied at minimum boundary', async () => {
        test.skip(true, PENDING);
    });

    test('QR-CM05 — fixed commission applied at maximum boundary', async () => {
        test.skip(true, PENDING);
    });

    test('QR-CM06 — fixed commission not applied below minimum', async () => {
        test.skip(true, PENDING);
    });

    test('QR-CM07 — fixed commission not applied above maximum', async () => {
        test.skip(true, PENDING);
    });

    // ---- Percentage commission ----

    test('QR-CM08 — percentage commission deducted on a standard QR payment', async () => {
        test.skip(true, PENDING);
    });

    test('QR-CM09 — percentage commission applied at minimum boundary', async () => {
        test.skip(true, PENDING);
    });

    test('QR-CM10 — percentage commission applied at maximum boundary', async () => {
        test.skip(true, PENDING);
    });

    test('QR-CM11 — percentage commission not applied below minimum', async () => {
        test.skip(true, PENDING);
    });

    test('QR-CM12 — percentage commission not applied above maximum', async () => {
        test.skip(true, PENDING);
    });

    // ---- Dual-side application & validation ----

    test('QR-CM13 — commission added on payer side / deducted on payee side', async () => {
        test.skip(true, PENDING);
    });

    test('QR-CM14 — overlapping commission rules rejected', async () => {
        test.skip(true, PENDING);
    });

    test('QR-CM15 — min amount cannot exceed max amount', async () => {
        test.skip(true, PENDING);
    });

    test('QR-CM16 — transaction type cannot be edited on an existing commission', async () => {
        test.skip(true, PENDING);
    });

    test('QR-CM17 — disabling a commission schema stops it applying', async () => {
        test.skip(true, PENDING);
    });

    test('QR-CM18 — re-enabling a commission schema resumes applying it', async () => {
        test.skip(true, PENDING);
    });
});
