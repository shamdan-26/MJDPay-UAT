import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { BankTransferPage } from '../../pageElements/Shared/BankTransferPage';
import { HOME_URL } from '../BankTransferHelper';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../Login/LoginHelper';

// Wallet-balance limit enforcement (EMI-180, Admin Portal → Manage Limits → Wallet
// Balance). Every case is gated on an Admin Portal risk-level configuration step
// that has no automation yet — each test is skipped rather than omitted, so this
// file's test count stays 1:1 with the source test cases
// (AIO_CASE_1-64_Export_05Jul2026_140738.pdf, TC-2362–2369 and TC-2398–2401)
// instead of silently dropping them from the suite. Remove the test.skip() line
// once an Admin Portal helper for Manage Limits → Wallet Balance exists.

const PENDING = 'pending Admin Portal "Manage Limits → Wallet Balance" automation (EMI-180)';

test.describe('BankTransfer – Wallet Balance Limits', () => {
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

    test('TC-2362 — allows a transfer within the admin-configured wallet limit', async () => {
        test.skip(true, PENDING);
        // Admin: Manage Limits → Wallet Balance → Update Limits → set a Biller risk-level
        // ceiling → Save. Biller: enter an amount under that ceiling and Proceed — expect
        // the standard success flow (balance debited, admin wallet credited, running-balance
        // popup populated with Wallet reference/Amount/Balance Before/After/Debit/Credit/Created).
    });

    test('TC-2363 — blocks a transfer that exceeds the admin-configured wallet limit', async () => {
        test.skip(true, PENDING);
        // Same admin setup as TC-2362; Biller enters an amount over the ceiling — expect the
        // transfer to be rejected before OTP/summary rather than silently succeeding.
    });

    test('TC-2364 — allows a transfer within the wallet limit (second configured risk level)', async () => {
        test.skip(true, PENDING);
    });

    test('TC-2365 — blocks a transfer exceeding the wallet limit (second configured risk level)', async () => {
        test.skip(true, PENDING);
    });

    test('TC-2366 — allows a transfer within the wallet limit (third configured risk level)', async () => {
        test.skip(true, PENDING);
    });

    test('TC-2367 — blocks a transfer exceeding the wallet limit (third configured risk level)', async () => {
        test.skip(true, PENDING);
    });

    test('TC-2368 — allows a transfer within the wallet limit (fourth configured risk level)', async () => {
        test.skip(true, PENDING);
    });

    test('TC-2369 — blocks a transfer exceeding the wallet limit (fourth configured risk level)', async () => {
        test.skip(true, PENDING);
    });

    test('TC-2398 — allows a transfer within the wallet limit (repeat scenario)', async () => {
        test.skip(true, PENDING);
    });

    test('TC-2399 — blocks a transfer exceeding the wallet limit (repeat scenario)', async () => {
        test.skip(true, PENDING);
    });

    test('TC-2400 — allows a transfer within the wallet limit (repeat scenario)', async () => {
        test.skip(true, PENDING);
    });

    test('TC-2401 — blocks a transfer exceeding the wallet limit (repeat scenario)', async () => {
        test.skip(true, PENDING);
    });
});
