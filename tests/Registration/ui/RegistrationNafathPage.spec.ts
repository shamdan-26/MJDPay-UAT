import { test, expect, Page } from '@playwright/test';
import { goToInfoStep, goToVerificationStep, nextResidentAsset, generateEmail } from '../helpers';

// Navigates to Tab 2 (Financial & Business) using a resident asset that bypasses NAFATH in UAT
async function navigateToFinancialTab(browser: any): Promise<Page> {
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

test.describe('Registration - NAFATH Step Page Elements', () => {

    // ─────────────────────────────────────────────────────────────────────────
    // Header, progress bar, inner tab nav, and Tab 2 (Financial & Business)
    // ─────────────────────────────────────────────────────────────────────────

    test.describe('Header, Progress Bar, Tab Navigation & Tab 2 — Financial & Business', () => {
        test.describe.configure({ mode: 'serial' });

        let page: Page;

        test.beforeAll(async ({ browser }) => {
            test.setTimeout(120_000);
            page = await navigateToFinancialTab(browser);
        });

        test.afterAll(async () => { await page.close(); });

        // ── Header / Banner [ref_1 – ref_7] ──────────────────────────────────

        test('should display the MJD Pay logo [ref_3]', async () => {
            await expect(page.locator('#auth_header_logo[aria-label="MJD Pay"]')).toBeVisible();
        });

        test('should link the MJD Pay logo to the landing page [ref_2]', async () => {
            await expect(page.getByRole('link', { name: 'MJD Pay' }))
                .toHaveAttribute('href', '/business/landing');
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

        // ── Page headings [ref_9 – ref_11] ───────────────────────────────────

        test('should display the "Create Account" eyebrow text [ref_9]', async () => {
            await expect(page.locator('#register-form-eyebrow')).toContainText('Create Account');
        });

        test('should display the "Financials & business profile" form title [ref_10]', async () => {
            await expect(page.locator('#register-form-title.form-title'))
                .toContainText('Financials & business profile');
        });

        test('should display the "Step 2 of 3" step description [ref_11]', async () => {
            await expect(page.locator('#register-form-sub-title')).toContainText('Step 2 of 3');
        });

        // ── Outer progress bar [ref_12 – ref_15] ─────────────────────────────

        test('should display "Business Info" as the first outer step [ref_12]', async () => {
            await expect(page.locator('.mp-stepbar .mp-step').nth(0)).toContainText('Business Info');
        });

        test('should display "NAFATH" as the active outer step [ref_13]', async () => {
            await expect(page.locator('.mp-step.is-active').first()).toContainText('NAFATH');
        });

        test('should display "Products" as the third outer step [ref_14]', async () => {
            await expect(page.locator('.mp-stepbar .mp-step').nth(2)).toContainText('Products');
        });

        test('should display "Contract" as the fourth outer step [ref_15]', async () => {
            await expect(page.locator('.mp-stepbar .mp-step').nth(3)).toContainText('Contract');
        });

        // ── Inner tab navigation [ref_16 – ref_23] ───────────────────────────

        test('should display the inner tab list [ref_16]', async () => {
            await expect(page.getByRole('tablist')).toBeVisible();
        });

        test('should display the Business Info inner tab [ref_17]', async () => {
            await expect(page.getByRole('tab').nth(0)).toBeVisible();
        });

        test('should show a "done" checkmark icon on the Business Info tab [ref_18]', async () => {
            await expect(page.getByRole('tab').nth(0).getByRole('img', { name: 'done' }))
                .toBeVisible();
        });

        test('should display "business Info" label on the first inner tab [ref_19]', async () => {
            await expect(page.getByRole('tab').nth(0)).toContainText('business Info');
        });

        test('should display the "Financial & Business" inner tab [ref_20, ref_21]', async () => {
            await expect(page.getByRole('tab').nth(1)).toContainText('Financial & Business');
        });

        test('should display the "Verification & Uploads" inner tab [ref_22, ref_23]', async () => {
            await expect(page.getByRole('tab').nth(2)).toContainText('Verification & Uploads');
        });

        // ── Tab Panel 2 — Financial & Business form [ref_59 – ref_85] ────────

        test('should display the Monthly Expected Number Of Bills label [ref_61]', async () => {
            await expect(page.getByText(/Monthly Expected Number Of bills/i).first()).toBeVisible();
        });

        test('should display the Monthly Expected Number textbox with placeholder [ref_62]', async () => {
            await expect(page.getByRole('textbox', { name: /monthly expected number/i }))
                .toHaveAttribute('placeholder', /2000/i);
        });

        test('should display the "This field is required." hint [ref_63]', async () => {
            await expect(page.getByText('This field is required.').first()).toBeVisible();
        });

        test('should display the Monthly Expected Sum label [ref_64]', async () => {
            await expect(page.getByText(/monthly expected sum/i).first()).toBeVisible();
        });

        test('should display the Monthly Expected Sum textbox [ref_65]', async () => {
            await expect(page.getByRole('textbox', { name: /monthly expected sum/i })).toBeVisible();
        });

        test('should display the Expected Monthly Withdrawal label [ref_66]', async () => {
            await expect(page.getByText(/monthly withdrawal/i).first()).toBeVisible();
        });

        test('should display the Expected Monthly Withdrawal textbox [ref_67]', async () => {
            await expect(page.getByRole('textbox', { name: /monthly withdrawal/i })).toBeVisible();
        });

        test('should display the Expected Monthly Deposit label [ref_68]', async () => {
            await expect(page.getByText(/monthly deposit/i).first()).toBeVisible();
        });

        test('should display the Expected Monthly Deposit textbox [ref_69]', async () => {
            await expect(page.getByRole('textbox', { name: /monthly deposit/i })).toBeVisible();
        });

        test('should display the Banks label [ref_70]', async () => {
            await expect(page.getByText('Banks').first()).toBeVisible();
        });

        test('should display the Banks dropdown with "Select Option" placeholder [ref_71, ref_72]', async () => {
            await expect(page.locator('#floating-dropdown-banks-9')).toBeVisible();
            await expect(page.locator('#floating-dropdown-banks-9')).toContainText('Select Option');
        });

        test('should display the Industries label [ref_73]', async () => {
            await expect(page.getByText('Industries').first()).toBeVisible();
        });

        test('should display the Industries dropdown with "Select Option" placeholder [ref_74, ref_75]', async () => {
            await expect(page.locator('#floating-dropdown-industries-10')).toBeVisible();
            await expect(page.locator('#floating-dropdown-industries-10')).toContainText('Select Option');
        });

        test('should display the Annual Income label [ref_76]', async () => {
            await expect(page.getByText('Annual Income').first()).toBeVisible();
        });

        test('should display the Annual Income dropdown with "Select Option" placeholder [ref_77, ref_78]', async () => {
            await expect(page.locator('#floating-dropdown-annual-income-11')).toBeVisible();
            await expect(page.locator('#floating-dropdown-annual-income-11')).toContainText('Select Option');
        });

        test('should display the Back button on Tab 2 [ref_79]', async () => {
            await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
        });

        test('should display the Next button on Tab 2 [ref_80]', async () => {
            await expect(page.getByRole('button', { name: /next/i })).toBeVisible();
        });

        test('should display "Already have an account?" text on Tab 2 [ref_81]', async () => {
            await expect(page.getByText('Already have an account?').first()).toBeVisible();
        });

        test('should display the Log In link on Tab 2 [ref_82]', async () => {
            await expect(page.getByText('Log In', { exact: true }).first()).toBeVisible();
        });

        test('should display Terms & Conditions reference on Tab 2 [ref_84]', async () => {
            await expect(page.getByText(/Terms & Conditions/i).first()).toBeVisible();
        });

        test('should display Privacy Policy reference on Tab 2 [ref_85]', async () => {
            await expect(page.getByText(/Privacy Policy/i).first()).toBeVisible();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Tab 1 — Business Info (completed / editable state)
    // ─────────────────────────────────────────────────────────────────────────

    test.describe('Tab 1 — Business Info (completed state) [ref_24 – ref_58]', () => {
        test.describe.configure({ mode: 'serial' });

        let page: Page;

        test.beforeAll(async ({ browser }) => {
            test.setTimeout(120_000);
            page = await navigateToFinancialTab(browser);
            await page.getByRole('tab').nth(0).click();
            await page.locator('#floating-text-field-2').waitFor({ state: 'visible', timeout: 10000 });
        });

        test.afterAll(async () => { await page.close(); });

        test('should display the Profile Type label [ref_26]', async () => {
            await expect(page.locator('#register-profile-types .mp-field-label'))
                .toContainText('Profile Type');
        });

        test('should display the Profile Type radiogroup [ref_27]', async () => {
            await expect(page.getByRole('radiogroup', { name: 'Profile Type' })).toBeVisible();
        });

        test('should display the Merchant radio option with description [ref_28 – ref_30]', async () => {
            await expect(page.locator('#register-profile-card-MERCHANT .mp-rc-title')).toContainText('Merchant');
            await expect(page.locator('#register-profile-card-MERCHANT .mp-rc-sub'))
                .toContainText('Accept payments and manage your store.');
        });

        test('should display the Customer radio option with description [ref_34 – ref_36]', async () => {
            await expect(page.locator('#register-profile-card-CUSTOMER .mp-rc-title')).toContainText('Customer');
            await expect(page.locator('#register-profile-card-CUSTOMER .mp-rc-sub'))
                .toContainText('Accept payments and manage your store.');
        });

        test('should display the Freelancer radio option with description [ref_37 – ref_39]', async () => {
            await expect(page.locator('#register-profile-card-FREELANCER .mp-rc-title')).toContainText('Freelancer');
            await expect(page.locator('#register-profile-card-FREELANCER .mp-rc-sub'))
                .toContainText('Accept payments and manage your store.');
        });

        test('should display the Unified Number label [ref_40]', async () => {
            await expect(page.locator('label[for="register-unifiedNumber-input"]'))
                .toContainText('unified number');
        });

        test('should display the Unified Number tooltip button [ref_41]', async () => {
            await expect(page.getByRole('button', { name: /Unified Number/i })).toBeVisible();
        });

        test('should display the Unified Number input [ref_43]', async () => {
            await expect(page.locator('#floating-text-field-2')).toBeVisible();
        });

        test('should display the National ID/Iqama label [ref_45]', async () => {
            await expect(page.locator('label[for="register-id-input"]'))
                .toContainText('National ID/Iqama');
        });

        test('should display the National ID/Iqama tooltip button [ref_46]', async () => {
            await expect(page.getByRole('button', { name: /National ID.*Iqama|Iqama/i })).toBeVisible();
        });

        test('should display the National ID/Iqama input [ref_48]', async () => {
            await expect(page.locator('#floating-text-field-3')).toBeVisible();
        });

        test('should display the Email label [ref_50]', async () => {
            await expect(page.locator('#register-email-group label')).toContainText('Email');
        });

        test('should display the Email input [ref_51]', async () => {
            await expect(page.locator('#floating-email-email-4')).toBeVisible();
        });

        test('should display the Next button on Tab 1 [ref_53]', async () => {
            await expect(page.locator('#register-next-button')).toBeVisible();
        });

        test('should display "Already have an account?" text on Tab 1 [ref_54]', async () => {
            await expect(page.getByText('Already have an account?').first()).toBeVisible();
        });

        test('should display the Log In link on Tab 1 [ref_55]', async () => {
            await expect(page.locator('#btn_register_login_step1')).toContainText('Log In');
        });

        test('should display Terms & Conditions reference on Tab 1 [ref_57]', async () => {
            await expect(page.locator('#login-form-footer').first()).toContainText('Terms & Conditions');
        });

        test('should display Privacy Policy reference on Tab 1 [ref_58]', async () => {
            await expect(page.locator('#login-form-footer').first()).toContainText('Privacy Policy');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Tab 3 — Verification & Uploads
    // ─────────────────────────────────────────────────────────────────────────

    test.describe('Tab 3 — Verification & Uploads [ref_86 – ref_109]', () => {
        test.describe.configure({ mode: 'serial' });

        let page: Page;

        test.beforeAll(async ({ browser }) => {
            test.setTimeout(180_000);
            const context = await browser.newContext();
            await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
            page = await context.newPage();
            await goToVerificationStep(page);
        });

        test.afterAll(async () => { await page.close(); });

        test('should display the IBAN label [ref_88]', async () => {
            await expect(page.getByText('IBAN').first()).toBeVisible();
        });

        test('should display the IBAN textbox with correct placeholder [ref_89]', async () => {
            await expect(page.getByRole('textbox', { name: /iban/i }))
                .toHaveAttribute('placeholder', 'Eg. SA0380000001234567891234');
        });

        test('should display the IBAN format hint [ref_90]', async () => {
            await expect(page.getByText(/24 characters starting with SA/i)).toBeVisible();
        });

        test('should display the IBAN proof label [ref_91]', async () => {
            await expect(page.getByText('IBAN proof').first()).toBeVisible();
        });

        test('should display the IBAN proof "Click to upload" area [ref_92]', async () => {
            await expect(page.getByText('Click to upload').first()).toBeVisible();
        });

        test('should display the IBAN proof file type hint [ref_93]', async () => {
            await expect(page.getByText(/Bank letter or statement/i)).toBeVisible();
        });

        test('should display the VAT number label [ref_95]', async () => {
            await expect(page.getByText('VAT number').first()).toBeVisible();
        });

        test('should display the VAT number textbox with correct placeholder [ref_96]', async () => {
            await expect(page.getByRole('textbox', { name: /vat/i }))
                .toHaveAttribute('placeholder', 'Eg. 300123456700003');
        });

        test('should display the VAT number hint text [ref_97]', async () => {
            await expect(page.getByText('From your VAT certificate')).toBeVisible();
        });

        test('should display the VAT certificate label [ref_98]', async () => {
            await expect(page.getByText('VAT certificate').first()).toBeVisible();
        });

        test('should display the VAT certificate "Click to upload" area [ref_99]', async () => {
            await expect(page.getByText('Click to upload').nth(1)).toBeVisible();
        });

        test('should display the VAT certificate file type hint [ref_100]', async () => {
            await expect(page.getByText(/PDF · max 5MB/i)).toBeVisible();
        });

        test('should display the Back button on Tab 3 [ref_103]', async () => {
            await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
        });

        test('should display the Sign Up button on Tab 3 [ref_104]', async () => {
            await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
        });

        test('should display "Already have an account?" text on Tab 3 [ref_105]', async () => {
            await expect(page.getByText('Already have an account?').first()).toBeVisible();
        });

        test('should display the Log In link on Tab 3 [ref_106]', async () => {
            await expect(page.getByText('Log In', { exact: true }).first()).toBeVisible();
        });

        test('should display Terms & Conditions reference on Tab 3 [ref_108]', async () => {
            await expect(page.getByText(/Terms & Conditions/i).first()).toBeVisible();
        });

        test('should display Privacy Policy reference on Tab 3 [ref_109]', async () => {
            await expect(page.getByText(/Privacy Policy/i).first()).toBeVisible();
        });
    });
});
