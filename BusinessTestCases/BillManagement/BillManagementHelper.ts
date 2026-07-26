import payBillData from '../../data/PayBill.json';

/**
 * Create Bill / Bill Management (EMI-183 Bill Management, EMI-242 Excel bulk
 * upload, EMI-3020 Predefined Items — epics EMI-2179/EMI-2178). Reuses the
 * same Biller-capable fixture account as PayBillHelper.ts since no dedicated
 * "Biller creates a bill" account/data set exists yet in this repo.
 */

export const BASE_URL = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';
export const HOME_URL = `${BASE_URL}/business/main/home`;

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

export const BILLER_COMPANY  = process.env['BILL_CREATE_COMPANY']  ?? primary.companyNumber;
export const BILLER_MOBILE   = process.env['BILL_CREATE_MOBILE']   ?? primary.mobileNumber;
export const BILLER_PASSWORD = process.env['BILL_CREATE_PASSWORD'] ?? primary.password;

export interface NewBillInput {
    beneficiary: string;
    billRef: string;
    amount: string;
    discountType?: 'None' | 'Fixed' | 'Percentage';
    discountValue?: string;
    applyVat?: boolean;
    issueDate?: string;
    expiryDate?: string;
    description?: string;
}

export function uniqueBillRef(prefix = 'QA-BILL'): string {
    return `${prefix}-${Date.now()}`;
}
