import { test, expect } from '@playwright/test';
import { LoginPage } from '../Helpers/LoginPage';
// Note: MongoDB utility import will be needed here later
// import { getLatestOtp } from '../utilities/OtpUtils'; 
const loginData = require('../../data/LoginTests.json');

type LoginTestData = {
    type: 'positive' | 'negative';
    execute?: boolean;
    description: string;
    companyNumber: string;
    mobileNumber: string;
    password: string;
    otpCode?: string;
    expectedMobileValue?: string;
    expectedMobileLength?: number;
    expectedToastError?: string;
    useSequentialTyping?: boolean;
};

const dataSets = loginData as LoginTestData[];

test.describe('MajdPay Login Tests', () => {

    test.beforeEach(async ({ page }) => {
        const loginPage = new LoginPage(page);
        // 1. Navigate to the website
        await loginPage.navigate();
    });

    test.describe('Successful Login Scenarios', () => {
        const positiveTests = dataSets.filter(data => data.type === 'positive');

        for (const data of positiveTests) {
            test(`Login for user: ${data.description}`, async ({ page }) => {
                if (data.execute === false) {
                    test.skip();
                }
                const loginPage = new LoginPage(page);

                // 2. Enter login credentials (fetched from JSON to replace DataProvider functionality)
                await loginPage.login(data.companyNumber, data.mobileNumber, data.password);

                // 3. Handle OTP verification flow
                if (await loginPage.isOTPScreenDisplayed()) {
                    console.log('OTP Screen displayed, fetching code...');

                    // Note: OtpWaiter will need to be converted to TypeScript later
                    // Using fallback OTP code from data or empty string for now
                    const otpCode = data.otpCode ?? '';

                    await loginPage.enterOTP(otpCode);
                    await loginPage.verifyButton.click();
                }

                // 4. Assert successful login
                await loginPage.assertLoginSuccess();
            });
        }
    });

    test.describe('Validation / Negative Login Scenarios', () => {
        const negativeTests = dataSets.filter(data => data.type === 'negative');

        for (const data of negativeTests) {
            test(`Validation: ${data.description}`, async ({ page }) => {
                if (data.execute === false) {
                    test.skip();
                }
                const loginPage = new LoginPage(page);

                if (data.description === 'Login in Arabic Language') {
                    console.log('Executing Arabic Language UI validation...');
                    await loginPage.selectArabic();
                    await expect(loginPage.arabicButton).toHaveAttribute('aria-pressed', 'true');
                    const isArabicActive = await loginPage.isLanguageActive(loginPage.arabicButton);
                    expect(isArabicActive).toBe(true);

                    // Assert Title is explicitly present in Arabic
                    await loginPage.assertArabicTitleVisible();
                    return; // Skip full login execution
                }

                await loginPage.login(
                    data.companyNumber,
                    data.mobileNumber,
                    data.password,
                    { 
                        useSequentialTyping: data.useSequentialTyping,
                        skipSubmit: (data.expectedMobileValue !== undefined || data.expectedMobileLength !== undefined)
                    }
                );

                if (data.expectedMobileValue !== undefined) {
                    const actualValue = await loginPage.mobileNumberInput.inputValue();
                    expect(actualValue).toBe(data.expectedMobileValue);
                }

                if (data.expectedMobileLength !== undefined) {
                    const actualValue = await loginPage.mobileNumberInput.inputValue();
                    expect(actualValue).toHaveLength(data.expectedMobileLength);
                }

                await expect(page).toHaveURL(/\/business\/auth\/login/i);

                if (data.expectedToastError !== undefined) {
                    await loginPage.assertToastError(data.expectedToastError);
                } else if (data.expectedMobileLength === undefined) {
                    await loginPage.assertValidationErrorsVisible();
                }
            });
        }
    });
    // ── UI Theme and Language Login Scenarios ──────────────────────────

    test.describe('UI Theme and Language Login Scenarios', () => {
        const creds = dataSets.find(d => d.type === 'positive')!;

        test('Login in Light Mode (Default)', async ({ page }) => {
            if (creds.execute === false) {
                test.skip();
            }
            const loginPage = new LoginPage(page);

            // Step 1: Navigate to the Login Page
            await loginPage.navigate();

            // Step 2: Verify Light mode is active (default) — toggle button is present
            await expect(loginPage.themeToggleButton).toBeVisible();

            // Step 3: Perform Login
            await loginPage.login(creds.companyNumber, creds.mobileNumber, creds.password);

            // Step 4: Handle OTP if displayed
            if (await loginPage.isOTPScreenDisplayed()) {
                const otpCode = creds.otpCode ?? '';
                await loginPage.enterOTP(otpCode);
                await loginPage.verifyButton.click();
            }

            // Step 5: Assert successful login
            await loginPage.assertLoginSuccess();
        });

        test('Login in Dark Mode', async ({ page }) => {
            if (creds.execute === false) {
                test.skip();
            }
            const loginPage = new LoginPage(page);

            // Step 1: Navigate to the Login Page
            await loginPage.navigate();

            // Step 2: Switch to Dark Mode BEFORE any login interaction
            await loginPage.toggleTheme();

            // Step 3: Perform Login
            await loginPage.login(creds.companyNumber, creds.mobileNumber, creds.password);

            // Step 4: Handle OTP if displayed
            if (await loginPage.isOTPScreenDisplayed()) {
                const otpCode = creds.otpCode ?? '';
                await loginPage.enterOTP(otpCode);
                await loginPage.verifyButton.click();
            }

            // Step 5: Assert successful login
            await loginPage.assertLoginSuccess();
        });

        test('Login in English Language (Default)', async ({ page }) => {
            if (creds.execute === false) {
                test.skip();
            }
            const loginPage = new LoginPage(page);

            // Step 1: Navigate to the Login Page
            await loginPage.navigate();

            // Step 2: Confirm English is the active language BEFORE login
            const isEnglishActive = await loginPage.isLanguageActive(loginPage.englishButton);
            expect(isEnglishActive).toBe(true);

            // Step 3: Perform Login
            await loginPage.login(creds.companyNumber, creds.mobileNumber, creds.password);

            // Step 4: Handle OTP if displayed
            if (await loginPage.isOTPScreenDisplayed()) {
                const otpCode = creds.otpCode ?? '';
                await loginPage.enterOTP(otpCode);
                await loginPage.verifyButton.click();
            }

            // Step 5: Assert successful login
            await loginPage.assertLoginSuccess();
        });
        /*
                test('Login in Arabic Language', async ({ page }) => {
                    if (creds.execute === false) {
                        test.skip();
                    }
                    const loginPage = new LoginPage(page);
        
                    // Step 1: Navigate to the Login Page
                    await loginPage.navigate();
        
                    // Step 2: Switch to Arabic BEFORE any login interaction
                    await loginPage.selectArabic();
        
                    // Wait for Arabic language to be active (more stable than networkidle)
                    await expect(loginPage.arabicButton).toHaveAttribute('aria-pressed', 'true');
        
                    // Verify Arabic is now the active language
                    const isArabicActive = await loginPage.isLanguageActive(loginPage.arabicButton);
                    expect(isArabicActive).toBe(true);
        
                    // Step 3: Perform Login
                    await loginPage.login(creds.companyNumber, creds.mobileNumber, creds.password);
        
                    // Step 4: Handle OTP if displayed
                    if (await loginPage.isOTPScreenDisplayed()) {
                        const otpCode = creds.otpCode ?? '';
                        await loginPage.enterOTP(otpCode);
                        await loginPage.verifyButton.click();
                    }
        
                    // Step 5: Assert successful login
                    await loginPage.assertLoginSuccess();
                });*/
    });

    // ── Password Visibility Scenarios ────────────────────────────

    test.describe('Password Visibility Scenarios', () => {
        const creds = dataSets.find(d => d.type === 'positive')!;

        test('Merchant - Verify that the text inside the password field is masked by default', async ({ page }) => {
            if (creds.execute === false) {
                test.skip();
            }
            const loginPage = new LoginPage(page);

            // Step 1: Navigate to the Login Page
            await loginPage.navigate();

            // Step 2: Enter password only (dummy) to test password masking
            await loginPage.passwordInput.fill('DummyPassword123!');

            // Assert password field is masked by default (type=password)
            expect(await loginPage.isPasswordMasked()).toBeTruthy();
        });

        test('Merchant - Show the password', async ({ page }) => {
            if (creds.execute === false) {
                test.skip();
            }
            const loginPage = new LoginPage(page);

            // Step 1: Navigate to the Login Page
            await loginPage.navigate();

            // Step 2: Enter password only (dummy)
            await loginPage.passwordInput.fill('DummyPassword123!');

            // Step 3: Verify password is initially masked
            expect(await loginPage.isPasswordMasked()).toBeTruthy();

            // Step 4: Click to show password
            await loginPage.togglePasswordVisibility();

            // Step 5: Verify password is now visible (type=text)
            expect(await loginPage.isPasswordVisible()).toBeTruthy();
        });

        test('Merchant - Hide the password', async ({ page }) => {
            if (creds.execute === false) {
                test.skip();
            }
            const loginPage = new LoginPage(page);

            // Step 1: Navigate to the Login Page
            await loginPage.navigate();

            // Step 2: Enter password only (dummy)
            await loginPage.passwordInput.fill('DummyPassword123!');

            // Step 3: Click to show password first
            await loginPage.togglePasswordVisibility();
            expect(await loginPage.isPasswordVisible()).toBeTruthy();

            // Step 4: Click to hide password
            await loginPage.togglePasswordVisibility();

            // Step 5: Verify password is masked again
            expect(await loginPage.isPasswordMasked()).toBeTruthy();
        });
    });
});