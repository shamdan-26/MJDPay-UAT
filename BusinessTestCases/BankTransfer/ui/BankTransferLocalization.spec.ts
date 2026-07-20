import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/LoginPage';
import { OtpPage } from '../../pageElements/OtpPage';
import { DashboardPage } from '../../pageElements/DashboardPage';
import { HomepageQuickActionsPage } from '../../pageElements/HomepageQuickActionsPage';
import { BankTransferPage } from '../../pageElements/BankTransferPage';
import { HOME_URL } from '../BankTransferHelper';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../Login/LoginHelper';

// Arabic-locale checks for the Bank Transfer flow. Per QA-DATA-TESTID-HANDOFF.md,
// the frontend replaced text-based locators with `data-testid` specifically so
// these controls resolve identically in English and Arabic — this file verifies
// that promise: the flow still works when switched to Arabic, and the app
// actually renders the documented Arabic copy (not just "some text").

test.describe('BankTransfer — Arabic Localization', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(90000);

    let page: Page;
    let dashboard: DashboardPage;
    let quickActions: HomepageQuickActionsPage;
    let bt: BankTransferPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();

        const loginPage = new LoginPage(page);
        const otp = new OtpPage(page);
        dashboard = new DashboardPage(page);
        quickActions = new HomepageQuickActionsPage(page);
        bt = new BankTransferPage(page);

        await loginPage.goto(LOGIN_URL);
        await loginPage.fillAndSubmit(VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD);
        if (await otp.isVisible()) {
            await otp.fillAndVerify(await getOtpFromDb(VALID_MOBILE));
        }
        await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });

        await dashboard.switchLanguage('ar');
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await page.goto(HOME_URL);
        await page.waitForLoadState('domcontentloaded');
        await quickActions.quickActionCashoutCard.click();
        await expect(bt.inputAmount).toBeVisible({ timeout: 15000 });
    });

    test('should render the page in right-to-left direction', async () => {
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    });

    test('should accept an amount and enable Proceed via the language-agnostic testid locators', async () => {
        await expect(bt.proceedButton).toBeDisabled();
        await bt.enterAmount('10');
        await expect(bt.proceedButton).toBeEnabled({ timeout: 5000 });
    });

    test('should display the Proceed button label in Arabic', async () => {
        await bt.enterAmount('10');
        await expect(bt.proceedButton).toHaveText(/متابعة/);
    });

    test('should display the summary Next button label in Arabic after proceeding', async () => {
        await bt.enterAmount('10');
        await bt.clickProceedButton();
        await expect(bt.proceedButtonInSummary).toBeVisible({ timeout: 15000 });
        await expect(bt.proceedButtonInSummary).toHaveText(/التالي/);
    });

    test('should display the summary Cancel button label in Arabic and leave the balance unchanged', async () => {
        await bt.getBalanceBeforeBankTransfer();
        await bt.enterAmount('10');
        await bt.clickProceedButton();
        await expect(bt.summaryCancelButton).toBeVisible({ timeout: 15000 });
        await expect(bt.summaryCancelButton).toHaveText(/إلغاء/);
        await bt.summaryCancelButton.click();
        await bt.checkBalanceRemainsUnchanged();
    });
});
