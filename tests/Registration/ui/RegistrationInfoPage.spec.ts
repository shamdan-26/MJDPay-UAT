import { test, expect, Page, Browser, chromium } from '@playwright/test';
import { goToInfoStep } from '../helpers';

let browser: Browser;
let page: Page;

test.beforeAll(async (): Promise<void> => {
    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
    page = await context.newPage();
    await goToInfoStep(page);
}, 120_000);

test.afterAll(async (): Promise<void> => {
    await page.close();
    await browser.close();
});

test.describe('Registration - Info Page', () => {
    test.describe.configure({ mode: 'serial' });

    // ── Header / banner ─────────────────────────────────────────────────────────

    test('should display the MJD Pay logo', async () => {
        await expect(page.getByRole('img', { name: 'MJD Pay' })).toBeVisible();
    });

    test('should link the MJD Pay logo to the landing page', async () => {
        await expect(page.getByRole('link', { name: 'MJD Pay' }))
            .toHaveAttribute('href', '/business/landing');
    });

    test('should display the EN language button', async () => {
        await expect(
            page.getByRole('group', { name: /change language/i }).getByRole('button', { name: 'EN' })
        ).toBeVisible();
    });

    test('should display the Arabic language button', async () => {
        await expect(
            page.getByRole('group', { name: /change language/i }).getByRole('button', { name: 'العربية' })
        ).toBeVisible();
    });

    test('should display the theme toggle button', async () => {
        await expect(page.getByRole('button', { name: 'Switch theme' })).toBeVisible();
    });

    // ── Page content / headings ─────────────────────────────────────────────────

    test('should display the "Create Account" eyebrow text', async () => {
        await expect(page.getByText('Create Account')).toBeVisible();
    });

    test('should display the registration info form heading', async () => {
        await expect(page.getByText('Tell us about your business')).toBeVisible();
    });

    test('should display the step description text', async () => {
        await expect(page.getByText(/Step 1 of 3/i)).toBeVisible();
    });

    test('should display the "business Info" step indicator', async () => {
        await expect(page.getByText(/business info/i).first()).toBeVisible();
    });

    // ── Profile Type radio group ──────────────────────────────────────────────

    test('should display the Profile Type label', async () => {
        await expect(page.getByText('Profile Type').first()).toBeVisible();
    });

    test('should display the Profile Type radio group', async () => {
        await expect(page.getByRole('radiogroup', { name: 'Profile Type' })).toBeVisible();
    });

    test('should display the Merchant profile option', async () => {
        await expect(
            page.getByRole('radiogroup', { name: 'Profile Type' }).getByRole('radio', { name: /^Merchant/i })
        ).toBeVisible();
    });

    test('should display the Biller profile option', async () => {
        await expect(
            page.getByRole('radiogroup', { name: 'Profile Type' }).getByRole('radio', { name: /^Biller/i })
        ).toBeVisible();
    });

    test('should display the Customer profile option', async () => {
        await expect(
            page.getByRole('radiogroup', { name: 'Profile Type' }).getByRole('radio', { name: /^Customer/i })
        ).toBeVisible();
    });

    test('should display the Freelancer profile option', async () => {
        await expect(
            page.getByRole('radiogroup', { name: 'Profile Type' }).getByRole('radio', { name: /^Freelancer/i })
        ).toBeVisible();
    });

    test('should display exactly four Profile Type options', async () => {
        await expect(
            page.getByRole('radiogroup', { name: 'Profile Type' }).getByRole('radio')
        ).toHaveCount(4);
    });

    // ── CRN field ─────────────────────────────────────────────────────────────

    test('should display the CRN field label', async () => {
        await expect(page.getByText('unified number').first()).toBeVisible();
    });

    test('should display the CRN input', async () => {
        await expect(page.getByPlaceholder('Eg. 1023456789')).toBeVisible();
    });

    test('should show the correct placeholder for the CRN field', async () => {
        await expect(page.getByPlaceholder('Eg. 1023456789')).toBeVisible();
    });

    test('should display the CRN info tooltip button', async () => {
        await expect(page.getByRole('button', { name: /Unified Number/i })).toBeVisible();
    });

    // ── Iqama field ───────────────────────────────────────────────────────────

    test('should display the Iqama field label', async () => {
        await expect(page.getByText('National ID/Iqama').first()).toBeVisible();
    });

    test('should display the Iqama input', async () => {
        await expect(page.getByPlaceholder('Eg. 1012345678')).toBeVisible();
    });

    test('should show the correct placeholder for the Iqama field', async () => {
        await expect(page.getByPlaceholder('Eg. 1012345678')).toBeVisible();
    });

    test('should display the Iqama info tooltip button', async () => {
        await expect(
            page.getByRole('button', { name: /National ID.*Iqama|Iqama/i })
        ).toBeVisible();
    });

    // ── Email field ───────────────────────────────────────────────────────────

    test('should display the Email field label', async () => {
        await expect(page.getByText(/Email/i).first()).toBeVisible();
    });

    test('should display the Email input', async () => {
        await expect(page.getByRole('textbox', { name: /Email/i })).toBeVisible();
    });

    test('should show the correct placeholder for the Email field', async () => {
        await expect(page.getByRole('textbox', { name: /Email/i }))
            .toHaveAttribute('placeholder', 'Eg. example@email.com');
    });

    // ── Next / Submit button ──────────────────────────────────────────────────

    test('should display the Next button', async () => {
        await expect(
            page.getByRole('button', { name: /next|submit|continue/i }).first()
        ).toBeVisible();
    });

    test('should have the Next button disabled when required fields are empty', async () => {
        await expect(
            page.getByRole('button', { name: /next|submit|continue/i }).first()
        ).toBeDisabled();
    });

    // ── Log In link ───────────────────────────────────────────────────────────

    test('should display the "Already have an account?" text', async () => {
        await expect(page.getByText('Already have an account?').first()).toBeVisible();
    });

    test('should display the Log In link', async () => {
        await expect(page.getByText('Log In', { exact: true }).first()).toBeVisible();
    });

    // ── Legal links ─────────────────────────────────────────────────────────────

    test('should display the Terms & Conditions reference', async () => {
        await expect(page.getByText(/Terms & Conditions/i).first()).toBeVisible();
    });

    test('should display the Privacy Policy reference', async () => {
        await expect(page.getByText(/Privacy Policy/i).first()).toBeVisible();
    });
});
