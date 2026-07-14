import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/LoginPage';
import { OtpPage } from '../../pageElements/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/HomepageQuickActionsPage';
import { BankTransferPage } from '../../pageElements/BankTransferPage';
import { HOME_URL } from '../BankTransferHelper';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../Login/LoginHelper';

// Element-presence assertions for the Confirmation summary only — do the
// rows render with the right labels. Whether the commission/VAT/Total math
// is actually correct is a business-logic question, not a presence one, and
// lives in functional/BankTransferHappyPath.spec.ts.

/**
 * The Proceed click occasionally doesn't register on dev (the button stays
 * enabled on "proceed") — a hydration-timing flake independent of balance/
 * validation. Retry the click only while the button is still enabled (i.e.
 * genuinely un-clicked), then wait out the async summary calculation.
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

test.describe('BankTransfer – Page Elements – Confirmation summary', () => {
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
        await bt.enterAmount('10');
        await proceedToConfirmation(page, bt);
        await bt.waitForSummaryToSettle();
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should display the Transaction Type, Bank, and IBAN rows', async () => {
        await expect.soft(bt.getSummaryText('Transaction Type')).resolves.not.toBe('');
        await expect.soft(bt.getSummaryText('Bank')).resolves.not.toBe('');
        await expect.soft(bt.getSummaryText('IBAN')).resolves.not.toBe('');
    });

    test('should display the Original Amount, commission, VAT, and Total rows', async () => {
        await expect.soft(bt.getSummaryMoney('Original Amount')).resolves.not.toBeNaN();
        await expect.soft(bt.getSummaryMoney('commission')).resolves.not.toBeNaN();
        await expect.soft(bt.getSummaryMoney('VAT')).resolves.not.toBeNaN();
        await expect.soft(bt.getSummaryMoney('Total amount to be sent')).resolves.not.toBeNaN();
    });

    test('should display the Confirmation heading and subtitle', async () => {
        await expect.soft(bt.pageTitle).toHaveText('Confirmation');
        await expect.soft(bt.pageSubtitle).toHaveText(/send funds to a saudi iban/i);
    });
});
