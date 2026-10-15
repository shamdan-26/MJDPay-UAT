import testAccounts from '../../data/testAccounts.json';
import payBillData from '../../data/PayBill.json';

export const BASE_URL  = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';
export const HOME_URL  = `${BASE_URL}/business/main/home`;

type PayBillTestData = {
    description: string;
    companyNumber: string;
    mobileNumber: string;
    password: string;
    otpCode?: string;
    billStatus: string;
};

const dataSets = payBillData as PayBillTestData[];
const primary = dataSets[0]!;

// Dedicated account with a live "Approved" received bill in UAT — override via
// env vars if the fixture bill/account needs to be rotated out.
export const BILL_COMPANY  = process.env['BILL_PAYMENT_COMPANY']  ?? testAccounts.moduleAccounts.payBill.company;
export const BILL_MOBILE   = process.env['BILL_PAYMENT_MOBILE']   ?? testAccounts.moduleAccounts.payBill.mobile;
export const BILL_PASSWORD = process.env['BILL_PAYMENT_PASSWORD'] ?? testAccounts.defaultPassword;
export const BILL_STATUS   = primary.billStatus;

// Known-good bill number in UAT used by PayBillQrAndSearch.spec.ts's manual-lookup
// positive assertion (BQR-04) — override via env if this fixture bill rotates out.
export const BILL_LOOKUP_NUMBER = process.env['BILL_LOOKUP_NUMBER'] ?? '1041';
