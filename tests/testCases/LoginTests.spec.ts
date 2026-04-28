import { test } from '@playwright/test';
import { LoginPage } from '../pageObjects/LoginPage';
// import { getLatestOtp } from '../utilities/OtpUtils';
const loginData = require('../../data/LoginTests.json');
 
test.describe('MajdPay Login Tests', () => {
 
    type LoginTestData = {
        description: string;
        companyNumber: string;
        mobileNumber: string;
        password: string;
        otpCode?: string;
    };
 
    const dataSets = loginData as LoginTestData[];
 
    for (const data of dataSets) {
        test(`Login for user: ${data.description}`, async ({ page }) => {
            const loginPage = new LoginPage(page);
 
            await loginPage.navigate();
 
            await loginPage.login(data.companyNumber, data.Number, data.password);
 
            if (await loginPage.isOTPScreenDisplayed()) {
                console.log('OTP Screen displayed, fetching code...');
 
               
                const otpCode = data.otpCode ?? '';
 
                await loginPage.enterOTP(otpCode);
                await loginPage.verifyButton.click();
            }
 
           
            await loginPage.assertLoginSuccess();
 
        });
    }
 
});
 
 