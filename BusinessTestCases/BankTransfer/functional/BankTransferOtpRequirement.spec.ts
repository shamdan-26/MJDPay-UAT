import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { BankTransferPage } from '../../pageElements/Shared/BankTransferPage';
import { HOME_URL, proceedToConfirmation, ensureNonZeroBalance } from '../helpers/BankTransferHelper.ts';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../Login/helpers/LoginHelper.ts';

// Whether a Merchant transfer requires OTP is controlled by an Admin Portal
// toggle (EMI-180, Configuration Settings → Transaction → activate/deactivate).
// TC-2402 (OTP required) is the default state on dev, so it runs as-is. TC-2403
// (OTP deactivated) only becomes meaningful once that toggle is flipped in the
// Admin Portal — until then it self-skips at runtime (with a clear reason)
// rather than being hard test.skip()'d, and it runs automatically once the
// environment has OTP turned off.

test.describe('BankTransfer – Merchant OTP Requirement Toggle', () => {
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

    test('TC-2402 — prompts for OTP when the admin has activated the transaction OTP requirement', async () => {
        // OTP requirement is active by default on dev — the OTP step must gate the
        // transfer after the Confirmation summary.
        await bt.enterAmount('10');
        await proceedToConfirmation(page, bt);
        await bt.waitForSummaryToSettle();
        await bt.clickProceedButtonInSummary();

        await expect(otp.inputs.first()).toBeVisible({ timeout: 15000 });
        await expect(otp.inputs).toHaveCount(6);
        await expect.soft(otp.verifyButton).toBeVisible();

        await otp.cancelButton.click();
    });

    test('TC-2403 — skips OTP when the admin has deactivated the transaction OTP requirement', async () => {
        // Admin: Configuration Settings → Transaction → deactivate. With OTP off,
        // Proceed on the summary completes the transfer immediately, no OTP modal.
        await bt.getBalanceBeforeBankTransfer();
        await bt.enterAmount('10');
        await proceedToConfirmation(page, bt);
        await bt.waitForSummaryToSettle();
        await bt.clickProceedButtonInSummary();

        const otpShown = await otp.inputs.first()
            .waitFor({ state: 'visible', timeout: 8000 })
            .then(() => true)
            .catch(() => false);
        test.skip(
            otpShown,
            'transaction OTP requirement is still ACTIVE on this environment — deactivate it via Admin Portal → Configuration Settings → Transaction to exercise this case',
        );

        // No OTP prompted → the transfer must process straight through.
        await expect(page.getByRole('heading', { name: /successful|ناجح|نجاح/i })).toBeVisible({ timeout: 20000 });
        await bt.clickSuccessful_OkButton();

        await page.goto(HOME_URL);
        await page.waitForLoadState('domcontentloaded');
        await bt.checkBalanceAfterBankTransfer('10');
    });
});
