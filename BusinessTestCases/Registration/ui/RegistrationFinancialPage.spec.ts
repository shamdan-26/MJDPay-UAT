import { test, expect } from '@playwright/test';
import { REGISTER_URL, goToFinancialStep, selectRandomOption } from '../RegistrationHelper';

test.describe('Registration – Financial & Business Step (Tab 2 of 3)', () => {
    // Serial, not parallel: each test's beforeEach drives a full mobile->OTP->
    // Business Info registration against a small shared resident-asset pool.
    // Running these across workers was tried and reverted — concurrent
    // registrations collide on the shared pool and the OTP/registration flow
    // in this environment can't reliably handle simultaneous attempts (13/40
    // tests failed with worker parallelism). Slow but correct beats fast and flaky.
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await goToFinancialStep(page);
    });

    test('should show the Financial & Business step fields on arrival', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i })).toBeVisible();
        await expect(page.getByRole('textbox', { name: /monthly expected sum|إجمالي مبالغ الفواتير/i })).toBeVisible();
        await expect(page.getByRole('textbox', { name: /monthly withdrawal|حجم السحب الشهري/i })).toBeVisible();
        await expect(page.getByRole('textbox', { name: /monthly deposit|حجم الإيداع الشهري/i })).toBeVisible();
        await expect(page.locator('#mat-select-value-0.mat-mdc-select-value')).toBeVisible();
        await expect(page.locator('#mat-select-value-1.mat-mdc-select-value')).toBeVisible();
        await expect(page.getByRole('button', { name: /back|رجوع/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /next|التالي/i })).toBeVisible();
        await expect(page.locator('.mp-step.is-active .mp-step-meta .mp-step-num')).toContainText('1');
    });

    // ── Step indicator ────────────────────────────────────────────────────────

    test('should show the Financial & Business tab as active', async ({ page }) => {
        await expect(page.locator('#register-form-title.form-title')).toContainText(/financial|البيانات المالية/i);
    });

    test('should mark the Financial & Business inner tab as active (is-active)', async ({ page }) => {
        await expect(page.locator('.mp-stepbar .mp-step.is-active')).toBeVisible();
    });

    test('should display all four step indicators', async ({ page }) => {
        await expect(page.getByText(/business info|بيانات النشاط/i).first()).toBeVisible();
        await expect(page.getByText(/nafath|نَفاذ|نفاذ/i).first()).toBeVisible();
        await expect(page.getByText(/products|المنتجات/i).first()).toBeVisible();
        await expect(page.getByText(/contract|العقد/i).first()).toBeVisible();
    });

    // ── Monthly Expected Number of Bills ──────────────────────────────────────

    test('should display the Monthly Expected Number Of Bills label', async ({ page }) => {
        await expect(page.getByText(/monthly expected number of bills|العدد الشهري المتوقع للفواتير/i).first()).toBeVisible();
    });

    test('should display the Monthly Expected Number Of Bills field', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i })).toBeVisible();
    });

    test('should show the correct placeholder for Monthly Expected Number Of Bills', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i }))
            .toHaveAttribute('placeholder', /2000/i);
    });

    test('should accept numeric input for Monthly Expected Number Of Bills', async ({ page }) => {
        await page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i }).fill('1500');
        await expect(page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i })).toHaveValue('1500');
    });

    // ── Monthly Expected Sum of Bills ─────────────────────────────────────────

    test('should display the Monthly Expected Sum Of Bills label', async ({ page }) => {
        await expect(page.getByText(/monthly expected sum of bills|إجمالي مبالغ الفواتير/i).first()).toBeVisible();
    });

    test('should display the Monthly Expected Sum Of Bills field', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /monthly expected sum|إجمالي مبالغ الفواتير/i })).toBeVisible();
    });

    test('should show the correct placeholder for Monthly Expected Sum Of Bills', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /monthly expected sum|إجمالي مبالغ الفواتير/i }))
            .toHaveAttribute('placeholder', /2000/i);
    });

    test('should accept numeric input for Monthly Expected Sum Of Bills', async ({ page }) => {
        await page.getByRole('textbox', { name: /monthly expected sum|إجمالي مبالغ الفواتير/i }).fill('50000');
        await expect(page.getByRole('textbox', { name: /monthly expected sum|إجمالي مبالغ الفواتير/i })).toHaveValue('50000');
    });

    // ── Expected Monthly Withdrawal ───────────────────────────────────────────

    test('should display the Expected Monthly Withdrawal label', async ({ page }) => {
        await expect(page.getByText(/expected monthly withdrawal|حجم السحب الشهري/i).first()).toBeVisible();
    });

    test('should display the Expected Monthly Withdrawal field', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /monthly withdrawal|حجم السحب الشهري/i })).toBeVisible();
    });

    test('should show the correct placeholder for Expected Monthly Withdrawal', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /monthly withdrawal|حجم السحب الشهري/i }))
            .toHaveAttribute('placeholder', /2000/i);
    });

    test('should accept numeric input for Expected Monthly Withdrawal', async ({ page }) => {
        await page.getByRole('textbox', { name: /monthly withdrawal|حجم السحب الشهري/i }).fill('10000');
        await expect(page.getByRole('textbox', { name: /monthly withdrawal|حجم السحب الشهري/i })).toHaveValue('10000');
    });

    // ── Expected Monthly Deposit ──────────────────────────────────────────────

    test('should display the Expected Monthly Deposit label', async ({ page }) => {
        await expect(page.getByText(/expected monthly deposit|حجم الإيداع الشهري/i).first()).toBeVisible();
    });

    test('should display the Expected Monthly Deposit field', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /monthly deposit|حجم الإيداع الشهري/i })).toBeVisible();
    });

    test('should show the correct placeholder for Expected Monthly Deposit', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /monthly deposit|حجم الإيداع الشهري/i }))
            .toHaveAttribute('placeholder', /2000/i);
    });

    test('should accept numeric input for Expected Monthly Deposit', async ({ page }) => {
        await page.getByRole('textbox', { name: /monthly deposit|حجم الإيداع الشهري/i }).fill('20000');
        await expect(page.getByRole('textbox', { name: /monthly deposit|حجم الإيداع الشهري/i })).toHaveValue('20000');
    });

    // ── Banks dropdown ────────────────────────────────────────────────────────

    test('should display the Banks dropdown label', async ({ page }) => {
        // Banks/Industries only render after Section 1 is completed and the
        // internal stepper "Next" (#btn_signup, class="mat-stepper-next ...") is
        // clicked — they are not present on arrival.

        await page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i }).fill('1500');
        await page.getByRole('textbox', { name: /monthly expected sum|إجمالي مبالغ الفواتير/i }).fill('50000');
        await page.getByRole('textbox', { name: /monthly withdrawal|حجم السحب الشهري/i }).fill('10000');
        await page.getByRole('textbox', { name: /monthly deposit|حجم الإيداع الشهري/i }).fill('20000');


        await expect(page.locator('.floating-field-label.ng-star-inserted', { hasText: /industries|القطاعات/i })).toBeVisible();
        await selectRandomOption(page, page.locator('[id^="floating-dropdown-industries"], [id^="floating-dropdown-القطاعات"]'));

        await expect(page.locator('.floating-field-label.ng-star-inserted', { hasText: /annual income|الدخل السنوي/i })).toBeVisible();
        await selectRandomOption(page, page.locator('[id^="floating-dropdown-annual-income"], [id^="floating-dropdown-الدخل-السنوي"]'));

        await page.locator('.mat-stepper-next').click();

        await expect(page.getByText(/banks|البنك/i).first()).toBeVisible();
    });

    test('should display the Banks dropdown', async ({ page }) => {
        await expect(page.locator('#mat-select-value-0.mat-mdc-select-value')).toBeVisible();
    });

    test('should show "Select Option" as the default for Banks', async ({ page }) => {
        await expect(page.locator('#mat-select-value-0 .mat-mdc-select-placeholder.mat-mdc-select-min-line')).toContainText(/select option|اختر خيارًا/i);
    });

    test('should open the Banks dropdown when clicked', async ({ page }) => {
        await page.locator('#mat-select-value-0.mat-mdc-select-value').click();
        await expect(page.locator('mat-option').first()).toBeVisible({ timeout: 5000 });
    });

    // ── Industries dropdown ───────────────────────────────────────────────────

    test('should display the Industries dropdown label', async ({ page }) => {
        await expect(page.getByText(/industries|القطاعات/i).first()).toBeVisible();
    });

    test('should display the Industries dropdown', async ({ page }) => {
        await expect(page.locator('#mat-select-value-1.mat-mdc-select-value')).toBeVisible();
    });

    test('should show "Select Option" as the default for Industries', async ({ page }) => {
        await expect(page.locator('#mat-select-value-1 .mat-mdc-select-placeholder.mat-mdc-select-min-line.ng-star-inserted')).toContainText(/select option|اختر خيارًا/i);
    });

    test('should open the Industries dropdown when clicked', async ({ page }) => {
        await page.locator('#mat-select-value-1.mat-mdc-select-value').click();
        await expect(page.locator('mat-option').first()).toBeVisible({ timeout: 5000 });
    });

    // ── Annual Income dropdown ────────────────────────────────────────────────

    test('should display the Annual Income dropdown label', async ({ page }) => {
        await expect(page.getByText(/annual income|الدخل السنوي/i).first()).toBeVisible();
    });

    test('should display the Annual Income dropdown', async ({ page }) => {
        await expect(page.locator('[id^="floating-dropdown-annual-income"].mat-mdc-select.mat-mdc-select-empty, [id^="floating-dropdown-الدخل-السنوي"].mat-mdc-select.mat-mdc-select-empty')).toBeVisible();
    });

    test('should show "Select Option" as the default for Annual Income', async ({ page }) => {
        await expect(page.locator('#mat-select-value-2 .mat-mdc-select-placeholder.mat-mdc-select-min-line.ng-star-inserted')).toContainText(/select option|اختر خيارًا/i);
    });

    test('should open the Annual Income dropdown when clicked', async ({ page }) => {
        await page.locator('[id^="floating-dropdown-annual-income"].mat-mdc-select.mat-mdc-select-empty, [id^="floating-dropdown-الدخل-السنوي"].mat-mdc-select.mat-mdc-select-empty').click();
        await expect(page.locator('mat-option').first()).toBeVisible({ timeout: 5000 });
    });

    // ── Navigation buttons ────────────────────────────────────────────────────

    test('should display the Back button', async ({ page }) => {
        await expect(page.getByRole('button', { name: /back|رجوع/i })).toBeVisible();
    });

    test('should display the Next button', async ({ page }) => {
        await expect(page.getByRole('button', { name: /next|التالي/i })).toBeVisible();
    });

    test('should keep Next disabled when required fields are empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: /next|التالي/i })).toBeDisabled();
    });

    test('should return to Business Info tab when Back is clicked', async ({ page }) => {
        await page.getByRole('button', { name: /back|رجوع/i }).click();
        await expect(page.locator('.mp-step.is-active .mp-step-num')).toContainText('1', { timeout: 10000 });
    });

    test('should proceed to Verification & Uploads tab when Next is clicked with valid data', async ({ page }) => {
        await page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i }).fill('1500');
        await page.getByRole('textbox', { name: /monthly expected sum|إجمالي مبالغ الفواتير/i }).fill('50000');
        await page.getByRole('textbox', { name: /monthly withdrawal|حجم السحب الشهري/i }).fill('10000');
        await page.getByRole('textbox', { name: /monthly deposit|حجم الإيداع الشهري/i }).fill('20000');

        await selectRandomOption(page, page.locator('#mat-select-value-0.mat-mdc-select-value'));
        await selectRandomOption(page, page.locator('#mat-select-value-1.mat-mdc-select-value'));

        await page.getByRole('button', { name: /next|التالي/i }).click();
        await expect(page.locator('#register-form-title.form-title'))
            .toContainText(/verification & documents|التحقق والمستندات/i, { timeout: 10000 });
    });

    // ── Footer ────────────────────────────────────────────────────────────────

    test('should display "Already have an account?" text', async ({ page }) => {
        await expect(page.locator('#login-line.new-user span').filter({ visible: true }).first()).toBeVisible();
    });

    test('should display Terms & Conditions link', async ({ page }) => {
        await expect(page.locator('span.text-primary.link').filter({ hasText: /terms & conditions|الشروط والأحكام/i }).filter({ visible: true }).first()).toBeVisible();
    });

    test('should display Privacy Policy link', async ({ page }) => {
        await expect(page.locator('span.text-primary.link').filter({ hasText: /privacy policy|سياسة الخصوصية/i }).filter({ visible: true }).first()).toBeVisible();
    });
});
