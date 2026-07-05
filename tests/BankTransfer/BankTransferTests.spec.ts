import { test, expect } from '@playwright/test';
import { type Page } from '@playwright/test';
import { LoginPage } from '../pageElements/LoginPage';
import { OtpPage } from '../pageElements/OtpPage';
import { HomePage } from '../Helpers/HomePage';
import { BankTransferPage } from '../Helpers/BankTransferPage';
import { ToastMessages } from '../Helpers/common/ToastMessages';
import { LOGIN_URL, HOME_URL } from './BankTransferHelper';
import bankTransferData from '../../data/BankTransferData.json';

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

test.describe('Merchant Bank Transfer Tests', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(180000);

    let page: Page;
    let loginPage: LoginPage;
    let otp: OtpPage;
    let hp: HomePage;
    let bt: BankTransferPage;
    let toast: ToastMessages;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        loginPage = new LoginPage(page);
        otp = new OtpPage(page);
        hp = new HomePage(page);
        bt = new BankTransferPage(page);
        toast = new ToastMessages(page);

        const data = dataSets.find(d => d.execute !== false) || dataSets[0];
        await loginPage.goto(LOGIN_URL);
        await loginPage.fillAndSubmit(data.CN, data.mobile, data.pwd);

        if (await otp.isVisible()) {
            await otp.fillAndVerify('0000');
        }
        await expect(page).toHaveURL(/\/business\/main\/home/i, { timeout: 10000 });
    });

    test.beforeEach(async () => {
        await page.goto(HOME_URL);
        await page.waitForLoadState('domcontentloaded');
        await hp.clickTransferButton();
    });

    test.afterAll(async () => {
        await page.close();
    });

    for (const data of dataSets) {
        test(`${data.description}`, async () => {
            test.skip(!data.execute, 'disabled in test data');

            if (data.AmountType === 'Standard') {
                await test.step('Execute Standard Bank Transfer with custom amount', async () => {
                    await bt.getBalanceBeforeBankTransfer();
                    await bt.enterAmount(data.Amount);
                    await bt.clickProceedButton();
                    await bt.clickProceedButtonInSummary();

                    if (await otp.isVisible()) {
                        await otp.fillAndVerify('0000');
                    }

                    await bt.clickSuccessful_OkButton();
                    await page.reload();
                    await bt.checkBalanceAfterBankTransfer(data.Amount);
                });

            } else if (data.AmountType === 'Predefined') {
                await test.step('Execute Bank Transfer with random Predefined Amount selector', async () => {
                    await bt.getBalanceBeforeBankTransfer();
                    await bt.selectRandomPredefinedAmount();
                    await bt.clickProceedButton();
                    await bt.clickProceedButtonInSummary();

                    if (await otp.isVisible()) {
                        await otp.fillAndVerify('0000');
                    }

                    await bt.clickSuccessful_OkButton();
                    await page.reload();
                    await bt.checkBalanceAfterBankTransferBySelectAmount();
                });

            } else if (data.AmountType === 'Failure Flow Invalid OTP') {
                await test.step('Execute Bank Transfer with Invalid OTP and Verify Failure', async () => {
                    await bt.getBalanceBeforeBankTransfer();
                    await bt.enterAmount(data.Amount);
                    await bt.clickProceedButton();
                    await bt.clickProceedButtonInSummary();

                    if (await otp.isVisible()) {
                        await otp.fill('9999');
                        await otp.verifyButton.click();
                        await otp.cancelButton.click();
                    }

                    await hp.clicTransactions_NavButton();
                    await bt.verifyLastTransactionFailed();
                });

            } else if (data.AmountType === 'Negative Flow') {
                await test.step('Assert negative/invalid input validation on amount field', async () => {
                    await bt.assertInvalidAmountNotAccepted(data.Amount, data.AmountType);
                });

            } else if (data.AmountType === 'Zero Amount Test') {
                await test.step('Verify system behavior when entering 0 as transfer amount', async () => {
                    await bt.assertInvalidAmountNotAccepted(data.Amount, data.AmountType);
                });

            } else if (data.AmountType === 'Invalid Characters Test') {
                await test.step('Verify system behavior when entering alphabetic characters or special symbols', async () => {
                    await bt.assertInvalidAmountNotAccepted(data.Amount, data.AmountType);
                });

            } else if (data.AmountType === 'Valid Float with 2 Decimals' || data.AmountType === 'Valid Float with 1 Decimal') {
                await test.step(`Execute Bank Transfer for ${data.AmountType} ensuring decimal BVA passes`, async () => {
                    await bt.getBalanceBeforeBankTransfer();
                    await bt.enterAmount(data.Amount);
                    await bt.clickProceedButton();
                    await bt.clickProceedButtonInSummary();

                    if (await otp.isVisible()) {
                        await otp.fillAndVerify('0000');
                    }

                    await bt.clickSuccessful_OkButton();
                    await page.reload();
                    await bt.checkBalanceAfterBankTransfer(data.Amount);
                });

            } else if (data.AmountType === 'Invalid Float with 3 Decimals') {
                await test.step('Verify system truncates or rejects invalid floats with 3 decimals (Negative BVA)', async () => {
                    await bt.assertInvalidAmountNotAccepted(data.Amount, data.AmountType);
                });

            } else if (data.AmountType === 'Copy and Paste Amount') {
                await test.step('Simulate copying and pasting amount directly to check validation triggers', async () => {
                    await bt.pasteAmount(data.Amount);
                    expect(await bt.getAmountValue()).toBe(data.Amount);
                    await expect(bt.proceedButton).toBeEnabled({ timeout: 5000 });
                });

            } else if (data.AmountType === 'Copy and Paste Invalid Amount') {
                await test.step('Simulate pasting invalid amount to check negative validation triggers', async () => {
                    await bt.pasteAmount(data.Amount);
                    expect(await bt.getAmountValue()).toBe('');
                    await expect(bt.proceedButton).toBeDisabled({ timeout: 5000 });
                });

            } else if (data.AmountType === 'Cancel via Page Refresh') {
                await test.step('Fill transfer details and abort transaction by refreshing page', async () => {
                    await bt.getBalanceBeforeBankTransfer();
                    await bt.enterAmount(data.Amount);
                    await bt.clickProceedButton();
                    await page.waitForTimeout(2000);
                    await expect(bt.proceedButtonInSummary).toBeVisible({ timeout: 15000 });
                    await page.reload();
                    await bt.checkBalanceRemainsUnchanged();
                });

            } else if (data.AmountType === 'Cancel via Summary Cancel Button') {
                await test.step('Fill transfer details and logically cancel via explicit Cancel button', async () => {
                    await bt.getBalanceBeforeBankTransfer();
                    await bt.enterAmount(data.Amount);
                    await bt.clickProceedButton();
                    await page.waitForTimeout(2000);
                    await bt.clickSummaryCancelButton();
                    await bt.checkBalanceRemainsUnchanged();
                });

            } else if (data.AmountType === 'Insufficient Balance Check') {
                await test.step('Execute Insufficient Balance cash out check', async () => {
                    const walletBalance = await bt.getBalanceBeforeBankTransfer();
                    await bt.enterAmount(String(walletBalance + 10));
                    await bt.clickProceedButton();
                    await toast.verifyInsufficientFundMessageDisplayed();
                });
            }
        });
    }
});
