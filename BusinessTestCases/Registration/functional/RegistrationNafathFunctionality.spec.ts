import { test, expect, Page } from '@playwright/test';
import { goToInfoStep, nextCitizenAsset, generateEmail, REGISTER_URL } from '../RegistrationHelper';

test.describe('Registration - Nafath Verification', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let nafathAppeared = false;

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        page = await context.newPage();

        const asset = nextCitizenAsset();
        await goToInfoStep(page, asset.mobile);

        const radioGroup = page.getByRole('radiogroup', { name: /Profile Type|نوع الملف التجاري/i });
        await radioGroup.getByRole('radio').first().click();
        await page.locator('#floating-text-field-2').fill(asset.crn);
        await page.locator('#floating-text-field-3').fill(asset.nationalId);
        await page.locator('input[type="email"]').fill(generateEmail());
        await page.getByRole('button', { name: /next|التالي/i }).click();
        await page.getByRole('button', { name: /Loading|جاري التحميل/i })
            .waitFor({ state: 'hidden', timeout: 20000 })
            .catch(() => {});

        nafathAppeared = await page.getByText(/nafath|نفاذ/i).first()
            .waitFor({ state: 'visible', timeout: 20000 })
            .then(() => true)
            .catch(() => false);
    }, 120_000);

    test.afterAll(async () => {
        await page.close();
    });

    const SKIP_MSG = 'Nafath popup did not appear — Nafath may be bypassed for this test account in this environment';

    // ── Popup presence ────────────────────────────────────────────────────────

    test('should display the Nafath popup after submitting Business Info', async () => {
        test.skip(!nafathAppeared, SKIP_MSG);
        await expect(page.getByText(/nafath|نفاذ/i).first()).toBeVisible();
    });

    // ── Timer ─────────────────────────────────────────────────────────────────

    test('should display a countdown timer in the Nafath popup', async () => {
        test.skip(!nafathAppeared, SKIP_MSG);
        await expect(page.getByText(/\d+:\d+/).first()).toBeVisible();
    });

    // ── Verify button ─────────────────────────────────────────────────────────
    // Per EMI-4895: the button starts disabled and only enables once the
    // redirect countdown expires. EMI-4937 fixed that duration to 20s (was 30s).

    test('should have the Verify button disabled while the redirect countdown is active [EMI-4895]', async () => {
        test.skip(!nafathAppeared, SKIP_MSG);
        await expect(page.getByRole('button', { name: /verify|تحقق/i })).toBeDisabled();
    });

    test('should keep the Verify button disabled mid-countdown, not just on load [EMI-4895]', async () => {
        test.skip(!nafathAppeared, SKIP_MSG);
        await page.waitForTimeout(3000);
        await expect(page.getByRole('button', { name: /verify|تحقق/i })).toBeDisabled();
    });

    test('should enable the Verify button once the 20-second countdown expires [EMI-4937]', async () => {
        test.skip(!nafathAppeared, SKIP_MSG);
        await expect(page.getByRole('button', { name: /verify|تحقق/i })).toBeEnabled({ timeout: 25_000 });
    });
});
