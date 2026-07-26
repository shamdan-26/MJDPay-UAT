import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomePage } from '../../pageElements/Shared/HomePage';
import { W2WTransferPage } from '../../pageElements/W2WTransfer/W2WTransferPage';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../Login/LoginHelper';

// Fixed/percentage commission, Default-vs-Custom schema, and validation rules
// for W2W Transfer (EMI-2031 Commission management — epic EMI-2186). Gated on
// an Admin Portal configuration step with no automation yet — mirrors
// BankTransferCommission.spec.ts. Maps to
// docs/manual-test-cases/B2B-Transactions.md section I (WT-CM01..18).
//
// Note: the base debit/credit math (sender debited, receiver credited by the
// exact amount) is already exercised without commission in
// W2WTransferFunctionality.spec.ts — what's missing here is the admin-configured
// commission schema behavior these cases describe.

const PENDING = 'pending Admin Portal "Commission Management" automation (EMI-2031)';

test.describe('W2W Transfer – Commission', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(150000);

    let page: Page;
    let loginPage: LoginPage;
    let otp: OtpPage;
    let homePage: HomePage;
    let w2w: W2WTransferPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();

        loginPage = new LoginPage(page);
        otp = new OtpPage(page);
        homePage = new HomePage(page);
        w2w = new W2WTransferPage(page);

        await loginPage.goto(LOGIN_URL);
        await loginPage.fillAndSubmit(VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD);
        if (await otp.isVisible()) {
            await otp.fillAndVerify(await getOtpFromDb(VALID_MOBILE));
        }
        await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });
    });

    test.beforeEach(async () => {
        await homePage.clickW2WTransferButton();
        await expect(w2w.inputCRN).toBeVisible({ timeout: 15000 });
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('WT-CM01 — default schema applies when no custom commission exists', async () => {
        test.skip(true, PENDING);
    });

    test('WT-CM02 — custom per-account schema overrides the default', async () => {
        test.skip(true, PENDING);
    });

    // ---- Fixed commission ----

    test('WT-CM03 — fixed commission deducted on a standard transfer', async () => {
        test.skip(true, PENDING);
    });

    test('WT-CM04 — fixed commission applied at minimum boundary', async () => {
        test.skip(true, PENDING);
    });

    test('WT-CM05 — fixed commission applied at maximum boundary', async () => {
        test.skip(true, PENDING);
    });

    test('WT-CM06 — fixed commission not applied below minimum', async () => {
        test.skip(true, PENDING);
    });

    test('WT-CM07 — fixed commission not applied above maximum', async () => {
        test.skip(true, PENDING);
    });

    // ---- Percentage commission ----

    test('WT-CM08 — percentage commission deducted on a standard transfer', async () => {
        test.skip(true, PENDING);
    });

    test('WT-CM09 — percentage commission applied at minimum boundary', async () => {
        test.skip(true, PENDING);
    });

    test('WT-CM10 — percentage commission applied at maximum boundary', async () => {
        test.skip(true, PENDING);
    });

    test('WT-CM11 — percentage commission not applied below minimum', async () => {
        test.skip(true, PENDING);
    });

    test('WT-CM12 — percentage commission not applied above maximum', async () => {
        test.skip(true, PENDING);
    });

    // ---- Dual-side application & validation ----

    test('WT-CM13 — commission added on sender side / deducted on receiver side', async () => {
        test.skip(true, PENDING);
    });

    test('WT-CM14 — overlapping commission rules rejected', async () => {
        test.skip(true, PENDING);
    });

    test('WT-CM15 — min amount cannot exceed max amount', async () => {
        test.skip(true, PENDING);
    });

    test('WT-CM16 — transaction type cannot be edited on an existing commission', async () => {
        test.skip(true, PENDING);
    });

    test('WT-CM17 — disabling a commission schema stops it applying', async () => {
        test.skip(true, PENDING);
    });

    test('WT-CM18 — re-enabling a commission schema resumes applying it', async () => {
        test.skip(true, PENDING);
    });
});
