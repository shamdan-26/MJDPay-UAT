import { test, expect, Page } from '@playwright/test';
import { goToInfoStep, REGISTER_URL, nextResidentAsset, generateEmail } from '../helpers';

async function navigateToFinancialTab(browser: any): Promise<Page> {
    const context = await browser.newContext();
    const origin = new URL(REGISTER_URL).origin;
    await context.grantPermissions(['geolocation'], { origin });
    const page: Page = await context.newPage();
    const asset = nextResidentAsset();
    await goToInfoStep(page, asset.mobile);
    const radios = page.getByRole('radio');
    await radios.first().waitFor({ state: 'visible', timeout: 10000 });
    await radios.first().click();
    await page.locator('#floating-text-field-2').fill(asset.crn);
    await page.locator('#floating-text-field-3').fill(asset.nationalId);
    await page.locator('#floating-email-email-4').fill(generateEmail());
    await page.getByRole('button', { name: 'next' }).click();
    await page.getByRole('button', { name: 'Loading' })
        .waitFor({ state: 'hidden', timeout: 20000 })
        .catch(() => {});
    await page.getByRole('textbox', { name: /monthly expected number/i })
        .waitFor({ state: 'visible', timeout: 30000 });
    return page;
}

// ─────────────────────────────────────────────────────────────────────────────
// Archived – Biller test case from RegistrationNafathPage
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Registration - NAFATH Step Page Elements (Biller – Archived)', () => {

    test.describe('Tab 1 — Business Info (completed state) – Biller [ref_31 – ref_33]', () => {
        test.describe.configure({ mode: 'serial' });

        let page: Page;

        test.beforeAll(async ({ browser }) => {
            test.setTimeout(120_000);
            page = await navigateToFinancialTab(browser);
            await page.getByRole('tab').nth(0).click();
            await page.locator('#floating-text-field-2').waitFor({ state: 'visible', timeout: 10000 });
        });

        test.afterAll(async () => { await page.close(); });

        test('should display the Biller radio option with description [ref_31 – ref_33]', async () => {
            await expect(page.locator('#register-profile-card-BILLER .mp-rc-title')).toContainText('Biller');
            await expect(page.locator('#register-profile-card-BILLER .mp-rc-sub'))
                .toContainText('Issue and collect bills from your customers.');
        });
    });
});
