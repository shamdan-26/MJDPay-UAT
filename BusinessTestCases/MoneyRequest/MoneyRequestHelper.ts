import testAccounts from '../../data/testAccounts.json';

/**
 * Money Request (EMI-834). Reuses the same shared business-account fixture
 * pool as Topup/QRPayment since no dedicated requester/requested account pair
 * exists yet for this feature.
 */

export const BASE_URL = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';
export const HOME_URL = `${BASE_URL}/business/main/home`;

export const REQUESTER_COMPANY  = process.env['MONEY_REQUEST_COMPANY']  ?? testAccounts.moduleAccounts.moneyRequestRequester.company;
export const REQUESTER_MOBILE   = process.env['MONEY_REQUEST_MOBILE']   ?? testAccounts.moduleAccounts.moneyRequestRequester.mobile;
export const REQUESTER_PASSWORD = process.env['MONEY_REQUEST_PASSWORD'] ?? testAccounts.defaultPassword;

export const PAYER_COMPANY  = process.env['MONEY_REQUEST_PAYER_COMPANY']  ?? testAccounts.moduleAccounts.moneyRequestPayer.company;
export const PAYER_MOBILE   = process.env['MONEY_REQUEST_PAYER_MOBILE']   ?? testAccounts.moduleAccounts.moneyRequestPayer.mobile;
export const PAYER_PASSWORD = process.env['MONEY_REQUEST_PAYER_PASSWORD'] ?? testAccounts.defaultPassword;
