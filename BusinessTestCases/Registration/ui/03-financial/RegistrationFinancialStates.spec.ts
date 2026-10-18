import { test, expect } from '@playwright/test';
import { goToFinancialStepMocked } from '../../helpers/RegistrationHelper';
import { RegistrationFinancialPage } from '../../../pageElements/Registration/RegistrationFinancialPage';

// Financial & Business — lookup failures, dropdown keyboard operation and layout, reached with no real OTP
// and no pool identity (OTP bypass + mocked Business Info submit).
const LOOKUPS = {
    industries: '**/emi-profile/api/v1/industries',
    annualIncomes: '**/emi-profile/api/v1/annual-incomes',
    banks: '**/api/v1/lookup/banks',
};

test.describe('Registration – Financial & Business states', { tag: ['@registration', '@financial', '@ui'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'ui' }] }, () => {
    test.beforeEach(() => { test.setTimeout(120_000); });

    for (const [name, pattern] of Object.entries(LOOKUPS)) {
        test(`should stay usable and not crash when the ${name} lookup fails`, { annotation: [{ type: 'testcase', description: "RG-FINST-01: Should stay usable and not crash when the … lookup fails" }] }, async ({ page }) => {
            const pageErrors: string[] = [];
            page.on('pageerror', e => pageErrors.push(e.message));
            await page.route(pattern, route => route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));
            await goToFinancialStepMocked(page);
            const fin = new RegistrationFinancialPage(page);
            await expect(fin.monthlyBillsInput).toBeVisible();
            await expect(fin.nextButton).toBeDisabled();
            expect(pageErrors).toHaveLength(0);
        });
    }

    test('should show an empty industries list as no options rather than a blank panel', { annotation: [{ type: 'testcase', description: "RG-FINST-02: Should show an empty industries list as no options rather than a blank panel" }] }, async ({ page }) => {
        await page.route(LOOKUPS.industries, route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
        await goToFinancialStepMocked(page);
        const fin = new RegistrationFinancialPage(page);
        await fin.industriesDropdown.click();
        await expect(page.getByRole('option')).toHaveCount(0);
        await expect(fin.nextButton).toBeDisabled();
    });

    test.describe('with working lookups', () => {
        let fin: RegistrationFinancialPage;

        test.beforeEach(async ({ page }) => {
            await goToFinancialStepMocked(page);
            fin = new RegistrationFinancialPage(page);
        });

        test('should open the industries list with the keyboard and choose an option', { annotation: [{ type: 'testcase', description: "RG-FINST-03: Should open the industries list with the keyboard and choose an option" }] }, async ({ page }) => {
            await fin.industriesDropdown.focus();
            await page.keyboard.press('Enter');
            const options = page.getByRole('option');
            await expect(options.first()).toBeVisible();
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
            await expect(options.first()).toBeHidden();
        });

        test('should close an open dropdown with Escape without selecting anything', { annotation: [{ type: 'testcase', description: "RG-FINST-04: Should close an open dropdown with Escape without selecting anything" }] }, async ({ page }) => {
            await fin.annualIncomeDropdown.click();
            await expect(page.getByRole('option').first()).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(page.getByRole('option').first()).toBeHidden();
        });

        test('should show a no-results state when the industries search matches nothing', { annotation: [{ type: 'testcase', description: "RG-FINST-05: Should show a no-results state when the industries search matches nothing" }] }, async ({ page }) => {
            await fin.industriesDropdown.click();
            const search = page.getByRole('searchbox').or(page.locator('input[type="search"], .ng-dropdown-panel input, [role="listbox"] input')).first();
            await search.fill('zzzzzzzzqq');
            await expect(page.getByRole('option')).toHaveCount(0);
        });

        test('should not overflow a 375px viewport', { annotation: [{ type: 'testcase', description: "RG-FINST-06: Should not overflow a 375px viewport" }] }, async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 800 });
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
            expect(overflow).toBeLessThanOrEqual(1);
        });

        test('should keep Back reachable and return to Business Info', { annotation: [{ type: 'testcase', description: "RF-43: Return to Business Info tab when Back is clicked" }] }, async ({ page }) => {
            await fin.backButton.click();
            await expect(page.locator('#register-profile-card-MERCHANT')).toBeVisible();
        });

        test('should switch to right-to-left layout and keep the form usable in Arabic', { annotation: [{ type: 'testcase', description: "RG-FINST-07: Should switch to right-to-left layout and keep the form usable in Arabic" }] }, async ({ page }) => {
            await fin.arabicButton.click();
            await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
            await expect(fin.monthlyBillsInput).toBeVisible();
        });
    });
});
