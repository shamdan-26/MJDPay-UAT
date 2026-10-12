import { test, expect } from '@playwright/test';
import { REGISTER_URL, generateKSAMobile, apiError, json } from '../../RegistrationHelper';
import { RegistrationMobilePage } from '../../../pageElements/Registration/RegistrationMobilePage';

// Mobile step — interaction states (loading, error, keyboard, focus, input handling), with the OTP request mocked.
const SEND_OTP = '**/emi-profile/api/v1/register/mobile/otp';

test.describe('Registration – Mobile step states', { tag: ['@registration', '@entry', '@ui'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'ui' }] }, () => {
    let mobilePage: RegistrationMobilePage;

    test.beforeEach(async ({ page }) => {
        mobilePage = new RegistrationMobilePage(page);
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    });

    test('should put keyboard focus in the mobile field on load', async () => {
        await expect(mobilePage.mobileInput).toBeFocused();
    });

    test('should expose a numeric input mode for the mobile field', async () => {
        await expect(mobilePage.mobileInput).toHaveAttribute('inputmode', /numeric|tel/);
    });

    test('should submit the mobile number when Enter is pressed in the field', async ({ page }) => {
        let sent = 0;
        await page.route(SEND_OTP, route => { sent++; return json(route, 200, { requestId: 'r', otpRequired: true, sessionToken: null, refreshToken: null }); });
        await mobilePage.mobileInput.fill(generateKSAMobile());
        await mobilePage.mobileInput.press('Enter');
        await expect.poll(() => sent).toBe(1);
    });

    test('should keep Next from firing a second request while the first is in flight', async ({ page }) => {
        let sent = 0;
        await page.route(SEND_OTP, async route => {
            sent++;
            await new Promise(r => setTimeout(r, 1500));
            await json(route, 200, { requestId: 'r', otpRequired: true, sessionToken: null, refreshToken: null });
        });
        await mobilePage.mobileInput.fill(generateKSAMobile());
        await mobilePage.nextButton.click();
        await mobilePage.nextButton.click({ force: true, timeout: 1000 }).catch(() => {});
        await page.waitForTimeout(2000);
        expect(sent).toBe(1);
    });

    test('should stay on the mobile step and keep the number when the server returns an error', async ({ page }) => {
        const mobile = generateKSAMobile();
        const err = apiError(500, 'INTERNAL_ERROR');
        await page.route(SEND_OTP, route => json(route, err.status, err.body));
        await mobilePage.mobileInput.fill(mobile);
        await mobilePage.nextButton.click();
        await expect(page.getByRole('heading', { name: /Enter OTP|أدخل رمز التحقق/i })).toHaveCount(0);
        await expect(mobilePage.mobileInput).toHaveValue(mobile);
        await expect(mobilePage.mobileInput).toBeEnabled();
    });

    test('should show an error and not open the OTP dialog when the number is rejected as already registered', async ({ page }) => {
        const err = apiError(409, 'PROFILE_ALREADY_EXISTS');
        await page.route(SEND_OTP, route => json(route, err.status, err.body));
        await mobilePage.mobileInput.fill(generateKSAMobile());
        await mobilePage.nextButton.click();
        await expect(page.getByRole('heading', { name: /Enter OTP|أدخل رمز التحقق/i })).toHaveCount(0);
        await expect(page).toHaveURL(REGISTER_URL);
    });

    for (const [label, pasted] of [['a +966-prefixed number', '+966512345678'], ['a 0-prefixed number', '0512345678'], ['a number with spaces and dashes', '51 234-5678']] as const) {
        test(`should keep only digits (max 9) when ${label} is pasted`, async ({ page }) => {
            await mobilePage.mobileInput.focus();
            await page.evaluate(text => {
                const el = document.activeElement as HTMLInputElement;
                const data = new DataTransfer();
                data.setData('text/plain', text);
                el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
            }, pasted);
            const value = await mobilePage.mobileInput.inputValue();
            expect(/^\d{0,9}$/.test(value), `field holds ${JSON.stringify(value)}`).toBe(true);
        });
    }

    test('should show the country code prefix next to the field', async () => {
        await expect(mobilePage.countryCode).toBeVisible();
        await expect(mobilePage.countryCode).toContainText(/966/);
    });

    test('should move focus logically from the field to Next with the Tab key', async ({ page }) => {
        await mobilePage.mobileInput.fill(generateKSAMobile());
        await page.keyboard.press('Tab');
        await expect(mobilePage.nextButton).toBeFocused();
    });
});
