import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/LoginPage';
import { OtpPage } from '../../pageElements/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/HomepageQuickActionsPage';
import { BankTransferPage } from '../../pageElements/BankTransferPage';
import { HOME_URL } from '../BankTransferHelper';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, VALID_OTP, getOtpFromDb } from '../../Login/LoginHelper';

// Full successful Cashout flows and the Confirmation-summary math. Element
// presence (IBAN card, summary rows, OTP boxes) lives in ui/BankTransferAmountPage.spec.ts,
// ui/BankTransferConfirmationPage.spec.ts, and ui/BankTransferOtpPage.spec.ts —
// this file only owns "does the flow complete and is the money math right."

const VAT_RATE = 0.15;

/**
 * The Proceed click occasionally doesn't register on dev (the button stays
 * enabled on "proceed") — a hydration-timing flake independent of balance/
 * validation. Once it does register, the button goes disabled/"is-loading"
 * and the summary API can take well over 8s to resolve — observed anywhere
 * from ~1s to 45+s on this environment. So: retry the click only while the
 * button is still enabled (i.e. genuinely un-clicked), then wait out the
 * async summary calculation for as long as it takes.
 */
async function proceedToConfirmation(page: Page, bt: BankTransferPage): Promise<void> {
    const nextButton = page.getByRole('button', { name: /^next$/i });
    await bt.clickProceedButton();

    // Poll rather than retry once — on a slow/loaded dev backend a single
    // extra click after a fixed wait isn't always enough.
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
        if (await nextButton.isVisible().catch(() => false)) return;
        await page.waitForTimeout(2000);
        if (await bt.proceedButton.isEnabled().catch(() => false)) {
            await bt.proceedButton.click().catch(() => {});
        }
    }
    await expect(nextButton).toBeVisible({ timeout: 5000 });
}

test.describe('BankTransfer – Happy Path', () => {
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

    test('should complete a standard transfer with a custom amount and debit the exact amount', async () => {
        await bt.getBalanceBeforeBankTransfer();
        await bt.enterAmount('10.00');
        await proceedToConfirmation(page, bt);
        await bt.clickProceedButtonInSummary();
        // Wait for the OTP form to actually render before filling it — checking
        // otp.isVisible() immediately after the Next click can race ahead of the
        // modal and silently skip the fill, leaving Verify disabled forever.
        await expect(otp.inputs.first()).toBeVisible({ timeout: 15000 });
        await otp.fillAndVerify(await getOtpFromDb(VALID_MOBILE));
        // The success modal can take longer than clickSuccessful_OkButton()'s own
        // 15s wait to render after OTP submission — wait for the heading first.
        await expect(page.getByRole('heading', { name: /successful/i })).toBeVisible({ timeout: 20000 });
        await bt.clickSuccessful_OkButton();
        await page.reload();
        await bt.checkBalanceAfterBankTransfer('10.00');
    });

    test('should complete a transfer using a randomly selected predefined amount', async () => {
        const balance = await bt.getBalanceBeforeBankTransfer();
        await bt.selectRandomPredefinedAmount(balance);
        await proceedToConfirmation(page, bt);
        await bt.clickProceedButtonInSummary();
        // Wait for the OTP form to actually render before filling it — checking
        // otp.isVisible() immediately after the Next click can race ahead of the
        // modal and silently skip the fill, leaving Verify disabled forever.
        await expect(otp.inputs.first()).toBeVisible({ timeout: 15000 });
        await otp.fillAndVerify(await getOtpFromDb(VALID_MOBILE));
        // The success modal can take longer than clickSuccessful_OkButton()'s own
        // 15s wait to render after OTP submission — wait for the heading first.
        await expect(page.getByRole('heading', { name: /successful/i })).toBeVisible({ timeout: 20000 });
        await bt.clickSuccessful_OkButton();
        await page.reload();
        await bt.checkBalanceAfterBankTransferBySelectAmount();
    });

    test('should accept a valid amount with 2 decimal places and debit it correctly', async () => {
        await bt.getBalanceBeforeBankTransfer();
        await bt.enterAmount('15.75');
        await proceedToConfirmation(page, bt);
        await bt.clickProceedButtonInSummary();
        // Wait for the OTP form to actually render before filling it — checking
        // otp.isVisible() immediately after the Next click can race ahead of the
        // modal and silently skip the fill, leaving Verify disabled forever.
        await expect(otp.inputs.first()).toBeVisible({ timeout: 15000 });
        await otp.fillAndVerify(await getOtpFromDb(VALID_MOBILE));
        // The success modal can take longer than clickSuccessful_OkButton()'s own
        // 15s wait to render after OTP submission — wait for the heading first.
        await expect(page.getByRole('heading', { name: /successful/i })).toBeVisible({ timeout: 20000 });
        await bt.clickSuccessful_OkButton();
        await page.reload();
        await bt.checkBalanceAfterBankTransfer('15.75');
    });

    test('should accept a valid amount with 1 decimal place and debit it correctly', async () => {
        await bt.getBalanceBeforeBankTransfer();
        await bt.enterAmount('20.5');
        await proceedToConfirmation(page, bt);
        await bt.clickProceedButtonInSummary();
        // Wait for the OTP form to actually render before filling it — checking
        // otp.isVisible() immediately after the Next click can race ahead of the
        // modal and silently skip the fill, leaving Verify disabled forever.
        await expect(otp.inputs.first()).toBeVisible({ timeout: 15000 });
        await otp.fillAndVerify(await getOtpFromDb(VALID_MOBILE));
        // The success modal can take longer than clickSuccessful_OkButton()'s own
        // 15s wait to render after OTP submission — wait for the heading first.
        await expect(page.getByRole('heading', { name: /successful/i })).toBeVisible({ timeout: 20000 });
        await bt.clickSuccessful_OkButton();
        await page.reload();
        await bt.checkBalanceAfterBankTransfer('20.5');
    });

    test('should accept a pasted valid amount and enable Proceed', async () => {
        await bt.pasteAmount('50.00');
        expect(await bt.getAmountValue()).toBe('50.00');
        await expect(bt.proceedButton).toBeEnabled({ timeout: 5000 });
    });

    test('should reflect the entered amount and compute commission/VAT/total correctly on the Confirmation summary', async () => {
        const expectedIban = (await bt.ibanCardValue.innerText()).trim();
        const expectedBank = (await bt.ibanCardBank.innerText()).trim();

        await bt.enterAmount('10');
        await proceedToConfirmation(page, bt);
        await bt.waitForSummaryToSettle();

        await expect.soft(bt.getSummaryText('Transaction Type')).resolves.toMatch(/cashout/i);
        await expect.soft(bt.getSummaryText('Bank')).resolves.toBe(expectedBank);
        await expect.soft(bt.getSummaryText('IBAN')).resolves.toBe(expectedIban);

        const original = await bt.getSummaryMoney('Original Amount');
        const commission = await bt.getSummaryMoney('commission');
        const vat = await bt.getSummaryMoney('VAT');
        const total = await bt.getSummaryMoney('Total amount to be sent');

        expect(original).toBe(10);
        expect(vat).toBeCloseTo(commission * VAT_RATE, 2);
        expect(total).toBeCloseTo(original - commission - vat, 2);
    });

    test('should auto-submit on a correct OTP, show a success confirmation, and debit the entered amount', async () => {
        await bt.getBalanceBeforeBankTransfer();
        await bt.enterAmount('10');
        await proceedToConfirmation(page, bt);
        await bt.waitForSummaryToSettle();
        await bt.clickProceedButtonInSummary();
        await expect(otp.inputs.first()).toBeVisible({ timeout: 15000 });

        await otp.fillAndVerify(VALID_OTP);
        await expect(page.getByRole('heading', { name: /successful/i })).toBeVisible({ timeout: 20000 });
        await bt.clickSuccessful_OkButton();

        await page.goto(HOME_URL);
        await page.waitForLoadState('domcontentloaded');
        await bt.checkBalanceAfterBankTransfer('10');
    });
});
