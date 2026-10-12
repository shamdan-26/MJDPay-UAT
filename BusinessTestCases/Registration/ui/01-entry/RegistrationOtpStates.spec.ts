import { test, expect } from '@playwright/test';
import { fillOTP, goToOtpDialogMocked, mockOtpRequired, OTP_NOT_VALID } from '../../RegistrationHelper';

// OTP dialog — accessibility and state presentation, with the gateway mocked (no real OTP needed).
const OTP_BOX    = { name: 'One time password input' };
const VERIFY_BTN = /Verify|تحقق/i;

test.describe('Registration – OTP dialog states', { tag: ['@registration', '@entry', '@ui'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'ui' }] }, () => {
    test.beforeEach(async ({ page }) => {
        await mockOtpRequired(page, () => OTP_NOT_VALID);
        await goToOtpDialogMocked(page);
    });

    test('should show the dialog as a labelled modal', async ({ page }) => {
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveAccessibleName(/OTP|رمز/i);
    });

    test('should give every code box an accessible name and a numeric input mode', async ({ page }) => {
        const boxes = page.getByRole('textbox', OTP_BOX);
        const n = await boxes.count();
        expect(n).toBeGreaterThanOrEqual(4);
        for (let i = 0; i < n; i++) {
            await expect(boxes.nth(i)).toHaveAttribute('inputmode', /numeric|tel/);
            await expect(boxes.nth(i)).toHaveAttribute('maxlength', '1');
        }
    });

    test('should focus the first code box when the dialog opens', async ({ page }) => {
        await expect(page.getByRole('textbox', OTP_BOX).first()).toBeFocused();
    });

    test('should show the resend countdown as mm:ss and count down', async ({ page }) => {
        const timer = page.getByText(/\b\d{1,2}:\d{2}\b/).first();
        await expect(timer).toBeVisible();
        const first = await timer.textContent();
        await expect.poll(async () => timer.textContent(), { timeout: 5000 }).not.toBe(first);
    });

    test('should keep Verify disabled until every box is filled and enable it after', async ({ page }) => {
        const verify = page.getByRole('button', { name: VERIFY_BTN });
        await expect(verify).toBeDisabled();
        await fillOTP(page, '123456');
        await expect(verify).toBeEnabled();
    });

    test('should announce a wrong code to assistive technology', async ({ page }) => {
        await fillOTP(page, '111111');
        await page.getByRole('button', { name: VERIFY_BTN }).click();
        await expect(page.locator('[role="alert"], [aria-live="assertive"], [aria-live="polite"], .text-danger, mat-snack-bar-container').filter({ hasText: /\S/ }).first()).toBeVisible({ timeout: 10000 });
    });

    test('should accept only digits in a code box', async ({ page }) => {
        const first = page.getByRole('textbox', OTP_BOX).first();
        await first.pressSequentially('a', { delay: 30 });
        await expect(first).toHaveValue('');
        await first.pressSequentially('7', { delay: 30 });
        await expect(first).toHaveValue('7');
    });

    test('should render the dialog right-to-left in Arabic', async ({ page }) => {
        await page.getByRole('button', { name: 'العربية' }).click();
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('should keep the dialog inside a 375px viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 });
        const box = await page.getByRole('dialog').boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(375 + 1);
    });
});
