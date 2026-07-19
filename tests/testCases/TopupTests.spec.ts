import { test, expect } from '../../fixtures/pageFixtures';

const topupData = require('../../test-data/topupData.json');

type TopupTestData = {
    testName: string;
    execute: boolean;
    companyNumber: string;
    mobileNumber: string;
    password: string;
    amount: string;
    paymentMethod: string;
    cardNumber: string;
    expiry: string;
    holder: string;
    cvv: string;
    otpCode?: string;
    isSelectAmount?: boolean;
    expectDisabled?: boolean;
    returnCode?: string;
    expectedStatus?: string;
    amountInput?: string;
    expectedValue?: string;
    isNegativeFlow?: boolean;
    isButtonDisabled?: boolean;
    isClipboardTest?: boolean;
    cancelType?: string;
};

const dataSets = topupData as TopupTestData[];

test.describe.serial('MajdPay Wallet Top-up Tests', () => {
    test.setTimeout(180000); // 3 minutes timeout for each financial test flow

    for (const data of dataSets) {
        if (!data.execute) continue;

        test(`${data.testName} `, async ({ loginPage, topupPage, homePage, transactionsPage, page }) => {

            // Step 1: Login
            console.log("Step 1: Open login page");
            await loginPage.navigate();
            await loginPage.login(data.companyNumber, data.mobileNumber, data.password);

            // Handle OTP verification flow
            if (await loginPage.isOTPScreenDisplayed()) {
                console.log("Handling OTP screen...");
                const otpCode = data.otpCode ?? "0000";
                await loginPage.enterOTP(otpCode);
                await loginPage.verifyButton.click();
            }

            await loginPage.assertLoginSuccess();

            // Handle potential session expired dialog
            const sessionExpiredDialog = page.getByRole('dialog').filter({ hasText: /session expired/i }).first();
            if (await sessionExpiredDialog.isVisible().catch(() => false)) {
                console.log("Session expired dialog found, re-logging in...");
                const okButton = sessionExpiredDialog.getByRole('button', { name: /^ok$/i }).first();
                await okButton.click();
                await loginPage.navigate();
                await loginPage.login(data.companyNumber, data.mobileNumber, data.password);
                if (await loginPage.isOTPScreenDisplayed()) {
                    const otpCode = data.otpCode ?? "0000";
                    await loginPage.enterOTP(otpCode);
                    await loginPage.verifyButton.click();
                }
                await loginPage.assertLoginSuccess();
            }

            // Capture balance before top-up (applicable to standard flows and cancellation flows)
            if (data.amountInput === undefined || data.cancelType !== undefined) {
                console.log("Step 2: Capturing balance before top-up");
                await topupPage.balanceBeforeTopup();
            }

            // Pre-cancellation ledger state capture
            let initialLastTxnAmount = "";
            let initialLastTxnStatus = "";
            if (data.cancelType !== undefined) {
                console.log("Pre-cancellation Step: Capturing initial last transaction row state");
                await homePage.clicTransactions_NavButton();
                await page.waitForTimeout(2000);
                await page.reload({ waitUntil: 'networkidle' }).catch(() => null);
                initialLastTxnAmount = (await transactionsPage.lastTransactionAmount.textContent().catch(() => "")) ?? "";
                initialLastTxnStatus = (await transactionsPage.lastTransactionStatus.textContent().catch(() => "")) ?? "";
                console.log(`Initial transaction row state: Amount [${initialLastTxnAmount}], Status [${initialLastTxnStatus}]`);

                // Go back home to topup screen
                await homePage.clickHome_NavButton();
            }

            // Step 3: Open Top-up screen
            console.log("Step 3: Navigating to top-up menu");
            await homePage.clickTopupButton();

            // Step 4: Select Payment Method (Reordered: payment method selection gates amount entry)
            console.log(`Step 4: Selecting payment method: ${data.paymentMethod}`);
            const method = data.paymentMethod.toUpperCase();
            if (method === 'MADA') {
                await topupPage.click_MADA_paymentMethod();
            } else if (method === 'MASTER') {
                await topupPage.click_MASTER_paymentMethod();
            } else if (method === 'VISA') {
                await topupPage.click_VISA_paymentMethod();
            } else {
                throw new Error(`Unknown payment method: ${data.paymentMethod}`);
            }

            // Localized UI Validation checks for amount field
            if (data.amountInput !== undefined && data.cancelType === undefined) {
                console.log(`Executing localized UI validation check for: ${data.testName}`);
                if (data.isClipboardTest) {
                    await topupPage.pasteAmount(data.amountInput);
                } else {
                    await topupPage.enterAmountKeyboard(data.amountInput);
                }

                // Verify the field text filters or restricts the value to match expectedValue
                const actualValue = await topupPage.getAmountValue();
                console.log(`Expected Value: "${data.expectedValue}", Actual Value: "${actualValue}"`);
                expect(actualValue).toBe(data.expectedValue);

                // Verify button state
                if (data.isButtonDisabled) {
                    await expect(topupPage.proceedButton).toBeDisabled({ timeout: 5000 });
                    console.log("Passed: Proceed button is correctly DISABLED");
                } else {
                    await expect(topupPage.proceedButton).toBeEnabled({ timeout: 5000 });
                    console.log("Passed: Proceed button is correctly ENABLED");
                }

                console.log("Localized UI Validation test complete.");
                return;
            }

            // Step 5: Set Amount
            if (data.cancelType !== undefined) {
                console.log(`Step 5: Entering amount for cancellation check: ${data.amountInput}`);
                await topupPage.enterAmountKeyboard(data.amountInput!);
            } else if (data.isSelectAmount) {
                console.log("Step 5: Selecting predefined amount option");
                await topupPage.Select_Amount();
            } else {
                console.log(`Step 5: Entering custom amount: ${data.amount}`);
                await topupPage.setAmount(data.amount);
            }

            // Step 6: Proceed to payment details (opens popup window / shows summary modal)
            console.log("Step 6: Confirming Top-up Summary");
            await topupPage.clickProceedButton();

            // Handling Top-up Cancellation Flow
            if (data.cancelType !== undefined) {
                await page.waitForTimeout(2000);
                await expect(topupPage.NextButtonInTopupSummary).toBeVisible({ timeout: 15000 });

                if (data.cancelType === 'REFRESH') {
                    console.log("Simulating cancellation via page reload...");
                    await page.reload();
                    await page.waitForLoadState('networkidle').catch(() => null);
                } else if (data.cancelType === 'CANCEL_BUTTON') {
                    console.log("Simulating cancellation via Summary Cancel button...");
                    await topupPage.clickSummaryCancelButton();
                }

                // Assertion 1: Verify summary is closed / redirected safely
                await expect(topupPage.NextButtonInTopupSummary).not.toBeVisible({ timeout: 5000 });
                console.log("Assertion 1 Passed: Next button in summary is no longer visible.");

                // Assertion 2: Verify balance is completely unchanged
                console.log("Assertion 2: Verifying balance remains completely unchanged");
                await topupPage.checkBalanceRemainsUnchanged();

                // Assertion 3: Verify no new transaction row is generated
                console.log("Assertion 3: Verifying no new transaction row was added");
                await homePage.clicTransactions_NavButton();
                await page.waitForTimeout(2000);
                await page.reload({ waitUntil: 'networkidle' }).catch(() => null);
                const postLastTxnAmount = (await transactionsPage.lastTransactionAmount.textContent().catch(() => "")) ?? "";
                const postLastTxnStatus = (await transactionsPage.lastTransactionStatus.textContent().catch(() => "")) ?? "";
                console.log(`Post-cancellation transaction row state: Amount [${postLastTxnAmount}], Status [${postLastTxnStatus}]`);
                expect(postLastTxnAmount).toBe(initialLastTxnAmount);
                expect(postLastTxnStatus).toBe(initialLastTxnStatus);
                console.log("Assertion 3 Passed: Ledger remains untouched.");

                console.log("Cancellation test case verified successfully.");
                return;
            }

            // Expect a new popup tab/window to open on clicking Next
            const [popup] = await Promise.all([
                page.context().waitForEvent('page'),
                topupPage.clickNextButtonInTopupSummary()
            ]);

            // Scope the page object to the new popup window
            topupPage.setActivePage(popup);
            await popup.waitForLoadState('load');

            // Step 7: Fill card details in the popup window
            console.log("Step 7: Filling card details inside the payment gateway window");
            await topupPage.setCardNumberInput(data.cardNumber);
            await topupPage.setExpiryDate(data.expiry);
            await topupPage.setCardHolder(data.holder);
            await topupPage.setCVV(data.cvv);

            // Step 8: Assert button status / Click pay
            if (data.expectDisabled) {
                console.log("Step 8: Verifying Pay Now button is disabled for invalid credentials");
                await topupPage.assertPayNowButtonIsDisabled();
                await popup.close();
                return;
            }

            console.log("Step 8: Clicking Pay Now button");
            await topupPage.clickPay_nowButton();

            // Select gateway return code if testing failure/pending gateway simulations
            if (data.returnCode) {
                await topupPage.selectGatewayReturnCode(data.returnCode);
            }

            // Step 9: Handle payment authentication frame
            console.log("Step 9: Submitting payment authentication");
            if (method === 'MADA' || method === 'MASTER') {
                await topupPage.clickSubmitButton_MADA_MASTER();
            } else if (method === 'VISA') {
                if (await topupPage.isHyperpayScreenDisplayed()) {
                    await topupPage.clickSubmitButton();
                } else {
                    console.log("Hyperpay screen did not require manual interaction, proceeding...");
                }
            }

            // Wait until the payment gateway popup finishes processing and closes
            await popup.waitForEvent('close', { timeout: 30000 }).catch(() => console.log("Popup window was closed or redirected."));

            // Reset scope back to main wallet application page
            topupPage.resetActivePage();

            // Step 10: Handle OTP verification after payment if triggered
            if (await loginPage.isOTPScreenDisplayed()) {
                console.log("Step 10: Handling OTP verification after payment");
                const otpCode = data.otpCode ?? "0000";
                await loginPage.enterOTP(otpCode);
                await loginPage.verifyButton.click();
            }

            // Step 11: Confirm and check payment result (successful, pending, or failed)
            if (data.expectedStatus === 'FAILED') {
                console.log("Verifying failed top-up flow popup alerts");
                await topupPage.assertFailedPopup();
                await topupPage.clickOkButton();

                console.log("Asserting wallet ledger balance remains unchanged");
                await topupPage.checkBalanceRemainsUnchanged();

                console.log("Navigating to transactions reports to check FAILED ledger log");
                await homePage.clicTransactions_NavButton();

                // Explicitly reload the page to ensure the layout fetches the updated transaction status from the API
                await page.waitForTimeout(2000);
                await page.reload({ waitUntil: 'networkidle' }).catch(() => null);

                const status = await transactionsPage.getLastTransactionStatus();
                expect(status.toUpperCase()).toBe("FAILED");
                console.log("Transaction flow failed and verified successfully.");
                return;
            }

            if (data.expectedStatus === 'PENDING') {
                console.log("Verifying pending top-up flow popup alerts");
                await topupPage.assertPendingPopup();
                await topupPage.clickOkButton();

                console.log("Asserting wallet ledger balance remains unchanged");
                await topupPage.checkBalanceRemainsUnchanged();

                console.log("Navigating to transactions reports to check PENDING ledger log");
                await homePage.clicTransactions_NavButton();

                // Explicitly reload the page to ensure the layout fetches the updated transaction status from the API
                await page.waitForTimeout(2000);
                await page.reload({ waitUntil: 'networkidle' }).catch(() => null);

                const status = await transactionsPage.getLastTransactionStatus();
                expect(status.toUpperCase()).toBe("PENDING");
                console.log("Transaction flow pending and verified successfully.");
                return;
            }

            // Standard successful flow confirmation
            console.log("Step 11: Completing flow and clicking OK button");
            await topupPage.clickOkButton();

            console.log("Reloading the page to force API balance sync");
            await page.reload();
            await page.waitForLoadState('networkidle').catch(() => null);

            // Step 12: Validate balance updated correctly
            console.log("Step 12: Verifying post-transaction ledger balance integrity");
            if (data.isSelectAmount) {
                await topupPage.checkBalanceAfterTopupBySelectAmount();
            } else {
                await topupPage.checkBalanceAfterTopup_Safe(data.amount);
            }
            console.log("Transaction flow verification successful.");
        });
    }
});