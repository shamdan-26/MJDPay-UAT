import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { BankTransferPage } from '../../pageElements/Shared/BankTransferPage';
import { HOME_URL, proceedToConfirmation, SUMMARY_LABEL, ensureNonZeroBalance } from '../BankTransferHelper';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, VALID_OTP, getOtpFromDb } from '../../Login/LoginHelper';

// Full successful Cashout flows and the Confirmation-summary math. Element
// presence (IBAN card, summary rows, OTP boxes) lives in ui/BankTransferAmountPage.spec.ts,
// ui/BankTransferConfirmationPage.spec.ts, and ui/BankTransferOtpPage.spec.ts —
// this file only owns "does the flow complete and is the money math right."

const VAT_RATE = 0.15;

test.describe('BankTransfer – Happy Path', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(150000);

    let page: Page;
    let loginPage: LoginPage;
    let otp: OtpPage;
    let quickActions: HomepageQuickActionsPage;
    let bt: BankTransferPage;

    async function doLogin(): Promise<void> {
        await loginPage.goto(LOGIN_URL);
        await loginPage.fillAndSubmit(VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD);
        if (await otp.isVisible()) {
            await otp.fillAndVerify(await getOtpFromDb(VALID_MOBILE));
        }
        await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });
    }

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

        await doLogin();
        await ensureNonZeroBalance(page, VALID_MOBILE);
    });

    test.beforeEach(async () => {
        await page.goto(HOME_URL);
        await page.waitForLoadState('domcontentloaded');

        // The session opened once in beforeAll can time out partway through this
        // long serial suite — the app then renders a "session expired" dialog
        // instead of the shell. Re-authenticate and reload before proceeding.
        const sessionExpired = await page
            .getByText(/session.?expired|انتهت صلاحية الجلسة/i)
            .waitFor({ state: 'visible', timeout: 3000 })
            .then(() => true)
            .catch(() => false);
        if (sessionExpired) {
            await doLogin();
            await page.goto(HOME_URL);
            await page.waitForLoadState('domcontentloaded');
        }

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
        await expect(page.getByRole('heading', { name: /successful|ناجح|نجاح/i })).toBeVisible({ timeout: 20000 });
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
        await expect(page.getByRole('heading', { name: /successful|ناجح|نجاح/i })).toBeVisible({ timeout: 20000 });
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
        await expect(page.getByRole('heading', { name: /successful|ناجح|نجاح/i })).toBeVisible({ timeout: 20000 });
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
        await expect(page.getByRole('heading', { name: /successful|ناجح|نجاح/i })).toBeVisible({ timeout: 20000 });
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

        // The Cashout summary renders in Arabic by default on dev/UAT — match rows
        // and the Transaction Type value bilingually.
        await expect.soft(bt.getSummaryText(SUMMARY_LABEL.txnType)).resolves.toMatch(/cashout|سحب نقدي/i);
        await expect.soft(bt.getSummaryText(SUMMARY_LABEL.bank)).resolves.toBe(expectedBank);
        await expect.soft(bt.getSummaryText(SUMMARY_LABEL.iban)).resolves.toBe(expectedIban);

        const original = await bt.getSummaryMoney(SUMMARY_LABEL.original);
        const commission = await bt.getSummaryMoney(SUMMARY_LABEL.commission);
        const vat = await bt.getSummaryMoney(SUMMARY_LABEL.vat);
        const total = await bt.getSummaryMoney(SUMMARY_LABEL.total);

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
        await expect(page.getByRole('heading', { name: /successful|ناجح|نجاح/i })).toBeVisible({ timeout: 20000 });
        await bt.clickSuccessful_OkButton();

        await page.goto(HOME_URL);
        await page.waitForLoadState('domcontentloaded');
        await bt.checkBalanceAfterBankTransfer('10');
    });
});
