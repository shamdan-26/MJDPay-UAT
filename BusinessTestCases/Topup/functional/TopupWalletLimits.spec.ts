import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { TopupPage } from '../../pageElements/Topup/TopupPage';
import { HOME_URL } from '../TopupHelper';
import { LOGIN_URL, getOtpFromDb } from '../../Login/LoginHelper';
import topupData from '../../../data/topupData.json';

// Wallet-balance limit enforcement for Top Up (EMI-659, EMI-1653, EMI-195 —
// epic EMI-2185). Top-up only credits the user's own wallet, so only the
// *maximum* ceiling is relevant here (no in-platform sender to hit a minimum
// floor). Gated on an Admin Portal configuration step with no automation yet —
// mirrors BankTransferWalletLimits.spec.ts. Maps to
// docs/manual-test-cases/B2B-Transactions.md section M (TU-WB01..08).

type LoginData = { companyNumber: string; mobileNumber: string; password: string };
const loginData = (topupData as LoginData[]).find(d => d.companyNumber) as LoginData;

const PENDING = 'pending Admin Portal "Manage Limits → Wallet Balance" automation (EMI-1653/EMI-195)';

test.describe('Topup – Wallet Balance Limits', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(150000);

    let page: Page;
    let loginPage: LoginPage;
    let otp: OtpPage;
    let quickActions: HomepageQuickActionsPage;
    let topup: TopupPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();

        loginPage = new LoginPage(page);
        otp = new OtpPage(page);
        quickActions = new HomepageQuickActionsPage(page);
        topup = new TopupPage(page);

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
        await quickActions.quickActionTopupCard.click();
        await expect(topup.inputAmount).toBeVisible({ timeout: 15000 });
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('TU-WB01 — top-up within max-balance ceiling succeeds (Merchant, Low risk)', async () => {
        test.skip(true, PENDING);
    });

    test('TU-WB02 — top-up breaching max-balance ceiling is blocked (Merchant, Low risk)', async () => {
        test.skip(true, PENDING);
    });

    test('TU-WB03 — top-up within max-balance ceiling succeeds (Biller, Low risk)', async () => {
        test.skip(true, PENDING);
    });

    test('TU-WB04 — top-up breaching max-balance ceiling is blocked (Biller, Low risk)', async () => {
        test.skip(true, PENDING);
    });

    test('TU-WB05 — top-up within max-balance ceiling succeeds (Merchant, Medium risk)', async () => {
        test.skip(true, PENDING);
    });

    test('TU-WB06 — top-up breaching max-balance ceiling is blocked (Merchant, Medium risk)', async () => {
        test.skip(true, PENDING);
    });

    test('TU-WB07 — top-up within max-balance ceiling succeeds (Biller, Medium risk)', async () => {
        test.skip(true, PENDING);
    });

    test('TU-WB08 — top-up breaching max-balance ceiling is blocked (Biller, Medium risk)', async () => {
        test.skip(true, PENDING);
    });
});
