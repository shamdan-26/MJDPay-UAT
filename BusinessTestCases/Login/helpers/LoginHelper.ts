import type { Page } from '@playwright/test';
import { FIXED_OTP } from '../../../support/otp.ts';
import { waitForToastClear } from '../../shared/toastMessages.ts';
import { LoginPage } from '../../pageElements/Shared/LoginPage.ts';
import testAccounts from '../../../data/testAccounts.json';

export const LOGIN_URL    = `${process.env['BASE_URL'] ?? 'https://dev-emi.dg-cash.app'}/business/auth/login`;
export const SESSION_PATH = 'session.json';

// Shared merchant (not blocked): used by the other modules and by the Login API regression check.
export const VALID_COMPANY  = process.env['DEV_COMPANY'] ?? testAccounts.merchant.company;
export const VALID_MOBILE   = process.env['DEV_MOBILE']  ?? testAccounts.merchant.mobile;

// HAPPY-PATH account (not blocked): successful-login tests only (happy path, OTP flow, navigation, validation card).
// No negative, wrong-password or lockout scenario may use it — those use NEGATIVE_* below.
export const LOGIN_COMPANY  = process.env['DEV_LOGIN_COMPANY'] ?? testAccounts.loginAccounts.happy.company;
export const LOGIN_MOBILE   = process.env['DEV_LOGIN_MOBILE']  ?? testAccounts.loginAccounts.happy.mobile;

// NEGATIVE-PATH account (gets blocked): wrong-password, invalid-credential, form-validation and lockout scenarios.
// The lockout test genuinely blocks it, so it needs an out-of-band unblock before the next full run.
export const NEGATIVE_COMPANY = process.env['DEV_BLOCKED_COMPANY'] ?? testAccounts.loginAccounts.blocked.company;
export const NEGATIVE_MOBILE  = process.env['DEV_BLOCKED_MOBILE']  ?? testAccounts.loginAccounts.blocked.mobile;

export const VALID_PASSWORD = testAccounts.defaultPassword;

/**
 * Business accounts created by the Registration suite, with the company numbers read from the
 * Admin Portal (Manage Users → Accounts → Business → user info). They sign in with
 * `VALID_PASSWORD` (same assumption as the shared merchant/biller — not yet confirmed per account).
 */
export const CREATED_ACCOUNTS: ReadonlyArray<{ company: string; mobile: string }> = testAccounts.createdAccounts;
export const WRONG_PASSWORD = testAccounts.wrongPassword;

/** Password every new Business user starts with; signing in with it forces a password update. */
export const FIRST_LOGIN_DEFAULT_PASSWORD = testAccounts.firstLoginDefaultPassword;

// DEV-only OTP bypass — in UAT use getOtpFromDb() instead.
export const VALID_OTP   = FIXED_OTP;
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

// EMI-5836 — dedicated accounts whose NAFATH/WATHIQ *document* has expired
// (is_nafath_data_expired / is_wathiq_data_expired = true via the government
// document-expiration validation job). Set via env vars once QA has these
// provisioned in UAT; every test consuming these is skipped, not failed,
// when unset. There is deliberately no equivalent pair for the Redis-*TTL*-only
// expiry variant — that state isn't reachable through any UI/API surface QA
// controls (it's set by the internal Redis TTL-monitoring job), so those
// scenarios are covered as skip(true)-pending in the spec instead of being
// wired to env vars that could never be satisfied.
export const NAFATH_EXPIRED_COMPANY  = process.env['NAFATH_EXPIRED_COMPANY']  ?? '';
export const NAFATH_EXPIRED_MOBILE   = process.env['NAFATH_EXPIRED_MOBILE']   ?? '';
export const NAFATH_EXPIRED_PASSWORD = process.env['NAFATH_EXPIRED_PASSWORD'] ?? VALID_PASSWORD;
export const WATHIQ_EXPIRED_COMPANY  = process.env['WATHIQ_EXPIRED_COMPANY']  ?? '';
export const WATHIQ_EXPIRED_MOBILE   = process.env['WATHIQ_EXPIRED_MOBILE']   ?? '';
export const WATHIQ_EXPIRED_PASSWORD = process.env['WATHIQ_EXPIRED_PASSWORD'] ?? VALID_PASSWORD;

/** Generates a random valid KSA-format mobile (9 digits, starts with 5) not present in UAT test data. */
export function generateUnregisteredMobile(): string {
    const random = Math.floor(Math.random() * 100_000_000).toString().padStart(8, '0');
    return `5${random}`;
}

/**
 * Every environment accepts the fixed OTP 918512 (testAccounts.validOtp), so no mailbox/DB round trip is needed.
 * The mobile/attempt/filter parameters are kept only so existing callers keep compiling.
 */
export async function getOtpFromDb(
    _mobile?: string,
    _maxAttempts?: number,
    _delayMs?: number,
    _messageFilter?: RegExp
): Promise<string> {
    return VALID_OTP;
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
