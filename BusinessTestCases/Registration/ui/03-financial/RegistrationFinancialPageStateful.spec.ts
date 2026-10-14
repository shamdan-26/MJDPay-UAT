import { test, expect } from '@playwright/test';
import { goToFinancialStep, selectRandomOption } from '../../RegistrationHelper';
import { RegistrationFinancialPage } from '../../../pageElements/Registration/RegistrationFinancialPage';

// ─────────────────────────────────────────────────────────────────────────────
// Stateful / mutating tests — each fills fields, opens a dropdown overlay, or
// navigates away from the Financial step, so each needs its own fresh
// registration to avoid interfering with the next test.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Financial & Business Step (Tab 2 of 3) — stateful', { tag: ['@registration', '@financial', '@ui'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'ui' }] }, () => {
    // Serial, not parallel: each test's beforeEach drives a full mobile->OTP->
    // Business Info registration against a small shared resident-asset pool.
    // Running these across workers was tried and reverted — concurrent
    // registrations collide on the shared pool and the OTP/registration flow
    // in this environment can't reliably handle simultaneous attempts (13/40
    // tests failed with worker parallelism). Slow but correct beats fast and flaky.
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        // goToFinancialStep can retry up to 10 times (already-registered / already-
        // progressed assets), each attempt a full mobile -> OTP -> Business Info
        // round trip. test.setTimeout() covers the WHOLE test (this hook plus the
        // test body), not just the hook — a run that succeeds late (e.g. attempt
        // 5/10) can burn most of a too-small budget on retries alone, starving the
        // test body's own assertions and surfacing as a misleading "locator.fill:
        // Test timeout exceeded" on a perfectly valid locator (confirmed via a live
        // run: 4 stale attempts + 1 success ate ~290s of a 300s budget, leaving
        // .fill() almost nothing). Sized for a worst-case 10 attempts (~50s each
        // without the old IMAP wait) plus real headroom for the test body.
        test.setTimeout(600_000);
        await goToFinancialStep(page);
    });

    test('should accept numeric input for Monthly Expected Sum Of Bills', { annotation: [{ type: 'testcase', description: "RF-36: Accept numeric input for Monthly Expected Sum Of Bills" }] }, async ({ page }) => {
        await page.getByRole('textbox', { name: /monthly expected sum|إجمالي الفواتير الصادرة/i }).fill('50000');
        await expect(page.getByRole('textbox', { name: /monthly expected sum|إجمالي الفواتير الصادرة/i })).toHaveValue('50000');
    });

    test('should accept numeric input for Expected Monthly Withdrawal', { annotation: [{ type: 'testcase', description: "RF-37: Accept numeric input for Expected Monthly Withdrawal" }] }, async ({ page }) => {
        await page.getByRole('textbox', { name: /monthly withdrawal|السحب الشهري/i }).fill('10000');
        await expect(page.getByRole('textbox', { name: /monthly withdrawal|السحب الشهري/i })).toHaveValue('10000');
    });

    test('should accept numeric input for Expected Monthly Deposit', { annotation: [{ type: 'testcase', description: "RF-38: Accept numeric input for Expected Monthly Deposit" }] }, async ({ page }) => {
        await page.getByRole('textbox', { name: /monthly deposit|الإيداع الشهري/i }).fill('20000');
        await expect(page.getByRole('textbox', { name: /monthly deposit|الإيداع الشهري/i })).toHaveValue('20000');
    });

    test('should display the Banks dropdown label', { annotation: [{ type: 'testcase', description: "RF-39: Display the Banks dropdown label" }] }, async ({ page }) => {
        // Banks/Industries only render after Section 1 is completed and the
        // internal stepper "Next" (#btn_signup, class="mat-stepper-next ...") is
        // clicked — they are not present on arrival.

        await page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i }).fill('1500');
        await page.getByRole('textbox', { name: /monthly expected sum|إجمالي الفواتير الصادرة/i }).fill('50000');
        await page.getByRole('textbox', { name: /monthly withdrawal|السحب الشهري/i }).fill('10000');
        await page.getByRole('textbox', { name: /monthly deposit|الإيداع الشهري/i }).fill('20000');

        await expect(page.locator('.floating-field-label.ng-star-inserted', { hasText: /industries|القطاعات/i })).toBeVisible();
        await selectRandomOption(page, page.locator('#mat-select-value-0'));

        await expect(page.locator('.floating-field-label.ng-star-inserted', { hasText: /annual income|الدخل السنوي/i })).toBeVisible();
        await selectRandomOption(page, page.locator('#mat-select-value-1'));

        await page.locator('.mat-stepper-next').click();

        await expect(page.getByText(/banks|البنك/i).first()).toBeVisible();
    });

    test('should open the Industries dropdown when clicked', { annotation: [{ type: 'testcase', description: "RF-40: Open the Industries dropdown when clicked" }] }, async ({ page }) => {
        // Industries is mat-select-value-0 on arrival — Banks and Annual Income are
        // mat-select-value-1 at different points (Annual Income pre-advance, Banks
        // post-advance), so index 0 is the only unambiguous one on arrival.
        await page.locator('#mat-select-value-0.mat-mdc-select-value').click();
        await expect(page.locator('mat-option').first()).toBeVisible({ timeout: 5000 });
    });

    test('should open the Annual Income dropdown when clicked', { annotation: [{ type: 'testcase', description: "RF-41: Open the Annual Income dropdown when clicked" }] }, async ({ page }) => {
        await page.locator('#mat-select-value-1.mat-mdc-select-value').click();
        await expect(page.locator('mat-option').first()).toBeVisible({ timeout: 5000 });
    });

    test('should open the Banks dropdown when clicked', { annotation: [{ type: 'testcase', description: "RF-42: Open the Banks dropdown when clicked" }] }, async ({ page }) => {
        // Banks only renders after Section 1 is completed and the internal
        // stepper "Next" (#btn_signup) is clicked — same setup as "should display
        // the Banks dropdown label" above.
        await page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i }).fill('1500');
        await page.getByRole('textbox', { name: /monthly expected sum|إجمالي الفواتير الصادرة/i }).fill('50000');
        await page.getByRole('textbox', { name: /monthly withdrawal|السحب الشهري/i }).fill('10000');
        await page.getByRole('textbox', { name: /monthly deposit|الإيداع الشهري/i }).fill('20000');

        await selectRandomOption(page, page.locator('#mat-select-value-0'));
        await selectRandomOption(page, page.locator('#mat-select-value-1'));

        await page.locator('.mat-stepper-next').click();

        const financial = new RegistrationFinancialPage(page);
        await financial.banksDropdown.click();
        await expect(page.locator('mat-option').first()).toBeVisible({ timeout: 5000 });
    });

    test('should return to Business Info tab when Back is clicked', { annotation: [{ type: 'testcase', description: "RF-43: Return to Business Info tab when Back is clicked" }] }, async ({ page }) => {
        await page.getByRole('button', { name: /back|رجوع/i }).click();
        await expect(page.locator('.mp-step.is-active .mp-step-num')).toContainText('1', { timeout: 10000 });
    });

    test('should proceed to Verification & Uploads tab when Next is clicked with valid data', { annotation: [{ type: 'testcase', description: "RF-44: Proceed to Verification & Uploads tab when Next is clicked with valid data" }] }, async ({ page }) => {
        await page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i }).fill('1500');
        await page.getByRole('textbox', { name: /monthly expected sum|إجمالي الفواتير الصادرة/i }).fill('50000');
        await page.getByRole('textbox', { name: /monthly withdrawal|السحب الشهري/i }).fill('10000');
        await page.getByRole('textbox', { name: /monthly deposit|الإيداع الشهري/i }).fill('20000');

        await selectRandomOption(page, page.locator('#mat-select-value-0.mat-mdc-select-value'));
        await selectRandomOption(page, page.locator('#mat-select-value-1.mat-mdc-select-value'));

        await page.getByRole('button', { name: /next|التالي/i }).click();
        await expect(page.locator('#register-form-title.form-title'))
            .toContainText(/verification & documents|التحقق والمستندات/i, { timeout: 10000 });
    });
});
