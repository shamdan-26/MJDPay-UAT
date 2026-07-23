import { type Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { LoginPage } from '../pageElements/Shared/LoginPage';
import { OtpPage } from '../pageElements/Shared/OtpPage';

export const BASE_URL = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';

export type W2WTestData = {
    testName: string;
    suite: 'balance_update' | 'transaction_table' | 'invalid_crn' | 'amount_validation' | 'insufficient_fund' | 'crn_validation';
    execute: boolean;
    amountType?: string;
    crnType?: string;
    amountValidation?: string;
    companyNumber: string;
    mobileNumber: string;
    password: string;
    companyNumber_Biller: string;
    mobileNumber_Biller: string;
    password_Biller: string;
    receiverCRN: string;
    amount: string;
    otpCode?: string;
    expectedUIValue?: string;
    expectButtonDisabled?: boolean;
    isClipboardTest?: boolean;
    purposeOfTransfer?: string;
};

export async function performLogin(
    page: Page,
    companyNumber: string,
    mobileNumber: string,
    password: string,
    otpCode: string
): Promise<void> {
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/business/auth/login`);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

    const loginPage = new LoginPage(page);
    await loginPage.goto(`${BASE_URL}/business/auth/login`);
    await loginPage.fillAndSubmit(companyNumber, mobileNumber, password);

    const otp = new OtpPage(page);
    if (await otp.isVisible()) {
        await otp.fillAndVerify(otpCode);
    }

    await expect(page).toHaveURL(/\/business\/main\/home/i, { timeout: 10000 });
}
