import { expect, type Page, type Response } from '@playwright/test';
import testAccounts from '../../../data/testAccounts.json';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { FIRST_LOGIN_DEFAULT_PASSWORD, LOGIN_URL, VALID_OTP } from './LoginHelper.ts';

// Helpers for the first-login specs (Login/functional/05-first-login).

export type FirstLoginAccount = { company: string; mobile: string };

/** Registration-created accounts that still have the default password (found by FirstLoginProbe.spec.ts). */
export const FIRST_LOGIN_ACCOUNTS: ReadonlyArray<FirstLoginAccount> = testAccounts.firstLoginAccounts;

export const RESET_PASSWORD_URL = /\/business\/auth\/reset-password/;

/** Password the end-to-end case sets, so a consumed account joins the normal pool (same as testAccounts.defaultPassword). */
export const NEW_PASSWORD = testAccounts.defaultPassword;

/** Signs in through the real login page and the OTP step; leaves the page wherever the app sends the user next. */
export async function signInThroughOtp(page: Page, account: FirstLoginAccount, password: string = FIRST_LOGIN_DEFAULT_PASSWORD): Promise<void> {
    const loginPage = new LoginPage(page);
    await loginPage.goto(LOGIN_URL);
    await loginPage.fillAndSubmit(account.company, account.mobile, password);
    const otp = new OtpPage(page);
    await otp.heading.waitFor({ state: 'visible', timeout: 20000 });

    // Watch the verify call so a stuck OTP screen turns into a clear message (status + body) instead of a URL timeout.
    // The OTP widget auto-submits on the last digit: just wait for the verify request, never click Verify.
    const isVerify = (r: Response) => r.request().method() === 'POST' && /\/auth\/verify\/otp/.test(r.url());
    const seen = page.waitForResponse(isVerify, { timeout: 15000 }).catch(() => null);
    await otp.fillAndVerify(VALID_OTP);
    const verifyResponse = await seen;
    if (verifyResponse && !verifyResponse.ok()) {
        throw new Error(`OTP verify for ${account.company} returned ${verifyResponse.status()}: ${(await verifyResponse.text().catch(() => '')).slice(0, 200)}`);
    }
}

/** Default password + OTP, then waits on the forced reset screen. Nothing is submitted, so the account is not consumed. */
export async function reachResetScreen(page: Page, account: FirstLoginAccount): Promise<void> {
    await signInThroughOtp(page, account);
    await expect(page, `${account.company} should be forced to the reset screen (is it already consumed?)`).toHaveURL(RESET_PASSWORD_URL, { timeout: 20000 });
}
