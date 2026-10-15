import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { BankTransferPage } from '../../pageElements/Shared/BankTransferPage';
import { HOME_URL, ensureNonZeroBalance } from '../BankTransferHelper';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../Login/LoginHelper';

// System / Admin cash-out (EMI-2050, TC-3129–3133, plus the notification cases
// TC-3127 / TC-3132). This is the *Admin Portal* "System Cash-Out" surface —
// a pre-configured, non-editable destination IBAN, an explicit admin-confirmation
// step, and finance email/SMS notifications — not the Biller/Merchant Cashout
// flow the rest of this folder covers. The file is kept 1:1 with the source
// export (AIO_CASE_1-64_Export_07Sep2026_130734.pdf).
//
// NOTE: the cases below are still stubs — there is no Admin Portal helper for
// System Cash-Out yet, so each body is a comment describing the assertions to
// write once that tooling exists (and the Biller-side SMS/email notification
// checks need to be split into their own mailbox-backed test).

test.describe('BankTransfer – System / Admin Cash-Out', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(150000);

    let page: Page;
    let loginPage: LoginPage;
    let otp: OtpPage;
    let quickActions: HomepageQuickActionsPage;
    let bt: BankTransferPage;

    test.beforeAll(async ({ browser }) => {
        // Hooks don't inherit the describe-level test.setTimeout() above — it
        // only extends tests. ensureNonZeroBalance's card-topup branch (OTP
        // round-trip included) can push this hook past the config's default
        // 60s hook timeout, so extend it here too.
        test.setTimeout(150000);
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
        await ensureNonZeroBalance(page, VALID_MOBILE);
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

    test('TC-3127 — user receives an SMS and email confirmation after a successful cash-out', async () => {
        // Complete a Biller cash-out, then assert the shared test mailbox received a
        // confirmation email carrying the amount, reference, and masked IBAN
        // (SMS is not automatable here). Belongs with support/emailOtp.ts-backed checks.
    });

    test('TC-3129 — the Admin cash-out page pre-fills the destination IBAN and makes it non-editable', async () => {
        // Admin Portal → System Cash-Out: destination IBAN pre-filled from the
        // system wallet config, input readonly/disabled.
    });

    test('TC-3130 — an invalid configured system IBAN blocks the cash-out with a clear error', async () => {
        // With an intentionally invalid system IBAN configured, attempting the
        // cash-out shows "The destination IBAN is invalid. Please update the
        // configuration and try again."
    });

    test('TC-3131 — the system cash-out executes only after explicit admin confirmation', async () => {
        // Admin enters an amount within the system wallet balance; nothing moves
        // until the confirmation step is completed.
    });

    test('TC-3132 — finance is emailed a confirmation after a successful system cash-out', async () => {
        // The configured finance contact receives an email with the transaction details.
    });

    test('TC-3133 — a system cash-out is logged with system wallet id, amount, IBAN, and status', async () => {
        // Log/records assertion (System Wallet ID, Amount, Destination IBAN,
        // Status ∈ {Pending, Successful, Failed}); needs Admin Portal / DB access.
    });
});
