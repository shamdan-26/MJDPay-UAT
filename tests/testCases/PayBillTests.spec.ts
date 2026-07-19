import { test as baseTest, expect } from '../../fixtures/pageFixtures';

let sharedContext: any;
let sharedPage: any;

const test = baseTest.extend<{}>({
    page: async ({}, use) => {
        await use(sharedPage);
    }
});

test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext();
    sharedPage = await sharedContext.newPage();
});

test.afterAll(async () => {
    if (sharedContext) {
        await sharedContext.close();
        sharedContext = undefined;
        sharedPage = undefined;
    }
});

const payBillData = require('../../test-data/PayBill.json');

test.describe('Pay Bill Flow', () => {
    type PayBillTestData = {
        description: string;
        companyNumber: string;
        mobileNumber: string;
        password: string;
        otpCode?: string;
        billStatus: string;
    };

    const dataSets = payBillData as PayBillTestData[];

    for (const data of dataSets) {
        test.describe.serial('Pay Approved Received Bill Flow', () => {
            let oldBalance = 0;
            let billAmount = 0;
            let isLoggedIn = false;

            test.beforeEach(async ({ loginPage, page }) => {
                // Resilient fallback logic if page context gets interrupted
                if (page.isClosed()) {
                    console.log('Page context was terminated, resetting login state...');
                    isLoggedIn = false;
                }

                if (!isLoggedIn) {
                    await loginPage.navigate();
                    await loginPage.login(data.companyNumber, data.mobileNumber, data.password);

                    if (await loginPage.isOTPScreenDisplayed()) {
                        const otpCode = data.otpCode ?? '';
                        await loginPage.enterOTP(otpCode);
                        await loginPage.verifyButton.click();
                    }

                    await loginPage.assertLoginSuccess();
                    isLoggedIn = true;
                }
            });

            test('Verify successful payment submission popup', async ({ homePage, billsPage }) => {
                oldBalance = await homePage.getWalletBalance();

                await billsPage.MapsToReceivedBills();
                billAmount = await billsPage.initiateQuickPayment(data.billStatus);

                await billsPage.confirmPayment();
            });

            test('Verify wallet balance decrease after bill payment', async ({ homePage }) => {
                await homePage.clickHome_NavButton();

                const newBalance = await homePage.getWalletBalance();
                expect(newBalance).toBeCloseTo(oldBalance - billAmount, 2);
            });

            test('Verify transaction record creation and success status in transactions table', async ({ homePage, transactionsPage, page }) => {
                await homePage.clicTransactions_NavButton();

                // Robust locator alternative: Ensure the rows center shell is visible before asserting text content
                await page.locator('datatable-body-row .datatable-row-center').first().or(page.locator('.datatable-row-center').nth(1)).waitFor({ state: 'visible', timeout: 15000 });

                // Force a complete browser reload to fetch the latest backend DB entries
                await page.reload({ waitUntil: 'load' });

                await transactionsPage.assertBillPaymentLedgerEntry(billAmount);
            });

            test('Verify bill payment with insufficient funds error message', async ({ homePage, bankTransferPage, billsPage, loginPage, page }) => {
                await homePage.clickHome_NavButton();
                const currentBalance = await homePage.getWalletBalance();

                if (currentBalance > 0) {
                    await homePage.clickTransferButton();

                    await bankTransferPage.clickUseFullBalanceToggle();
                    await bankTransferPage.clickProceedButton();
                    await bankTransferPage.clickProceedButtonInSummary();

                    if (await loginPage.isOTPScreenDisplayed()) {
                        const otpCode = data.otpCode ?? '';
                        await loginPage.enterOTP(otpCode);
                        await loginPage.verifyButton.click();
                    }

                    await bankTransferPage.clickSuccessful_OkButton();
                }

                await billsPage.MapsToReceivedBills();

                // Use a standard un-approved/approved bill status. For safety we just use data.billStatus.
                // We do not want to click the "Go to home" modal if it appears, because it shouldn't appear for insufficient funds.
                await billsPage.initiateQuickPayment(data.billStatus);

                // Click pay button in Payment Summary
                await expect(billsPage.summaryPayButton).toBeVisible();
                await billsPage.summaryPayButton.click();

                // Click Confirm button in Confirm Payment popup
                await expect(billsPage.confirmPayButton).toBeVisible();
                await billsPage.confirmPayButton.click();

                // Negative Assertion: Verify the toast error message
                const toastLocator = page.locator('.toast-snackbar__detail').or(page.locator('.p-toast-detail')).or(page.locator('[data-pc-section="detail"]'));
                await expect(toastLocator).toBeVisible({ timeout: 15000 });
                const toastText = ((await toastLocator.textContent()) ?? '').toLowerCase();

                expect(
                    toastText.includes('insufficient') || toastText.includes('balance') || toastText.includes('fund'),
                    `Expected an insufficient fund error toast, but toast reads: "${toastText}"`
                ).toBeTruthy();
            });
        });
    }
});
