import { test, expect } from '../../../shared/fixtures.ts';
import { assertToast } from '../../../shared/toastMessages.ts';
import { FirstLoginPasswordPage } from '../../../pageElements/Login/FirstLoginPasswordPage';
import { FIRST_LOGIN_DEFAULT_PASSWORD, LOGIN_URL } from '../../helpers/LoginHelper.ts';
import { FIRST_LOGIN_ACCOUNTS, NEW_PASSWORD, RESET_PASSWORD_URL, reachResetScreen } from '../../helpers/firstLogin';

// First-time login — the forced password-change screen. A Business user whose password is still the default
// (Aa#123456) is sent to /business/auth/reset-password right after the OTP. Every case here leaves the account
// UNCONSUMED: it only types into the form and never submits a valid change, so the accounts can be reused.
// Accounts: two sign-ins on one account at the same time interfere (a new login ends the earlier session and can
// invalidate its OTP), and Playwright runs these tests on several workers. So the form cases use one account PER WORKER
// (indexes 0–2, picked by parallelIndex; keep workers <= 3), and the two rejected-change cases have their own (3 and 4),
// so a rejected attempt can never touch an account the form cases depend on. The last accounts are kept for the
// end-to-end case (FirstLoginEndToEnd.spec.ts).

const FORM_ACCOUNT_COUNT    = 3;
const WRONG_CURRENT_ACCOUNT = FIRST_LOGIN_ACCOUNTS[3];
const SAME_PASSWORD_ACCOUNT = FIRST_LOGIN_ACCOUNTS[4];

test.describe('Login — First login — forced password change (form)', { tag: ['@login', '@functional', '@first-login'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'functional' }] }, () => {
    test.beforeEach(async ({ page }, testInfo) => {
        test.slow();
        await reachResetScreen(page, FIRST_LOGIN_ACCOUNTS[testInfo.parallelIndex % FORM_ACCOUNT_COUNT]);
    });

    test('should force a default-password user to the reset screen after the OTP', { annotation: [{ type: 'testcase', description: 'LG-FIRST-01: Default password forces the reset screen after the OTP' }] }, async ({ page }) => {
        const reset = new FirstLoginPasswordPage(page);
        await expect(page).toHaveURL(RESET_PASSWORD_URL);
        await expect(reset.currentInput).toBeVisible();
        await expect(reset.newInput).toBeVisible();
        await expect(reset.confirmInput).toBeVisible();
        await expect(reset.submitButton).toBeVisible();
    });

    test('should not let the user reach the app until the password is changed', { annotation: [{ type: 'testcase', description: 'LG-FIRST-02: Home is not reachable before the password is changed' }] }, async ({ page }) => {
        await page.goto(new URL('/business/main/home', LOGIN_URL).toString());
        await expect(page).not.toHaveURL(/\/business\/main\/home/, { timeout: 15000 });
    });

    test('should keep the submit button disabled while the form is empty', { annotation: [{ type: 'testcase', description: 'LG-FIRST-03: Submit is disabled on an empty form' }] }, async ({ page }) => {
        const reset = new FirstLoginPasswordPage(page);
        await expect(reset.submitButton).toBeDisabled();
    });

    test('should keep the submit button disabled until all three fields are filled', { annotation: [{ type: 'testcase', description: 'LG-FIRST-04: Submit needs all three fields' }] }, async ({ page }) => {
        const reset = new FirstLoginPasswordPage(page);
        await reset.currentInput.fill(FIRST_LOGIN_DEFAULT_PASSWORD);
        await expect(reset.submitButton).toBeDisabled();
        await reset.newInput.fill(NEW_PASSWORD);
        await expect(reset.submitButton).toBeDisabled();
        await reset.confirmInput.fill(NEW_PASSWORD);
        await expect(reset.submitButton).toBeEnabled();
    });

    // Policy shown on the page: 8–20 characters, lowercase, uppercase, a digit and a special character.
    const WEAK: Array<[id: string, label: string, value: string]> = [
        ['05', 'shorter than 8 characters', 'Aa#1234'],
        ['06', 'longer than 20 characters', 'Aa#' + '1'.repeat(18)],
        ['07', 'without an uppercase letter', 'aa#12345678'],
        ['08', 'without a lowercase letter', 'AA#12345678'],
        ['09', 'without a digit', 'Aa#abcdefgh'],
        ['10', 'without a special character', 'Aa12345678'],
    ];
    for (const [id, label, value] of WEAK) {
        test(`should reject a new password ${label}`, { annotation: [{ type: 'testcase', description: `LG-FIRST-${id}: New password ${label} is rejected` }] }, async ({ page }) => {
            const reset = new FirstLoginPasswordPage(page);
            await reset.fill(FIRST_LOGIN_DEFAULT_PASSWORD, value);
            // The page flags a broken rule on its checklist icons; #error_content-newPassword is an empty container for
            // some rules, so the disabled submit is the reliable signal. The confirmation matches, so only the policy blocks it.
            await expect(reset.mismatchError).toHaveCount(0);
            await expect(reset.submitButton).toBeDisabled();
        });
    }

    const STRONG: Array<[id: string, label: string, value: string]> = [
        ['11', 'exactly 8 characters', 'Aa#12345'],
        ['12', 'exactly 20 characters', 'Aa#' + '1'.repeat(17)],
    ];
    for (const [id, label, value] of STRONG) {
        test(`should accept a new password of ${label}`, { annotation: [{ type: 'testcase', description: `LG-FIRST-${id}: New password of ${label} passes the policy` }] }, async ({ page }) => {
            const reset = new FirstLoginPasswordPage(page);
            await reset.fill(FIRST_LOGIN_DEFAULT_PASSWORD, value);
            await expect(reset.policyError).toHaveCount(0);
            await expect(reset.submitButton).toBeEnabled();
        });
    }

    test('should show a mismatch error when the confirmation differs', { annotation: [{ type: 'testcase', description: 'LG-FIRST-13: Confirmation that differs is rejected' }] }, async ({ page }) => {
        const reset = new FirstLoginPasswordPage(page);
        await reset.fill(FIRST_LOGIN_DEFAULT_PASSWORD, NEW_PASSWORD, NEW_PASSWORD + '8');
        await expect(reset.mismatchError).toBeVisible();
        await expect(reset.submitButton).toBeDisabled();
    });

    test('should treat the confirmation as case-sensitive', { annotation: [{ type: 'testcase', description: 'LG-FIRST-14: Confirmation is case-sensitive' }] }, async ({ page }) => {
        const reset = new FirstLoginPasswordPage(page);
        await reset.fill(FIRST_LOGIN_DEFAULT_PASSWORD, NEW_PASSWORD, NEW_PASSWORD.toLowerCase());
        await expect(reset.mismatchError).toBeVisible();
        await expect(reset.submitButton).toBeDisabled();
    });

    test('should clear the mismatch error once the confirmation matches', { annotation: [{ type: 'testcase', description: 'LG-FIRST-15: Mismatch error clears when the confirmation matches' }] }, async ({ page }) => {
        const reset = new FirstLoginPasswordPage(page);
        await reset.fill(FIRST_LOGIN_DEFAULT_PASSWORD, NEW_PASSWORD, NEW_PASSWORD + '8');
        await expect(reset.mismatchError).toBeVisible();
        await reset.confirmInput.fill(NEW_PASSWORD);
        await expect(reset.mismatchError).toHaveCount(0);
        await expect(reset.submitButton).toBeEnabled();
    });

    test('should mask all three fields and reveal each with its own toggle', { annotation: [{ type: 'testcase', description: 'LG-FIRST-16: Show/hide toggles work per field' }] }, async ({ page }) => {
        const reset = new FirstLoginPasswordPage(page);
        await reset.fill(FIRST_LOGIN_DEFAULT_PASSWORD, NEW_PASSWORD);
        for (const [input, toggle] of [[reset.currentInput, reset.currentToggle], [reset.newInput, reset.newToggle], [reset.confirmInput, reset.confirmToggle]] as const) {
            await expect(input).toHaveAttribute('type', 'password');
            await toggle.click();
            await expect(input).toHaveAttribute('type', 'text');
            await toggle.click();
            await expect(input).toHaveAttribute('type', 'password');
        }
    });

    // Switching language reloads the page, so the app asks first and warns that typed input is lost (wording seen on
    // dev, 2026-10-14: "تغيير اللغة سيعيد تحميل الصفحة، لذا ستفقد ما أدخلته في هذه الصفحة. هل تريد المتابعة؟").
    const LANGUAGE_WARNING = /تغيير اللغة سيعيد تحميل|changing the language will reload/i;

    test('should keep what the user typed when they decline the language-change warning', { annotation: [{ type: 'testcase', description: 'LG-FIRST-19: Declining the language switch keeps the typed input' }] }, async ({ page }) => {
        const reset = new FirstLoginPasswordPage(page);
        await reset.currentInput.fill(FIRST_LOGIN_DEFAULT_PASSWORD);
        await page.getByRole('button', { name: 'EN', exact: true }).click();
        await expect(page.getByText(LANGUAGE_WARNING)).toBeVisible();
        await page.getByRole('button', { name: /متابعة التعديل|keep editing|continue editing/i }).click();
        await expect(page.getByText(LANGUAGE_WARNING)).toBeHidden();
        await expect(reset.currentInput).toHaveValue(FIRST_LOGIN_DEFAULT_PASSWORD);
        await expect(page).toHaveURL(RESET_PASSWORD_URL);
    });

    test('should clear the form but stay on the reset screen when the user accepts the language change', { annotation: [{ type: 'testcase', description: 'LG-FIRST-21: Accepting the language switch reloads the reset screen with an empty form' }] }, async ({ page }) => {
        const reset = new FirstLoginPasswordPage(page);
        await reset.currentInput.fill(FIRST_LOGIN_DEFAULT_PASSWORD);
        await page.getByRole('button', { name: 'EN', exact: true }).click();
        await page.getByRole('button', { name: /^(تغيير|change)$/i }).click();
        await expect(page).toHaveURL(RESET_PASSWORD_URL);
        await expect(reset.currentInput).toHaveValue('');
        await expect(page.getByRole('button', { name: 'EN', exact: true })).toHaveAttribute('aria-pressed', 'true');
    });
});

// These two submit a change the server must reject. They use their own accounts and never send a valid change.
test.describe('Login — First login — rejected changes', { tag: ['@login', '@functional', '@first-login'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'functional' }] }, () => {
    test('should reject a wrong current password and keep the user on the reset screen', { annotation: [{ type: 'testcase', description: 'LG-FIRST-17: Wrong current password is rejected' }] }, async ({ page }) => {
        test.slow();
        await reachResetScreen(page, WRONG_CURRENT_ACCOUNT);
        const reset = new FirstLoginPasswordPage(page);
        await reset.fill('Wrong#Pass99', NEW_PASSWORD);
        await reset.submit();
        await expect(page).toHaveURL(RESET_PASSWORD_URL);
        // The server rejection must be shown to the user rather than failing silently.
        await assertToast(page);
    });

    test('should refuse to reuse the default password as the new password', { annotation: [{ type: 'testcase', description: 'LG-FIRST-18: New password equal to the default is rejected' }] }, async ({ page }) => {
        test.slow();
        await reachResetScreen(page, SAME_PASSWORD_ACCOUNT);
        const reset = new FirstLoginPasswordPage(page);
        await reset.fill(FIRST_LOGIN_DEFAULT_PASSWORD, FIRST_LOGIN_DEFAULT_PASSWORD);
        // Either the form blocks it on the client or the server rejects it; either way the user must stay on the reset screen.
        if (await reset.submitButton.isEnabled()) {
            test.info().annotations.push({ type: 'outcome', description: 'form allowed the submit; the server decides' });
            await reset.submit();
            await expect(page).toHaveURL(RESET_PASSWORD_URL);
            await assertToast(page); // a server rejection must be shown to the user
        } else {
            test.info().annotations.push({ type: 'outcome', description: 'form blocked it on the client (submit disabled)' });
            await expect(page).toHaveURL(RESET_PASSWORD_URL);
        }
    });
});
