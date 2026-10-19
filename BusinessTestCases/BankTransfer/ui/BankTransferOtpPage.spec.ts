import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { BankTransferPage } from '../../pageElements/Shared/BankTransferPage';
import { HOME_URL, proceedToConfirmation, ensureNonZeroBalance } from '../helpers/BankTransferHelper.ts';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../Login/helpers/LoginHelper.ts';

// Element-presence assertions for the OTP step that don't require completing
// a real transfer (box count, countdown). The success modal's heading/Ok
// button is asserted in functional/BankTransferHappyPath.spec.ts instead of
// being duplicated here — checking it standalone would mean running a second
// real, balance-debiting OTP completion just to look at the modal.

test.describe('BankTransfer – Page Elements – OTP step', () => {
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

        // Cashout flow defaults to Arabic on dev/UAT — assert either copy.
        await expect.soft(bt.pageTitle).toHaveText(/^(Confirmation|التأكيد)$/i);
        await expect.soft(bt.pageSubtitle).toHaveText(
            /a code has been sent to you|تم إرسال رمز التحقق/i,
        );
        await expect.soft(otp.resendButton).toBeVisible();
        await expect.soft(otp.verifyButton).toBeVisible();

        await otp.cancelButton.click();
    });

    test('should reset the countdown timer when the resend link is clicked', async () => {
        // Overrides the describe-level 150s default — proceedToConfirmation's own
        // up-to-90s retry loop plus waiting out the full resend countdown below can
        // together exceed that.
        test.setTimeout(240000);
        await bt.enterAmount('10');
        await proceedToConfirmation(page, bt);
        await bt.waitForSummaryToSettle();
        await bt.clickProceedButtonInSummary();
        await expect(otp.inputs.first()).toBeVisible({ timeout: 15000 });

        // resendButton stays disabled until the countdown expires (same as Login/
        // ForgotPassword's OTP widget, sharing Shared/OtpPage.ts) — wait for it to
        // actually become enabled rather than clicking after an arbitrary delay.
        const seconds = await otp.getRemainingSeconds() || 90;
        await expect(otp.resendButton).toBeEnabled({ timeout: (seconds + 5) * 1000 });
        const beforeResend = await otp.getRemainingSeconds();

        await otp.resendButton.click();

        // A successful resend re-issues the OTP and restarts its countdown — the
        // remaining time should jump back up rather than keep counting down from
        // where it was. The re-issue round-trips the backend and on this dev
        // environment has been observed taking >10s, so poll generously.
        await expect.poll(() => otp.getRemainingSeconds(), { timeout: 45000 }).toBeGreaterThan(beforeResend);

        await otp.cancelButton.click();
    });

    test('should keep the Verify button disabled until all six digits are entered', async () => {
        await bt.enterAmount('10');
        await proceedToConfirmation(page, bt);
        await bt.waitForSummaryToSettle();
        await bt.clickProceedButtonInSummary();
        await expect(otp.inputs.first()).toBeVisible({ timeout: 15000 });

        // Five digits only — the transfer must not be submittable yet.
        for (let i = 0; i < 5; i++) {
            await otp.inputs.nth(i).pressSequentially('0', { delay: 40 });
        }
        await expect(otp.verifyButton).toBeDisabled();

        await otp.cancelButton.click();
    });

    test('should distribute a pasted six-digit code across the six inputs', async () => {
        await bt.enterAmount('10');
        await proceedToConfirmation(page, bt);
        await bt.waitForSummaryToSettle();
        await bt.clickProceedButtonInSummary();
        await expect(otp.inputs.first()).toBeVisible({ timeout: 15000 });

        await otp.inputs.first().focus();
        await otp.inputs.first().evaluate((el: HTMLInputElement) => {
            const dt = new DataTransfer();
            dt.setData('text/plain', '123456');
            el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
        });

        const digits = (await otp.inputs.allTextContents()).join('')
            || (await Promise.all(
                Array.from({ length: await otp.inputs.count() }, (_, i) => otp.inputs.nth(i).inputValue()),
            )).join('');
        expect(digits.replace(/\D/g, '')).toBe('123456');

        await otp.cancelButton.click();
    });

    test('should display the OTP recap IBAN and total', async () => {
        await bt.enterAmount('10');
        await proceedToConfirmation(page, bt);
        await bt.waitForSummaryToSettle();
        await bt.clickProceedButtonInSummary();
        await expect(otp.inputs.first()).toBeVisible({ timeout: 15000 });

        await expect.soft(bt.otpRecapIban).toBeVisible();
        await expect.soft(bt.otpRecapIban).toHaveText(/^SA\d{2}[\s*]+\d{4}$/);
        await expect.soft(bt.otpRecapTotal).toBeVisible();
        expect(parseFloat((await bt.otpRecapTotal.innerText()).trim())).toBeGreaterThan(0);

        await otp.cancelButton.click();
    });
});
