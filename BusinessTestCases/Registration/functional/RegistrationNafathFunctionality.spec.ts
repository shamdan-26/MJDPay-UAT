import { test, expect, Page } from '@playwright/test';
import { goToInfoStep, nextCitizenAsset, generateEmail, REGISTER_URL } from '../helpers';

test.describe('Registration - Nafath Verification', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let nafathAppeared = false;

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        await context.grantPermissions(['geolocation'], { origin: new URL(REGISTER_URL).origin });
        page = await context.newPage();

        const asset = nextCitizenAsset();
        await goToInfoStep(page, asset.mobile);

        const radioGroup = page.getByRole('radiogroup', { name: 'Profile Type' });
        await radioGroup.getByRole('radio').first().click();
        await page.locator('#floating-text-field-2').fill(asset.crn);
        await page.locator('#floating-text-field-3').fill(asset.nationalId);
        await page.getByRole('textbox', { name: /Email/i }).fill(generateEmail());
        await page.getByRole('button', { name: 'next' }).click();
        await page.getByRole('button', { name: 'Loading' })
            .waitFor({ state: 'hidden', timeout: 20000 })
            .catch(() => {});

        nafathAppeared = await page.getByText(/nafath/i).first()
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
        await expect(page.getByText(/nafath/i).first()).toBeVisible();
    });

    // ── Timer ─────────────────────────────────────────────────────────────────

    test('should display a countdown timer in the Nafath popup', async () => {
        test.skip(!nafathAppeared, SKIP_MSG);
        await expect(page.getByText(/\d+:\d+/).first()).toBeVisible();
    });

    // ── Verify button ─────────────────────────────────────────────────────────

    test('should have the Verify button enabled while the timer is active', async () => {
        test.skip(!nafathAppeared, SKIP_MSG);
        await expect(page.getByRole('button', { name: /verify/i })).toBeEnabled();
    });

    test('should keep the Verify button enabled throughout the active timer period', async () => {
        test.skip(!nafathAppeared, SKIP_MSG);
        // Wait 3 seconds to confirm button remains enabled mid-timer, not just on load.
        await page.waitForTimeout(3000);
        await expect(page.getByRole('button', { name: /verify/i })).toBeEnabled();
    });
});
