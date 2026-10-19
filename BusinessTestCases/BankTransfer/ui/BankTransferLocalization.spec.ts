import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { BankTransferPage } from '../../pageElements/Shared/BankTransferPage';
import { HOME_URL, ensureNonZeroBalance } from '../helpers/BankTransferHelper.ts';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../Login/helpers/LoginHelper.ts';

// Arabic-locale checks for the Bank Transfer flow. The app loads in Arabic by
// default on dev/UAT, so this suite does NOT switch language — it verifies the
// flow works as shipped and renders the documented Arabic copy. Per
// QA-DATA-TESTID-HANDOFF.md the controls carry `data-testid` so they resolve
// identically in either language; the label assertions here pin the Arabic copy.

test.describe('BankTransfer — Arabic Localization', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(90000);

    let page: Page;
    let quickActions: HomepageQuickActionsPage;
    let bt: BankTransferPage;

    test.beforeAll(async ({ browser }) => {
        // Hooks don't inherit the describe-level test.setTimeout() above — it
        // only extends tests. ensureNonZeroBalance's card-topup branch (OTP
        // round-trip included) can push this hook past the config's default
        // 60s hook timeout, so extend it here too.
        test.setTimeout(90000);
        page = await browser.newPage();

        const loginPage = new LoginPage(page);
        const otp = new OtpPage(page);
        quickActions = new HomepageQuickActionsPage(page);
        bt = new BankTransferPage(page);

        await loginPage.goto(LOGIN_URL);
        await loginPage.fillAndSubmit(VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD);
        if (await otp.isVisible()) {
            await otp.fillAndVerify(await getOtpFromDb(VALID_MOBILE));
        }
        await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });
        await ensureNonZeroBalance(page, VALID_MOBILE);

        // Every assertion below depends on the app defaulting to Arabic — fail
        // fast with a clear signal here if that ever stops being true.
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
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
