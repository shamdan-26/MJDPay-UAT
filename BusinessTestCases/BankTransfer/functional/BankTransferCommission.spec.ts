import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/LoginPage';
import { OtpPage } from '../../pageElements/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/HomepageQuickActionsPage';
import { BankTransferPage } from '../../pageElements/BankTransferPage';
import { HOME_URL } from '../BankTransferHelper';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../Login/LoginHelper';

// Fixed and percentage commission deduction on cash-out, including min/max
// boundary behavior (EMI-180, Admin Portal → Commission Management → Accounts
// Commission). Gated on an Admin Portal configuration step with no automation
// yet — each test is skipped rather than omitted, so this file's test count
// stays 1:1 with the source test cases (AIO_CASE_1-64_Export_05Jul2026_140738.pdf,
// TC-2388–2397). Remove the test.skip() line once an Admin Portal helper for
// Commission Management exists.
//
// Note: the commission/VAT *arithmetic* (Total = Original − commission − VAT,
// VAT = commission × 15%) is already exercised generically in
// BankTransferHappyPath.spec.ts — what's missing here is the admin-configured
// fixed/percentage/min/max business rules these cases actually describe.

const PENDING = 'pending Admin Portal "Commission Management" automation (EMI-180)';

test.describe('BankTransfer – Commission', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(150000);

    let page: Page;
    let loginPage: LoginPage;
    let otp: OtpPage;
    let quickActions: HomepageQuickActionsPage;
    let bt: BankTransferPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();

        loginPage = new LoginPage(page);
        otp = new OtpPage(page);
        quickActions = new HomepageQuickActionsPage(page);
        bt = new BankTransferPage(page);

        await loginPage.goto(LOGIN_URL);
        await loginPage.fillAndSubmit(VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD);
        if (await otp.isVisible()) {
            await otp.fillAndVerify(await getOtpFromDb(VALID_MOBILE));
        }
        await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });
    });

    test.beforeEach(async () => {
        await page.goto(HOME_URL);
        await page.waitForLoadState('domcontentloaded');
        await quickActions.quickActionCashoutCard.click();
        await expect(bt.inputAmount).toBeVisible({ timeout: 15000 });
    });

    test.afterAll(async () => {
        await page.close();
    });

    // ---- Fixed commission ----

    test('TC-2388 — deducts a fixed commission on a standard transfer', async () => {
        test.skip(true, PENDING);
        // Admin: Commission Management → Accounts Commission → Add New Commission → configure
        // a fixed amount → Save. Biller: transfer within the commission's applicable range —
        // expect the deducted commission to be reflected in the Confirmation summary and in
        // the Biller/admin wallet deltas.
    });

    test('TC-2389 — deducts the fixed commission when the transfer equals the minimum value', async () => {
        test.skip(true, PENDING);
    });

    test('TC-2390 — deducts the fixed commission when the transfer equals the maximum value', async () => {
        test.skip(true, PENDING);
    });

    test('TC-2391 — does not deduct the fixed commission below the configured minimum value', async () => {
        test.skip(true, PENDING);
    });

    test('TC-2392 — does not deduct the fixed commission above the configured maximum value', async () => {
        test.skip(true, PENDING);
    });

    // ---- Percentage commission ----

    test('TC-2393 — deducts a percentage commission on a standard transfer', async () => {
        test.skip(true, PENDING);
        // Same admin flow as TC-2388, configuring a percentage instead of a fixed amount.
    });

    test('TC-2394 — deducts the percentage commission when the transfer equals the minimum value', async () => {
        test.skip(true, PENDING);
    });

    test('TC-2395 — deducts the percentage commission when the transfer equals the maximum value', async () => {
        test.skip(true, PENDING);
    });

    test('TC-2396 — does not deduct the percentage commission below the configured minimum value', async () => {
        test.skip(true, PENDING);
    });

    test('TC-2397 — does not deduct the percentage commission above the configured maximum value', async () => {
        test.skip(true, PENDING);
    });
});
