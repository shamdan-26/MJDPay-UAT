import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { BankTransferPage } from '../../pageElements/Shared/BankTransferPage';
import { HOME_URL, proceedToConfirmation, SUMMARY_LABEL, ensureNonZeroBalance } from '../helpers/BankTransferHelper.ts';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../Login/helpers/LoginHelper.ts';

// Abandon/cancel flows and cross-step state persistence. The legacy suite had
// two near-duplicate "cancel from Confirmation" tests (one via the redesigned
// screen's Cancel button, one via the older screen) — consolidated here into
// the single, more robust version (waits for the async summary to settle
// before cancelling, then confirms the Amount step is back).

test.describe('BankTransfer – Session & Cancellation', () => {
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

    test('should discard the transfer and leave the balance unchanged when the page is refreshed mid-flow', async () => {
        await bt.getBalanceBeforeBankTransfer();
        await bt.enterAmount('10.00');
        await proceedToConfirmation(page, bt);
        await page.reload();
        await bt.checkBalanceRemainsUnchanged();
    });

    test('should return to the Amount step and leave the balance unchanged when Cancel is clicked on the Confirmation summary', async () => {
        await bt.getBalanceBeforeBankTransfer();
        await bt.enterAmount('10');
        await proceedToConfirmation(page, bt);
        await bt.waitForSummaryToSettle();

        await bt.clickSummaryCancelButton();
        await expect(bt.inputAmount).toBeVisible({ timeout: 10000 });
        await bt.checkBalanceRemainsUnchanged();
    });

    test('should return home and leave the balance unchanged when Cancel is clicked at the OTP step', async () => {
        await bt.getBalanceBeforeBankTransfer();
        await bt.enterAmount('10');
        await proceedToConfirmation(page, bt);
        await bt.waitForSummaryToSettle();
        await bt.clickProceedButtonInSummary();
        await expect(otp.inputs.first()).toBeVisible({ timeout: 15000 });

        await otp.cancelButton.click();
        await page.goto(HOME_URL);
        await page.waitForLoadState('domcontentloaded');
        await bt.checkBalanceRemainsUnchanged();
    });

    // NOTE: the Confirmation summary has only "Cancel" and "Next" — there is no
    // separate "Back" control (handoff §4.4's bank-confirm-back-btn is not
    // rendered). Returning from the summary to the Amount step is covered by the
    // Cancel test above.

    test('should carry the same masked IBAN and total from Confirmation through to the OTP step', async () => {
        await bt.enterAmount('10');
        await proceedToConfirmation(page, bt);
        await bt.waitForSummaryToSettle();

        const confirmationIban = await bt.getSummaryText(SUMMARY_LABEL.iban);
        const confirmationTotal = await bt.getSummaryMoney(SUMMARY_LABEL.total);

        await bt.clickProceedButtonInSummary();
        await expect(otp.inputs.first()).toBeVisible({ timeout: 15000 });
        await expect(bt.otpRecapIban).toHaveText(confirmationIban);
        const otpTotal = parseFloat((await bt.otpRecapTotal.innerText()).trim());
        expect(otpTotal).toBeCloseTo(confirmationTotal, 2);

        await otp.cancelButton.click();
    });
});
