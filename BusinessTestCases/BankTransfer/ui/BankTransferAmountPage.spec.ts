import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Login/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/Homepage/HomepageQuickActionsPage';
import { BankTransferPage } from '../../pageElements/BankTransfer/BankTransferPage';
import { HOME_URL } from '../BankTransferHelper';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../Login/LoginHelper';

// Element-presence assertions for the Amount step only. Amount-field
// validation, preset-override, and full-balance behavior are interactions,
// not presence checks — they live in the functional/ files.

test.describe('BankTransfer – Page Elements – Amount step', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(150000);

    let page: Page;
    let loginPage: LoginPage;
    let otp: OtpPage;
    let quickActions: HomepageQuickActionsPage;
    let bt: BankTransferPage;

    test.beforeAll(async ({ browser }) => {
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

    // ── Page hero ──────────────────────────────────────────────────────────────

    test('should display the "Cashout" page title and its description', async () => {
        await expect(bt.pageTitle).toHaveText('Cashout');
        await expect(bt.pageSubtitle).toHaveText(/send funds to a saudi iban/i);
    });

    // ── Balance card ───────────────────────────────────────────────────────────

    test('should display the Current Balance label and a numeric balance amount', async () => {
        await expect(bt.balanceCardLabel).toHaveText(/current balance/i);
        await expect(bt.balanceAmount).toBeVisible();
        await expect(bt.balanceAmount).toContainText(/\d/);
    });

    test('should display the wallet code next to the balance', async () => {
        await expect(bt.balanceWalletCode).toHaveText(/wallet code\s+[A-Z0-9-]+/i);
    });

    test('should display the Topup, QR, and wallet settings buttons on the balance card', async () => {
        await expect(bt.balanceTopupButton).toBeVisible();
        await expect(bt.balanceTopupButton).toHaveText(/topup/i);
        await expect(bt.balanceQrButton).toBeVisible();
        await expect(bt.balanceSettingsButton).toBeVisible();
    });

    // ── IBAN card ──────────────────────────────────────────────────────────────

    test('should display the IBAN label alongside a masked IBAN, the bank name, and a verified checkmark', async () => {
        await expect(bt.ibanCardLabel).toHaveText(/iban/i);
        await expect(bt.ibanCardValue).toBeVisible();
        await expect(bt.ibanCardValue).toHaveText(/^SA\d{2}\s*\*\*\s*\d{4}$/);
        await expect(bt.ibanCardBank).not.toHaveText('');
        await expect(bt.ibanCardCheck).toBeVisible();
    });

    // ── Section header ─────────────────────────────────────────────────────────

    test('should display the step-2 "Amount" section header and its description', async () => {
        await expect(bt.sectionStepBadge).toHaveText('2');
        await expect(bt.sectionTitle).toHaveText('Amount');
        await expect(bt.sectionDescription).toHaveText(/enter the amount to transfer/i);
    });

    // ── Amount field ───────────────────────────────────────────────────────────

    test('should display the "Set Amount You Want Transfer" label and the currency icon in the input', async () => {
        await expect(bt.amountFieldTitle).toHaveText(/set amount you want transfer/i);
        await expect(bt.amountCurrencyIcon).toBeVisible();
    });

    test('should display the "0.00" placeholder in the amount input', async () => {
        await expect(bt.inputAmount).toHaveAttribute('placeholder', '0.00');
    });

    test('should display the "Use full balance" toggle with its label', async () => {
        await expect(bt.useFullBalanceToggle).toBeVisible();
        await expect(bt.fullBalanceToggleLabel).toHaveText(/use full balance/i);
    });

    test('should keep Proceed disabled while the amount field is empty', async () => {
        await expect(bt.inputAmount).toHaveValue('');
        await expect(bt.proceedButton).toBeDisabled();
    });

    // ── Preset amount chips ──────────────────────────────────────────────────────

    test('should display the "Or select amount" label and all 5 preset amount chips', async () => {
        await expect(bt.quickAmountLabel).toHaveText(/or select amount/i);
        await expect(bt.presetAmountChips).toHaveCount(5);

        const expected = ['500', '1000', '2000', '5000', '10000'];
        const texts = (await bt.presetAmountChips.allTextContents()).map(t => t.trim());
        expect(texts).toEqual(expected);
    });

    // ── Proceed button ───────────────────────────────────────────────────────────

    test('should display the Proceed button with its label and arrow icon', async () => {
        await expect(bt.proceedButton).toBeVisible();
        await expect(bt.proceedButton).toHaveText(/proceed/i);
        await expect(bt.proceedButton.locator('svg')).toBeVisible();
    });
});
