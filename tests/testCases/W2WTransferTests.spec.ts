import { test, expect } from '@playwright/test';
import { LoginPage } from '../Helpers/LoginPage';
import { HomePage } from '../Helpers/HomePage';
import { W2WTransferPage } from '../Helpers/W2WTransferPage';
import { TransactionsPage } from '../Helpers/TransactionsPage';

const w2wData = require('../../data/w2wTransferData.json');

// ============================================================
// ---------- TypeScript Type Definition ----------
// ============================================================

type W2WTestData = {
    testName: string;
    suite: 'balance_update' | 'transaction_table' | 'invalid_crn' | 'amount_validation' | 'insufficient_fund' | 'crn_validation';
    execute: boolean;
    amountType?: string;
    crnType?: string;
    amountValidation?: string;
    companyNumber: string;
    mobileNumber: string;
    password: string;
    companyNumber_Biller: string;
    mobileNumber_Biller: string;
    password_Biller: string;
    receiverCRN: string;
    amount: string;
    otpCode?: string;
    expectedUIValue?: string;
    expectButtonDisabled?: boolean;
    isClipboardTest?: boolean;
    purposeOfTransfer?: string;
};

const dataSets = w2wData as W2WTestData[];

// ============================================================
// ---------- Shared Login Helper ----------
// ============================================================

/**
 * Performs a full login flow (navigate → fill credentials → handle OTP → assert success).
 * Reused across all W2W test suites to avoid duplication.
 */
async function performLogin(
    page: import('@playwright/test').Page,
    companyNumber: string,
    mobileNumber: string,
    password: string,
    otpCode: string
) {
    // Isolate context to prevent cross-suite contamination when running sequentially
    await page.context().clearCookies();
    // Navigate to base URL to allow localStorage access for cleanup
    await page.goto('https://uat.majdpay.com/business/auth/login');
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(companyNumber, mobileNumber, password);

    if (await loginPage.isOTPScreenDisplayed()) {
        console.log('   OTP screen detected — entering OTP...');
        await loginPage.enterOTP(otpCode);
        await loginPage.verifyButton.click();
    }

    await loginPage.assertLoginSuccess();
}

// ============================================================
// Main test suite
// ============================================================

test.describe.serial('MajdPay W2W Transfer Tests', () => {
    test.setTimeout(180000); // 3-minute timeout for dual-browser financial flows

    // ============================================================
    // SUITE 1: Balance Update Tests (Merchant DEBIT + Biller CREDIT)
    // ============================================================

    test.describe('W2W Transfer — Verify Merchant & Biller Balance Update', () => {
        const balanceUpdateTests = dataSets.filter(d => d.suite === 'balance_update');

        for (const data of balanceUpdateTests) {
            if (!data.execute) continue;

            test(`${data.testName} | Amount Type: ${data.amountType}`, async ({ page, browser }) => {

                // ── Step 1: Merchant Login ──────────────────────────────────────────
                console.log('Step 1: Open Business app and log in as Merchant');
                await performLogin(page, data.companyNumber, data.mobileNumber, data.password, data.otpCode ?? '0000');
                console.log('   Merchant login successful ✔');

                // ── Step 2: Open a second browser context for Biller ────────────────
                console.log('Step 2: Open second browser context and log in as Biller');
                const billerContext = await browser.newContext();
                const billerPage = await billerContext.newPage();
                await performLogin(
                    billerPage,
                    data.companyNumber_Biller,
                    data.mobileNumber_Biller,
                    data.password_Biller,
                    data.otpCode ?? '0000'
                );
                console.log('   Biller login successful ✔');

                const w2wMerchant = new W2WTransferPage(page);
                const w2wBiller = new W2WTransferPage(billerPage);
                const homeMerchant = new HomePage(page);

                // ── Step 3: Capture balances BEFORE transfer ────────────────────────
                console.log('Step 3: Capturing wallet balances BEFORE W2W transfer');
                await w2wBiller.captureBalanceBeforeTransfer_Biller();
                await w2wMerchant.captureBalanceBeforeTransfer_Merchant();

                // ── Step 4: Merchant navigates to W2W Transfer screen ───────────────
                console.log('Step 4: Navigating to W2W Transfer screen (Merchant)');
                await homeMerchant.clickW2WTransferButton();

                // ── Step 5: Enter CRN and Check Recipient ───────────────────────────
                console.log(`Step 5: Entering Receiver CRN: "${data.receiverCRN}"`);
                await w2wMerchant.enterCRN(data.receiverCRN);

                // ── Step 6: Check Recipient ──────────────────────────────────────────
                console.log('Step 6: Clicking Check Recipient to validate CRN lookup');
                await w2wMerchant.clickCheckRecipient();

                // Allow the API call to resolve and the recipient name to render
                await page.waitForTimeout(4000);

                // ── Step 6.1: Enter Amount ──────────────────────────────────────────
                console.log(`Step 6.1: Entering Amount: "${data.amount}" (Type: ${data.amountType})`);
                await w2wMerchant.enterAmount(data.amount);

                // ── Step 7: Select Purpose of Transfer ─────────────────────────────
                console.log('Step 7: Selecting a random Purpose of Transfer');
                await w2wMerchant.selectRandomPurposeOfTransfer();
                await page.waitForTimeout(4000);

                // ── Step 8: Click Amount Input (triggers UI recalculation) ──────────
                console.log('Step 8: Clicking Amount input to trigger field validation');
                await w2wMerchant.clickAmountInput();
                await page.waitForTimeout(4000);

                // ── Step 9: Proceed and Confirm Transfer ────────────────────────────
                console.log('Step 9: Clicking Proceed and Transfer buttons');
                await w2wMerchant.clickProceedButton();

                // Ensure the final transfer confirmation context is fully visible before clicking
                await page.waitForTimeout(1500);
                await w2wMerchant.clickTransferButton();

                // Allow the network request to resolve and the UI to show either OTP or Success screen
                await page.waitForTimeout(3000);

                // ── Step 10: Handle OTP for W2W confirmation (if triggered) ─────────
                const loginPage = new LoginPage(page);
                if (await loginPage.isOTPScreenDisplayed()) {
                    console.log('Step 10: OTP screen displayed — entering W2W transfer OTP');
                    await loginPage.enterOTP(data.otpCode ?? '0000');
                    await loginPage.verifyButton.click();
                } else {
                    console.log('Step 10: No OTP screen — continuing');
                }

                // ── Step 10.1: Click Ok on Success Message ───────────────────────────
                console.log('Step 10.1: Clicking Ok on success message');
                await w2wMerchant.clickOkButton();

                // ── Step 11: Verify Merchant balance DECREASED correctly ─────────────
                console.log('Step 11: Verifying Merchant balance is correctly DEBITED after W2W');
                await w2wMerchant.checkBalanceAfterTransfer_Safe_Merchant(data.amount);
                console.log('   Merchant balance debit assertion PASSED ✔');

                // ── Step 12: Allow Biller balance to settle, then verify CREDIT ───────
                console.log('Step 12: Waiting for Biller balance to reflect credit, then verifying');
                await billerPage.waitForTimeout(4000);
                await w2wBiller.checkBalanceAfterTransfer_Safe_Biller(data.amount);
                console.log('   Biller balance credit assertion PASSED ✔');

                // ── Cleanup ───────────────────────────────────────────────────────────
                await billerContext.close();
                console.log('   Biller browser context closed. Test complete ✔');
            });
        }
    });

    // ============================================================
    // SUITE 2: Transaction Table Verification
    // ============================================================

    test.describe('W2W Transfer — Transaction Appears in Transaction Table', () => {
        const txnTableTests = dataSets.filter(d => d.suite === 'transaction_table');

        for (const data of txnTableTests) {
            if (!data.execute) continue;

            test(`${data.testName}`, async ({ page }) => {

                // ── Step 1: Login ────────────────────────────────────────────────────
                console.log('Step 1: Open login page and log in as Merchant');
                await performLogin(page, data.companyNumber, data.mobileNumber, data.password, data.otpCode ?? '0000');
                console.log('   Merchant login successful ✔');

                const w2w = new W2WTransferPage(page);
                const homePage = new HomePage(page);

                // ── Step 2: Navigate to W2W Transfer ────────────────────────────────
                console.log('Step 2: Navigating to W2W Transfer screen');
                await homePage.clickW2WTransferButton();

                // ── Step 3: Enter CRN ─────────────────────────────────────
                console.log(`Step 3: Entering Receiver CRN: "${data.receiverCRN}"`);
                await w2w.enterCRN(data.receiverCRN);

                // ── Step 4: Check Recipient ──────────────────────────────────────────
                console.log('Step 4: Clicking Check Recipient to validate CRN');
                await w2w.clickCheckRecipient();
                await page.waitForTimeout(6000);

                // ── Step 4.1: Enter Amount ───────────────────────────────────────────
                console.log(`Step 4.1: Entering Amount: "${data.amount}"`);
                await w2w.enterAmount(data.amount);

                // ── Step 5: Select Purpose of Transfer ──────────────────────────────
                console.log(`Step 5: Selecting a specific Purpose of Transfer to bypass manual approval queues: "${data.purposeOfTransfer || 'Item purchases'}"`);
                await w2w.selectSpecificPurposeOfTransfer(data.purposeOfTransfer || 'Item purchases');
                await page.waitForTimeout(4000);

                // ── Step 6: Click Amount Input (UI trigger) ──────────────────────────
                console.log('Step 6: Clicking Amount input to trigger UI recalculation');
                await w2w.clickAmountInput();
                await page.waitForTimeout(4000);

                // ── Step 7: Proceed and Confirm Transfer ─────────────────────────────
                console.log('Step 7: Clicking Proceed and Transfer buttons');
                await w2w.clickProceedButton();

                // Ensure the final transfer confirmation context is fully visible before clicking
                await page.waitForTimeout(1500);
                await w2w.clickTransferButton();

                // Allow the network request to resolve and the UI to show either OTP or Success screen
                await page.waitForTimeout(3000);

                // ── Step 8: Handle W2W confirmation OTP ──────────────────────────────
                const loginPage = new LoginPage(page);
                if (await loginPage.isOTPScreenDisplayed()) {
                    console.log('Step 8: Entering W2W OTP...');
                    await loginPage.enterOTP(data.otpCode ?? '0000');
                    await loginPage.verifyButton.click();
                } else {
                    console.log('Step 8: No OTP screen — continuing');
                }

                // ── Step 8.1: Click Ok on Success Message ────────────────────────────
                console.log('Step 8.1: Clicking Ok on success message');
                await w2w.clickOkButton();
                await page.waitForTimeout(4000);

                // ── Step 9: Navigate to Transactions page ─────────────────────────────
                console.log('Step 9: Navigating to Transactions page');
                await homePage.clicTransactions_NavButton();

                // Allow transaction list to load; explicitly reload for fresh API data
                await page.waitForTimeout(3000);
                await page.reload({ waitUntil: 'networkidle' }).catch(() => null);

                // ── Step 10: Validate last transaction status ──────────────────────────
                console.log('Step 10: Fetching and validating the last transaction status');
                const transactionsPage = new TransactionsPage(page);
                let status = await transactionsPage.validateLastTransactionAndReturnStatus(data.amount);
                console.log(`   Initial transaction status fetched: "${status}"`);

                // ── Step 10.1: Polling loop if Pending ───────────────────────────────
                let retries = 3;
                while (status.toLowerCase() === 'pending' && retries > 0) {
                    console.log(`   Status is Pending. Retrying... (${retries} attempts left)`);
                    await page.waitForTimeout(3000);
                    await page.reload({ waitUntil: 'networkidle' });
                    status = await transactionsPage.validateLastTransactionAndReturnStatus(data.amount);
                    console.log(`   Latest transaction status fetched: "${status}"`);
                    retries--;
                }

                // ── Step 11: Assert status is SUCCESS ─────────────────────────────────
                console.log('Step 11: Asserting W2W transaction status is SUCCESS');
                w2w.assertW2WTransactionIsSuccess(status);
                console.log('   W2W Transaction appeared successfully in Merchant Transactions table ✔');
            });
        }
    });

    // ============================================================
    // SUITE 3: Invalid CRN Scenarios
    // ============================================================

    test.describe.serial('W2W Transfer — Invalid CRN Error Handling', () => {
        const invalidCrnTests = dataSets.filter(d => d.suite === 'invalid_crn');

        let sharedPage: import('@playwright/test').Page;
        let w2w: W2WTransferPage;
        let homePage: HomePage;

        test.beforeAll(async ({ browser }) => {
            const context = await browser.newContext();
            sharedPage = await context.newPage();

            // Find the first valid data object to extract login credentials
            const baselineData = invalidCrnTests.find(d => d.execute) || invalidCrnTests[0];

            console.log('--- beforeAll: Starting single shared browser context for Invalid CRN testing ---');
            await performLogin(
                sharedPage,
                baselineData.companyNumber,
                baselineData.mobileNumber,
                baselineData.password,
                baselineData.otpCode ?? '0000'
            );

            w2w = new W2WTransferPage(sharedPage);
            homePage = new HomePage(sharedPage);

            await homePage.clickW2WTransferButton();
        });

        for (const data of invalidCrnTests) {
            if (!data.execute) continue;

            test(`${data.testName} | CRN Type: ${data.crnType}`, async () => {

                // ── Step 3: Enter invalid CRN ────────────────────────────────────────
                console.log(`Step 3: Entering invalid Receiver CRN: "${data.receiverCRN}" (Type: ${data.crnType})`);
                await w2w.inputCRN.clear();
                await w2w.enterCRN(data.receiverCRN);

                // ── Step 4: Click Check Recipient ────────────────────────────────────
                console.log('Step 4: Clicking Check Recipient button');
                await w2w.clickCheckRecipient();

                if (data.testName === 'W2W_Transfer_InvalidCRN_NonExistent' || data.testName.includes('IsSame_For_Sender_And_Receiver')) {
                    // ── Step 5: Assert Toast Message appears ─────────────────────────────
                    console.log('Step 5: Asserting "No recipient found" toast is displayed');
                    await w2w.assertNoRecipientFoundToast();
                    console.log(`   Invalid CRN "${data.crnType}" correctly rejected with toast ✔`);
                } else {
                    // ── Step 5: Allow API lookup to complete ────────────────────────────
                    console.log('Step 5: Waiting for CRN lookup response...');
                    await sharedPage.waitForTimeout(6000);

                    // ── Step 6: Enter Transfer Amount ────────────────────────────────────
                    console.log(`Step 6: Entering Transfer Amount: "${data.amount}"`);
                    await w2w.inputAmount.clear();
                    await w2w.enterAmount(data.amount);

                    // ── Step 7: Assert company name div is EMPTY (CRN not found) ─────────
                    console.log('Step 7: Asserting company name div is empty — confirming CRN was rejected');
                    await w2w.assertCompanyNameIsEmpty();
                    console.log(`   Invalid CRN "${data.crnType}" correctly rejected (div empty) ✔`);
                }

                // Reset state for next iteration safely
                await w2w.inputCRN.clear();
                if (await w2w.inputAmount.isVisible()) {
                    await w2w.inputAmount.clear();
                }
            });
        }
    });

    // ============================================================
    // SUITE 4: Amount Field Validation (Prevents Invalid Input)
    // ============================================================

    test.describe.serial('W2W Transfer — Amount Field Input Validation Layout', () => {
        const amountValidationTests = dataSets.filter(d => d.suite === 'amount_validation');

        let sharedPage: import('@playwright/test').Page;
        let w2w: W2WTransferPage;
        let homePage: HomePage;

        test.beforeAll(async ({ browser }) => {
            const context = await browser.newContext();
            await context.grantPermissions(['clipboard-read', 'clipboard-write']);
            sharedPage = await context.newPage();

            const baselineData = amountValidationTests.find(d => d.execute) || amountValidationTests[0];

            console.log('--- beforeAll: Starting single shared browser context for Amount Validation testing ---');
            await performLogin(
                sharedPage,
                baselineData.companyNumber,
                baselineData.mobileNumber,
                baselineData.password,
                baselineData.otpCode ?? '0000'
            );

            w2w = new W2WTransferPage(sharedPage);
            homePage = new HomePage(sharedPage);

            await homePage.clickW2WTransferButton();

            // Setup persistent form state: Enter a valid CRN and click Check Recipient to reveal amount field
            console.log(`--- beforeAll: Navigating to W2W Transfer and unlocking wizard with baseline CRN "${baselineData.receiverCRN}" ---`);
            await w2w.inputCRN.clear();
            await w2w.enterCRN(baselineData.receiverCRN);
            await w2w.clickCheckRecipient();

            // Wait for company name div or amount field to be visible to ensure form unlocked
            await sharedPage.waitForTimeout(4000);

            // Select Purpose of Transfer to unlock the Proceed button state permanently
            await w2w.selectRandomPurposeOfTransfer();
        });

        for (const data of amountValidationTests) {
            if (!data.execute) continue;

            test(`${data.testName} | Validation Type: ${data.amountValidation}`, async () => {

                console.log(`Step 3: Interacting with Transfer Amount: "${data.amount}"`);
                await w2w.inputAmount.clear();

                if (data.isClipboardTest) {
                    console.log(`   Pasting amount via clipboard: "${data.amount}"`);
                    await w2w.inputAmount.focus();
                    await sharedPage.evaluate((text) => navigator.clipboard.writeText(text), data.amount);
                    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
                    await sharedPage.keyboard.press(`${modifier}+V`);
                } else {
                    console.log(`   Typing amount sequentially: "${data.amount}"`);
                    if (data.amount !== "") {
                        await w2w.inputAmount.pressSequentially(data.amount, { delay: 50 });
                    }
                }

                if (data.expectedUIValue !== undefined) {
                    // Verify the value is accurately rendered or filtered
                    const enteredAmount = await w2w.getAmountValue();
                    expect(enteredAmount).toBe(data.expectedUIValue);
                    console.log(`   Passed: UI Filter successfully evaluated the input. Field value is currently: [${enteredAmount}]`);
                }

                if (data.expectButtonDisabled) {
                    // Proceed button should be strictly disabled
                    await expect(w2w.proceedButton).toBeDisabled({ timeout: 5000 });
                    console.log('   Passed: Proceed button is correctly DISABLED for this invalid case.');
                } else {
                    // Ensure system recognizes the input and activates the UI transfer button
                    await expect(w2w.proceedButton).toBeEnabled({ timeout: 5000 });
                    console.log('   Passed: Proceed button is correctly ENABLED for this valid case.');
                }

                // Cleanly clear the amount input box at the end of each test
                await w2w.inputAmount.clear();
            });
        }
    });

    // ============================================================
    // SUITE 5: Insufficient Fund Test
    // ============================================================

    test.describe('W2W Transfer — Insufficient Fund', () => {
        const insufficientFundTests = dataSets.filter(d => d.suite === 'insufficient_fund');

        for (const data of insufficientFundTests) {
            if (!data.execute) continue;

            test(`${data.testName}`, async ({ page }) => {

                // ── Step 1: Login ────────────────────────────────────────────────────
                console.log('Step 1: Open login page and log in as Merchant');
                await performLogin(page, data.companyNumber, data.mobileNumber, data.password, data.otpCode ?? '0000');
                console.log('   Merchant login successful ✔');

                const w2w = new W2WTransferPage(page);
                const homePage = new HomePage(page);

                // ── Step 2: Navigate to W2W Transfer ────────────────────────────────
                console.log('Step 2: Navigate to W2W Transfer page');
                await homePage.clickW2WTransferButton();

                // ── Step 3: Capture current balance to compute over-limit amount ─────
                console.log('Step 3: Reading current Merchant balance to compute amount exceeding it');
                const balanceBefore = await w2w.captureBalanceBeforeTransfer_Merchant();

                // ── Step 4: Enter CRN ─────────────────────────────────────────────────
                console.log(`Step 4: Entering Receiver CRN: "${data.receiverCRN}"`);
                await w2w.enterCRN(data.receiverCRN);

                // ── Step 5: Check Recipient ──────────────────────────────────────────
                console.log('Step 5: Clicking Check Recipient');
                await w2w.clickCheckRecipient();
                await page.waitForTimeout(4000);

                // ── Step 6: Enter amount that EXCEEDS current balance ─────────────────
                const amountToTransfer = (balanceBefore + 100).toFixed(2);
                console.log(`Step 6: Entering amount GREATER than balance: ${amountToTransfer} (Balance: ${balanceBefore})`);
                await w2w.enterAmount(amountToTransfer);

                // ── Step 7: Select Purpose of Transfer ──────────────────────────────
                console.log('Step 7: Selecting a random Purpose of Transfer');
                await w2w.selectRandomPurposeOfTransfer();
                await page.waitForTimeout(2000);

                // ── Step 8: Proceed and attempt Transfer ─────────────────────────────
                console.log('Step 8: Clicking Proceed and Transfer buttons');
                await w2w.clickProceedButton();

                // Ensure the final transfer confirmation context is fully visible before clicking
                await page.waitForTimeout(1500);
                await w2w.clickTransferButton();

                // ── Step 9: Assert Insufficient Fund error is displayed ───────────────
                console.log('Step 9: Validating Insufficient Fund error message is displayed');
                await w2w.assertInsufficientFundToastDisplayed();
                console.log('   Insufficient fund error correctly displayed ✔');
            });
        }
    });
    // ============================================================
    // SUITE 6: CRN Input Validation (Boundary & Characters)
    // ============================================================

    test.describe.serial('W2W Transfer — CRN Field Input Validation Layout', () => {
        const crnValidationTests = dataSets.filter(d => d.suite === 'crn_validation');

        let sharedPage: import('@playwright/test').Page;
        let w2wTransferPage: W2WTransferPage;
        let homePage: HomePage;

        test.beforeAll(async ({ browser }) => {
            const context = await browser.newContext();
            sharedPage = await context.newPage();

            // Find the first valid data object to extract login credentials
            const baselineData = crnValidationTests.find(d => d.execute) || crnValidationTests[0];

            console.log('--- beforeAll: Starting single shared browser context for CRN boundary testing ---');
            // Execute single persistent login
            await performLogin(
                sharedPage,
                baselineData.companyNumber,
                baselineData.mobileNumber,
                baselineData.password,
                baselineData.otpCode ?? '0000'
            );

            w2wTransferPage = new W2WTransferPage(sharedPage);
            homePage = new HomePage(sharedPage);

            // Navigate to W2W Transfer once
            await homePage.clickW2WTransferButton();
        });

        for (const data of crnValidationTests) {
            if (!data.execute) continue;

            test(`${data.testName} | Validation Type: ${data.crnType}`, async () => {

                // ── Step 3: Type into CRN Field ──────────────────────────────────────
                console.log(`Step 3: Typing Receiver CRN: "${data.receiverCRN}"`);
                // Clear first, then type sequentially to simulate real input
                await w2wTransferPage.inputCRN.clear();
                if (data.receiverCRN) {
                    await w2wTransferPage.inputCRN.pressSequentially(data.receiverCRN, { delay: 50 });
                }

                // ── Step 4: Validate UI filtering behavior ───────────────────────────
                if (data.expectedUIValue !== undefined) {
                    console.log(`Step 4: Asserting UI filtered the value to: "${data.expectedUIValue}"`);
                    const actualValue = await w2wTransferPage.inputCRN.inputValue();
                    if (actualValue !== data.expectedUIValue) {
                        throw new Error(`CRN input filter failed. Expected UI to show "${data.expectedUIValue}", but found "${actualValue}"`);
                    }
                    expect(actualValue).toBe(data.expectedUIValue);
                    console.log(`   Passed: UI filter restricted the input to: [${actualValue}] ✔`);
                }

                // ── Step 5: Assert Button State ──────────────────────────────────────
                console.log(`Step 5: Asserting Check Recipient button state. Expecting disabled: ${data.expectButtonDisabled}`);
                if (data.expectButtonDisabled) {
                    await expect(w2wTransferPage.checkRecipientButton).toBeDisabled({ timeout: 5000 });
                    console.log('   Assertion Passed: Check Recipient button is correctly DISABLED ✔');
                } else {
                    await expect(w2wTransferPage.checkRecipientButton).toBeEnabled({ timeout: 5000 });
                    console.log('   Assertion Passed: Check Recipient button is correctly ENABLED ✔');
                }

                // Crucial: Clear or reset the field at the end of each test so the next scenario starts with a clean input box.
                await w2wTransferPage.inputCRN.clear();
            });
        }
    });
});
