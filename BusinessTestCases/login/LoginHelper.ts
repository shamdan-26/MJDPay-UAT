import type { Page } from '@playwright/test';
import { MongoClient } from 'mongodb';
import { waitForToastClear } from '../shared';
import { LoginPage } from '../pageElements/LoginPage';
import testAccounts from '../../data/testAccounts.json';

export const LOGIN_URL    = `${process.env['BASE_URL'] ?? 'https://uat.majdpay.com'}/business/auth/login`;
export const SESSION_PATH = 'session.json';

// Account used for wrong-password / invalid-credential tests.
export const VALID_COMPANY  = process.env['UAT_COMPANY'] ?? testAccounts.merchant.company;
export const VALID_MOBILE   = process.env['UAT_MOBILE']  ?? testAccounts.merchant.mobile;

// Account used for successful-login tests (happy path, OTP flow, validation card).
export const LOGIN_COMPANY  = process.env['UAT_LOGIN_COMPANY'] ?? testAccounts.loginHappyPath.company;
export const LOGIN_MOBILE   = process.env['UAT_LOGIN_MOBILE']  ?? testAccounts.loginHappyPath.mobile;

export const VALID_PASSWORD = testAccounts.defaultPassword;
export const WRONG_PASSWORD = testAccounts.wrongPassword;

// DEV-only OTP bypass — in UAT use getOtpFromDb() instead.
export const VALID_OTP   = testAccounts.validOtp;
export const INVALID_OTP = testAccounts.invalidOtp;

// Dedicated accounts for account-status and lockout tests (set via env vars).
export const LOCKED_COMPANY      = process.env['LOCKED_COMPANY']      ?? '';
export const LOCKED_MOBILE       = process.env['LOCKED_MOBILE']        ?? '';
export const DEACTIVATED_COMPANY = process.env['DEACTIVATED_COMPANY']  ?? '';
export const DEACTIVATED_MOBILE  = process.env['DEACTIVATED_MOBILE']   ?? '';
export const AML_COMPANY         = process.env['AML_COMPANY']          ?? '';
export const AML_MOBILE          = process.env['AML_MOBILE']           ?? '';
export const LOCKOUT_COMPANY     = process.env['LOCKOUT_COMPANY']      ?? '';
export const LOCKOUT_MOBILE      = process.env['LOCKOUT_MOBILE']       ?? '';
export const LOCKOUT_PASSWORD    = process.env['LOCKOUT_PASSWORD']     ?? VALID_PASSWORD;

/** Generates a random valid KSA-format mobile (9 digits, starts with 5) not present in UAT test data. */
export function generateUnregisteredMobile(): string {
    const random = Math.floor(Math.random() * 100_000_000).toString().padStart(8, '0');
    return `5${random}`;
}

const MONGO_DB  = 'notification-log';

export async function getOtpFromDb(
    mobile: string,
    maxAttempts = 10,
    delayMs = 2000,
    messageFilter: RegExp = /Use this OTP/i
): Promise<string> {
    if ((process.env['ENV'] ?? 'dev') === 'dev') return VALID_OTP;
    const MONGO_URI = process.env['MONGO_URI'] ?? (() => { throw new Error('MONGO_URI env var is not set'); })();
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        const col = client.db(MONGO_DB).collection('notifications');
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const doc = await col.findOne(
                {
                    recipient: { $in: [mobile, `966${mobile}`, `+966${mobile}`, `0${mobile}`] },
                    message: { $regex: messageFilter },
                },
                { sort: { createdAt: -1 } }
            );
            if (doc) {
                const msg = doc.message as string;
                // Try the explicit "OTP: DIGITS" format first, then fall back to any 6–8 digit sequence.
                const match = msg.match(/Use this OTP\s*[:\s]+(\d+)/i) ?? msg.match(/\b(\d{6,8})\b/);
                if (match) return match[1];
            }
            if (attempt < maxAttempts) await new Promise(r => setTimeout(r, delayMs));
        }
        throw new Error(`No OTP notification found for mobile ${mobile} after ${maxAttempts} attempts`);
    } finally {
        await client.close();
    }
}

export async function fillOtpInputs(page: Page, otp: string): Promise<void> {
    const inputs = page.getByRole('textbox', { name: 'One time password input' });
    const count  = await inputs.count();
    for (let i = 0; i < count; i++) {
        await inputs.nth(i).pressSequentially(otp[i] ?? '0', { delay: 50 });
    }
}

export async function gotoLogin(page: Page): Promise<void> {
    const loginPage = new LoginPage(page);
    await loginPage.goto(LOGIN_URL);
}

export async function fillAndSubmitLogin(page: Page): Promise<void> {
    const loginPage = new LoginPage(page);
    await loginPage.fillAndSubmit(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
}
