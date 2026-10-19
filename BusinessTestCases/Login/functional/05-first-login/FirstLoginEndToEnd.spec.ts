import { test, expect } from '../../../shared/fixtures.ts';
import { FirstLoginPasswordPage } from '../../../pageElements/Login/FirstLoginPasswordPage';
import { LoginPage } from '../../../pageElements/Shared/LoginPage';
import { FIRST_LOGIN_DEFAULT_PASSWORD, LOGIN_URL } from '../../helpers/LoginHelper.ts';
import { FIRST_LOGIN_ACCOUNTS, NEW_PASSWORD, RESET_PASSWORD_URL, signInThroughOtp } from '../../helpers/firstLogin';

// First-time login — END TO END. This case CONSUMES one account: it sets the new password, so the account is no longer
// in first-login state afterwards. The new password is the suite's shared one (Aa#1234567), so a consumed account
// simply becomes a normal account every other spec can use.
//
// Opt-in (FIRST_LOGIN_E2E=1). The account is FIRST_LOGIN_ACCOUNTS[FIRST_LOGIN_E2E_INDEX]; the default is the LAST one
// (the form cases use the first three). After a run, lower the index for the next run (…=15, 14, …) — a consumed
// account makes the case skip with a clear reason instead of failing.

const INDEX   = Number(process.env['FIRST_LOGIN_E2E_INDEX'] ?? FIRST_LOGIN_ACCOUNTS.length - 1);
const ACCOUNT = FIRST_LOGIN_ACCOUNTS[INDEX];

test.describe('Login — First login — end to end (consumes an account)', { tag: ['@login', '@functional', '@first-login'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'functional' }] }, () => {
    test.skip(!process.env['FIRST_LOGIN_E2E'], 'Set FIRST_LOGIN_E2E=1 — this case changes the password of one first-login account');
    test.describe.configure({ mode: 'serial' });

    test('LG-FIRST-20: default password → forced reset → new password works, old one no longer does', { annotation: [{ type: 'testcase', description: 'LG-FIRST-20: First login end to end' }] }, async ({ browser }) => {
        test.setTimeout(240000);
        test.skip(!ACCOUNT, `FIRST_LOGIN_E2E_INDEX=${INDEX} is outside firstLoginAccounts (0–${FIRST_LOGIN_ACCOUNTS.length - 1})`);
        test.info().annotations.push({ type: 'account', description: `${ACCOUNT.company} (index ${INDEX})` });

        // 1. Default password + OTP → the forced reset screen.
        const first = await (await browser.newContext()).newPage();
        await signInThroughOtp(first, ACCOUNT);
        test.skip(!RESET_PASSWORD_URL.test(first.url()), `${ACCOUNT.company} is not in first-login state any more — use the next FIRST_LOGIN_E2E_INDEX`);

        // 2. Change the password to the shared one.
        const reset = new FirstLoginPasswordPage(first);
        await reset.fill(FIRST_LOGIN_DEFAULT_PASSWORD, NEW_PASSWORD);
        await expect(reset.submitButton).toBeEnabled();
        await reset.submit();

        // 3. A password change ends the session (EMI-200): the user must sign in again.
        await expect(first).not.toHaveURL(RESET_PASSWORD_URL, { timeout: 20000 });
        test.info().annotations.push({ type: 'after-change-url', description: first.url() });
        await expect(first).toHaveURL(/\/business\/auth\/login/);
        await first.context().close();

        // 4. The new password signs in through the OTP and reaches the app (no second forced reset).
        const second = await (await browser.newContext()).newPage();
        await signInThroughOtp(second, ACCOUNT, NEW_PASSWORD);
        await expect(second).toHaveURL(/\/business\/main\/home/, { timeout: 20000 });
        await second.context().close();

        // 5. The old default password no longer works (one rejected attempt).
        const third = await (await browser.newContext()).newPage();
        let status = 0;
        third.on('response', res => { if (res.request().method() === 'POST' && /\/auth\/signin$/.test(res.url())) status = res.status(); });
        const loginPage = new LoginPage(third);
        await loginPage.goto(LOGIN_URL);
        await loginPage.fillAndSubmit(ACCOUNT.company, ACCOUNT.mobile, FIRST_LOGIN_DEFAULT_PASSWORD);
        await expect.poll(() => status, { timeout: 15000 }).toBeGreaterThan(0);
        expect(status).toBeGreaterThanOrEqual(400);
        await expect(third).toHaveURL(/\/business\/auth\/login/);
        await third.context().close();
    });
});
