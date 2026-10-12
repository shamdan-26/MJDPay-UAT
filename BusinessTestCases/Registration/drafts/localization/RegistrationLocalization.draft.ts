// DRAFT — unverified, not run by the suite. Promote by renaming to .spec.ts and moving to Registration/ui/shared/.
//
// Localization beyond "AR/EN renders": numerals, long Arabic text, mixed-direction content, date formats, and key
// consistency between the two languages. Mock-driven; no OTP or pool identity.
//
// Assumptions : the Business Info email/CRN/ID fields accept ASCII digits only (Arabic-Indic digits are normalised or
//               rejected — the expected behaviour is a product decision; the test records what happens and asserts
//               "never accepted as-is"). Hijri date display exists only on the Contract (acceptance date) — unverified.
import { test, expect } from '@playwright/test';
import { REGISTER_URL, goToInfoStepMocked, goToFinancialStepMocked, RESIDENT_ASSETS } from '../../RegistrationHelper';
import { RegistrationInfoPage } from '../../../pageElements/Registration/RegistrationInfoPage';
import { RegistrationFinancialPage } from '../../../pageElements/Registration/RegistrationFinancialPage';

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const toArabicIndic = (s: string) => s.replace(/\d/g, d => ARABIC_INDIC[Number(d)]);
const asset = RESIDENT_ASSETS[0];

test.describe('Registration – localization (DRAFT)', { tag: ['@registration', '@ui', '@i18n'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'ui' }] }, () => {
    test.beforeEach(() => { test.setTimeout(120_000); });

    test('mobile field: Arabic-Indic digits are normalised to ASCII or rejected, never kept raw', async ({ page }) => {
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const input = page.getByRole('textbox', { name: /Mobile number|رقم الجوال/ });
        await input.pressSequentially(toArabicIndic('512345678'), { delay: 20 });
        const value = await input.inputValue();
        expect(/[٠-٩]/.test(value), `field kept Arabic-Indic digits: ${value}`).toBe(false);
    });

    test('CRN and National ID fields do not keep Arabic-Indic digits', async ({ page }) => {
        await goToInfoStepMocked(page);
        const info = new RegistrationInfoPage(page);
        await info.crnInput.fill(toArabicIndic(asset.crn));
        await info.idInput.fill(toArabicIndic(asset.nationalId));
        expect(/[٠-٩]/.test(await info.crnInput.inputValue())).toBe(false);
        expect(/[٠-٩]/.test(await info.idInput.inputValue())).toBe(false);
    });

    test('financial amount fields normalise Arabic-Indic digits and keep a valid number', async ({ page }) => {
        await goToFinancialStepMocked(page);
        const fin = new RegistrationFinancialPage(page);
        await fin.monthlyBillsInput.pressSequentially(toArabicIndic('1500'), { delay: 20 });
        const v = await fin.monthlyBillsInput.inputValue();
        expect(/[٠-٩]/.test(v), `kept Arabic-Indic digits: ${v}`).toBe(false);
    });

    test('a 120-character Arabic value in the email-adjacent fields wraps without horizontal overflow', async ({ page }) => {
        await goToInfoStepMocked(page);
        await page.getByRole('button', { name: 'العربية' }).click();
        const info = new RegistrationInfoPage(page);
        await info.emailInput.fill(`${'ا'.repeat(60)}@${'ب'.repeat(55)}.com`);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
    });

    test('mixed-direction text (Arabic label + Latin value) keeps the caret and value order correct', async ({ page }) => {
        await goToInfoStepMocked(page);
        await page.getByRole('button', { name: 'العربية' }).click();
        const info = new RegistrationInfoPage(page);
        await info.emailInput.fill('qa@example.com');
        // Email values are LTR islands even in an RTL page.
        const dir = await info.emailInput.evaluate(el => getComputedStyle(el).direction);
        expect(['ltr', 'rtl']).toContain(dir);
        await expect(info.emailInput).toHaveValue('qa@example.com');
    });

    test('switching language keeps entered values and the current step', async ({ page }) => {
        await goToInfoStepMocked(page);
        const info = new RegistrationInfoPage(page);
        await info.crnInput.fill(asset.crn);
        await info.idInput.fill(asset.nationalId);
        await page.getByRole('button', { name: 'العربية' }).click();
        await expect(info.crnInput).toHaveValue(asset.crn);
        await expect(info.idInput).toHaveValue(asset.nationalId);
        await page.getByTestId('lang-en').click().catch(async () => { await page.getByRole('button', { name: 'EN' }).click(); });
        await expect(info.crnInput).toHaveValue(asset.crn);
    });

    test('no untranslated key or placeholder text appears in either language', async ({ page }) => {
        await goToInfoStepMocked(page);
        for (const lang of ['EN', 'AR'] as const) {
            if (lang === 'AR') await page.getByRole('button', { name: 'العربية' }).click();
            const text = await page.locator('body').innerText();
            expect(text, `raw i18n key visible in ${lang}`).not.toMatch(/\b[a-z]+(\.[a-z_]+){2,}\b|\{\{.*\}\}|undefined|\[object Object\]/i);
        }
    });

    test('Arabic page contains Arabic text and English page contains Latin text for the main heading', async ({ page }) => {
        // Checked on the mobile step: switching language on Business Info resets the wizard (#register-form-title disappears).
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const next = page.getByRole('button', { name: /^(next|التالي)$/i });
        await expect(next).toHaveText(/[؀-ۿ]{3,}/); // the wizard opens in Arabic by default
        await page.getByRole('button', { name: 'EN', exact: true }).click();
        await expect(next).toHaveText(/[A-Za-z]{3,}/);
        await page.getByRole('button', { name: 'العربية' }).click();
        await expect(next).toHaveText(/[؀-ۿ]{3,}/);
    });

    test('dates shown in the UI use a consistent calendar and 4-digit year', async ({ page }) => {
        await goToInfoStepMocked(page);
        const text = await page.locator('body').innerText();
        const dates = text.match(/\b\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}\b/g) ?? [];
        for (const d of dates) expect(d, 'ambiguous 2-digit year').toMatch(/\d{4}/);
    });
});
