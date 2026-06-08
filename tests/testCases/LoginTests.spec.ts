import { test, expect } from '@playwright/test';
import { LoginPage } from '../pageObjects/LoginPage';// هنا ستحتاجين لاستيراد الـ Utility الخاصة بالـ MongoDB لاحقاً
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

            // 1. الذهاب للموقع
            await loginPage.navigate();

            // 2. إدخال البيانات (يمكنك جلبها من JSON لتعويض DataProvider)
            await loginPage.login(data.companyNumber, data.mobileNumber, data.password);

            // 3. التعامل مع الـ OTP
            if (await loginPage.isOTPScreenDisplayed()) {
                console.log('OTP Screen displayed, fetching code...');

                // ملاحظة: ستحتاجين لتحويل OtpWaiter إلى TypeScript 
                // لنفترض أن الـ OTP هو 123456 للتجربة حالياً
                const otpCode = data.otpCode ?? '';

                await loginPage.enterOTP(otpCode);
                await loginPage.verifyButton.click();
            }

            // 4. التأكد من النجاح
            await loginPage.assertLoginSuccess();

        });
    }

    test('Verify that the OTP input fields accepts only numeric input', async ({ page }) => {
        const loginPage = new LoginPage(page);
        const data = dataSets[0];

        // 1. الذهاب للموقع
        await loginPage.navigate();

        // 2. إدخال بيانات صحيحة للوصول لصفحة الـ OTP
        await loginPage.login(data.companyNumber, data.mobileNumber, data.password);

        // 3. التأكد من ظهور خانات الـ OTP
        const firstOtpInput = page.locator('#ngx-otp-input-0');
        await expect(firstOtpInput).toBeVisible({ timeout: 10000 });

        // 4. محاولة إدخال حروف (غير أرقام) والتأكد من أنها لم تُقبل
        await firstOtpInput.pressSequentially('abc');
        let value = await firstOtpInput.inputValue();
        expect(value).not.toMatch(/[a-zA-Z]/);

        // 5. محاولة إدخال رموز خاصة والتأكد من عدم قبولها
        await firstOtpInput.fill(''); // مسح الخانة
        await firstOtpInput.pressSequentially('@#$');
        value = await firstOtpInput.inputValue();
        expect(value).not.toMatch(/[@#$]/);

        // 6. التأكد من قبول الأرقام
        await firstOtpInput.fill(''); // مسح الخانة
        await firstOtpInput.pressSequentially('5');
        value = await firstOtpInput.inputValue();
        expect(value).toBe('5');
    });

});
