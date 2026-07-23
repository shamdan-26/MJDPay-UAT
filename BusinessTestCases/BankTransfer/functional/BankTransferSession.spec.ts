import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { BankTransferPage } from '../../pageElements/Shared/BankTransferPage';
import { HOME_URL } from '../BankTransferHelper';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../Login/LoginHelper';

// Abandon/cancel flows and cross-step state persistence. The legacy suite had
// two near-duplicate "cancel from Confirmation" tests (one via the redesigned
// screen's Cancel button, one via the older screen) — consolidated here into
// the single, more robust version (waits for the async summary to settle
// before cancelling, then confirms the Amount step is back).

/**
 * The Proceed click occasionally doesn't register on dev (the button stays
 * enabled on "proceed") — a hydration-timing flake independent of balance/
 * validation. Retry the click only while the button is still enabled (i.e.
 * genuinely un-clicked), then wait out the async summary calculation.
 */
async function proceedToConfirmation(page: Page, bt: BankTransferPage): Promise<void> {
    const nextButton = page.getByRole('button', { name: /^next$/i });
    await bt.clickProceedButton();

    // Poll rather than retry once — on a slow/loaded dev backend a single
    // extra click after a fixed wait isn't always enough.
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
        if (await nextButton.isVisible().catch(() => false)) return;
        await page.waitForTimeout(2000);
        if (await bt.proceedButton.isEnabled().catch(() => false)) {
            await bt.proceedButton.click().catch(() => {});
        }
    }
    await expect(nextButton).toBeVisible({ timeout: 5000 });
}

test.describe('BankTransfer – Session & Cancellation', () => {
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

    test('should carry the same masked IBAN and total from Confirmation through to the OTP step', async () => {
        await bt.enterAmount('10');
        await proceedToConfirmation(page, bt);
        await bt.waitForSummaryToSettle();

        const confirmationIban = await bt.getSummaryText('IBAN');
        const confirmationTotal = await bt.getSummaryMoney('Total amount to be sent');

        await bt.clickProceedButtonInSummary();
        await expect(otp.inputs.first()).toBeVisible({ timeout: 15000 });

        await expect(bt.otpRecapIban).toHaveText(confirmationIban);
        const otpTotal = parseFloat((await bt.otpRecapTotal.innerText()).trim());
        expect(otpTotal).toBeCloseTo(confirmationTotal, 2);

        await otp.cancelButton.click();
    });
});
