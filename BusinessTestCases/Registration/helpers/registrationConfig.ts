import registrationDefaults from '../../../data/registrationDefaults.json';

declare const process: { env: Record<string, string | undefined> };

const BASE_URL = process.env['BASE_URL'] ?? 'https://dev-emi.dg-cash.app';
export const LOGIN_URL    = `${BASE_URL}/business/auth/login`;
export const REGISTER_URL = `${BASE_URL}/business/auth/register`;

/** Fixed registration email — the Mailosaur inbox the tests read activation/OTP emails from. Override with REGISTRATION_EMAIL. */
export const REGISTRATION_EMAIL = process.env['REGISTRATION_EMAIL'] ?? 'either-duty@76g5xcrh.mailosaur.net';

/** Valid email for Business Info — the same fixed Mailosaur inbox, so every registration email is readable by the tests. */
export const VALID_EMAIL = REGISTRATION_EMAIL;

// Verification & Uploads step (Tab 3) — shared valid test data
export const VALID_IBAN       = registrationDefaults.validIban;
export const VALID_VAT_NUMBER = registrationDefaults.validVatNumber;

/** Minimal 1x1 PNG used as a stand-in upload file across registration file-upload tests. */
export const TEST_FILE_BUFFER = Buffer.from(registrationDefaults.testFileBase64, 'base64');

/** Email every registration test uses (kept as a function so existing callers are unchanged). */
export function generateEmail(): string {
    return REGISTRATION_EMAIL;
}
