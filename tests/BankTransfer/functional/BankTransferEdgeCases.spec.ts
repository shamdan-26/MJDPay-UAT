import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/LoginPage';
import { OtpPage } from '../../pageElements/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/homepage/HomepageQuickActionsPage';
import { BankTransferPage } from '../../Helpers/BankTransferPage';
import { HOME_URL } from '../BankTransferHelper';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../login/LoginHelper';

// Interaction quirks that aren't plain happy/negative cases. The decimal
// boundary itself (1/2 decimals accepted, 3 decimals rejected) is exercised
// by BankTransferHappyPath.spec.ts and BankTransferNegative.spec.ts — this
// file only owns the preset-override and full-balance-precision behaviors.

test.describe('BankTransfer – Edge Cases', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(150000);

    let page: Page;
    let loginPage: LoginPage;
    let otp: OtpPage;
    let quickActions: HomepageQuickActionsPage;
    let bt: BankTransferPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.context().grantPermissions(['geolocation'], { origin: new URL(LOGIN_URL).origin });

        loginPage = new LoginPage(page);
        otp = new OtpPage(page);
        quickActions = new HomepageQuickActionsPage(page);
        bt = new BankTransferPage(page);

        await loginPage.goto(LOGIN_URL);
        await loginPage.fillAndSubmit(VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD);
        if (await otp.isVisible()) {
            await otp.fillAndVerify(await getOtpFromDb(VALID_MOBILE));
        }
        await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });
    });

    test.beforeEach(async () => {
        await page.goto(HOME_URL);
        await page.waitForLoadState('domcontentloaded');
        await quickActions.quickActionCashoutCard.click();
        await expect(bt.inputAmount).toBeVisible({ timeout: 15000 });
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should override the selected preset amount when the field is edited afterward', async () => {
        await bt.selectRandomPredefinedAmount();
        await expect(bt.proceedButton).toBeEnabled();

        await bt.enterAmount('123');
        await expect(bt.inputAmount).toHaveValue('123');
    });

    test('should fill up to 4 decimal places and lock manual entry when "Use full balance" is toggled on', async () => {
        await bt.getBalanceBeforeBankTransfer();
        await bt.clickUseFullBalanceToggle();

        await expect(bt.inputAmount).toHaveAttribute('readonly', '');
        const filled = await bt.inputAmount.inputValue();
        expect(filled).toMatch(/^\d+(\.\d{1,4})?$/);
        expect(parseFloat(filled)).toBeCloseTo(bt.balanceBeforeBankTransferVar, 3);
    });
});
