import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/LoginPage';
import { OtpPage } from '../../pageElements/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/homepage/HomepageQuickActionsPage';
import { BankTransferPage } from '../../Helpers/BankTransferPage';
import { HOME_URL } from '../BankTransferHelper';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../login/LoginHelper';

// Whether a Merchant transfer requires OTP at all is controlled by an Admin
// Portal toggle (EMI-180, Configuration Settings → Transaction → activate/
// deactivate). The rest of the suite always exercises the OTP-required path;
// these two cases prove the toggle itself is respected in both directions.
// Gated on an Admin Portal configuration step with no automation yet — each
// test is skipped rather than omitted, so this file's test count stays 1:1
// with the source test cases (AIO_CASE_1-64_Export_05Jul2026_140738.pdf,
// TC-2402–2403). Remove the test.skip() line once an Admin Portal helper for
// Configuration Settings → Transaction exists.

const PENDING = 'pending Admin Portal "Configuration Settings → Transaction OTP toggle" automation (EMI-180)';

test.describe('BankTransfer – Merchant OTP Requirement Toggle', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(150000);

    let page: Page;
    let loginPage: LoginPage;
    let otp: OtpPage;
    let quickActions: HomepageQuickActionsPage;
    let bt: BankTransferPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.context().grantPermissions(['geolocation'], { origin: new URL(LOGIN_URL).origin });

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

    test('TC-2402 — prompts for OTP when the admin has activated the transaction OTP requirement', async () => {
        test.skip(true, PENDING);
        // Admin: Configuration Settings → Transaction → activate. Merchant: transfer a valid
        // amount and Proceed — expect the OTP modal to appear, and the transfer to process only
        // after a successful OTP verification.
    });

    test('TC-2403 — skips OTP when the admin has deactivated the transaction OTP requirement', async () => {
        test.skip(true, PENDING);
        // Admin: Configuration Settings → Transaction → deactivate. Merchant: transfer a valid
        // amount and Proceed — expect the transfer to process immediately, with no OTP modal.
    });
});
