import { Page } from '@playwright/test';
import { FIXED_OTP } from '../../../support/otp';
import { boxStep } from '../../shared/boxStep.ts';

/** Every environment accepts this fixed OTP for any mobile — no mailbox/DB round trip needed. */
export { FIXED_OTP };

/** Parameters are kept only so existing callers keep compiling. */
export async function getOtpFromDb(_mobile?: string, _maxAttempts?: number, _delayMs?: number): Promise<string> {
    return boxStep('getOtpFromDb', async () => {
        return FIXED_OTP;
    });
}

export async function fillOTP(page: Page, otp?: string) {
    return boxStep('fillOTP', async () => {
        const inputs = page.getByRole('textbox', { name: 'One time password input' });
        await inputs.first().waitFor({ state: 'visible', timeout: 10000 });
        const count  = await inputs.count();
        for (let i = 0; i < count; i++) {
            await inputs.nth(i).pressSequentially(otp?.[i] ?? '0', { delay: 50 });
        }
    });
}
