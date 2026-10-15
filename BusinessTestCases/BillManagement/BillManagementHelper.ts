import testAccounts from '../../data/testAccounts.json';

/**
 * Create Bill / Bill Management (EMI-183 Bill Management, EMI-242 Excel bulk
 * upload, EMI-3020 Predefined Items — epics EMI-2179/EMI-2178). Reuses the
 * same Biller-capable fixture account as PayBillHelper.ts since no dedicated
 * "Biller creates a bill" account/data set exists yet in this repo.
 */

export const BASE_URL = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';
export const HOME_URL = `${BASE_URL}/business/main/home`;

export const BILLER_COMPANY  = process.env['BILL_CREATE_COMPANY']  ?? testAccounts.moduleAccounts.billCreate.company;
export const BILLER_MOBILE   = process.env['BILL_CREATE_MOBILE']   ?? testAccounts.moduleAccounts.billCreate.mobile;
export const BILLER_PASSWORD = process.env['BILL_CREATE_PASSWORD'] ?? testAccounts.defaultPassword;

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

/**
 * A single line item on a Detailed Bill (EMI-1679, EMI-3060, EMI-4123).
 * `vat` is deliberately optional — EMI-3957 established that VAT must stay
 * optional in the *edit item* form exactly as it already is in *add item*.
 */
export interface BillItemInput {
    name: string;
    quantity: string;
    unitPrice: string;
    discountType?: 'No Discount' | 'Fixed' | 'Percentage';
    discountValue?: string;
    vat?: string;
}

export function uniqueItemName(prefix = 'QA-ITEM'): string {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/** Strips currency symbols, thousands separators and whitespace from a money label so it can be compared numerically. */
export function parseMoney(text: string | null | undefined): number {
    if (!text) return NaN;
    const cleaned = text.replace(/[^\d.,-]/g, '').replace(/,/g, '');
    return Number.parseFloat(cleaned);
}

/**
 * Item total as the product currently defines it (EMI-4123):
 *   (unitPrice - fixedDiscount) x quantity
 * i.e. the discount is applied to the *unit price*, before multiplying by
 * quantity. EMI-4121 is still an open Inquiry asking whether the KSA market
 * expects the discount applied to the line total instead — if that inquiry is
 * resolved the other way, this function and BI-03/BI-04 are the single place
 * that needs updating.
 */
export function expectedItemTotal(unitPrice: number, quantity: number, discount = 0, discountType: 'FIXED' | 'PERCENTAGE' = 'FIXED'): number {
    const unitAfterDiscount = discountType === 'FIXED'
        ? unitPrice - discount
        : unitPrice * (1 - discount / 100);
    return Math.max(0, unitAfterDiscount) * quantity;
}

/**
 * The *alternative* EMI-4121 interpretation: the discount applied to the line
 * total (unitPrice x quantity) rather than to the unit price:
 *   (unitPrice x quantity) - fixedDiscount
 * Exists so BI-26 in BillItems.spec.ts can record which interpretation the
 * app currently implements without presuming EMI-4121's still-open answer.
 */
export function expectedItemTotalLineDiscount(unitPrice: number, quantity: number, discount = 0, discountType: 'FIXED' | 'PERCENTAGE' = 'FIXED'): number {
    const lineTotal = unitPrice * quantity;
    const afterDiscount = discountType === 'FIXED'
        ? lineTotal - discount
        : lineTotal * (1 - discount / 100);
    return Math.max(0, afterDiscount);
}
