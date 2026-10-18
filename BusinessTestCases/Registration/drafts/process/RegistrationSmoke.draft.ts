// DRAFT — unverified, not run by the suite. Promote by renaming to .spec.ts and moving to Registration/functional/journeys/.
//
// Smoke tier: five fast checks proving the registration wizard is alive after a deploy. See drafts/process/smoke-tier.md.
// Four are mock-driven (no backend), one is a single real gateway call.
import { test, expect } from '@playwright/test';
import { REGISTER_URL, goToInfoStepMocked, goToFinancialStepMocked, postRegistration, toApiMobile, generateFreshKSAMobile } from '../../helpers/RegistrationHelper';

test.describe('Registration – smoke (DRAFT)', { tag: ['@registration', '@smoke'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'smoke' }] }, () => {
    test.beforeEach(() => { test.setTimeout(60_000); });

    test('registration page loads with title, logo and the mobile field', async ({ page }) => {
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await expect(page).toHaveTitle('EMI - Business');
        await expect(page.locator('img[alt="MJD Pay"]').first()).toBeVisible();
        await expect(page.getByRole('textbox', { name: /Mobile number|رقم الجوال/ })).toBeVisible();
    });

    test('mobile step reaches Business Info with profile cards', async ({ page }) => {
        await goToInfoStepMocked(page);
        await expect(page.locator('#register-profile-card-MERCHANT')).toBeVisible();
    });

    test('Business Info reaches Financial & Business', async ({ page }) => {
        await goToFinancialStepMocked(page);
        await expect(page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i })).toBeVisible();
    });

    test('language and theme controls work', async ({ page }) => {
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.getByRole('button', { name: 'العربية' }).click();
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        const before = await page.locator('body').getAttribute('class');
        await page.getByRole('button', { name: 'Switch theme' }).click();
        await expect.poll(() => page.locator('body').getAttribute('class')).not.toBe(before);
    });

    test('the gateway answers a real OTP request with a requestId', async ({ request }) => {
        const res = await postRegistration(request, '/register/mobile/otp', { mobileNumber: toApiMobile(generateFreshKSAMobile()) });
        expect(res.status()).toBe(200);
        expect(await res.json()).toHaveProperty('requestId');
    });
});
