import { test } from '@playwright/test';
import { LoginPage } from '../pageObjects/LoginPage';
import { runWithAIRecovery } from '../utils/runWithAIRecovery.js';

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

            await runWithAIRecovery(async () => {

                const loginPage = new LoginPage(page);

                // 1. الذهاب للموقع
                await loginPage.navigate();

                // 2. تسجيل الدخول
                await loginPage.login(
                    data.companyNumber,
                    data.mobileNumber,
                    data.password
                );

                // 3. التعامل مع OTP
                if (await loginPage.isOTPScreenDisplayed()) {
                    console.log('OTP Screen displayed, fetching code...');

                    const otpCode = data.otpCode ?? '';

                    await loginPage.enterOTP(otpCode);
                    await loginPage.verifyButton.click();
                }

                // 4. التحقق من نجاح الدخول
                await loginPage.assertLoginSuccess();

            }, {
                page,
                testData: data
            });

        });

    }

});