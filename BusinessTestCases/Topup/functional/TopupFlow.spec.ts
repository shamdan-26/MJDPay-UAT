import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomePage } from '../../pageElements/Shared/HomePage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { TopupPage } from '../../pageElements/Topup/TopupPage';
import { HOME_URL } from '../TopupHelper';
import { LOGIN_URL, getOtpFromDb } from '../../Login/LoginHelper';
import topupData from '../../../data/topupData.json';

// Real card-payment topup flow: MADA/VISA/MASTER submission, the Hyperpay
// gateway-simulator return codes (failed/pending), amount-field validation,
// and mid-flow cancellation. Element presence lives in ui/TopupPage.spec.ts
// and ui/TopupSummaryPage.spec.ts — this file owns "does the money move."

type TopupTestData = {
    testName: string;
    execute: boolean;
    companyNumber: string;
    mobileNumber: string;
    password: string;
    amount?: string;
    paymentMethod: 'MADA' | 'VISA' | 'MASTER';
    cardNumber?: string;
    expiry?: string;
    holder?: string;
    cvv?: string;
    otpCode?: string;
    isSelectAmount?: boolean;
    expectDisabled?: boolean;
    returnCode?: string;
    expectedStatus?: 'FAILED' | 'PENDING';
    amountInput?: string;
    expectedValue?: string;
    isNegativeFlow?: boolean;
    isButtonDisabled?: boolean;
    isClipboardTest?: boolean;
    cancelType?: 'REFRESH' | 'CANCEL_BUTTON';
};

const dataSets = (topupData as TopupTestData[]).filter(d => d.execute);

test.describe.serial('Topup — Card Payment Flow', () => {
    test.setTimeout(150000);

    let page: Page;
    let loginPage: LoginPage;
    let otp: OtpPage;
    let homePage: HomePage;
    let quickActions: HomepageQuickActionsPage;
    let topup: TopupPage;
    let isLoggedIn = false;

    test.beforeEach(async ({ browser }) => {
        if (!page || page.isClosed()) {
            page = await browser.newPage();
            loginPage = new LoginPage(page);
            otp = new OtpPage(page);
            homePage = new HomePage(page);
            quickActions = new HomepageQuickActionsPage(page);
            topup = new TopupPage(page);
            isLoggedIn = false;
        }

        if (!isLoggedIn) {
            const data = dataSets.find(d => d.companyNumber) ?? dataSets[0]!;
            await loginPage.goto(LOGIN_URL);
            await loginPage.fillAndSubmit(data.companyNumber, data.mobileNumber, data.password);
            if (await otp.isVisible()) {
                await otp.fillAndVerify(await getOtpFromDb(data.mobileNumber));
            }
            await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });
            isLoggedIn = true;
        }

        await page.goto(HOME_URL);
        await page.waitForLoadState('domcontentloaded');
        await quickActions.quickActionTopupCard.click();
        await expect(topup.inputAmount).toBeVisible({ timeout: 15000 });
    });

    test.afterAll(async () => {
        if (page && !page.isClosed()) await page.close();
    });

    for (const data of dataSets) {
        test(data.testName, async () => {
            // ── Amount-field validation only (no payment method / gateway involved) ──
            if (data.amountInput !== undefined && data.cancelType === undefined) {
                if (data.isClipboardTest) {
                    await topup.pasteAmount(data.amountInput);
                } else {
                    await topup.enterAmount(data.amountInput);
                }
                expect(await topup.getAmountValue()).toBe(data.expectedValue);

                if (data.isButtonDisabled) {
                    await expect(topup.proceedButton).toBeDisabled({ timeout: 5000 });
                } else {
                    await expect(topup.proceedButton).toBeEnabled({ timeout: 5000 });
                }
                return;
            }

            // ── Cancellation mid-flow ──────────────────────────────────────────────
            if (data.cancelType !== undefined) {
                await topup.getBalanceBeforeTopup();
                await topup.selectPaymentMethod(data.paymentMethod.toLowerCase() as 'mada' | 'visa' | 'master');
                await topup.enterAmount(data.amountInput!);
                await topup.clickProceedButton();
                await expect(topup.summaryNextButton).toBeVisible({ timeout: 15000 });

                if (data.cancelType === 'REFRESH') {
                    await page.reload();
                    await page.waitForLoadState('networkidle').catch(() => null);
                } else {
                    await topup.clickSummaryCancelButton();
                }

                await expect(topup.summaryNextButton).not.toBeVisible({ timeout: 5000 });
                await topup.checkBalanceRemainsUnchanged();
                return;
            }

            // ── Full card-payment flow ─────────────────────────────────────────────
            await topup.getBalanceBeforeTopup();
            await topup.selectPaymentMethod(data.paymentMethod.toLowerCase() as 'mada' | 'visa' | 'master');

            if (data.isSelectAmount) {
                await topup.selectRandomPresetChip();
            } else {
                await topup.enterAmount(data.amount!);
            }

            await topup.clickProceedButton();
            const popup = await topup.clickSummaryNextAndCapturePopup();

            await topup.fillCardDetails(data.cardNumber!, data.expiry!, data.holder!, data.cvv!);

            if (data.expectDisabled) {
                await topup.assertPayNowButtonIsDisabled();
                await popup.close();
                topup.resetActivePage();
                return;
            }

            await topup.clickPayNowButton();

            if (data.returnCode) {
                await topup.selectGatewayReturnCode(data.returnCode);
            }

            if (data.paymentMethod === 'MADA' || data.paymentMethod === 'MASTER') {
                await topup.clickCardSchemeSubmitButton();
            } else if (await topup.isHyperpayScreenDisplayed()) {
                await topup.clickHyperpaySubmitButton();
            }

            await popup.waitForEvent('close', { timeout: 30000 }).catch(() => null);
            topup.resetActivePage();

            if (await otp.isVisible()) {
                await otp.fillAndVerify(data.otpCode ?? await getOtpFromDb(data.mobileNumber));
            }

            if (data.expectedStatus === 'FAILED') {
                await topup.assertFailedPopup();
                await topup.clickResultOkButton();
                await topup.checkBalanceRemainsUnchanged();
                await homePage.clicTransactions_NavButton();
                await page.reload({ waitUntil: 'networkidle' }).catch(() => null);
                await topup.verifyLastTransactionFailed();
                return;
            }

            if (data.expectedStatus === 'PENDING') {
                await topup.assertPendingPopup();
                await topup.clickResultOkButton();
                await topup.checkBalanceRemainsUnchanged();
                return;
            }

            await topup.clickResultOkButton();
            await page.reload();
            await page.waitForLoadState('networkidle').catch(() => null);

            if (data.isSelectAmount) {
                await topup.checkBalanceAfterTopupBySelectedChip();
            } else {
                await topup.checkBalanceAfterTopup(data.amount!);
            }
        });
    }
});
