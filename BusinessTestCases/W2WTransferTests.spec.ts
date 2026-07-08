import { test, expect } from '@playwright/test';
import { type Page } from '@playwright/test';
import { LoginPage } from './Helpers/LoginPage';
import { HomePage } from './Helpers/HomePage';
import { W2WTransferPage } from './Helpers/W2WTransferPage';
import { TransactionsPage } from './Helpers/TransactionsPage';
import w2wData from '../data/w2wTransferData.json';

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
const BASE_URL  = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';

async function performLogin(
    page: Page,
    companyNumber: string,
    mobileNumber: string,
    password: string,
    otpCode: string
): Promise<void> {
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/business/auth/login`);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(companyNumber, mobileNumber, password);

    if (await loginPage.isOTPScreenDisplayed()) {
        await loginPage.enterOTP(otpCode);
        await loginPage.verifyButton.click();
    }

    await loginPage.assertLoginSuccess();
}

test.describe('MajdPay W2W Transfer Tests', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(180000);

    // ── Suite 1: Balance Update (Merchant DEBIT + Biller CREDIT) ──────────────

    test.describe('W2W Transfer — Verify Merchant & Biller Balance Update', () => {
        const balanceUpdateTests = dataSets.filter(d => d.suite === 'balance_update');

        for (const data of balanceUpdateTests) {
            if (!data.execute) continue;

            test(`${data.testName} | Amount Type: ${data.amountType}`, async ({ page, browser }) => {
                await performLogin(page, data.companyNumber, data.mobileNumber, data.password, data.otpCode ?? '0000');

                const billerContext = await browser.newContext();
                const billerPage    = await billerContext.newPage();
                await performLogin(billerPage, data.companyNumber_Biller, data.mobileNumber_Biller, data.password_Biller, data.otpCode ?? '0000');

                const w2wMerchant   = new W2WTransferPage(page);
                const w2wBiller     = new W2WTransferPage(billerPage);
                const homeMerchant  = new HomePage(page);

                await w2wBiller.captureBalanceBeforeTransfer_Biller();
                await w2wMerchant.captureBalanceBeforeTransfer_Merchant();
                await homeMerchant.clickW2WTransferButton();

                await w2wMerchant.enterCRN(data.receiverCRN);
                await w2wMerchant.clickCheckRecipient();
                await page.waitForTimeout(4000);

                await w2wMerchant.enterAmount(data.amount);
                await w2wMerchant.selectRandomPurposeOfTransfer();
                await page.waitForTimeout(4000);

                await w2wMerchant.clickAmountInput();
                await page.waitForTimeout(4000);

                await w2wMerchant.clickProceedButton();
                await page.waitForTimeout(1500);
                await w2wMerchant.clickTransferButton();
                await page.waitForTimeout(3000);

                const loginPage = new LoginPage(page);
                if (await loginPage.isOTPScreenDisplayed()) {
                    await loginPage.enterOTP(data.otpCode ?? '0000');
                    await loginPage.verifyButton.click();
                }

                await w2wMerchant.clickOkButton();
                await w2wMerchant.checkBalanceAfterTransfer_Safe_Merchant(data.amount);

                await billerPage.waitForTimeout(4000);
                await w2wBiller.checkBalanceAfterTransfer_Safe_Biller(data.amount);

                await billerContext.close();
            });
        }
    });

    // ── Suite 2: Transaction Table Verification ───────────────────────────────

    test.describe('W2W Transfer — Transaction Appears in Transaction Table', () => {
        const txnTableTests = dataSets.filter(d => d.suite === 'transaction_table');

        for (const data of txnTableTests) {
            if (!data.execute) continue;

            test(`${data.testName}`, async ({ page }) => {
                await performLogin(page, data.companyNumber, data.mobileNumber, data.password, data.otpCode ?? '0000');

                const w2w      = new W2WTransferPage(page);
                const homePage = new HomePage(page);

                await homePage.clickW2WTransferButton();
                await w2w.enterCRN(data.receiverCRN);
                await w2w.clickCheckRecipient();
                await page.waitForTimeout(6000);

                await w2w.enterAmount(data.amount);
                await w2w.selectSpecificPurposeOfTransfer(data.purposeOfTransfer || 'Item purchases');
                await page.waitForTimeout(4000);

                await w2w.clickAmountInput();
                await page.waitForTimeout(4000);

                await w2w.clickProceedButton();
                await page.waitForTimeout(1500);
                await w2w.clickTransferButton();
                await page.waitForTimeout(3000);

                const loginPage = new LoginPage(page);
                if (await loginPage.isOTPScreenDisplayed()) {
                    await loginPage.enterOTP(data.otpCode ?? '0000');
                    await loginPage.verifyButton.click();
                }

                await w2w.clickOkButton();
                await page.waitForTimeout(4000);

                await homePage.clicTransactions_NavButton();
                await page.waitForTimeout(3000);
                await page.reload({ waitUntil: 'networkidle' }).catch(() => null);

                const transactionsPage = new TransactionsPage(page);
                let status = await transactionsPage.validateLastTransactionAndReturnStatus(data.amount);

                let retries = 3;
                while (status.toLowerCase() === 'pending' && retries > 0) {
                    await page.waitForTimeout(3000);
                    await page.reload({ waitUntil: 'networkidle' });
                    status = await transactionsPage.validateLastTransactionAndReturnStatus(data.amount);
                    retries--;
                }

                w2w.assertW2WTransactionIsSuccess(status);
            });
        }
    });

    // ── Suite 3: Invalid CRN Error Handling ───────────────────────────────────

    test.describe('W2W Transfer — Invalid CRN Error Handling', () => {
        test.describe.configure({ mode: 'serial' });
        const invalidCrnTests = dataSets.filter(d => d.suite === 'invalid_crn');

        let sharedPage: Page;
        let w2w: W2WTransferPage;
        let homePage: HomePage;

        test.beforeAll(async ({ browser }) => {
            const context  = await browser.newContext();
            sharedPage     = await context.newPage();
            const baseData = invalidCrnTests.find(d => d.execute) || invalidCrnTests[0];

            await performLogin(sharedPage, baseData.companyNumber, baseData.mobileNumber, baseData.password, baseData.otpCode ?? '0000');

            w2w      = new W2WTransferPage(sharedPage);
            homePage = new HomePage(sharedPage);
            await homePage.clickW2WTransferButton();
        });

        for (const data of invalidCrnTests) {
            if (!data.execute) continue;

            test(`${data.testName} | CRN Type: ${data.crnType}`, async () => {
                await w2w.inputCRN.clear();
                await w2w.enterCRN(data.receiverCRN);
                await w2w.clickCheckRecipient();

                if (data.testName === 'W2W_Transfer_InvalidCRN_NonExistent' || data.testName.includes('IsSame_For_Sender_And_Receiver')) {
                    await w2w.assertNoRecipientFoundToast();
                } else {
                    await sharedPage.waitForTimeout(6000);
                    await w2w.inputAmount.clear();
                    await w2w.enterAmount(data.amount);
                    await w2w.assertCompanyNameIsEmpty();
                }

                await w2w.inputCRN.clear();
                if (await w2w.inputAmount.isVisible()) {
                    await w2w.inputAmount.clear();
                }
            });
        }
    });

    // ── Suite 4: Amount Field Input Validation ────────────────────────────────

    test.describe('W2W Transfer — Amount Field Input Validation Layout', () => {
        test.describe.configure({ mode: 'serial' });
        const amountValidationTests = dataSets.filter(d => d.suite === 'amount_validation');

        let sharedPage: Page;
        let w2w: W2WTransferPage;
        let homePage: HomePage;

        test.beforeAll(async ({ browser }) => {
            const context  = await browser.newContext();
            await context.grantPermissions(['clipboard-read', 'clipboard-write']);
            sharedPage     = await context.newPage();
            const baseData = amountValidationTests.find(d => d.execute) || amountValidationTests[0];

            await performLogin(sharedPage, baseData.companyNumber, baseData.mobileNumber, baseData.password, baseData.otpCode ?? '0000');

            w2w      = new W2WTransferPage(sharedPage);
            homePage = new HomePage(sharedPage);
            await homePage.clickW2WTransferButton();

            await w2w.inputCRN.clear();
            await w2w.enterCRN(baseData.receiverCRN);
            await w2w.clickCheckRecipient();
            await sharedPage.waitForTimeout(4000);
            await w2w.selectRandomPurposeOfTransfer();
        });

        for (const data of amountValidationTests) {
            if (!data.execute) continue;

            test(`${data.testName} | Validation Type: ${data.amountValidation}`, async () => {
                await w2w.inputAmount.clear();

                if (data.isClipboardTest) {
                    await w2w.inputAmount.focus();
                    await sharedPage.evaluate((text) => navigator.clipboard.writeText(text), data.amount);
                    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
                    await sharedPage.keyboard.press(`${modifier}+V`);
                } else if (data.amount !== '') {
                    await w2w.inputAmount.pressSequentially(data.amount, { delay: 50 });
                }

                if (data.expectedUIValue !== undefined) {
                    expect(await w2w.getAmountValue()).toBe(data.expectedUIValue);
                }

                if (data.expectButtonDisabled) {
                    await expect(w2w.proceedButton).toBeDisabled({ timeout: 5000 });
                } else {
                    await expect(w2w.proceedButton).toBeEnabled({ timeout: 5000 });
                }

                await w2w.inputAmount.clear();
            });
        }
    });

    // ── Suite 5: Insufficient Fund ────────────────────────────────────────────

    test.describe('W2W Transfer — Insufficient Fund', () => {
        const insufficientFundTests = dataSets.filter(d => d.suite === 'insufficient_fund');

        for (const data of insufficientFundTests) {
            if (!data.execute) continue;

            test(`${data.testName}`, async ({ page }) => {
                await performLogin(page, data.companyNumber, data.mobileNumber, data.password, data.otpCode ?? '0000');

                const w2w      = new W2WTransferPage(page);
                const homePage = new HomePage(page);

                await homePage.clickW2WTransferButton();

                const balanceBefore    = await w2w.captureBalanceBeforeTransfer_Merchant();
                const amountToTransfer = (balanceBefore + 100).toFixed(2);

                await w2w.enterCRN(data.receiverCRN);
                await w2w.clickCheckRecipient();
                await page.waitForTimeout(4000);

                await w2w.enterAmount(amountToTransfer);
                await w2w.selectRandomPurposeOfTransfer();
                await page.waitForTimeout(2000);

                await w2w.clickProceedButton();
                await page.waitForTimeout(1500);
                await w2w.clickTransferButton();

                await w2w.assertInsufficientFundToastDisplayed();
            });
        }
    });

    // ── Suite 6: CRN Field Input Validation ──────────────────────────────────

    test.describe('W2W Transfer — CRN Field Input Validation Layout', () => {
        test.describe.configure({ mode: 'serial' });
        const crnValidationTests = dataSets.filter(d => d.suite === 'crn_validation');

        let sharedPage: Page;
        let w2wTransferPage: W2WTransferPage;
        let homePage: HomePage;

        test.beforeAll(async ({ browser }) => {
            const context  = await browser.newContext();
            sharedPage     = await context.newPage();
            const baseData = crnValidationTests.find(d => d.execute) || crnValidationTests[0];

            await performLogin(sharedPage, baseData.companyNumber, baseData.mobileNumber, baseData.password, baseData.otpCode ?? '0000');

            w2wTransferPage = new W2WTransferPage(sharedPage);
            homePage        = new HomePage(sharedPage);
            await homePage.clickW2WTransferButton();
        });

        for (const data of crnValidationTests) {
            if (!data.execute) continue;

            test(`${data.testName} | Validation Type: ${data.crnType}`, async () => {
                await w2wTransferPage.inputCRN.clear();
                if (data.receiverCRN) {
                    await w2wTransferPage.inputCRN.pressSequentially(data.receiverCRN, { delay: 50 });
                }

                if (data.expectedUIValue !== undefined) {
                    const actualValue = await w2wTransferPage.inputCRN.inputValue();
                    if (actualValue !== data.expectedUIValue) {
                        throw new Error(`CRN input filter failed. Expected "${data.expectedUIValue}", but found "${actualValue}"`);
                    }
                    expect(actualValue).toBe(data.expectedUIValue);
                }

                if (data.expectButtonDisabled) {
                    await expect(w2wTransferPage.checkRecipientButton).toBeDisabled({ timeout: 5000 });
                } else {
                    await expect(w2wTransferPage.checkRecipientButton).toBeEnabled({ timeout: 5000 });
                }

                await w2wTransferPage.inputCRN.clear();
            });
        }
    });
});
