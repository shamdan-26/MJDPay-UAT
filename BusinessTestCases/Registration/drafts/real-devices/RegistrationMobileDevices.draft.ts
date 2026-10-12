// DRAFT — unverified, not run by the suite. Promote by renaming to .spec.ts and moving to Registration/ui/shared/.
//
// Device-emulated checks for the steps reachable without a real OTP (Mobile, OTP dialog, Business Info). Emulation
// covers viewport, touch, user agent and pixel ratio — NOT the real on-screen keyboard or SMS autofill; those stay in
// the manual checklist (devices.md). WebKit needs `npx playwright install webkit` and the WebKit project from
// playwright.config.ts (CROSS_BROWSER=1).
//
// Prerequisites: none beyond the mock helpers. Assumptions: autocomplete/inputmode attributes are the app's contract.
import { test, expect, devices } from '@playwright/test';
import { REGISTER_URL, goToInfoStepMocked, goToOtpDialogMocked, mockOtpRequired, OTP_NOT_VALID, generateKSAMobile } from '../../RegistrationHelper';

const DEVICES = ['iPhone 14', 'Pixel 7', 'Galaxy S9+', 'iPad (gen 7)'] as const;

for (const name of DEVICES) {
    test.describe(`Registration – ${name} (DRAFT)`, { tag: ['@registration', '@ui', '@devices'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'ui' }] }, () => {
        const { defaultBrowserType: _browser, ...device } = devices[name]; // defaultBrowserType cannot be set inside a describe
        test.use(device);

        test('mobile step: numeric input, tap target size and no horizontal scroll', async ({ page }) => {
            await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
            const input = page.getByRole('textbox', { name: /Mobile number|رقم الجوال/ });
            await expect(input).toHaveAttribute('inputmode', /numeric|tel/);
            const next = page.getByRole('button', { name: /next|التالي/i });
            const box = await next.boundingBox();
            expect(box!.height, 'Next tap target < 44px').toBeGreaterThanOrEqual(44);
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
            expect(overflow).toBeLessThanOrEqual(1);
        });

        test('mobile step: tapping Next advances with touch events', async ({ page }) => {
            await mockOtpRequired(page, () => OTP_NOT_VALID);
            await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.getByRole('textbox', { name: /Mobile number|رقم الجوال/ }).fill(generateKSAMobile());
            await page.getByRole('button', { name: /next|التالي/i }).tap();
            await expect(page.getByRole('heading', { name: /Enter OTP|أدخل رمز التحقق/i })).toBeVisible({ timeout: 20000 });
        });

        test('OTP dialog: one-time-code autofill hint and all boxes inside the viewport', async ({ page }) => {
            await mockOtpRequired(page, () => OTP_NOT_VALID);
            await goToOtpDialogMocked(page);
            const boxes = page.getByRole('textbox', { name: 'One time password input' });
            const first = boxes.first();
            // SMS autofill needs autocomplete="one-time-code" on (at least) the first box
            await expect(first).toHaveAttribute('autocomplete', 'one-time-code');
            const vw = page.viewportSize()!.width;
            for (const b of await boxes.all()) {
                const bb = await b.boundingBox();
                expect(bb!.x).toBeGreaterThanOrEqual(0);
                expect(bb!.x + bb!.width).toBeLessThanOrEqual(vw + 1);
            }
        });

        test('Business Info: all controls reachable by scrolling and Next is not hidden behind the footer', async ({ page }) => {
            test.setTimeout(90_000);
            await goToInfoStepMocked(page);
            const next = page.locator('#register-next-button');
            await next.scrollIntoViewIfNeeded();
            await expect(next).toBeVisible();
            const box = await next.boundingBox();
            expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height + (await page.evaluate(() => window.scrollY)) + 1);
        });

        test('Arabic RTL has no overflow at this width', async ({ page }) => {
            await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.getByRole('button', { name: 'العربية' }).tap();
            await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
            expect(overflow).toBeLessThanOrEqual(1);
        });
    });
}
