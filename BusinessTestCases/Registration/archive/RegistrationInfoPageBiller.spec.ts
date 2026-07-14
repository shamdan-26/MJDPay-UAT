import { test, expect, Page, Browser } from '@playwright/test';
import { goToInfoStep, REGISTER_URL, RESIDENT_ASSETS, generateEmail } from '../RegistrationHelper';

async function navigateToInfoStep(browser: Browser, workerIndex: number): Promise<Page> {
    const context = await browser.newContext();
    const origin = new URL(REGISTER_URL).origin;
    const page: Page = await context.newPage();
    const asset = RESIDENT_ASSETS[workerIndex % RESIDENT_ASSETS.length];
    await goToInfoStep(page, asset.mobile);
    await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 15000 });
    return page;
}

// ─────────────────────────────────────────────────────────────────────────────
// Archived – Biller test cases from RegistrationInfoPage
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Registration - Info Page (Biller – Archived)', () => {

    // ── Element Visibility ────────────────────────────────────────────────────

    test.describe('Element Visibility – Biller', () => {
        test.describe.configure({ mode: 'serial' });

        let page: Page;

        test.beforeAll(async ({ browser }, workerInfo) => {
            test.setTimeout(120_000);
            page = await navigateToInfoStep(browser, workerInfo.workerIndex);
        });

        test.afterAll(async () => { await page.close(); });

        test('should display the Biller radio option [ref_31]', async () => {
            await expect(page.locator('#register-profile-card-BILLER')).toBeVisible();
        });

        test('should display the Biller label and description [ref_32, ref_33]', async () => {
            await expect(page.locator('#register-profile-card-BILLER .mp-rc-title'))
                .toContainText('Biller');
            await expect(page.locator('#register-profile-card-BILLER .mp-rc-sub'))
                .toContainText('Issue and collect bills from your customers.');
        });
    });

    // ── Field Interactions ────────────────────────────────────────────────────

    test.describe('Field Interactions – Biller', () => {

        let currentAsset: typeof RESIDENT_ASSETS[number];

        test.beforeEach(async ({ page, context }, testInfo) => {
            test.setTimeout(120_000);
            currentAsset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
            const origin = new URL(REGISTER_URL).origin;
            await goToInfoStep(page, currentAsset.mobile);
            await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 15000 });
        });

        test('should allow selecting Biller profile type [ref_31]', async ({ page }) => {
            await page.locator('#register-profile-card-BILLER').click();
            await expect(page.locator('#register-profile-card-BILLER'))
                .toHaveAttribute('aria-checked', 'true');
        });

        test('should only allow one profile type selected at a time', async ({ page }) => {
            await page.locator('#register-profile-card-MERCHANT').click();
            await page.locator('#register-profile-card-BILLER').click();
            await expect(page.locator('#register-profile-card-MERCHANT'))
                .toHaveAttribute('aria-checked', 'false');
            await expect(page.locator('#register-profile-card-BILLER'))
                .toHaveAttribute('aria-checked', 'true');
        });
    });
});
