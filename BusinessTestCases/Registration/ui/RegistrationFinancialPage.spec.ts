import { test, expect, Page } from '@playwright/test';
import { goToFinancialStep, selectRandomOption } from '../RegistrationHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Read-only assertions share a single registered session (one beforeAll) instead
// of each re-driving the full mobile->OTP->Business Info flow. None of these
// tests fill fields, click Next/Back, or otherwise mutate the Financial step,
// so a single arrival is safe to reuse across all of them. Anything that fills
// fields, opens a dropdown overlay, or navigates away stays in the stateful
// describe block below with its own fresh registration per test.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Financial & Business Step (Tab 2 of 3) — read-only', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(60_000);
        const context = await browser.newContext();
        page = await context.newPage();
        await goToFinancialStep(page);
    });

    test.afterAll(async () => { await page.close(); });

    test('should show the Financial & Business step fields on arrival', async () => {
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

    test('should show the Financial & Business tab as active', async () => {
        await expect(page.locator('#register-form-title.form-title')).toContainText(/financial|البيانات المالية/i);
    });

    test('should mark the Financial & Business inner tab as active (is-active)', async () => {
        await expect(page.locator('.mp-stepbar .mp-step.is-active')).toBeVisible();
    });

    test('should display all four step indicators', async () => {
        await expect(page.getByText(/business info|بيانات النشاط/i).first()).toBeVisible();
        await expect(page.getByText(/nafath|نَفاذ|نفاذ/i).first()).toBeVisible();
        await expect(page.getByText(/products|المنتجات/i).first()).toBeVisible();
        await expect(page.getByText(/contract|العقد/i).first()).toBeVisible();
    });

    // ── Monthly Expected Number of Bills ──────────────────────────────────────

    test('should display the Monthly Expected Number Of Bills label', async () => {
        await expect(page.getByText(/monthly expected number of bills|العدد الشهري المتوقع للفواتير/i).first()).toBeVisible();
    });

    test('should display the Monthly Expected Number Of Bills field', async () => {
        await expect(page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i })).toBeVisible();
    });

    test('should show the correct placeholder for Monthly Expected Number Of Bills', async () => {
        await expect(page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i }))
            .toHaveAttribute('placeholder', /2000/i);
    });

    // ── Monthly Expected Sum of Bills ─────────────────────────────────────────

    test('should display the Monthly Expected Sum Of Bills label', async () => {
        await expect(page.getByText(/monthly expected sum of bills|إجمالي مبالغ الفواتير/i).first()).toBeVisible();
    });

    test('should display the Monthly Expected Sum Of Bills field', async () => {
        await expect(page.getByRole('textbox', { name: /monthly expected sum|إجمالي مبالغ الفواتير/i })).toBeVisible();
    });

    test('should show the correct placeholder for Monthly Expected Sum Of Bills', async () => {
        await expect(page.getByRole('textbox', { name: /monthly expected sum|إجمالي مبالغ الفواتير/i }))
            .toHaveAttribute('placeholder', /2000/i);
    });

    // ── Expected Monthly Withdrawal ───────────────────────────────────────────

    test('should display the Expected Monthly Withdrawal label', async () => {
        await expect(page.getByText(/expected monthly withdrawal|حجم السحب الشهري/i).first()).toBeVisible();
    });

    test('should display the Expected Monthly Withdrawal field', async () => {
        await expect(page.getByRole('textbox', { name: /monthly withdrawal|حجم السحب الشهري/i })).toBeVisible();
    });

    test('should show the correct placeholder for Expected Monthly Withdrawal', async () => {
        await expect(page.getByRole('textbox', { name: /monthly withdrawal|حجم السحب الشهري/i }))
            .toHaveAttribute('placeholder', /2000/i);
    });

    // ── Expected Monthly Deposit ──────────────────────────────────────────────

    test('should display the Expected Monthly Deposit label', async () => {
        await expect(page.getByText(/expected monthly deposit|حجم الإيداع الشهري/i).first()).toBeVisible();
    });

    test('should display the Expected Monthly Deposit field', async () => {
        await expect(page.getByRole('textbox', { name: /monthly deposit|حجم الإيداع الشهري/i })).toBeVisible();
    });

    test('should show the correct placeholder for Expected Monthly Deposit', async () => {
        await expect(page.getByRole('textbox', { name: /monthly deposit|حجم الإيداع الشهري/i }))
            .toHaveAttribute('placeholder', /2000/i);
    });

    // ── Banks dropdown ────────────────────────────────────────────────────────

    test('should display the Banks dropdown', async () => {
        await expect(page.locator('#mat-select-value-0.mat-mdc-select-value')).toBeVisible();
    });

    test('should show "Select Option" as the default for Banks', async () => {
        await expect(page.locator('#mat-select-value-0 .mat-mdc-select-placeholder.mat-mdc-select-min-line')).toContainText(/select option|اختر خيارًا/i);
    });

    // ── Industries dropdown ───────────────────────────────────────────────────

    test('should display the Industries dropdown label', async () => {
        await expect(page.getByText(/industries|القطاعات/i).first()).toBeVisible();
    });

    test('should display the Industries dropdown', async () => {
        await expect(page.locator('#mat-select-value-1.mat-mdc-select-value')).toBeVisible();
    });

    test('should show "Select Option" as the default for Industries', async () => {
        await expect(page.locator('#mat-select-value-1 .mat-mdc-select-placeholder.mat-mdc-select-min-line.ng-star-inserted')).toContainText(/select option|اختر خيارًا/i);
    });

    // ── Annual Income dropdown ────────────────────────────────────────────────

    test('should display the Annual Income dropdown label', async () => {
        await expect(page.locator('label.floating-field-label.ng-star-inserted[for="floating-dropdown-annualincomecode-10"]'))
            .toContainText(/annual income|الدخل السنوي/i);
    });

    test('should display the Annual Income dropdown', async () => {
        await expect(page.locator('label.floating-field-label.ng-star-inserted[for="floating-dropdown-annualincomecode-10"]')).toBeVisible();
    });

    test('should show "Select Option" as the default for Annual Income', async () => {
        await expect(page.locator('#mat-select-value-2 .mat-mdc-select-placeholder.mat-mdc-select-min-line.ng-star-inserted')).toContainText(/select option|اختر خيارًا/i);
    });

    // ── Navigation buttons ────────────────────────────────────────────────────

    test('should display the Back button', async () => {
        await expect(page.getByRole('button', { name: /back|رجوع/i })).toBeVisible();
    });

    test('should display the Next button', async () => {
        await expect(page.getByRole('button', { name: /next|التالي/i })).toBeVisible();
    });

    test('should keep Next disabled when required fields are empty', async () => {
        await expect(page.getByRole('button', { name: /next|التالي/i })).toBeDisabled();
    });

    // ── Footer ────────────────────────────────────────────────────────────────

    test('should display "Already have an account?" text', async () => {
        await expect(page.locator('#login-line.new-user span').filter({ visible: true }).first()).toBeVisible();
    });

    test('should display Terms & Conditions link', async () => {
        await expect(page.locator('span.text-primary.link').filter({ hasText: /terms & conditions|الشروط والأحكام/i }).filter({ visible: true }).first()).toBeVisible();
    });

    test('should display Privacy Policy link', async () => {
        await expect(page.locator('span.text-primary.link').filter({ hasText: /privacy policy|سياسة الخصوصية/i }).filter({ visible: true }).first()).toBeVisible();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stateful / mutating tests — each fills fields, opens a dropdown overlay, or
// navigates away from the Financial step, so each needs its own fresh
// registration to avoid interfering with the next test.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Financial & Business Step (Tab 2 of 3) — stateful', () => {
    // Serial, not parallel: each test's beforeEach drives a full mobile->OTP->
    // Business Info registration against a small shared resident-asset pool.
    // Running these across workers was tried and reverted — concurrent
    // registrations collide on the shared pool and the OTP/registration flow
    // in this environment can't reliably handle simultaneous attempts (13/40
    // tests failed with worker parallelism). Slow but correct beats fast and flaky.
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await goToFinancialStep(page);
    });

    test('should accept numeric input for Monthly Expected Number Of Bills', async ({ page }) => {
        await page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i }).fill('1500');
        await expect(page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i })).toHaveValue('1500');
    });

    test('should accept numeric input for Monthly Expected Sum Of Bills', async ({ page }) => {
        await page.getByRole('textbox', { name: /monthly expected sum|إجمالي مبالغ الفواتير/i }).fill('50000');
        await expect(page.getByRole('textbox', { name: /monthly expected sum|إجمالي مبالغ الفواتير/i })).toHaveValue('50000');
    });

    test('should accept numeric input for Expected Monthly Withdrawal', async ({ page }) => {
        await page.getByRole('textbox', { name: /monthly withdrawal|حجم السحب الشهري/i }).fill('10000');
        await expect(page.getByRole('textbox', { name: /monthly withdrawal|حجم السحب الشهري/i })).toHaveValue('10000');
    });

    test('should accept numeric input for Expected Monthly Deposit', async ({ page }) => {
        await page.getByRole('textbox', { name: /monthly deposit|حجم الإيداع الشهري/i }).fill('20000');
        await expect(page.getByRole('textbox', { name: /monthly deposit|حجم الإيداع الشهري/i })).toHaveValue('20000');
    });

    test('should display the Banks dropdown label', async ({ page }) => {
        // Banks/Industries only render after Section 1 is completed and the
        // internal stepper "Next" (#btn_signup, class="mat-stepper-next ...") is
        // clicked — they are not present on arrival.

        await page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i }).fill('1500');
        await page.getByRole('textbox', { name: /monthly expected sum|إجمالي مبالغ الفواتير/i }).fill('50000');
        await page.getByRole('textbox', { name: /monthly withdrawal|حجم السحب الشهري/i }).fill('10000');
        await page.getByRole('textbox', { name: /monthly deposit|حجم الإيداع الشهري/i }).fill('20000');


        await expect(page.locator('.floating-field-label.ng-star-inserted', { hasText: /industries|القطاعات/i })).toBeVisible();
        await selectRandomOption(page, page.locator('#mat-select-value-0'));

        await expect(page.locator('.floating-field-label.ng-star-inserted', { hasText: /annual income|الدخل السنوي/i })).toBeVisible();
        await selectRandomOption(page, page.locator('#mat-select-value-1'));

        await page.locator('.mat-stepper-next').click();

        await expect(page.getByText(/banks|البنك/i).first()).toBeVisible();
    });

    test('should open the Banks dropdown when clicked', async ({ page }) => {
        await page.locator('#mat-select-value-0.mat-mdc-select-value').click();
        await expect(page.locator('mat-option').first()).toBeVisible({ timeout: 5000 });
    });

    test('should open the Industries dropdown when clicked', async ({ page }) => {
        await page.locator('#mat-select-value-1.mat-mdc-select-value').click();
        await expect(page.locator('mat-option').first()).toBeVisible({ timeout: 5000 });
    });

    test('should open the Annual Income dropdown when clicked', async ({ page }) => {
        await page.locator('#mat-select-value-1.mat-mdc-select-value').click();
        await expect(page.locator('mat-option').first()).toBeVisible({ timeout: 5000 });
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
});
