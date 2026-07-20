import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/LoginPage';
import { OtpPage } from '../../pageElements/OtpPage';
import { HomePage } from '../../pageElements/HomePage';
import { BillsPage } from '../../pageElements/BillsPage';
import { BankTransferPage } from '../../pageElements/BankTransferPage';
import { TransactionsPage } from '../../pageElements/TransactionsPage';
import { HOME_URL, BILL_COMPANY, BILL_MOBILE, BILL_PASSWORD, BILL_STATUS } from '../PayBillHelper';
import { LOGIN_URL, getOtpFromDb } from '../../Login/LoginHelper';

// Full "pay a received bill" flow: submission popup, wallet debit, ledger entry,
// and the insufficient-funds rejection. Requires BILL_COMPANY/BILL_MOBILE to have
// at least one live "Approved" received bill in the target environment.

test.describe('Pay Bill — Received Bill Flow', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(120000);

    let page: Page;
    let loginPage: LoginPage;
    let otp: OtpPage;
    let homePage: HomePage;
    let billsPage: BillsPage;
    let oldBalance = 0;
    let billAmount = 0;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();

        loginPage = new LoginPage(page);
        otp = new OtpPage(page);
        homePage = new HomePage(page);
        billsPage = new BillsPage(page);

        await loginPage.goto(LOGIN_URL);
        await loginPage.fillAndSubmit(BILL_COMPANY, BILL_MOBILE, BILL_PASSWORD);
        if (await otp.isVisible()) {
            await otp.fillAndVerify(await getOtpFromDb(BILL_MOBILE));
        }
        await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should navigate to Received Bills and pay an approved bill successfully', async () => {
        oldBalance = await homePage.getWalletBalance();

        await homePage.clicBills_NavButton();
        await homePage.clickBillPayment_NavButton();
        await billsPage.goToReceivedBills();

        billAmount = await billsPage.initiateQuickPayment(BILL_STATUS);
        await billsPage.confirmPayment(() => getOtpFromDb(BILL_MOBILE));
    });

    test('should decrease the wallet balance by the paid bill amount', async () => {
        await homePage.clickHome_NavButton();
        const newBalance = await homePage.getWalletBalance();
        expect(newBalance).toBeCloseTo(oldBalance - billAmount, 2);
    });

    test('should create a successful transaction record in the transactions table', async () => {
        const transactionsPage = new TransactionsPage(page);
        await homePage.clicTransactions_NavButton();

        await expect(transactionsPage.lastTransactionRow).toBeVisible({ timeout: 15000 });
        await page.reload({ waitUntil: 'load' });

        const status = await transactionsPage.getLastTransactionStatus();
        expect(status.toUpperCase()).toBe('SUCCESS');
    });

    test('should show an insufficient-funds error when the wallet cannot cover the bill', async () => {
        await homePage.clickHome_NavButton();
        const currentBalance = await homePage.getWalletBalance();

        // Drain the wallet via a full-balance bank transfer so the next bill
        // payment attempt is guaranteed to be rejected for insufficient funds.
        if (currentBalance > 0) {
            const bt = new BankTransferPage(page);
            await homePage.clickTransferButton();
            await bt.clickUseFullBalanceToggle();
            await bt.clickProceedButton();
            await bt.clickProceedButtonInSummary();
            if (await otp.isVisible()) {
                await otp.fillAndVerify(await getOtpFromDb(BILL_MOBILE));
            }
            await bt.clickSuccessful_OkButton();
        }

        await homePage.clicBills_NavButton();
        await homePage.clickBillPayment_NavButton();
        await billsPage.goToReceivedBills();

        await billsPage.initiateQuickPayment(BILL_STATUS);
        await billsPage.clickSummaryPayButton();
        await billsPage.clickConfirmPayButton();

        await billsPage.assertInsufficientFundToastDisplayed();
    });
});
