declare const process: { env: Record<string, string | undefined> };
import { Page } from '@playwright/test';
import { fetchOtpFromEmail } from '../../../support/emailOtp';

export async function getOtpFromDb(mobile: string, maxAttempts = 10, delayMs = 2000): Promise<string> {
    const env = process.env['ENV'] ?? 'dev';
    // OTP_SOURCE=email reads the real OTP from the Mailosaur/IMAP inbox on every env (opt-in: dev's mail
    // relay must be delivering OTP emails there first, see support/emailOtp.ts).
    if (process.env['OTP_SOURCE'] === 'email') return fetchOtpFromEmail(mobile, maxAttempts, delayMs);
    // UAT now accepts a fixed all-zero OTP for any mobile, same as dev — no
    // longer limited to the dedicated DEV_OTP_ASSETS pool (see fillOTP's
    // '0'-per-digit fallback for '' below; '000000' behaves identically).
    // Skips the real IMAP/Azure round trip entirely.
    if (env === 'dev' || env === 'uat') return '000000';
    return fetchOtpFromEmail(mobile, maxAttempts, delayMs);
}

export async function fillOTP(page: Page, otp?: string) {
    const inputs = page.getByRole('textbox', { name: 'One time password input' });
    await inputs.first().waitFor({ state: 'visible', timeout: 10000 });
    const count  = await inputs.count();
    for (let i = 0; i < count; i++) {
        await inputs.nth(i).pressSequentially(otp?.[i] ?? '0', { delay: 50 });
    }
}
