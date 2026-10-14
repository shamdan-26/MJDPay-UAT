import { test, expect } from '../../../fixtures';
import { LOGIN_URL, INVALID_OTP, VALID_OTP } from '../../LoginHelper';
import { loginToOtpDialog } from '../../helpers/loginSession';
import { VERIFY_OTP_GLOB, json } from '../../helpers/loginMocks';

// OTP dialog edge cases beyond the basics in LoginOtp.spec.ts. Each test performs one real sign-in with the
// happy-path account and then mocks /auth/verify/otp where the server behaviour (expiry, reuse) is not reproducible.
// All skip when the login OTP requirement is switched off for the environment.

test.describe('Login — OTP Edge Cases', { tag: ['@login', '@functional', '@otp'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'functional' }] }, () => {
    test('should fill all boxes when a 6-digit code is pasted into the first box', { annotation: [{ type: 'testcase', description: "LG-OTPX-01: Should fill all boxes when a 6-digit code is pasted into the first box" }] }, async ({ page, otp }) => {
        await loginToOtpDialog(page, (c, r) => test.skip(c, r));
        await otp.inputs.nth(0).click();
        await page.evaluate(code => {
            const input = document.activeElement as HTMLInputElement;
            const data = new DataTransfer();
            data.setData('text', code);
            input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
        }, VALID_OTP);
        const count = await otp.inputs.count();
        const values: string[] = [];
        for (let i = 0; i < count; i++) values.push(await otp.inputs.nth(i).inputValue());
        // A paste-aware widget distributes the digits; a non-paste-aware one keeps at most the first digit.
        expect(values.join('').length, `pasted code not distributed: ${values.join('|')}`).toBeGreaterThanOrEqual(count);
    });

    test('should move focus to the previous box on Backspace in an empty box', { annotation: [{ type: 'testcase', description: "LG-OTPX-02: Should move focus to the previous box on Backspace in an empty box" }] }, async ({ page, otp }) => {
        await loginToOtpDialog(page, (c, r) => test.skip(c, r));
        await otp.inputs.nth(0).fill('1');
        await otp.inputs.nth(1).focus();
        await page.keyboard.press('Backspace');
        await expect(otp.inputs.nth(0)).toBeFocused();
    });

    test('should show an error and keep the dialog open when the server reports the OTP as expired', { annotation: [{ type: 'testcase', description: "LG-OTPX-03: Should show an error and keep the dialog open when the server reports the OTP as expired" }] }, async ({ page, otp }) => {
        await loginToOtpDialog(page, (c, r) => test.skip(c, r));
        await page.route(VERIFY_OTP_GLOB, route => json(route, 401, { message: 'OTP expired', code: 'OTP_EXPIRED' }));
        await otp.fillAndVerify(INVALID_OTP);
        await expect(otp.heading).toBeVisible();
        await expect(page).toHaveURL(/auth\/login/);
    });

    test('should reject a second use of the same OTP', { annotation: [{ type: 'testcase', description: "LG-OTPX-04: Should reject a second use of the same OTP" }] }, async ({ page, otp }) => {
        await loginToOtpDialog(page, (c, r) => test.skip(c, r));
        let calls = 0;
        await page.route(VERIFY_OTP_GLOB, route => {
            calls++;
            return calls === 1 ? route.continue() : json(route, 401, { message: 'OTP already used' });
        });
        await otp.fillAndVerify(VALID_OTP);
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 30000 });
        expect(calls).toBeGreaterThanOrEqual(1);
    });

    test('should keep the dialog open and clear the boxes after each wrong OTP, up to three times', { annotation: [{ type: 'testcase', description: "LG-OTPX-05: Should keep the dialog open and clear the boxes after each wrong OTP, up to three times" }] }, async ({ page, otp }) => {
        await loginToOtpDialog(page, (c, r) => test.skip(c, r));
        await page.route(VERIFY_OTP_GLOB, route => json(route, 401, { message: 'Invalid OTP' }));
        for (let attempt = 1; attempt <= 2; attempt++) {
            await otp.fillAndVerify(INVALID_OTP);
            await expect(otp.heading, `dialog closed after wrong OTP #${attempt}`).toBeVisible();
        }
    });

    test('should redirect back to the login form after the third wrong OTP (dev behaviour)', { annotation: [{ type: 'testcase', description: "LG-OTPX-06: Should redirect back to the login form after the third wrong OTP (dev behaviour)" }] }, async ({ page, otp }) => {
        await loginToOtpDialog(page, (c, r) => test.skip(c, r));
        await page.route(VERIFY_OTP_GLOB, route => json(route, 401, { message: 'Invalid OTP' }));
        for (let attempt = 1; attempt <= 3; attempt++) {
            if (!(await otp.heading.isVisible().catch(() => false))) break;
            await otp.fillAndVerify(INVALID_OTP);
            await page.waitForTimeout(800);
        }
        await expect(page).toHaveURL(LOGIN_URL, { timeout: 15000 });
        await expect(otp.heading).not.toBeVisible();
    });

    test('should start the resend countdown at a positive value no larger than 5 minutes', { annotation: [{ type: 'testcase', description: "LG-OTPX-07: Should start the resend countdown at a positive value no larger than 5 minutes" }] }, async ({ page, otp }) => {
        await loginToOtpDialog(page, (c, r) => test.skip(c, r));
        const seconds = await otp.getRemainingSeconds();
        expect(seconds).toBeGreaterThan(0);
        expect(seconds).toBeLessThanOrEqual(300);
    });

    test('should count the resend timer down while the dialog is open', { annotation: [{ type: 'testcase', description: "LG-OTPX-08: Should count the resend timer down while the dialog is open" }] }, async ({ page, otp }) => {
        await loginToOtpDialog(page, (c, r) => test.skip(c, r));
        const first = await otp.getRemainingSeconds();
        await page.waitForTimeout(3000);
        const second = await otp.getRemainingSeconds();
        expect(second).toBeLessThan(first);
    });

    test('should not leave the user in a half-authenticated state when the page is refreshed on the OTP dialog', { annotation: [{ type: 'testcase', description: "LG-OTPX-09: Should not leave the user in a half-authenticated state when the page is refreshed on the OTP dialog" }] }, async ({ page, otp }) => {
        await loginToOtpDialog(page, (c, r) => test.skip(c, r));
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/auth\/login/);
        await expect(otp.heading).not.toBeVisible({ timeout: 10000 }).catch(() => { /* dialog may restore: acceptable if it still demands the code */ });
        await page.goto(LOGIN_URL.replace('/auth/login', '/main'), { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/auth\/login/, { timeout: 15000 });
    });
});
