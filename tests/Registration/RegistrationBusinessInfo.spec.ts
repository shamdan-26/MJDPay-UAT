import { test, expect } from '@playwright/test';
import { goToInfoStep } from './helpers';

test.describe('Registration – Business Info Step (Tab 1 of 3)', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
        await goToInfoStep(page);
        await page.locator('input[type="email"][aria-label="Email"]').waitFor({ state: 'visible', timeout: 15000 });
    });

    // ── Step header ───────────────────────────────────────────────────────────

    test('should display the "Create Account" heading', async ({ page }) => {
        await expect(page.locator('#register-form-eyebrow')).toBeVisible();
        await expect(page.locator('#register-form-eyebrow')).toContainText('Create Account');
    });

    test('should display the "Tell us about your business" sub-heading', async ({ page }) => {
        await expect(page.locator('#register-form-title')).toBeVisible();
        await expect(page.locator('#register-form-title')).toContainText('Tell us about your business');
    });

    test('should display the step indicator "Step 1 of 3"', async ({ page }) => {
        await expect(page.locator('#register-form-sub-title')).toBeVisible();
        await expect(page.locator('#register-form-sub-title')).toContainText('Step 1 of 3');
    });

    test('should display the progress tabs: Business Info, NAFATH, Products, Contract', async ({ page }) => {
        // The visual stepper wrapper
        const stepBar = page.locator('.mp-stepbar.mp-stepbar-global.mp-stepbar-inline');
        await expect(stepBar).toBeVisible();

        // Step 1 – Business Info (active by default)
        const step1 = stepBar.locator('.mp-step').nth(0);
        await expect(step1).toBeVisible();
        await expect(step1).toHaveClass(/is-active/);
        await expect(step1.locator('.mp-step-meta')).toContainText('Business Info');

        // Step 2 – NAFATH
        const step2 = stepBar.locator('.mp-step').nth(1);
        await expect(step2).toBeVisible();
        await expect(step2.locator('.mp-step-meta')).toContainText('NAFATH');

        // Step 3 – Products
        const step3 = stepBar.locator('.mp-step').nth(2);
        await expect(step3).toBeVisible();
        await expect(step3.locator('.mp-step-meta')).toContainText('Products');

        // Step 4 – Contract
        const step4 = stepBar.locator('.mp-step').nth(3);
        await expect(step4).toBeVisible();
        await expect(step4.locator('.mp-step-meta')).toContainText('Contract');
    });

    // ── Profile Type ──────────────────────────────────────────────────────────

    test('should display the Profile Type field', async ({ page }) => {
        await expect(page.locator('#register-profile-types .mp-field-label')).toBeVisible();
        await expect(page.locator('#register-profile-types .mp-field-label')).toContainText('Profile Type');
    });

    test('should display the Merchant option with description', async ({ page }) => {
        await expect(page.locator('#register-profile-card-MERCHANT')).toBeVisible();
        await expect(page.locator('#register-profile-card-MERCHANT .mp-rc-title')).toContainText('Merchant');
        await expect(page.locator('#register-profile-card-MERCHANT .mp-rc-sub')).toContainText('Accept payments and manage your store.');
    });

    test('should display the Biller option with description', async ({ page }) => {
        await expect(page.locator('#register-profile-card-BILLER')).toBeVisible();
        await expect(page.locator('#register-profile-card-BILLER .mp-rc-title')).toContainText('Biller');
        await expect(page.locator('#register-profile-card-BILLER .mp-rc-sub')).toContainText('Issue and collect bills from your customers.');
    });

    test('should display the Customer option with description', async ({ page }) => {
        await expect(page.locator('#register-profile-card-CUSTOMER')).toBeVisible();
        await expect(page.locator('#register-profile-card-CUSTOMER .mp-rc-title')).toContainText('Customer');
        await expect(page.locator('#register-profile-card-CUSTOMER .mp-rc-sub')).toContainText('Accept payments and manage your store.');
    });

    test('should display the Freelancer option with description', async ({ page }) => {
        await expect(page.locator('#register-profile-card-FREELANCER')).toBeVisible();
        await expect(page.locator('#register-profile-card-FREELANCER .mp-rc-title')).toContainText('Freelancer');
        await expect(page.locator('#register-profile-card-FREELANCER .mp-rc-sub')).toContainText('Accept payments and manage your store.');
    });

    test('should allow selecting Merchant profile type', async ({ page }) => {
        await page.locator('#register-profile-card-MERCHANT').click();
        await expect(page.locator('#register-profile-card-MERCHANT')).toHaveAttribute('aria-checked', 'true');
    });

    test('should allow selecting Biller profile type', async ({ page }) => {
        await page.locator('#register-profile-card-BILLER').click();
        await expect(page.locator('#register-profile-card-BILLER')).toHaveAttribute('aria-checked', 'true');
    });

    test('should allow selecting Customer profile type', async ({ page }) => {
        await page.locator('#register-profile-card-CUSTOMER').click();
        await expect(page.locator('#register-profile-card-CUSTOMER')).toHaveAttribute('aria-checked', 'true');
    });

    test('should allow selecting Freelancer profile type', async ({ page }) => {
        await page.locator('#register-profile-card-FREELANCER').click();
        await expect(page.locator('#register-profile-card-FREELANCER')).toHaveAttribute('aria-checked', 'true');
    });

    test('should only allow one profile type to be selected at a time', async ({ page }) => {
        await page.locator('#register-profile-card-MERCHANT').click();
        await page.locator('#register-profile-card-BILLER').click();
        await expect(page.locator('#register-profile-card-MERCHANT')).toHaveAttribute('aria-checked', 'false');
        await expect(page.locator('#register-profile-card-BILLER')).toHaveAttribute('aria-checked', 'true');
    });

    // ── Unified Number ────────────────────────────────────────────────────────

    test('should display the Unified Number field', async ({ page }) => {
        await expect(page.locator('#register-unifiedNumber-group')).toBeVisible();
        await expect(page.locator('label[for="register-unifiedNumber-input"]')).toContainText('unified number');
    });

    test('should show the correct placeholder for Unified Number', async ({ page }) => {
        await expect(page.locator('#register-unifiedNumber-group input[type="text"]')).toHaveAttribute('placeholder', 'Eg. 1023456789');
    });

    test('should accept input in the Unified Number field', async ({ page }) => {
        await page.locator('#register-unifiedNumber-group input[type="text"]').fill('1023456789');
        await expect(page.locator('#register-unifiedNumber-group input[type="text"]')).toHaveValue('1023456789');
    });

    // ── National ID / Iqama ───────────────────────────────────────────────────

    test('should display the National ID/Iqama field', async ({ page }) => {
        await expect(page.locator('#register-id-group')).toBeVisible();
        await expect(page.locator('label[for="register-id-input"]')).toContainText('National ID/Iqama');
    });

    test('should show the correct placeholder for National ID/Iqama', async ({ page }) => {
        await expect(page.locator('#register-id-group input[type="text"]')).toHaveAttribute('placeholder', 'Eg. 1012345678');
    });

    test('should accept input in the National ID/Iqama field', async ({ page }) => {
        await page.locator('#register-id-group input[type="text"]').fill('2959795515');
        await expect(page.locator('#register-id-group input[type="text"]')).toHaveValue('2959795515');
    });

    // ── Email ─────────────────────────────────────────────────────────────────

    test('should display the Email field', async ({ page }) => {
        await expect(page.locator('#register-email-group')).toBeVisible();
        await expect(page.locator('#register-email-group label')).toContainText('Email');
    });

    test('should show the correct placeholder for Email', async ({ page }) => {
        await expect(page.locator('input[type="email"][aria-label="Email"]')).toHaveAttribute('placeholder', 'Eg. example@email.com');
    });

    test('should accept input in the Email field', async ({ page }) => {
        await page.locator('input[type="email"][aria-label="Email"]').fill('test@example.com');
        await expect(page.locator('input[type="email"][aria-label="Email"]')).toHaveValue('test@example.com');
    });

    // ── Next button ───────────────────────────────────────────────────────────

    test('should display the Next button', async ({ page }) => {
        await expect(page.locator('#register-next-button')).toBeVisible();
        await expect(page.locator('#register-next-button')).toContainText('next');
    });

    test('should have the Next button disabled when form is incomplete', async ({ page }) => {
        await expect(page.locator('#register-next-button')).toBeDisabled();
    });

    test('should enable the Next button when all fields are filled with valid data', async ({ page }) => {
        await page.locator('#register-profile-card-MERCHANT').click();
        await page.locator('#register-unifiedNumber-group input[type="text"]').fill('1023456789');
        await page.locator('#register-id-group input[type="text"]').fill('2959795515');
        await page.locator('input[type="email"][aria-label="Email"]').fill('test@example.com');
        await expect(page.locator('#register-next-button')).toBeEnabled();
    });

    // ── Footer ────────────────────────────────────────────────────────────────

    test('should display "Already have an account?" text', async ({ page }) => {
        await expect(page.locator('span.text-primary.link').filter({ visible: true }).first()).toBeVisible();
    });

    test('should display the Log In link', async ({ page }) => {
        await expect(page.locator('#btn_register_login_step1')).toBeVisible();
        await expect(page.locator('#btn_register_login_step1')).toContainText('Log In');
    });

    test('should display Terms & Conditions link', async ({ page }) => {
        await expect(page.locator('#login-form-footer').first()).toContainText('Terms & Conditions');
    });

    test('should display Privacy Policy link', async ({ page }) => {
        await expect(page.locator('#login-form-footer').first()).toContainText('Privacy Policy');
    });

    // ── Proceed to next step ──────────────────────────────────────────────────

    test('should proceed to the Financial & Business step when Next is clicked with valid data', async ({ page }) => {
        await page.locator('#register-profile-card-MERCHANT').click();
        await page.locator('#register-unifiedNumber-group input[type="text"]').fill('1023456789');
        await page.locator('#register-id-group input[type="text"]').fill('2959795515');
        await page.locator('input[type="email"][aria-label="Email"]').fill('test@example.com');
        await page.locator('#register-next-button').click();
        await expect(page.locator('#register-form-title.form-title')).toContainText(/financial/i, { timeout: 10000 });
    });
});
