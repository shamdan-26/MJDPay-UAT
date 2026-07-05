import { test, expect } from '@playwright/test';
import { LoginPage } from '../Helpers/LoginPage';
import { HomePage } from '../Helpers/HomePage';
import { BankTransferPage } from '../Helpers/BankTransferPage';
import { ToastMessages } from '../Helpers/common/ToastMessages';

const bankTransferData = require('../../data/BankTransferData.json');

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

    let page: import('@playwright/test').Page;
    let lp: LoginPage;
    let hp: HomePage;
    let bt: BankTransferPage;
    let toast: ToastMessages;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        lp = new LoginPage(page);
        hp = new HomePage(page);
        bt = new BankTransferPage(page);
        toast = new ToastMessages(page);

        // --- 1. LOGIN SECTION ---
        const data = dataSets.find(d => d.execute !== false) || dataSets[0];
        console.log('Logging in once for all tests...');
        await lp.navigate();
        await lp.login(data.CN, data.mobile, data.pwd);

        if (await lp.isOTPScreenDisplayed()) {
            console.log('Entering login OTP...');
            await lp.enterOTP("0000"); // Default sandbox/UAT OTP
            if (await lp.verifyButton.isVisible()) {
                await lp.verifyButton.click();
            }
        }
        await lp.assertLoginSuccess();
    });

    test.beforeEach(async () => {
        // --- 2. FORCING CLEAN NAVIGATION TO TRANSFER SECTION ---
        // Ensures no stale DOM state or obstructed UI from previous test runs
        console.log('Forcing clean navigation to Bank Transfer Section...');
        await page.goto('https://uat.majdpay.com/business/main/home');
        await page.waitForLoadState('domcontentloaded');
        await hp.clickTransferButton();
    });

    test.afterAll(async () => {
        await page.close();
    });

    for (const data of dataSets) {
        test(`${data.description}`, async () => {

            if (data.execute === false) {
                test.skip();
            }

            // --- 3. DYNAMIC TEST EXECUTION BASED ON AMOUNT TYPE ---
            if (data.AmountType === "Standard") {
                await test.step('Execute Standard Bank Transfer with custom amount', async () => {
                    await bt.getBalanceBeforeBankTransfer();
                    await bt.enterAmount(data.Amount);
                    await bt.clickProceedButton();
                    await bt.clickProceedButtonInSummary();

                    if (await lp.isOTPScreenDisplayed()) {
                        console.log('Entering Bank Transfer Authorization OTP...');
                        await lp.enterOTP("0000");
                        if (await lp.verifyButton.isVisible()) {
                            await lp.verifyButton.click();
                        }
                    }

                    await bt.clickSuccessful_OkButton();
                    await page.reload();
                    // Auto-waiting balance check
                    await bt.checkBalanceAfterBankTransfer(data.Amount);
                });

            } else if (data.AmountType === "Predefined") {
                await test.step('Execute Bank Transfer with random Predefined Amount selector', async () => {
                    await bt.getBalanceBeforeBankTransfer();
                    await bt.selectRandomPredefinedAmount();
                    await bt.clickProceedButton();
                    await bt.clickProceedButtonInSummary();

                    if (await lp.isOTPScreenDisplayed()) {
                        console.log('Entering Bank Transfer Authorization OTP...');
                        await lp.enterOTP("0000");
                        if (await lp.verifyButton.isVisible()) {
                            await lp.verifyButton.click();
                        }
                    }

                    await bt.clickSuccessful_OkButton();
                    await page.reload();
                    // Predefined amount calculation check
                    await bt.checkBalanceAfterBankTransferBySelectAmount();
                });

            } else if (data.AmountType === "Failure Flow Invalid OTP") {
                await test.step('Execute Bank Transfer with Invalid OTP and Verify Failure', async () => {
                    await bt.getBalanceBeforeBankTransfer();
                    await bt.enterAmount(data.Amount);
                    await bt.clickProceedButton();
                    await bt.clickProceedButtonInSummary();

                    if (await lp.isOTPScreenDisplayed()) {
                        console.log('Entering INVALID Authorization OTP...');
                        await lp.enterOTP("9999"); // Invalid OTP
                        await lp.verifyButton.click();

                        console.log('Cancelling OTP authorization prompt...');
                        await lp.otpCancelButton.click();
                    }

                    console.log('Navigating to Transactions dashboard to verify ledger status...');
                    await hp.clicTransactions_NavButton();
                    await bt.verifyLastTransactionFailed();
                });

            } else if (data.AmountType === "Negative Flow") {
                await test.step('Assert negative/invalid input validation on amount field', async () => {
                    await bt.assertInvalidAmountNotAccepted(data.Amount, data.AmountType);
                });

            } else if (data.AmountType === "Zero Amount Test") {
                await test.step('Verify system behavior when entering 0 as transfer amount', async () => {
                    await bt.assertInvalidAmountNotAccepted(data.Amount, data.AmountType);
                });

            } else if (data.AmountType === "Invalid Characters Test") {
                await test.step('Verify system behavior when entering alphabetic characters or special symbols', async () => {
                    await bt.assertInvalidAmountNotAccepted(data.Amount, data.AmountType);
                });

            } else if (data.AmountType === "Valid Float with 2 Decimals" || data.AmountType === "Valid Float with 1 Decimal") {
                await test.step(`Execute Bank Transfer for ${data.AmountType} ensuring decimal BVA passes`, async () => {
                    await bt.getBalanceBeforeBankTransfer();
                    await bt.enterAmount(data.Amount);
                    await bt.clickProceedButton();
                    await bt.clickProceedButtonInSummary();

                    if (await lp.isOTPScreenDisplayed()) {
                        console.log('Entering Bank Transfer Authorization OTP...');
                        await lp.enterOTP("0000");
                        if (await lp.verifyButton.isVisible()) {
                            await lp.verifyButton.click();
                        }
                    }

                    await bt.clickSuccessful_OkButton();
                    await page.reload();
                    await bt.checkBalanceAfterBankTransfer(data.Amount);
                });

            } else if (data.AmountType === "Invalid Float with 3 Decimals") {
                await test.step('Verify system truncates or rejects invalid floats with 3 decimals (Negative BVA)', async () => {
                    await bt.assertInvalidAmountNotAccepted(data.Amount, data.AmountType);
                });

            } else if (data.AmountType === "Copy and Paste Amount") {
                await test.step('Simulate copying and pasting amount directly to check validation triggers', async () => {
                    await bt.pasteAmount(data.Amount);

                    // Verify the pasted value is accurately rendered
                    const enteredAmount = await bt.getAmountValue();
                    expect(enteredAmount).toBe(data.Amount);

                    // Ensure system recognizes the paste and activates the UI transfer button
                    await expect(bt.proceedButton).toBeEnabled({ timeout: 5000 });
                });

            } else if (data.AmountType === "Copy and Paste Invalid Amount") {
                await test.step('Simulate pasting invalid amount to check negative validation triggers', async () => {
                    await bt.pasteAmount(data.Amount);

                    // Verify the field rejects / clears the invalid pasted content, leaving it empty
                    const enteredAmount = await bt.getAmountValue();
                    expect(enteredAmount).toBe(""); // Assuming the page strips all entirely invalid inputs

                    // Proceed button should be strictly disabled
                    await expect(bt.proceedButton).toBeDisabled({ timeout: 5000 });
                });

            } else if (data.AmountType === "Cancel via Page Refresh") {
                await test.step('Fill transfer details and abort transaction by refreshing page', async () => {
                    await bt.getBalanceBeforeBankTransfer();
                    await bt.enterAmount(data.Amount);
                    await bt.clickProceedButton();

                    // Wait until summary modal properly displays before abandoning
                    await page.waitForTimeout(2000);
                    await expect(bt.proceedButtonInSummary).toBeVisible({ timeout: 15000 });

                    console.log('Simulating abandonment via browser page reload...');
                    await page.reload();

                    // Assert strictly that balance underwent no deduction
                    await bt.checkBalanceRemainsUnchanged();
                });

            } else if (data.AmountType === "Cancel via Summary Cancel Button") {
                await test.step('Fill transfer details and logically cancel via explicit Cancel button', async () => {
                    await bt.getBalanceBeforeBankTransfer();
                    await bt.enterAmount(data.Amount);
                    await bt.clickProceedButton();

                    await page.waitForTimeout(2000);
                    console.log('Cancelling via Summary Cancel Button...');
                    await bt.clickSummaryCancelButton();

                    // Assert strictly that balance underwent no deduction
                    await bt.checkBalanceRemainsUnchanged();
                });

            } else if (data.AmountType === "Insufficient Balance Check") {
                await test.step('Execute Insufficient Balance cash out check', async () => {
                    const walletBalance = await bt.getBalanceBeforeBankTransfer();
                    const transferAmount = walletBalance + 10;

                    console.log(`Wallet Balance is: ${walletBalance}. Trying to transfer: ${transferAmount}`);
                    await bt.enterAmount(String(transferAmount));
                    await bt.clickProceedButton();

                    await toast.verifyInsufficientFundMessageDisplayed();
                });
            }
        });
    }
});
