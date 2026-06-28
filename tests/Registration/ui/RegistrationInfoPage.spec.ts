import { test, expect, Page, Browser } from '@playwright/test';
import { goToInfoStep, goToVerificationStep, nextResidentAsset, generateEmail } from '../helpers';

// Navigates to the Business Info form using a resident asset that bypasses NAFATH in UAT
async function navigateToInfoStep(browser: Browser): Promise<Page> {
    const context = await browser.newContext();
    await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
    const page: Page = await context.newPage();
    await goToInfoStep(page);
    await page.locator('input[type="email"][aria-label="Email"]').waitFor({ state: 'visible', timeout: 15000 });
    return page;
}

// Navigates to Tab 2 (Financial & Business) using a resident asset that bypasses NAFATH in UAT
async function navigateToFinancialTab(browser: Browser): Promise<Page> {
    const context = await browser.newContext();
    await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
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

test.describe('Registration - Info Page', () => {

    // ─────────────────────────────────────────────────────────────────────────
    // Header / Banner  [ref_1 – ref_7]
    // ─────────────────────────────────────────────────────────────────────────

    test.describe('Header & Banner [ref_1 – ref_7]', () => {
        test.describe.configure({ mode: 'serial' });

        let page: Page;

        test.beforeAll(async ({ browser }) => {
            test.setTimeout(120_000);
            page = await navigateToInfoStep(browser);
        });

        test('should display the MJD Pay logo [ref_3]', async () => {
            await expect(page.locator('#auth_header_logo[aria-label="MJD Pay"]')).toBeVisible();
        });

        test('should link the MJD Pay logo to the landing page [ref_2]', async () => {
            await expect(page.getByRole('link', { name: 'MJD Pay' }))
                .toHaveAttribute('href', '/business/landing');
        });

        test('should display the Change Language group [ref_4]', async () => {
            await expect(page.getByRole('group', { name: /change language/i })).toBeVisible();
        });

        test('should display the EN language button [ref_5]', async () => {
            await expect(
                page.getByRole('group', { name: /change language/i }).getByRole('button', { name: 'EN' })
            ).toBeVisible();
        });

        test('should display the Arabic language button [ref_6]', async () => {
            await expect(
                page.getByRole('group', { name: /change language/i }).getByRole('button', { name: 'العربية' })
            ).toBeVisible();
        });

        test('should display the theme toggle button [ref_7]', async () => {
            await expect(page.getByRole('button', { name: 'Switch theme' })).toBeVisible();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Main Content, Headings & Outer Progress Bar  [ref_8 – ref_15]
    // ─────────────────────────────────────────────────────────────────────────

    test.describe('Main Content, Headings & Progress Bar [ref_8 – ref_15]', () => {
        test.describe.configure({ mode: 'serial' });

        let page: Page;

        test.beforeAll(async ({ browser }) => {
            test.setTimeout(120_000);
            page = await navigateToInfoStep(browser);
        });

        test('should display the main page container [ref_8]', async () => {
            await expect(page.locator('main')).toBeVisible();
        });

        test('should display the "Create Account" eyebrow text [ref_9]', async () => {
            await expect(page.locator('#register-form-eyebrow')).toContainText('Create Account');
        });

        test('should display the "Tell us about your business" heading [ref_10]', async () => {
            await expect(page.locator('#register-form-title')).toContainText('Tell us about your business');
        });

        test('should display the "Step 1 of 3" description [ref_11]', async () => {
            await expect(page.locator('#register-form-sub-title')).toContainText('Step 1 of 3');
        });

        test('should display "Business Info" as the active outer step [ref_12]', async () => {
            const step = page.locator('.mp-stepbar .mp-step').nth(0);
            await expect(step).toHaveClass(/is-active/);
            await expect(step.locator('.mp-step-meta')).toContainText('Business Info');
        });

        test('should display "NAFATH" as the second outer step [ref_13]', async () => {
            await expect(page.locator('.mp-stepbar .mp-step').nth(1).locator('.mp-step-meta'))
                .toContainText('NAFATH');
        });

        test('should display "Products" as the third outer step [ref_14]', async () => {
            await expect(page.locator('.mp-stepbar .mp-step').nth(2).locator('.mp-step-meta'))
                .toContainText('Products');
        });

        test('should display "Contract" as the fourth outer step [ref_15]', async () => {
            await expect(page.locator('.mp-stepbar .mp-step').nth(3).locator('.mp-step-meta'))
                .toContainText('Contract');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Inner Tab Navigation  [ref_16 – ref_23]
    // ─────────────────────────────────────────────────────────────────────────

    test.describe('Inner Tab Navigation [ref_16 – ref_23]', () => {
        test.describe.configure({ mode: 'serial' });

        let page: Page;

        test.beforeAll(async ({ browser }) => {
            test.setTimeout(120_000);
            page = await navigateToInfoStep(browser);
        });

        test('should display the step bar [ref_16]', async () => {
            await expect(page.locator('.mp-stepbar.mp-stepbar-global.mp-stepbar-inline')).toBeVisible();
        });

        test('should display Tab 1 — Business Info [ref_17, ref_19]', async () => {
            await expect(page.locator('.mp-step.is-active', { hasText: 'Business Info' }).first()).toBeVisible();
        });

        test('should display Tab 2 — Financial & Business [ref_20, ref_21]', async () => {
            await expect(page.locator('.mp-step.ng-star-inserted', { hasText: 'NAFATH' }).first()).toBeVisible();
        });

        test('should display Tab 3 — Products [ref_22, ref_23]', async () => {
            await expect(page.locator('.mp-step.ng-star-inserted', { hasText: 'Products' }).first()).toBeVisible();
        });

        test('should display Tab 4 — Contract [ref_24, ref_25]', async () => {
            await expect(page.locator('.mp-step.ng-star-inserted', { hasText: 'Contract' }).first()).toBeVisible();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Tab Panel 1 — Business Info Form  [ref_24 – ref_58]
    // ─────────────────────────────────────────────────────────────────────────

    test.describe('Tab Panel 1 — Business Info Form [ref_24 – ref_58]', () => {

        // ── Element visibility (shared page, navigate once) ───────────────────

        test.describe('Element Visibility', () => {
            test.describe.configure({ mode: 'serial' });

            let page: Page;

            test.beforeAll(async ({ browser }) => {
                test.setTimeout(120_000);
                page = await navigateToInfoStep(browser);
            });

            test('should display the tab panel container [ref_24]', async () => {
                await expect(page.getByRole('tabpanel').first()).toBeVisible();
            });

            test('should display the Business Info form element [ref_25]', async () => {
                await expect(page.locator('form').first()).toBeVisible();
            });

            // ── Profile Type [ref_26 – ref_39] ───────────────────────────────

            test('should display the Profile Type label [ref_26]', async () => {
                await expect(page.locator('#register-profile-types .mp-field-label'))
                    .toContainText('Profile Type');
            });

            test('should display the Profile Type radiogroup [ref_27]', async () => {
                await expect(page.getByRole('radiogroup', { name: 'Profile Type' })).toBeVisible();
            });

            test('should display exactly four Profile Type options', async () => {
                await expect(
                    page.getByRole('radiogroup', { name: 'Profile Type' }).getByRole('radio')
                ).toHaveCount(4);
            });

            test('should display the Merchant radio option [ref_28]', async () => {
                await expect(page.locator('#register-profile-card-MERCHANT')).toBeVisible();
            });

            test('should display the Merchant label and description [ref_29, ref_30]', async () => {
                await expect(page.locator('#register-profile-card-MERCHANT .mp-rc-title'))
                    .toContainText('Merchant');
                await expect(page.locator('#register-profile-card-MERCHANT .mp-rc-sub'))
                    .toContainText('Accept payments and manage your store.');
            });

            test('should display the Biller radio option [ref_31]', async () => {
                await expect(page.locator('#register-profile-card-BILLER')).toBeVisible();
            });

            test('should display the Biller label and description [ref_32, ref_33]', async () => {
                await expect(page.locator('#register-profile-card-BILLER .mp-rc-title'))
                    .toContainText('Biller');
                await expect(page.locator('#register-profile-card-BILLER .mp-rc-sub'))
                    .toContainText('Issue and collect bills from your customers.');
            });

            test('should display the Customer radio option [ref_34]', async () => {
                await expect(page.locator('#register-profile-card-CUSTOMER')).toBeVisible();
            });

            test('should display the Customer label and description [ref_35, ref_36]', async () => {
                await expect(page.locator('#register-profile-card-CUSTOMER .mp-rc-title'))
                    .toContainText('Customer');
                await expect(page.locator('#register-profile-card-CUSTOMER .mp-rc-sub'))
                    .toContainText('Accept payments and manage your store.');
            });

            test('should display the Freelancer radio option [ref_37]', async () => {
                await expect(page.locator('#register-profile-card-FREELANCER')).toBeVisible();
            });

            test('should display the Freelancer label and description [ref_38, ref_39]', async () => {
                await expect(page.locator('#register-profile-card-FREELANCER .mp-rc-title'))
                    .toContainText('Freelancer');
                await expect(page.locator('#register-profile-card-FREELANCER .mp-rc-sub'))
                    .toContainText('Accept payments and manage your store.');
            });

            // ── Unified Number / CRN [ref_40 – ref_43] ───────────────────────

            test('should display the Unified Number label [ref_40]', async () => {
                await expect(page.locator('label[for="register-unifiedNumber-input"]'))
                    .toContainText('unified number');
            });

            test('should display the Unified Number tooltip button [ref_41]', async () => {
                await expect(page.getByRole('button', { name: /Unified Number/i })).toBeVisible();
            });

            test('should display the Unified Number input wrapper [ref_42]', async () => {
                await expect(page.locator('#register-unifiedNumber-group')).toBeVisible();
            });

            test('should display the Unified Number textbox with correct placeholder [ref_43]', async () => {
                await expect(page.locator('#register-unifiedNumber-group input[type="text"]'))
                    .toHaveAttribute('placeholder', 'Eg. 1023456789');
            });

            // ── National ID / Iqama [ref_45 – ref_48] ────────────────────────

            test('should display the National ID/Iqama label [ref_45]', async () => {
                await expect(page.locator('label[for="register-id-input"]'))
                    .toContainText('National ID/Iqama');
            });

            test('should display the National ID/Iqama tooltip button [ref_46]', async () => {
                await expect(page.getByRole('button', { name: /National ID.*Iqama|Iqama/i })).toBeVisible();
            });

            test('should display the National ID/Iqama input wrapper [ref_47]', async () => {
                await expect(page.locator('#register-id-group')).toBeVisible();
            });

            test('should display the National ID/Iqama textbox with correct placeholder [ref_48]', async () => {
                await expect(page.locator('#register-id-group input[type="text"]'))
                    .toHaveAttribute('placeholder', 'Eg. 1012345678');
            });

            // ── Email [ref_50 – ref_51] ───────────────────────────────────────

            test('should display the Email label [ref_50]', async () => {
                await expect(page.locator('#register-email-group label')).toContainText('Email');
            });

            test('should display the Email textbox with correct placeholder [ref_51]', async () => {
                await expect(page.locator('input[type="email"][aria-label="Email"]'))
                    .toHaveAttribute('placeholder', 'Eg. example@email.com');
            });

            // ── Next button [ref_53] ──────────────────────────────────────────

            test('should display the Next button [ref_53]', async () => {
                await expect(page.locator('#register-next-button')).toBeVisible();
                await expect(page.locator('#register-next-button')).toContainText('next');
            });

            // ── Footer [ref_54 – ref_58] ──────────────────────────────────────

            test('should display "Already have an account?" text [ref_54]', async () => {
                await expect(page.getByText('Already have an account?').first()).toBeVisible();
            });

            test('should display the Log In link [ref_55]', async () => {
                await expect(page.locator('#btn_register_login_step1')).toContainText('Log In');
            });

            test('should display "By continuing, you agree to our" text [ref_56]', async () => {
                await expect(
                    page.locator('#login-line span', { hasText: 'By continuing, you agree to our' }).first()
                ).toBeVisible();
            });

            test('should display Terms & Conditions reference [ref_57]', async () => {
                await expect(page.locator('#login-form-footer').first()).toContainText('Terms & Conditions');
            });

            test('should display Privacy Policy reference [ref_58]', async () => {
                await expect(page.locator('#login-form-footer').first()).toContainText('Privacy Policy');
            });
        });

        // ── Field interactions (fresh page per test) ──────────────────────────

        test.describe('Field Interactions', () => {

            let currentAsset: ReturnType<typeof nextResidentAsset>;

            test.beforeEach(async ({ page, context }) => {
                test.setTimeout(120_000);
                currentAsset = nextResidentAsset();
                await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
                await goToInfoStep(page, currentAsset.mobile);
                await page.locator('input[type="email"][aria-label="Email"]').waitFor({ state: 'visible', timeout: 15000 });
            });

            test('should allow selecting Merchant profile type [ref_28]', async ({ page }) => {
                await page.locator('#register-profile-card-MERCHANT').click();
                await expect(page.locator('#register-profile-card-MERCHANT'))
                    .toHaveAttribute('aria-checked', 'true');
            });

            test('should allow selecting Biller profile type [ref_31]', async ({ page }) => {
                await page.locator('#register-profile-card-BILLER').click();
                await expect(page.locator('#register-profile-card-BILLER'))
                    .toHaveAttribute('aria-checked', 'true');
            });

            test('should allow selecting Customer profile type [ref_34]', async ({ page }) => {
                await page.locator('#register-profile-card-CUSTOMER').click();
                await expect(page.locator('#register-profile-card-CUSTOMER'))
                    .toHaveAttribute('aria-checked', 'true');
            });

            test('should allow selecting Freelancer profile type [ref_37]', async ({ page }) => {
                await page.locator('#register-profile-card-FREELANCER').click();
                await expect(page.locator('#register-profile-card-FREELANCER'))
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

            test('should accept input in the Unified Number field [ref_43]', async ({ page }) => {
                await page.locator('#register-unifiedNumber-group input[type="text"]').fill(currentAsset.crn);
                await expect(page.locator('#register-unifiedNumber-group input[type="text"]'))
                    .toHaveValue(currentAsset.crn);
            });

            test('should display the Clear button for Unified Number after entry [ref_44]', async ({ page }) => {
                await page.locator('#register-unifiedNumber-group input[type="text"]').fill(currentAsset.crn);
                await expect(
                    page.locator('#register-unifiedNumber-group').getByRole('button', { name: 'Clear' })
                ).toBeVisible();
            });

            test('should accept input in the National ID/Iqama field [ref_48]', async ({ page }) => {
                await page.locator('#register-id-group input[type="text"]').fill(currentAsset.nationalId);
                await expect(page.locator('#register-id-group input[type="text"]'))
                    .toHaveValue(currentAsset.nationalId);
            });

            test('should accept input in the Email field [ref_51]', async ({ page }) => {
                await page.pause();
                await page.locator('input[type="email"][aria-label="Email"]').fill('test@example.com');
                await expect(page.locator('input[type="email"][aria-label="Email"]'))
                    .toHaveValue('test@example.com');
            });

            test('should have the Next button disabled when form is incomplete [ref_53]', async ({ page }) => {
                await page.pause();
                await expect(page.locator('#register-next-button')).toBeDisabled();
            });

            test('should enable the Next button when all fields are filled with valid data [ref_53]', async ({ page }) => {
                await page.locator('#register-profile-card-MERCHANT').click();
                await page.locator('#register-unifiedNumber-group input[type="text"]').fill(currentAsset.crn);
                await page.locator('#register-id-group input[type="text"]').fill(currentAsset.nationalId);
                await page.locator('input[type="email"][aria-label="Email"]').fill(generateEmail());
                await expect(page.locator('#register-next-button')).toBeEnabled();
            });
        });
    });
})
