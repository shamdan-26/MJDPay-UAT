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

const bankTransferData = require('../../test-data/BankTransferData.json');

test.describe.serial('Merchant Bank Transfer Tests', () => {
    test.setTimeout(180000); // 3 minutes timeout for heavy EMI flows

    type BankTransferTestData = {
        description: string;
        execute: boolean;
        CN: string;
        mobile: string;
        pwd: string;
        Amount: string;
        AmountType: string;
    };

    const dataSets = bankTransferData as BankTransferTestData[];

    let isLoggedIn = false;

    test.beforeEach(async ({ loginPage, homePage, page }) => {
        // Resilient fallback logic if page context gets interrupted
        if (page.isClosed()) {
            console.log('Page context was terminated, resetting login state...');
            isLoggedIn = false;
        }

        if (!isLoggedIn) {
            const data = dataSets.find(d => d.execute !== false) || dataSets[0];
            console.log('Logging in once for all tests...');
            await loginPage.navigate();
            await loginPage.login(data.CN, data.mobile, data.pwd);

            if (await loginPage.isOTPScreenDisplayed()) {
                console.log('Entering login OTP...');
                await loginPage.enterOTP("0000"); // Default sandbox/UAT OTP
                if (await loginPage.verifyButton.isVisible()) {
                    await loginPage.verifyButton.click();
                }
            }
            await loginPage.assertLoginSuccess();
            isLoggedIn = true;
        }

        // --- 2. FORCING CLEAN NAVIGATION TO TRANSFER SECTION ---
        console.log('Forcing clean navigation to Bank Transfer Section...');
        if (!page.isClosed()) {
            const currentUrl = page.url();
            if (currentUrl.includes('/business/main/home')) {
                // Safely reset using standard dynamic UI click instead of hard page.goto
                await homePage.clickHome_NavButton();
            } else {
                await page.goto('https://uat.majdpay.com/business/main/home', { waitUntil: 'load', timeout: 15000 });
            }
            await homePage.clickTransferButton();
        }
    });

    for (const data of dataSets) {
        test(`${data.description}`, async ({ bankTransferPage, homePage, loginPage, toastMessages, page }) => {

            if (data.execute === false) {
                test.skip();
            }

            // --- 3. DYNAMIC TEST EXECUTION BASED ON AMOUNT TYPE ---
            if (data.AmountType === "Standard") {
                await test.step('Execute Standard Bank Transfer with custom amount', async () => {
                    await bankTransferPage.getBalanceBeforeBankTransfer();
                    await bankTransferPage.enterAmount(data.Amount);
                    await bankTransferPage.clickProceedButton();
                    await bankTransferPage.clickProceedButtonInSummary();

                    if (await loginPage.isOTPScreenDisplayed()) {
                        console.log('Entering Bank Transfer Authorization OTP...');
                        await loginPage.enterOTP("0000");
                        if (await loginPage.verifyButton.isVisible()) {
                            await loginPage.verifyButton.click();
                        }
                    }

                    await bankTransferPage.clickSuccessful_OkButton();
                    await page.reload();
                    // Auto-waiting balance check
                    await bankTransferPage.checkBalanceAfterBankTransfer(data.Amount);
                });

            } else if (data.AmountType === "Predefined") {
                await test.step('Execute Bank Transfer with random Predefined Amount selector', async () => {
                    await bankTransferPage.getBalanceBeforeBankTransfer();
                    await bankTransferPage.selectRandomPredefinedAmount();
                    await bankTransferPage.clickProceedButton();
                    await bankTransferPage.clickProceedButtonInSummary();

                    if (await loginPage.isOTPScreenDisplayed()) {
                        console.log('Entering Bank Transfer Authorization OTP...');
                        await loginPage.enterOTP("0000");
                        if (await loginPage.verifyButton.isVisible()) {
                            await loginPage.verifyButton.click();
                        }
                    }

                    await bankTransferPage.clickSuccessful_OkButton();
                    await page.reload();
                    // Predefined amount calculation check
                    await bankTransferPage.checkBalanceAfterBankTransferBySelectAmount();
                });

            } else if (data.AmountType === "Failure Flow Invalid OTP") {
                await test.step('Execute Bank Transfer with Invalid OTP and Verify Failure', async () => {
                    await bankTransferPage.getBalanceBeforeBankTransfer();
                    await bankTransferPage.enterAmount(data.Amount);
                    await bankTransferPage.clickProceedButton();
                    await bankTransferPage.clickProceedButtonInSummary();

                    if (await loginPage.isOTPScreenDisplayed()) {
                        console.log('Entering INVALID Authorization OTP...');
                        await loginPage.enterOTP("9999"); // Invalid OTP
                        await loginPage.verifyButton.click();

                        console.log('Cancelling OTP authorization prompt...');
                        await loginPage.otpCancelButton.click();
                    }

                    console.log('Navigating to Transactions dashboard to verify ledger status...');
                    await homePage.clicTransactions_NavButton();
                    await bankTransferPage.verifyLastTransactionFailed();
                });

            } else if (data.AmountType === "Negative Flow") {
                await test.step('Assert negative/invalid input validation on amount field', async () => {
                    await bankTransferPage.assertInvalidAmountNotAccepted(data.Amount, data.AmountType);
                });

            } else if (data.AmountType === "Zero Amount Test") {
                await test.step('Verify system behavior when entering 0 as transfer amount', async () => {
                    await bankTransferPage.assertInvalidAmountNotAccepted(data.Amount, data.AmountType);
                });

            } else if (data.AmountType === "Invalid Characters Test") {
                await test.step('Verify system behavior when entering alphabetic characters or special symbols', async () => {
                    await bankTransferPage.assertInvalidAmountNotAccepted(data.Amount, data.AmountType);
                });

            } else if (data.AmountType === "Valid Float with 2 Decimals" || data.AmountType === "Valid Float with 1 Decimal") {
                await test.step(`Execute Bank Transfer for ${data.AmountType} ensuring decimal BVA passes`, async () => {
                    await bankTransferPage.getBalanceBeforeBankTransfer();
                    await bankTransferPage.enterAmount(data.Amount);
                    await bankTransferPage.clickProceedButton();
                    await bankTransferPage.clickProceedButtonInSummary();

                    if (await loginPage.isOTPScreenDisplayed()) {
                        console.log('Entering Bank Transfer Authorization OTP...');
                        await loginPage.enterOTP("0000");
                        if (await loginPage.verifyButton.isVisible()) {
                            await loginPage.verifyButton.click();
                        }
                    }

                    await bankTransferPage.clickSuccessful_OkButton();
                    await page.reload();
                    await bankTransferPage.checkBalanceAfterBankTransfer(data.Amount);
                });

            } else if (data.AmountType === "Invalid Float with 3 Decimals") {
                await test.step('Verify system truncates or rejects invalid floats with 3 decimals (Negative BVA)', async () => {
                    await bankTransferPage.assertInvalidAmountNotAccepted(data.Amount, data.AmountType);
                });

            } else if (data.AmountType === "Copy and Paste Amount") {
                await test.step('Simulate copying and pasting amount directly to check validation triggers', async () => {
                    await bankTransferPage.pasteAmount(data.Amount);

                    // Verify the pasted value is accurately rendered
                    const enteredAmount = await bankTransferPage.getAmountValue();
                    expect(enteredAmount).toBe(data.Amount);

                    // Ensure system recognizes the paste and activates the UI transfer button
                    await expect(bankTransferPage.proceedButton).toBeEnabled({ timeout: 5000 });
                });

            } else if (data.AmountType === "Copy and Paste Invalid Amount") {
                await test.step('Simulate pasting invalid amount to check negative validation triggers', async () => {
                    await bankTransferPage.pasteAmount(data.Amount);

                    // Verify the field rejects / clears the invalid pasted content, leaving it empty
                    const enteredAmount = await bankTransferPage.getAmountValue();
                    expect(enteredAmount).toBe(""); // Assuming the page strips all entirely invalid inputs

                    // Proceed button should be strictly disabled
                    await expect(bankTransferPage.proceedButton).toBeDisabled({ timeout: 5000 });
                });

            } else if (data.AmountType === "Cancel via Page Refresh") {
                await test.step('Fill transfer details and abort transaction by refreshing page', async () => {
                    await bankTransferPage.getBalanceBeforeBankTransfer();
                    await bankTransferPage.enterAmount(data.Amount);
                    await bankTransferPage.clickProceedButton();

                    // Wait until summary modal properly displays before abandoning
                    await page.waitForTimeout(2000);
                    await expect(bankTransferPage.proceedButtonInSummary).toBeVisible({ timeout: 15000 });

                    console.log('Simulating abandonment via browser page reload...');
                    await page.reload();

                    // Assert strictly that balance underwent no deduction
                    await bankTransferPage.checkBalanceRemainsUnchanged();
                });

            } else if (data.AmountType === "Cancel via Summary Cancel Button") {
                await test.step('Fill transfer details and logically cancel via explicit Cancel button', async () => {
                    await bankTransferPage.getBalanceBeforeBankTransfer();
                    await bankTransferPage.enterAmount(data.Amount);
                    await bankTransferPage.clickProceedButton();

                    await page.waitForTimeout(2000);
                    console.log('Cancelling via Summary Cancel Button...');
                    await bankTransferPage.clickSummaryCancelButton();

                    // Assert strictly that balance underwent no deduction
                    await bankTransferPage.checkBalanceRemainsUnchanged();
                });

            } else if (data.AmountType === "Insufficient Balance Check") {
                await test.step('Execute Insufficient Balance cash out check', async () => {
                    const walletBalance = await bankTransferPage.getBalanceBeforeBankTransfer();
                    const transferAmount = walletBalance + 10;

                    console.log(`Wallet Balance is: ${walletBalance}. Trying to transfer: ${transferAmount}`);
                    await bankTransferPage.enterAmount(String(transferAmount));
                    await bankTransferPage.clickProceedButton();

                    await toastMessages.verifyInsufficientFundMessageDisplayed();
                });
            }
        });
    }
});
