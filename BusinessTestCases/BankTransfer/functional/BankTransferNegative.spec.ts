import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { BankTransferPage } from '../../pageElements/Shared/BankTransferPage';
import { assertToast } from '../../toastMessages';
import { HOME_URL, proceedToConfirmation, ensureNonZeroBalance } from '../BankTransferHelper';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../Login/LoginHelper';

// Invalid-input rejection and failure handling. Happy-path completion lives in
// BankTransferHappyPath.spec.ts; the boundary between "3 decimals rejected"
// and "1/2 decimals accepted" is the same amount-field validation covered
// there and in BankTransferEdgeCases.spec.ts.

test.describe('BankTransfer – Negative Scenarios', () => {
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

    test('should reject a negative amount and keep Proceed disabled', async () => {
        await bt.assertInvalidAmountNotAccepted('-10.00', 'Negative Flow');
    });

    test('should reject zero as a transfer amount', async () => {
        await bt.assertInvalidAmountNotAccepted('0', 'Zero Amount Test');
    });

    test('should reject alphabetic characters and special symbols in the amount field', async () => {
        await bt.assertInvalidAmountNotAccepted('abc!@#', 'Invalid Characters Test');
    });

    test('should reject or truncate an amount with 3 decimal places', async () => {
        await bt.assertInvalidAmountNotAccepted('10.555', 'Invalid Float with 3 Decimals');
    });

    test('should reject a pasted invalid amount and keep Proceed disabled', async () => {
        await bt.pasteAmount('abc');
        expect(await bt.getAmountValue()).toBe('');
        await expect(bt.proceedButton).toBeDisabled({ timeout: 5000 });
    });

    test('should show the insufficient-funds toast and block the transfer when the amount exceeds the balance', async () => {
        const walletBalance = await bt.getBalanceBeforeBankTransfer();
        await bt.enterAmount(String(walletBalance + 10));
        await bt.clickProceedButton();
        // Cashout renders in Arabic by default on dev/UAT — match either copy.
        await assertToast(page, /insufficient funds|لا توجد أموال كافية/i, 40000);
    });

    // ── Amount-field input filter (EMI-TC-2359: "characters, not numbers and
    // decimals") ──────────────────────────────────────────────────────────────
    // Only genuinely non-numeric characters are asserted here. The field is
    // permissive about *formatting* of an otherwise-numeric value — leading
    // zeros ("0010"), a leading/trailing dot (".5", "10."), and surrounding
    // whitespace are accepted / silently normalised on dev, so those are not
    // treated as negative cases.

    test('should reject a thousands-separated amount', async () => {
        await bt.assertInvalidAmountNotAccepted('1,000', 'Thousands Separator');
    });

    test('should reject scientific notation in the amount field', async () => {
        await bt.assertInvalidAmountNotAccepted('1e5', 'Scientific Notation');
    });

    // ── Wrong OTP (EMI-TC-3125 / EMI-TC-3126) ──────────────────────────────────

    test('should error and return to the Amount step after three incorrect OTP attempts', async () => {
        // KNOWN DEFECT — marked test.fixme so it stays visible without failing the
        // suite. EXPECTED (EMI-TC-3125 / EMI-TC-3126): each wrong code shows an
        // inline "invalid OTP" error; after the 3rd failed attempt a message is
        // shown and the user is dropped back to the Amount step (in-flight
        // transfer abandoned, retry needs a fresh flow), balance never debited.
        // ACTUAL on dev: <pending description from QA — the observed behaviour is
        // a bug>. Remove the fixme line once the app is fixed.
        test.fixme(true, 'three-wrong-OTP handling is defective on dev — see comment');
        test.setTimeout(240000);
        await bt.getBalanceBeforeBankTransfer();
        await bt.enterAmount('10');
        await proceedToConfirmation(page, bt);
        await bt.waitForSummaryToSettle();
        await bt.clickProceedButtonInSummary();
        await expect(otp.inputs.first()).toBeVisible({ timeout: 15000 });

        const WRONG = '11111111';
        for (let attempt = 1; attempt <= 3; attempt++) {
            const count = await otp.inputs.count();
            for (let i = 0; i < count; i++) {
                await otp.inputs.nth(i).pressSequentially(WRONG[i] ?? '1', { delay: 40 });
            }
            if (await otp.verifyButton.isEnabled({ timeout: 2000 }).catch(() => false)) {
                await otp.verifyButton.click({ timeout: 5000 }).catch(() => {});
            }
            // Let the backend reject before the next round / the final redirect.
            await page.waitForTimeout(3000);
        }

        await expect.soft(otp.errorMessage.first()).toBeVisible({ timeout: 20000 });
        await expect(bt.inputAmount).toBeVisible({ timeout: 30000 });

        await page.goto(HOME_URL);
        await page.waitForLoadState('domcontentloaded');
        await bt.checkBalanceRemainsUnchanged();
    });
});
