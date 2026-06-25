import { test, expect } from '@playwright/test';
import { goToInfoStep } from '../helpers';

// ─── helpers ─────────────────────────────────────────────────────────────────

async function fillBusinessInfoAndClickNext(page: any) {
    await page.getByRole('radio').filter({ hasText: /merchant/i }).click();
    await page.getByRole('textbox', { name: /unified number/i }).fill('1023456789');
    await page.getByRole('textbox', { name: /national id|iqama/i }).fill('1012345678');
    await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('textbox', { name: /monthly expected number/i }).waitFor({ state: 'visible', timeout: 15000 });
}

// ─── tests ───────────────────────────────────────────────────────────────────

test.describe('Registration – Business Info Form Functionality', () => {
    test.describe.configure({ mode: 'serial' });

    // ── Tab 1 → Tab 2 transition ──────────────────────────────────────────────

    test.describe('After clicking Next on Business Info (Tab 1 → Tab 2)', () => {

        test.beforeEach(async ({ page, context }) => {
            await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
            await goToInfoStep(page);
        });

        test('should activate the Financial & Business tab after clicking Next with valid data', async ({ page }) => {
            await fillBusinessInfoAndClickNext(page);
            await expect(page.getByRole('tab', { name: /financial/i }))
                .toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
        });

        test('should deactivate the Business Info tab after advancing', async ({ page }) => {
            await fillBusinessInfoAndClickNext(page);
            await expect(page.getByRole('tab', { name: /business info/i }))
                .not.toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
        });

        test('should stay on the same URL after clicking Next', async ({ page }) => {
            await fillBusinessInfoAndClickNext(page);
            expect(page.url()).toContain('/business/auth/register');
        });

        test('should display the Monthly Expected Number Of Bills field on Tab 2', async ({ page }) => {
            await fillBusinessInfoAndClickNext(page);
            await expect(page.getByRole('textbox', { name: /monthly expected number/i })).toBeVisible();
        });

        test('should display the Banks dropdown on Tab 2', async ({ page }) => {
            await fillBusinessInfoAndClickNext(page);
            await expect(page.getByRole('combobox', { name: /banks/i })).toBeVisible();
        });

        test('should display the Next button on Tab 2', async ({ page }) => {
            await fillBusinessInfoAndClickNext(page);
            await expect(page.getByRole('button', { name: /next/i })).toBeVisible();
        });

        test('should display the Back button on Tab 2', async ({ page }) => {
            await fillBusinessInfoAndClickNext(page);
            await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
        });
    });

    // ── Back navigation from Tab 2 → Tab 1 ───────────────────────────────────

    test.describe('Back navigation from Financial & Business to Business Info', () => {

        test.beforeEach(async ({ page, context }) => {
            await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
            await goToInfoStep(page);
            await fillBusinessInfoAndClickNext(page);
        });

        test('should return to Business Info tab when Back is clicked from Tab 2', async ({ page }) => {
            await page.getByRole('button', { name: /back/i }).click();
            await expect(page.getByRole('tab', { name: /business info/i }))
                .toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
        });

        test('should restore the email field when returning to Tab 1 via Back', async ({ page }) => {
            await page.getByRole('button', { name: /back/i }).click();
            await expect(page.getByRole('textbox', { name: /email/i }))
                .toHaveValue('test@example.com', { timeout: 10000 });
        });

        test('should restore the Unified Number when returning to Tab 1 via Back', async ({ page }) => {
            await page.getByRole('button', { name: /back/i }).click();
            await expect(page.getByRole('textbox', { name: /unified number/i }))
                .toHaveValue('1023456789', { timeout: 10000 });
        });

        test('should restore the National ID when returning to Tab 1 via Back', async ({ page }) => {
            await page.getByRole('button', { name: /back/i }).click();
            await expect(page.getByRole('textbox', { name: /national id|iqama/i }))
                .toHaveValue('1012345678', { timeout: 10000 });
        });

        test('should allow re-advancing to Tab 2 after going Back to Tab 1', async ({ page }) => {
            await page.getByRole('button', { name: /back/i }).click();
            await page.getByRole('button', { name: /next/i }).click();
            await expect(page.getByRole('tab', { name: /financial/i }))
                .toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
        });
    });

    // ── Tab 1 field validation ────────────────────────────────────────────────

    test.describe('Business Info field validation before Next', () => {

        test.beforeEach(async ({ page, context }) => {
            await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
            await goToInfoStep(page);
        });

        test('should keep Next disabled when only Profile Type is selected', async ({ page }) => {
            await page.getByRole('radio').filter({ hasText: /merchant/i }).click();
            await expect(page.getByRole('button', { name: /next/i })).toBeDisabled();
        });

        test('should keep Next disabled when Profile Type + Unified Number are filled', async ({ page }) => {
            await page.getByRole('radio').filter({ hasText: /merchant/i }).click();
            await page.getByRole('textbox', { name: /unified number/i }).fill('1023456789');
            await expect(page.getByRole('button', { name: /next/i })).toBeDisabled();
        });

        test('should keep Next disabled when Profile Type + Unified Number + National ID are filled (no email)', async ({ page }) => {
            await page.getByRole('radio').filter({ hasText: /merchant/i }).click();
            await page.getByRole('textbox', { name: /unified number/i }).fill('1023456789');
            await page.getByRole('textbox', { name: /national id|iqama/i }).fill('1012345678');
            await expect(page.getByRole('button', { name: /next/i })).toBeDisabled();
        });

        test('should enable Next only after all four required fields are filled', async ({ page }) => {
            await page.getByRole('radio').filter({ hasText: /merchant/i }).click();
            await page.getByRole('textbox', { name: /unified number/i }).fill('1023456789');
            await page.getByRole('textbox', { name: /national id|iqama/i }).fill('1012345678');
            await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
            await expect(page.getByRole('button', { name: /next/i })).toBeEnabled();
        });

        test('should disable Next again after clearing the email field', async ({ page }) => {
            await page.getByRole('radio').filter({ hasText: /merchant/i }).click();
            await page.getByRole('textbox', { name: /unified number/i }).fill('1023456789');
            await page.getByRole('textbox', { name: /national id|iqama/i }).fill('1012345678');
            await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
            await expect(page.getByRole('button', { name: /next/i })).toBeEnabled();
            await page.getByRole('textbox', { name: /email/i }).clear();
            await expect(page.getByRole('button', { name: /next/i })).toBeDisabled();
        });

        test('should show a validation error when an invalid email is submitted', async ({ page }) => {
            await page.getByRole('radio').filter({ hasText: /merchant/i }).click();
            await page.getByRole('textbox', { name: /unified number/i }).fill('1023456789');
            await page.getByRole('textbox', { name: /national id|iqama/i }).fill('1012345678');
            await page.getByRole('textbox', { name: /email/i }).fill('bademail');
            await page.getByRole('button', { name: /next/i }).click({ force: true });
            const hasError = await page.locator('[class*="error"], [role="alert"]').isVisible().catch(() => false);
            const stillOnTab1 = await page.getByRole('tab', { name: /business info/i })
                .getAttribute('aria-selected').catch(() => 'false');
            expect(hasError || stillOnTab1 === 'true').toBeTruthy();
        });

        test('should not advance to Tab 2 if Next is clicked without filling fields', async ({ page }) => {
            await page.getByRole('button', { name: /next/i }).click({ force: true });
            const tab2Active = await page.getByRole('tab', { name: /financial/i })
                .getAttribute('aria-selected').catch(() => 'false');
            expect(tab2Active).not.toBe('true');
        });
    });

    // ── Profile Type switching ────────────────────────────────────────────────

    test.describe('Profile Type radio button switching', () => {

        test.beforeEach(async ({ page, context }) => {
            await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
            await goToInfoStep(page);
        });

        test('should switch from Merchant to Biller and reflect the change', async ({ page }) => {
            await page.getByRole('radio').filter({ hasText: /merchant/i }).click();
            await expect(page.getByRole('radio').filter({ hasText: /merchant/i })).toBeChecked();
            await page.getByRole('radio').filter({ hasText: /biller/i }).click();
            await expect(page.getByRole('radio').filter({ hasText: /biller/i })).toBeChecked();
            await expect(page.getByRole('radio').filter({ hasText: /merchant/i })).not.toBeChecked();
        });

        test('should switch from Biller back to Merchant', async ({ page }) => {
            await page.getByRole('radio').filter({ hasText: /biller/i }).click();
            await page.getByRole('radio').filter({ hasText: /merchant/i }).click();
            await expect(page.getByRole('radio').filter({ hasText: /merchant/i })).toBeChecked();
            await expect(page.getByRole('radio').filter({ hasText: /biller/i })).not.toBeChecked();
        });

        test('should allow advancing with Biller profile type selected', async ({ page }) => {
            await page.getByRole('radio').filter({ hasText: /biller/i }).click();
            await page.getByRole('textbox', { name: /unified number/i }).fill('1023456789');
            await page.getByRole('textbox', { name: /national id|iqama/i }).fill('1012345678');
            await page.getByRole('textbox', { name: /email/i }).fill('biller@example.com');
            await expect(page.getByRole('button', { name: /next/i })).toBeEnabled();
        });
    });

    // ── Tab indicator progression ─────────────────────────────────────────────

    test.describe('Step / tab indicator progression', () => {

        test.beforeEach(async ({ page, context }) => {
            await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
            await goToInfoStep(page);
        });

        test('should show Business Info tab as active on arrival', async ({ page }) => {
            await expect(page.getByRole('tab', { name: /business info/i }))
                .toHaveAttribute('aria-selected', 'true');
        });

        test('should show Financial tab as NOT active while on Tab 1', async ({ page }) => {
            const financialSelected = await page.getByRole('tab', { name: /financial/i })
                .getAttribute('aria-selected');
            expect(financialSelected).not.toBe('true');
        });

        test('should show Verification tab as NOT active while on Tab 1', async ({ page }) => {
            const verificationSelected = await page.getByRole('tab', { name: /verification/i })
                .getAttribute('aria-selected');
            expect(verificationSelected).not.toBe('true');
        });

        test('should display all three tabs at all times', async ({ page }) => {
            await expect(page.getByRole('tab', { name: /business info/i })).toBeVisible();
            await expect(page.getByRole('tab', { name: /financial/i })).toBeVisible();
            await expect(page.getByRole('tab', { name: /verification/i })).toBeVisible();
        });

        test('Financial tab should become active after clicking Next on Tab 1', async ({ page }) => {
            await fillBusinessInfoAndClickNext(page);
            await expect(page.getByRole('tab', { name: /financial/i }))
                .toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
        });
    });
});
