import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { BankTransferPage } from '../../pageElements/Shared/BankTransferPage';
import { HOME_URL, ensureNonZeroBalance } from '../BankTransferHelper';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../Login/LoginHelper';

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
        // Hooks don't inherit the describe-level test.setTimeout() above — it
        // only extends tests. ensureNonZeroBalance's card-topup branch (OTP
        // round-trip included) can push this hook past the config's default
        // 60s hook timeout, so extend it here too.
        test.setTimeout(150000);
        page = await browser.newPage();

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
        await ensureNonZeroBalance(page, VALID_MOBILE);
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

    test('should re-enable manual entry when "Use full balance" is toggled back off', async () => {
        await bt.clickUseFullBalanceToggle();
        await expect(bt.inputAmount).toHaveAttribute('readonly', '');

        await bt.clickUseFullBalanceToggle();
        await expect(bt.inputAmount).not.toHaveAttribute('readonly', '');

        await bt.enterAmount('12');
        await expect(bt.inputAmount).toHaveValue('12');
        await expect(bt.proceedButton).toBeEnabled();
    });

    test('should re-disable Proceed when a selected preset amount is cleared', async () => {
        await bt.selectRandomPredefinedAmount();
        await expect(bt.proceedButton).toBeEnabled();

        await bt.inputAmount.clear();
        await expect(bt.inputAmount).toHaveValue('');
        await expect(bt.proceedButton).toBeDisabled();
    });

    test('should switch the entered amount when a different preset chip is chosen', async () => {
        const chips = bt.presetAmountChips;
        await expect(chips.first()).toBeVisible({ timeout: 15000 });

        const firstValue = (((await chips.nth(0).textContent()) ?? '').replace(/[^0-9.]/g, ''));
        const secondValue = (((await chips.nth(1).textContent()) ?? '').replace(/[^0-9.]/g, ''));

        await chips.nth(0).click();
        await expect(bt.inputAmount).toHaveValue(firstValue);

        await chips.nth(1).click();
        await expect(bt.inputAmount).toHaveValue(secondValue);
    });
});
