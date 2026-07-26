import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { TopupPage } from '../../pageElements/Topup/TopupPage';
import { HOME_URL } from '../TopupHelper';
import { LOGIN_URL, getOtpFromDb } from '../../Login/LoginHelper';
import topupData from '../../../data/topupData.json';

// Transaction amount/count limit enforcement for Top Up (EMI-87 Transaction
// Limitations — its own example table explicitly names "Merchant top-up",
// including a High-risk example where the count limit is 0 — plus EMI-1653,
// EMI-195, epic EMI-2185). Gated on an Admin Portal configuration step with no
// automation yet — mirrors BankTransferTransactionLimits.spec.ts. Maps to
// docs/manual-test-cases/B2B-Transactions.md section N (TU-TL01..12).

type LoginData = { companyNumber: string; mobileNumber: string; password: string };
const loginData = (topupData as LoginData[]).find(d => d.companyNumber) as LoginData;

const PENDING = 'pending Admin Portal "Manage Limits → Transaction" automation (EMI-87/EMI-1653/EMI-195)';

test.describe('Topup – Transaction Limits', () => {
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

    // ---- Amount limits ----

    test('TU-TL01 — top-ups within the daily amount limit succeed (App)', async () => {
        test.skip(true, PENDING);
    });

    test('TU-TL02 — cumulative top-ups exceeding the daily amount limit are blocked (App)', async () => {
        test.skip(true, PENDING);
    });

    test('TU-TL03 — top-ups within the weekly amount limit succeed', async () => {
        test.skip(true, PENDING);
    });

    test('TU-TL04 — cumulative top-ups exceeding the weekly amount limit are blocked', async () => {
        test.skip(true, PENDING);
    });

    test('TU-TL05 — top-ups within the monthly amount limit succeed', async () => {
        test.skip(true, PENDING);
    });

    test('TU-TL06 — cumulative top-ups exceeding the monthly amount limit are blocked', async () => {
        test.skip(true, PENDING);
    });

    // ---- Count limits ----

    test('TU-TL07 — top-ups within the daily count limit succeed', async () => {
        test.skip(true, PENDING);
    });

    test('TU-TL08 — top-up once the daily count limit is exceeded is blocked', async () => {
        test.skip(true, PENDING);
    });

    test('TU-TL09 — High-risk account with a 0 count limit cannot top up at all', async () => {
        test.skip(true, PENDING);
        // Per EMI-87's own example row: Risk=High, Wallet Tier=basic, Transaction=Merchant
        // top-up, Platform=App, Period=Daily, Count=0 — any attempt should be blocked outright.
    });

    test('TU-TL10 — top-ups within the monthly count limit succeed', async () => {
        test.skip(true, PENDING);
    });

    test('TU-TL11 — top-up once the monthly count limit is exceeded is blocked', async () => {
        test.skip(true, PENDING);
    });

    test('TU-TL12 — top-ups within the weekly count limit succeed', async () => {
        test.skip(true, PENDING);
    });
});
