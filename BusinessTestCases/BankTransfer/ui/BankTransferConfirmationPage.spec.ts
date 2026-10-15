import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { BankTransferPage } from '../../pageElements/Shared/BankTransferPage';
import { HOME_URL, proceedToConfirmation, ensureNonZeroBalance } from '../BankTransferHelper';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../Login/LoginHelper';

// Element-presence assertions for the Confirmation summary only — do the
// rows render with the right labels. Whether the commission/VAT/Total math
// is actually correct is a business-logic question, not a presence one, and
// lives in functional/BankTransferHappyPath.spec.ts.

// Bilingual, same as BankTransferAmountPage.spec.ts: dev/UAT loads the
// Cashout flow in Arabic by default, so every row label and the page-hero
// copy is localized. Row locators are CSS-class based (.mp-sum-row /
// .money-amount) so they resolve regardless of language — it's the label
// text passed to getSummary* and the hardcoded .toHaveText() strings that
// need the Arabic alongside the English. Arabic copy confirmed against a
// live dev run (account "ش ا" / MER-Q9EK4TTPGE-30, 2026-09-07).
const TXN_TYPE_LABEL = /^(Transaction Type|نوع العملية)$/i;
const BANK_LABEL     = /^(Bank|البنك)$/i;
const IBAN_LABEL     = /^(IBAN|رقم الآيبان)$/i;
const ORIGINAL_LABEL = /^(Original Amount|المبلغ الأصلي)$/i;
const COMMISSION_LABEL = /^(commission|العمولة)$/i;
const VAT_LABEL      = /^(VAT|ضريبة القيمة المضافة)$/i;
const TOTAL_LABEL    = /^(Total amount to be sent|إجمالي المبلغ المراد إرساله)$/i;

test.describe('BankTransfer – Page Elements – Confirmation summary', () => {
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
        await bt.enterAmount('10');
        await proceedToConfirmation(page, bt);
        await bt.waitForSummaryToSettle();
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should display the Transaction Type, Bank, and IBAN rows', async () => {
        await expect.soft(bt.getSummaryText(TXN_TYPE_LABEL)).resolves.not.toBe('');
        await expect.soft(bt.getSummaryText(BANK_LABEL)).resolves.not.toBe('');
        await expect.soft(bt.getSummaryText(IBAN_LABEL)).resolves.not.toBe('');
    });

    test('should display the Original Amount, commission, VAT, and Total rows', async () => {
        await expect.soft(bt.getSummaryMoney(ORIGINAL_LABEL)).resolves.not.toBeNaN();
        await expect.soft(bt.getSummaryMoney(COMMISSION_LABEL)).resolves.not.toBeNaN();
        await expect.soft(bt.getSummaryMoney(VAT_LABEL)).resolves.not.toBeNaN();
        await expect.soft(bt.getSummaryMoney(TOTAL_LABEL)).resolves.not.toBeNaN();
    });

    test('should display the Confirmation heading and subtitle', async () => {
        await expect.soft(bt.pageTitle).toHaveText(/^(Confirmation|التأكيد)$/i);
        await expect.soft(bt.pageSubtitle).toHaveText(
            /send funds to a saudi iban|أرسل أموالاً إلى آيبان سعودي/i,
        );
    });

    test('should display the Cancel and Next buttons on the summary', async () => {
        // The summary exposes Cancel + Next only — no separate Back control
        // (handoff §4.4's bank-confirm-back-btn is not rendered in this UI).
        await expect.soft(bt.summaryCancelButton.first()).toBeVisible();
        await expect.soft(bt.proceedButtonInSummary).toBeVisible();
        await expect.soft(bt.proceedButtonInSummary).toBeEnabled();
        await expect.soft(bt.proceedButtonInSummary).toHaveText(/next|التالي/i);
    });

    test('should show the summary IBAN in the masked SA** **** format', async () => {
        // The source IBAN card lives on the Amount step; here we only assert the
        // summary row itself renders the destination IBAN masked (EMI-TC-3119).
        const summaryIban = await bt.getSummaryText(IBAN_LABEL);
        expect(summaryIban).toMatch(/^SA\d{2}[\s*]+\d{4}$/);
    });
});
