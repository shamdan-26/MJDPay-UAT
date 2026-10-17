/**
 * The one OTP every environment accepts for every OTP step (login, admin login, registration, transactions, top-up...).
 * Import this instead of typing the digits or reading an env override, so a stray .env value can never change it.
 * Wrong-code tests must use a DIFFERENT value on purpose (e.g. testAccounts.invalidOtp).
 */
export const FIXED_OTP = '918512';
