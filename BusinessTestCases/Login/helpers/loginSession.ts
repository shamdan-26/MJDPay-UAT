import { expect, type Page } from '@playwright/test';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { LOGIN_MOBILE, gotoLogin, fillAndSubmitLogin, getOtpFromDb } from './LoginHelper.ts';
import { boxStep } from '../../shared/boxStep.ts';

/** Logs the happy-path account in (answering the OTP dialog when it is enabled) and waits for the dashboard. */
export async function loginToDashboard(page: Page): Promise<void> {
    return boxStep('loginToDashboard', async () => {
        await gotoLogin(page);
        await fillAndSubmitLogin(page);
        const otp = new OtpPage(page);
        const shown = await otp.heading.waitFor({ state: 'visible', timeout: 30000 }).then(() => true, () => false);
        if (shown) await otp.fillAndVerify(await getOtpFromDb(LOGIN_MOBILE));
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 30000 });
    });
}

/** Submits valid credentials and returns the OTP page once its dialog is shown; skips the test when login OTP is off. */
export async function loginToOtpDialog(page: Page, skip: (condition: boolean, reason: string) => void): Promise<OtpPage> {
    return boxStep('loginToOtpDialog', async () => {
        await gotoLogin(page);
        await fillAndSubmitLogin(page);
        const otp = new OtpPage(page);
        const shown = await otp.heading.waitFor({ state: 'visible', timeout: 30000 }).then(() => true, () => false);
        skip(!shown, 'login OTP requirement is OFF for this account/environment');
        return otp;
    });
}
