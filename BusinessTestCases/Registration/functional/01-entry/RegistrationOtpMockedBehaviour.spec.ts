import { test, expect } from '@playwright/test';
import { fillOTP, goToOtpDialogMocked, mockOtpRequired, OTP_OK, OTP_NOT_VALID, apiError } from '../../RegistrationHelper';

// ─────────────────────────────────────────────────────────────────────────────
// OTP behaviour with the backend mocked. Dev now issues real 30s OTPs, so the
// failure modes below (expiry, lockout, server error, replay) cannot be driven
// live; here the gateway replies are scripted and only the UI is under test.
// No pool identity is consumed.
// ─────────────────────────────────────────────────────────────────────────────
const OTP_HEADING = /Enter OTP|أدخل رمز التحقق/i;
const VERIFY_BTN  = /Verify|تحقق/i;
const OTP_BOX     = { name: 'One time password input' };

test.describe('Registration – OTP behaviour (mocked backend)', { tag: ['@registration', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test('should send the typed code together with the requestId issued for the mobile', async ({ page }) => {
        const mocks = await mockOtpRequired(page, () => OTP_NOT_VALID);
        const mobile = await goToOtpDialogMocked(page);
        await fillOTP(page, '123456');
        await page.getByRole('button', { name: VERIFY_BTN }).click();
        await expect.poll(() => mocks.verifyCalls.length).toBe(1);
        expect(mocks.verifyCalls[0]).toMatchObject({ otp: '123456', requestId: 'mock-request-1' });
        expect(mocks.verifyCalls[0].mobileNumber).toContain(mobile);
    });

    test('should stay on the OTP dialog and allow another attempt after a wrong code', async ({ page }) => {
        await mockOtpRequired(page, () => OTP_NOT_VALID);
        await goToOtpDialogMocked(page);
        await fillOTP(page, '111111');
        await page.getByRole('button', { name: VERIFY_BTN }).click();
        await expect(page.getByRole('heading', { name: OTP_HEADING })).toBeVisible();
        await expect(page.getByRole('textbox', OTP_BOX).first()).toBeEnabled();
    });

    test('should advance to Business Info when the second attempt is correct', async ({ page }) => {
        const mocks = await mockOtpRequired(page, attempt => (attempt === 1 ? OTP_NOT_VALID : OTP_OK));
        await goToOtpDialogMocked(page);
        await fillOTP(page, '111111');
        await page.getByRole('button', { name: VERIFY_BTN }).click();
        await expect(page.getByRole('heading', { name: OTP_HEADING })).toBeVisible();
        // The dialog keeps the failed digits; retype the whole code.
        for (const box of await page.getByRole('textbox', OTP_BOX).all()) await box.fill('');
        await fillOTP(page, '222222');
        await page.getByRole('button', { name: VERIFY_BTN }).click();
        await expect(page.locator('#register-profile-card-MERCHANT')).toBeVisible({ timeout: 30000 });
        expect(mocks.verifyCalls).toHaveLength(2);
    });

    test('should not advance when the OTP has expired', async ({ page }) => {
        await mockOtpRequired(page, () => apiError(400, 'OTP_EXPIRED'));
        await goToOtpDialogMocked(page);
        await fillOTP(page, '123456');
        await page.getByRole('button', { name: VERIFY_BTN }).click();
        await expect(page.getByRole('heading', { name: OTP_HEADING })).toBeVisible();
        await expect(page.locator('#register-profile-card-MERCHANT')).toHaveCount(0);
    });

    test('should not advance when too many wrong attempts lock the request', async ({ page }) => {
        await mockOtpRequired(page, attempt => (attempt >= 3 ? apiError(423, 'OTP_MAX_ATTEMPTS_EXCEEDED') : OTP_NOT_VALID));
        await goToOtpDialogMocked(page);
        for (let i = 0; i < 3; i++) {
            for (const box of await page.getByRole('textbox', OTP_BOX).all()) await box.fill('');
            await fillOTP(page, '111111');
            await page.getByRole('button', { name: VERIFY_BTN }).click();
            await page.waitForTimeout(300);
        }
        await expect(page.locator('#register-profile-card-MERCHANT')).toHaveCount(0);
        await expect(page.getByRole('heading', { name: OTP_HEADING }).or(page.getByRole('textbox', { name: /Mobile number|رقم الجوال/ }))).toBeVisible();
    });

    test('should survive a server error on verify without leaving the OTP dialog or throwing', async ({ page }) => {
        const pageErrors: string[] = [];
        page.on('pageerror', e => pageErrors.push(e.message));
        await mockOtpRequired(page, () => apiError(500, 'INTERNAL_ERROR'));
        await goToOtpDialogMocked(page);
        await fillOTP(page, '123456');
        await page.getByRole('button', { name: VERIFY_BTN }).click();
        await expect(page.getByRole('heading', { name: OTP_HEADING })).toBeVisible();
        expect(pageErrors).toHaveLength(0);
    });

    test('should send only one verify request when Verify is double-clicked', async ({ page }) => {
        const mocks = await mockOtpRequired(page, () => OTP_OK);
        await goToOtpDialogMocked(page);
        await fillOTP(page, '123456');
        await page.getByRole('button', { name: VERIFY_BTN }).dblclick();
        await expect(page.locator('#register-profile-card-MERCHANT')).toBeVisible({ timeout: 30000 });
        expect(mocks.verifyCalls).toHaveLength(1);
    });

    test('should fill every box when a full code is pasted into the first one', async ({ page }) => {
        await mockOtpRequired(page, () => OTP_NOT_VALID);
        await goToOtpDialogMocked(page);
        const boxes = page.getByRole('textbox', OTP_BOX);
        const n = await boxes.count();
        const code = '987654'.slice(0, n).padEnd(n, '1');
        await boxes.first().focus();
        await page.evaluate(text => {
            const el = document.activeElement as HTMLInputElement;
            const data = new DataTransfer();
            data.setData('text/plain', text);
            el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
        }, code);
        const values = await boxes.evaluateAll(els => els.map(e => (e as HTMLInputElement).value).join(''));
        expect(values).toBe(code);
    });

    test('should move focus back to the previous box on Backspace in an empty box', async ({ page }) => {
        await mockOtpRequired(page, () => OTP_NOT_VALID);
        await goToOtpDialogMocked(page);
        const boxes = page.getByRole('textbox', OTP_BOX);
        await boxes.nth(0).pressSequentially('1', { delay: 50 });
        await expect(boxes.nth(1)).toBeFocused();
        await page.keyboard.press('Backspace');
        await expect(boxes.nth(0)).toBeFocused();
    });

    test('should request a new code (not reuse the old requestId) when Resend is used', async ({ page }) => {
        test.setTimeout(120_000);
        const mocks = await mockOtpRequired(page, () => OTP_NOT_VALID);
        await goToOtpDialogMocked(page);
        const resend = page.getByRole('button', { name: /Click to resend|انقر لإعادة الإرسال/i });
        await expect(resend).toBeEnabled({ timeout: 60000 });
        await resend.click();
        await expect.poll(() => mocks.resendCalls.count).toBe(1);
        await fillOTP(page, '123456');
        await page.getByRole('button', { name: VERIFY_BTN }).click();
        await expect.poll(() => mocks.verifyCalls.length).toBeGreaterThan(0);
        expect(mocks.verifyCalls[0].requestId, 'verify still used the first requestId after Resend').toBe('mock-resend-1');
    });
});
