import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { TopupPage } from '../../pageElements/Topup/TopupPage';
import { HOME_URL } from '../TopupHelper';
import { LOGIN_URL, getOtpFromDb } from '../../Login/LoginHelper';
import topupData from '../../../data/topupData.json';

// Fixed/percentage commission, Default-vs-Custom schema, and validation rules
// for Top Up (EMI-2031 Commission management — epic EMI-2186). Since top-up
// has no in-platform counterparty, commission (if configured) is deducted
// from the credited amount rather than split sender/receiver. Gated on an
// Admin Portal configuration step with no automation yet — mirrors
// BankTransferCommission.spec.ts. Maps to
// docs/manual-test-cases/B2B-Transactions.md section O (TU-CM01..18).

type LoginData = { companyNumber: string; mobileNumber: string; password: string };
const loginData = (topupData as LoginData[]).find(d => d.companyNumber) as LoginData;

const PENDING = 'pending Admin Portal "Commission Management" automation (EMI-2031)';

test.describe('Topup – Commission', () => {
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

    test('TU-CM01 — default schema applies when no custom commission exists', async () => {
        test.skip(true, PENDING);
    });

    test('TU-CM02 — custom per-account schema overrides the default', async () => {
        test.skip(true, PENDING);
    });

    // ---- Fixed commission ----

    test('TU-CM03 — fixed commission deducted on a standard top-up', async () => {
        test.skip(true, PENDING);
    });

    test('TU-CM04 — fixed commission applied at minimum boundary', async () => {
        test.skip(true, PENDING);
    });

    test('TU-CM05 — fixed commission applied at maximum boundary', async () => {
        test.skip(true, PENDING);
    });

    test('TU-CM06 — fixed commission not applied below minimum', async () => {
        test.skip(true, PENDING);
    });

    test('TU-CM07 — fixed commission not applied above maximum', async () => {
        test.skip(true, PENDING);
    });

    // ---- Percentage commission ----

    test('TU-CM08 — percentage commission deducted on a standard top-up', async () => {
        test.skip(true, PENDING);
    });

    test('TU-CM09 — percentage commission applied at minimum boundary', async () => {
        test.skip(true, PENDING);
    });

    test('TU-CM10 — percentage commission applied at maximum boundary', async () => {
        test.skip(true, PENDING);
    });

    test('TU-CM11 — percentage commission not applied below minimum', async () => {
        test.skip(true, PENDING);
    });

    test('TU-CM12 — percentage commission not applied above maximum', async () => {
        test.skip(true, PENDING);
    });

    // ---- Net-credit application & validation ----

    test('TU-CM13 — credited amount is net of commission', async () => {
        test.skip(true, PENDING);
    });

    test('TU-CM14 — overlapping commission rules rejected', async () => {
        test.skip(true, PENDING);
    });

    test('TU-CM15 — min amount cannot exceed max amount', async () => {
        test.skip(true, PENDING);
    });

    test('TU-CM16 — transaction type cannot be edited on an existing commission', async () => {
        test.skip(true, PENDING);
    });

    test('TU-CM17 — disabling a commission schema stops it applying', async () => {
        test.skip(true, PENDING);
    });

    test('TU-CM18 — re-enabling a commission schema resumes applying it', async () => {
        test.skip(true, PENDING);
    });
});
