import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/LoginPage';
import { OtpPage } from '../../pageElements/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/HomepageQuickActionsPage';
import { BankTransferPage } from '../../pageElements/BankTransferPage';
import { HOME_URL } from '../BankTransferHelper';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../Login/LoginHelper';

// Element-presence assertions for the OTP step that don't require completing
// a real transfer (box count, countdown). The success modal's heading/Ok
// button is asserted in functional/BankTransferHappyPath.spec.ts instead of
// being duplicated here — checking it standalone would mean running a second
// real, balance-debiting OTP completion just to look at the modal.

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

test.describe('BankTransfer – Page Elements – OTP step', () => {
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

    test('should display six OTP input boxes and a running countdown', async () => {
        await bt.enterAmount('10');
        await proceedToConfirmation(page, bt);
        await bt.waitForSummaryToSettle();
        await bt.clickProceedButtonInSummary();
        await expect(otp.inputs.first()).toBeVisible({ timeout: 15000 });

        await expect(otp.inputs).toHaveCount(6);

        const first = await otp.getRemainingSeconds();
        await page.waitForTimeout(2000);
        const second = await otp.getRemainingSeconds();
        expect(second).toBeLessThan(first);

        await otp.cancelButton.click();
    });

    test('should display the Confirmation heading, subtitle, resend link, and Verify button', async () => {
        await bt.enterAmount('10');
        await proceedToConfirmation(page, bt);
        await bt.waitForSummaryToSettle();
        await bt.clickProceedButtonInSummary();
        await expect(otp.inputs.first()).toBeVisible({ timeout: 15000 });

        await expect.soft(bt.pageTitle).toHaveText('Confirmation');
        await expect.soft(bt.pageSubtitle).toHaveText(/a code has been sent to you/i);
        await expect.soft(otp.resendButton).toBeVisible();
        await expect.soft(otp.verifyButton).toBeVisible();

        await otp.cancelButton.click();
    });
});
