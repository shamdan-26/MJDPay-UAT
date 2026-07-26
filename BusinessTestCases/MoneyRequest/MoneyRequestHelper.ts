import topupData from '../../data/topupData.json';

/**
 * Money Request (EMI-834). Reuses the same shared business-account fixture
 * pool as Topup/QRPayment since no dedicated requester/requested account pair
 * exists yet for this feature.
 */

export const BASE_URL = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';
export const HOME_URL = `${BASE_URL}/business/main/home`;

type LoginData = { companyNumber: string; mobileNumber: string; password: string };
const dataSets = topupData as LoginData[];

export const REQUESTER_COMPANY  = process.env['MONEY_REQUEST_COMPANY']  ?? dataSets[0]!.companyNumber;
export const REQUESTER_MOBILE   = process.env['MONEY_REQUEST_MOBILE']   ?? dataSets[0]!.mobileNumber;
export const REQUESTER_PASSWORD = process.env['MONEY_REQUEST_PASSWORD'] ?? dataSets[0]!.password;

export const PAYER_COMPANY  = process.env['MONEY_REQUEST_PAYER_COMPANY']  ?? dataSets[1]?.companyNumber ?? dataSets[0]!.companyNumber;
export const PAYER_MOBILE   = process.env['MONEY_REQUEST_PAYER_MOBILE']   ?? dataSets[1]?.mobileNumber ?? dataSets[0]!.mobileNumber;
export const PAYER_PASSWORD = process.env['MONEY_REQUEST_PAYER_PASSWORD'] ?? dataSets[1]?.password ?? dataSets[0]!.password;
