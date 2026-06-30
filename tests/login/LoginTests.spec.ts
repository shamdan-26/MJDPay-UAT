import { test, expect } from '@playwright/test';
import { LoginPage } from '../pageObjects/LoginPage';
import loginData from '../../data/LoginTests.json';

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
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.navigate();
    });

    // ── Successful Login Scenarios ────────────────────────────────────────────

    test.describe('Successful Login Scenarios', () => {
        const positiveTests = dataSets.filter(data => data.type === 'positive');

        for (const data of positiveTests) {
            test(`Login for user: ${data.description}`, async ({ page }) => {
                test.skip(data.execute === false, 'disabled in test data');

                const loginPage = new LoginPage(page);
                await loginPage.login(data.companyNumber, data.mobileNumber, data.password);

                if (await loginPage.isOTPScreenDisplayed()) {
                    await loginPage.enterOTP(data.otpCode ?? '');
                    await loginPage.verifyButton.click();
                }

                await loginPage.assertLoginSuccess();
            });
        }
    });

    // ── Validation / Negative Login Scenarios ─────────────────────────────────

    test.describe('Validation / Negative Login Scenarios', () => {
        const negativeTests = dataSets.filter(data => data.type === 'negative');

        for (const data of negativeTests) {
            test(`Validation: ${data.description}`, async ({ page }) => {
                test.skip(data.execute === false, 'disabled in test data');

                const loginPage = new LoginPage(page);

                if (data.description === 'Login in Arabic Language') {
                    await loginPage.selectArabic();
                    await expect(loginPage.arabicButton).toHaveAttribute('aria-pressed', 'true');
                    expect(await loginPage.isLanguageActive(loginPage.arabicButton)).toBe(true);
                    await loginPage.assertArabicTitleVisible();
                    return;
                }

                await loginPage.login(
                    data.companyNumber,
                    data.mobileNumber,
                    data.password,
                    {
                        useSequentialTyping: data.useSequentialTyping,
                        skipSubmit: (data.expectedMobileValue !== undefined || data.expectedMobileLength !== undefined),
                    }
                );

                if (data.expectedMobileValue !== undefined) {
                    expect(await loginPage.mobileNumberInput.inputValue()).toBe(data.expectedMobileValue);
                }

                if (data.expectedMobileLength !== undefined) {
                    expect(await loginPage.mobileNumberInput.inputValue()).toHaveLength(data.expectedMobileLength);
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

    // ── UI Theme and Language Scenarios ───────────────────────────────────────

    test.describe('UI Theme and Language Scenarios', () => {
        const creds = dataSets.find(d => d.type === 'positive')!;

        test('Login in Light Mode (Default)', async ({ page }) => {
            test.skip(creds.execute === false, 'disabled in test data');

            const loginPage = new LoginPage(page);
            await loginPage.navigate();
            await expect(loginPage.themeToggleButton).toBeVisible();
            await loginPage.login(creds.companyNumber, creds.mobileNumber, creds.password);

            if (await loginPage.isOTPScreenDisplayed()) {
                await loginPage.enterOTP(creds.otpCode ?? '');
                await loginPage.verifyButton.click();
            }

            await loginPage.assertLoginSuccess();
        });

        test('Login in Dark Mode', async ({ page }) => {
            test.skip(creds.execute === false, 'disabled in test data');

            const loginPage = new LoginPage(page);
            await loginPage.navigate();
            await loginPage.toggleTheme();
            await loginPage.login(creds.companyNumber, creds.mobileNumber, creds.password);

            if (await loginPage.isOTPScreenDisplayed()) {
                await loginPage.enterOTP(creds.otpCode ?? '');
                await loginPage.verifyButton.click();
            }

            await loginPage.assertLoginSuccess();
        });

        test('Login in English Language (Default)', async ({ page }) => {
            test.skip(creds.execute === false, 'disabled in test data');

            const loginPage = new LoginPage(page);
            await loginPage.navigate();
            expect(await loginPage.isLanguageActive(loginPage.englishButton)).toBe(true);
            await loginPage.login(creds.companyNumber, creds.mobileNumber, creds.password);

            if (await loginPage.isOTPScreenDisplayed()) {
                await loginPage.enterOTP(creds.otpCode ?? '');
                await loginPage.verifyButton.click();
            }

            await loginPage.assertLoginSuccess();
        });
    });

    // ── Password Visibility Scenarios ─────────────────────────────────────────

    test.describe('Password Visibility Scenarios', () => {
        const creds = dataSets.find(d => d.type === 'positive')!;

        test('Merchant - Verify that the text inside the password field is masked by default', async ({ page }) => {
            test.skip(creds.execute === false, 'disabled in test data');

            const loginPage = new LoginPage(page);
            await loginPage.navigate();
            await loginPage.passwordInput.fill('DummyPassword123!');
            expect(await loginPage.isPasswordMasked()).toBeTruthy();
        });

        test('Merchant - Show the password', async ({ page }) => {
            test.skip(creds.execute === false, 'disabled in test data');

            const loginPage = new LoginPage(page);
            await loginPage.navigate();
            await loginPage.passwordInput.fill('DummyPassword123!');
            expect(await loginPage.isPasswordMasked()).toBeTruthy();
            await loginPage.togglePasswordVisibility();
            expect(await loginPage.isPasswordVisible()).toBeTruthy();
        });

        test('Merchant - Hide the password', async ({ page }) => {
            test.skip(creds.execute === false, 'disabled in test data');

            const loginPage = new LoginPage(page);
            await loginPage.navigate();
            await loginPage.passwordInput.fill('DummyPassword123!');
            await loginPage.togglePasswordVisibility();
            expect(await loginPage.isPasswordVisible()).toBeTruthy();
            await loginPage.togglePasswordVisibility();
            expect(await loginPage.isPasswordMasked()).toBeTruthy();
        });
    });
});
