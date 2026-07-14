import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/LoginPage';
import { OtpPage } from '../../pageElements/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/HomepageQuickActionsPage';
import { DashboardPage } from '../../pageElements/DashboardPage';
import { BankTransferPage } from '../../pageElements/BankTransferPage';
import { assertToast } from '../../toastMessages';
import { HOME_URL } from '../BankTransferHelper';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../Login/LoginHelper';

// Invalid-input rejection and failure handling. Happy-path completion lives in
// BankTransferHappyPath.spec.ts; the boundary between "3 decimals rejected"
// and "1/2 decimals accepted" is the same amount-field validation covered
// there and in BankTransferEdgeCases.spec.ts.

test.describe('BankTransfer – Negative Scenarios', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(150000);

    let page: Page;
    let loginPage: LoginPage;
    let otp: OtpPage;
    let quickActions: HomepageQuickActionsPage;
    let dashboard: DashboardPage;
    let bt: BankTransferPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();

        loginPage = new LoginPage(page);
        otp = new OtpPage(page);
        quickActions = new HomepageQuickActionsPage(page);
        dashboard = new DashboardPage(page);
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

    test('should reject a negative amount and keep Proceed disabled', async () => {
        await bt.assertInvalidAmountNotAccepted('-10.00', 'Negative Flow');
    });

    test('should reject zero as a transfer amount', async () => {
        await bt.assertInvalidAmountNotAccepted('0', 'Zero Amount Test');
    });

    test('should reject alphabetic characters and special symbols in the amount field', async () => {
        await bt.assertInvalidAmountNotAccepted('abc!@#', 'Invalid Characters Test');
    });

    test('should reject or truncate an amount with 3 decimal places', async () => {
        await bt.assertInvalidAmountNotAccepted('10.555', 'Invalid Float with 3 Decimals');
    });

    test('should reject a pasted invalid amount and keep Proceed disabled', async () => {
        await bt.pasteAmount('abc');
        expect(await bt.getAmountValue()).toBe('');
        await expect(bt.proceedButton).toBeDisabled({ timeout: 5000 });
    });

    test('should show the insufficient-funds toast and block the transfer when the amount exceeds the balance', async () => {
        const walletBalance = await bt.getBalanceBeforeBankTransfer();
        await bt.enterAmount(String(walletBalance + 10));
        await bt.clickProceedButton();
        await assertToast(page, 'insufficient funds', 40000);
    });

    test('should fail the transaction when an incorrect OTP is submitted', async () => {
        test.skip(true, 'disabled — ported as-is from the legacy BankTransferTests.spec.ts data set (execute: false)');

        await bt.getBalanceBeforeBankTransfer();
        await bt.enterAmount('15.00');
        await bt.clickProceedButton();
        await bt.clickProceedButtonInSummary();

        if (await otp.isVisible()) {
            await otp.fill('9999');
            await otp.verifyButton.click();
            await otp.cancelButton.click();
        }

        await dashboard.transactionsLink.click();
        await bt.verifyLastTransactionFailed();
    });
});
