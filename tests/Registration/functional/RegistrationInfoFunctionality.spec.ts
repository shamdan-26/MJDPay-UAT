import { test, expect } from '@playwright/test';
import { goToInfoStep, nextResidentAsset, generateEmail } from '../helpers';

// ─── helpers ─────────────────────────────────────────────────────────────────

async function fillBusinessInfoAndClickNext(page: any) {
    const asset  = nextResidentAsset();
    const radios = page.getByRole('radio');
    await radios.first().waitFor({ state: 'visible', timeout: 10000 });
    const count = await radios.count();
    await radios.nth(Math.floor(Math.random() * count)).click();
    await page.locator('#floating-text-field-2').fill(asset.crn);
    await page.locator('#floating-text-field-3').fill(asset.nationalId);
    await page.locator('#floating-email-email-4').fill(generateEmail());
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
            await expect(page.locator('#register-form-title.form-title'))
                .toContainText(/financial/i, { timeout: 10000 });
        });

        test('should stay on the same URL after clicking Next', async ({ page }) => {
            await fillBusinessInfoAndClickNext(page);
            expect(page.url()).toContain('/business/auth/register');
        });

        test('should display the Monthly Expected Number Of Bills field on Tab 2', async ({ page }) => {
            await fillBusinessInfoAndClickNext(page);
            await expect(page.getByRole('textbox', { name: /monthly expected number/i })).toBeVisible();
        });

        test('should display the Banks, Industries, and Annual Income dropdowns on Tab 2', async ({ page }) => {
            await fillBusinessInfoAndClickNext(page);
            await expect(page.locator('#floating-dropdown-banks-9')).toBeVisible();
            await expect(page.locator('#floating-dropdown-industries-10')).toBeVisible();
            await expect(page.locator('#floating-dropdown-annual-income-11')).toBeVisible();
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

        test('should return to Business Info step when Back is clicked from Tab 2', async ({ page }) => {
            await page.getByRole('button', { name: /back/i }).click();
            await expect(page.locator('.mp-step.is-active').first())
                .toContainText('Business Info', { timeout: 10000 });
        });

        test('should restore the email field when returning to Tab 1 via Back', async ({ page }) => {
            await page.getByRole('button', { name: /back/i }).click();
            await expect(page.locator('#floating-email-email-4'))
                .not.toHaveValue('', { timeout: 10000 });
        });

        test('should restore the Unified Number when returning to Tab 1 via Back', async ({ page }) => {
            await page.getByRole('button', { name: /back/i }).click();
            await expect(page.locator('#floating-text-field-2'))
                .not.toHaveValue('', { timeout: 10000 });
        });

        test('should restore the National ID when returning to Tab 1 via Back', async ({ page }) => {
            await page.getByRole('button', { name: /back/i }).click();
            await expect(page.locator('#floating-text-field-3'))
                .not.toHaveValue('', { timeout: 10000 });
        });

        test('should allow re-advancing to Tab 2 after going Back to Tab 1', async ({ page }) => {
            await page.getByRole('button', { name: /back/i }).click();
            await page.getByRole('button', { name: /next/i }).click();
            await expect(page.locator('#register-form-title.form-title'))
                .toContainText(/financial/i, { timeout: 10000 });
        });
    });

    // ── Tab 1 field validation ────────────────────────────────────────────────

    test.describe('Business Info field validation before Next', () => {

        test.beforeEach(async ({ page, context }) => {
            await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
            await goToInfoStep(page);
        });

        test('should keep Next disabled when no fields are filled', async ({ page }) => {
            await expect(page.getByRole('button', { name: /next/i })).toBeDisabled();
        });

        test('should keep Next disabled when only Profile Type is selected', async ({ page }) => {
            await page.getByRole('radio').filter({ hasText: /merchant/i }).click();
            await expect(page.getByRole('button', { name: /next/i })).toBeDisabled();
        });

        test('should keep Next disabled when Profile Type + Unified Number are filled', async ({ page }) => {
            await page.getByRole('radio').filter({ hasText: /merchant/i }).click();
            await page.locator('#floating-text-field-2').fill('1023456789');
            await expect(page.getByRole('button', { name: /next/i })).toBeDisabled();
        });

        test('should keep Next disabled when Profile Type + Unified Number + National ID are filled (no email)', async ({ page }) => {
            await page.getByRole('radio').filter({ hasText: /merchant/i }).click();
            await page.locator('#floating-text-field-2').fill('1023456789');
            await page.locator('#floating-text-field-3').fill('1012345678');
            await expect(page.getByRole('button', { name: /next/i })).toBeDisabled();
        });

        test('should keep Next disabled when all fields are filled except Profile Type', async ({ page }) => {
            await page.locator('#floating-text-field-2').fill('1023456789');
            await page.locator('#floating-text-field-3').fill('1012345678');
            await page.locator('#floating-email-email-4').fill('test@example.com');
            await expect(page.getByRole('button', { name: /next/i })).toBeDisabled();
        });

        test('should disable Next again after clearing the email field', async ({ page }) => {
            await page.getByRole('radio').filter({ hasText: /merchant/i }).click();
            await page.locator('#floating-text-field-2').fill('1023456789');
            await page.locator('#floating-text-field-3').fill('1012345678');
            await page.locator('#floating-email-email-4').fill('test@example.com');
            await expect(page.getByRole('button', { name: /next/i })).toBeEnabled();
            await page.locator('#floating-email-email-4').clear();
            await expect(page.getByRole('button', { name: /next/i })).toBeDisabled();
        });

        test('should show a validation error when an invalid email is submitted', async ({ page }) => {
            await page.getByRole('radio').filter({ hasText: /merchant/i }).click();
            await page.locator('#floating-text-field-2').fill('1023456789');
            await page.locator('#floating-text-field-3').fill('1012345678');
            await page.locator('#floating-email-email-4').fill('bademail');
            await page.locator('#floating-email-email-4').blur();
            await expect(page.locator('#error_email.text-danger'))
                .toBeVisible({ timeout: 5000 });
        });

        test('should not advance to Tab 2 if Next is clicked without filling fields', async ({ page }) => {
            await page.getByRole('button', { name: /next/i }).click({ force: true });
            await expect(page.locator('.mp-step.is-active').first())
                .toContainText('Business Info', { timeout: 5000 });
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
            await page.locator('#floating-text-field-2').fill('1023456789');
            await page.locator('#floating-text-field-3').fill('1012345678');
            await page.locator('#floating-email-email-4').fill('biller@example.com');
            await expect(page.getByRole('button', { name: /next/i })).toBeEnabled();
        });
    });

    // ── Step indicator progression ────────────────────────────────────────────

    test.describe('Step / tab indicator progression', () => {

        test.beforeEach(async ({ page, context }) => {
            await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
            await goToInfoStep(page);
        });

        test('should show NAFATH step as NOT active while on Tab 1', async ({ page }) => {
            await expect(page.locator('.mp-step.is-active').first())
                .not.toContainText('NAFATH');
        });

        test('NAFATH step should become active after completing Business Info', async ({ page }) => {
            await fillBusinessInfoAndClickNext(page);
            await expect(page.locator('.mp-step.is-active').first())
                .toContainText('NAFATH', { timeout: 10000 });
        });
    });
});
