import { test, expect, Page } from '@playwright/test';
import { goToFinancialStep } from '../../helpers/RegistrationHelper';
import { RegistrationFinancialPage } from '../../../pageElements/Registration/RegistrationFinancialPage';

// ─────────────────────────────────────────────────────────────────────────────
// Read-only assertions share a single registered session (one beforeAll) instead
// of each re-driving the full mobile->OTP->Business Info flow. None of these
// tests fill fields, click Next/Back, or otherwise mutate the Financial step,
// so a single arrival is safe to reuse across all of them. Anything that fills
// fields, opens a dropdown overlay, or navigates away stays in the stateful
// describe block below with its own fresh registration per test.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Financial & Business Step (Tab 2 of 3) — read-only', { tag: ['@registration', '@financial', '@ui'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'ui' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let financial: RegistrationFinancialPage;

    test.beforeAll(async ({ browser }) => {
        // Same reasoning as the stateful block's beforeEach — goToFinancialStep can
        // retry up to 10 times, each a full mobile->OTP->Business Info round trip.
        // 300s cut it close (confirmed: 10/10 attempts fit exactly once, no margin
        // left) — matching the stateful block's 600_000 for real headroom.
        test.setTimeout(600_000);
        const context = await browser.newContext();
        page = await context.newPage();
        await goToFinancialStep(page);
        financial = new RegistrationFinancialPage(page);
    });

    test.afterAll(async () => { await page.close(); });

    // ── Header ────────────────────────────────────────────────────────────────

    test('should show the Financial & Business step fields on arrival', { annotation: [{ type: 'testcase', description: "RF-06: Show the Financial & Business step fields on arrival" }] }, async () => {
        await expect(page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i })).toBeVisible();
        await expect(page.getByRole('textbox', { name: /monthly expected sum|إجمالي الفواتير الصادرة/i })).toBeVisible();
        await expect(page.getByRole('textbox', { name: /monthly withdrawal|السحب الشهري/i })).toBeVisible();
        await expect(page.getByRole('textbox', { name: /monthly deposit|الإيداع الشهري/i })).toBeVisible();
        await expect(page.locator('#mat-select-value-0.mat-mdc-select-value')).toBeVisible();
        await expect(page.locator('#mat-select-value-1.mat-mdc-select-value')).toBeVisible();
        await expect(page.getByRole('button', { name: /back|رجوع/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /next|التالي/i })).toBeVisible();
        await expect(page.locator('.mp-step.is-active .mp-step-meta .mp-step-num')).toContainText('1');
    });

    // ── Step indicator ────────────────────────────────────────────────────────

    test('should show the Financial & Business tab as active', { annotation: [{ type: 'testcase', description: "RF-07: Show the Financial & Business tab as active" }] }, async () => {
        await expect(page.locator('#register-form-title.form-title')).toContainText(/financial|البيانات المالية/i);
    });

    test('should mark the Financial & Business inner tab as active (is-active)', { annotation: [{ type: 'testcase', description: "RF-08: Mark the Financial & Business inner tab as active (is-active)" }] }, async () => {
        await expect(page.locator('.mp-stepbar .mp-step.is-active')).toBeVisible();
    });

    test('should display all four step indicators', { annotation: [{ type: 'testcase', description: "RF-09: Display all four step indicators" }] }, async () => {
        await expect(page.getByText(/business info|بيانات النشاط/i).first()).toBeVisible();
        await expect(page.getByText(/nafath|نَفاذ|نفاذ/i).first()).toBeVisible();
        await expect(page.getByText(/products|المنتجات/i).first()).toBeVisible();
        await expect(page.getByText(/contract|العقد/i).first()).toBeVisible();
    });

    // ── Monthly Expected Number of Bills ──────────────────────────────────────

    test('should display the Monthly Expected Number Of Bills label', { annotation: [{ type: 'testcase', description: "RF-10: Display the Monthly Expected Number Of Bills label" }] }, async () => {
        await expect(page.getByText(/monthly expected number of bills|العدد الشهري المتوقع للفواتير/i).first()).toBeVisible();
    });

    test('should display the Monthly Expected Number Of Bills field', { annotation: [{ type: 'testcase', description: "RF-11: Display the Monthly Expected Number Of Bills field" }] }, async () => {
        await expect(page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i })).toBeVisible();
    });

    test('should show the correct placeholder for Monthly Expected Number Of Bills', { annotation: [{ type: 'testcase', description: "RF-12: Show the correct placeholder for Monthly Expected Number Of Bills" }] }, async () => {
        await expect(page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i }))
            .toHaveAttribute('placeholder', /2000/i);
    });

    // ── Monthly Expected Sum of Bills ─────────────────────────────────────────

    test('should display the Monthly Expected Sum Of Bills label', { annotation: [{ type: 'testcase', description: "RF-13: Display the Monthly Expected Sum Of Bills label" }] }, async () => {
        await expect(page.getByText(/monthly expected sum of bills|إجمالي الفواتير الصادرة/i).first()).toBeVisible();
    });

    test('should display the Monthly Expected Sum Of Bills field', { annotation: [{ type: 'testcase', description: "RF-14: Display the Monthly Expected Sum Of Bills field" }] }, async () => {
        await expect(page.getByRole('textbox', { name: /monthly expected sum|إجمالي الفواتير الصادرة/i })).toBeVisible();
    });

    test('should show the correct placeholder for Monthly Expected Sum Of Bills', { annotation: [{ type: 'testcase', description: "RF-15: Show the correct placeholder for Monthly Expected Sum Of Bills" }] }, async () => {
        await expect(page.getByRole('textbox', { name: /monthly expected sum|إجمالي الفواتير الصادرة/i }))
            .toHaveAttribute('placeholder', /2000/i);
    });

    // ── Expected Monthly Withdrawal ───────────────────────────────────────────

    test('should display the Expected Monthly Withdrawal label', { annotation: [{ type: 'testcase', description: "RF-16: Display the Expected Monthly Withdrawal label" }] }, async () => {
        await expect(page.getByText(/expected monthly withdrawal|السحب الشهري/i).first()).toBeVisible();
    });

    test('should display the Expected Monthly Withdrawal field', { annotation: [{ type: 'testcase', description: "RF-17: Display the Expected Monthly Withdrawal field" }] }, async () => {
        await expect(page.getByRole('textbox', { name: /monthly withdrawal|السحب الشهري/i })).toBeVisible();
    });

    test('should show the correct placeholder for Expected Monthly Withdrawal', { annotation: [{ type: 'testcase', description: "RF-18: Show the correct placeholder for Expected Monthly Withdrawal" }] }, async () => {
        await expect(page.getByRole('textbox', { name: /monthly withdrawal|السحب الشهري/i }))
            .toHaveAttribute('placeholder', /2000/i);
    });

    // ── Expected Monthly Deposit ──────────────────────────────────────────────

    test('should display the Expected Monthly Deposit label', { annotation: [{ type: 'testcase', description: "RF-19: Display the Expected Monthly Deposit label" }] }, async () => {
        await expect(page.getByText(/expected monthly deposit|الإيداع الشهري/i).first()).toBeVisible();
    });

    test('should display the Expected Monthly Deposit field', { annotation: [{ type: 'testcase', description: "RF-20: Display the Expected Monthly Deposit field" }] }, async () => {
        await expect(page.getByRole('textbox', { name: /monthly deposit|الإيداع الشهري/i })).toBeVisible();
    });

    test('should show the correct placeholder for Expected Monthly Deposit', { annotation: [{ type: 'testcase', description: "RF-21: Show the correct placeholder for Expected Monthly Deposit" }] }, async () => {
        await expect(page.getByRole('textbox', { name: /monthly deposit|الإيداع الشهري/i }))
            .toHaveAttribute('placeholder', /2000/i);
    });

    // ── Industries dropdown ───────────────────────────────────────────────────
    // Industries and Annual Income are the only two dropdowns present on arrival
    // (mat-select-value-0 and -1 respectively) — Banks does not render until the
    // internal sub-step "Next" (#btn_signup) is clicked, see the stateful
    // "should display the Banks dropdown label" test below.

    test('should display the Industries dropdown label', { annotation: [{ type: 'testcase', description: "RF-22: Display the Industries dropdown label" }] }, async () => {
        await expect(page.getByText(/industries|القطاعات/i).first()).toBeVisible();
    });

    test('should display the Industries dropdown', { annotation: [{ type: 'testcase', description: "RF-23: Display the Industries dropdown" }] }, async () => {
        await expect(page.locator('#mat-select-value-0.mat-mdc-select-value')).toBeVisible();
    });

    test('should show "Select Option" as the default for Industries', { annotation: [{ type: 'testcase', description: "RF-24: Show \"Select Option\" as the default for Industries" }] }, async () => {
        // Matches the diacritic-independent prefix "اختر خيار" rather than the full
        // word with its trailing tanween fatha — the app renders that mark as
        // alef-then-diacritic ("خياراً"), while a literal "اختر خيارًا" in the regex
        // encodes diacritic-then-alef, a different Unicode sequence for the same
        // "select an option" reading. Confirmed live: toContainText timed out
        // against the real rendered text ("اختر خياراً") because of that byte-level
        // mismatch, not a timing/rendering issue.
        await expect(page.locator('#mat-select-value-0 .mat-mdc-select-placeholder.mat-mdc-select-min-line.ng-star-inserted')).toContainText(/select option|اختر خيار/i);
    });

    // ── Annual Income dropdown ────────────────────────────────────────────────
    // Scoped via the mat-select's data-testid rather than the floating label's
    // "for" id — that id is an Angular-wide auto-increment counter
    // ("floating-dropdown-annualincomecode-N") that shifts whenever an unrelated
    // field earlier on the page is added/removed, which is exactly what broke
    // the previous hardcoded "-10" locator.

    test('should display the Annual Income dropdown label', { annotation: [{ type: 'testcase', description: "RF-25: Display the Annual Income dropdown label" }] }, async () => {
        await expect(
            page.locator('.floating-field-shell', { has: page.locator('[data-testid="register-annual-income"]') })
                .locator('label.floating-field-label')
        ).toContainText(/annual income|الدخل السنوي/i);
    });

    test('should display the Annual Income dropdown', { annotation: [{ type: 'testcase', description: "RF-26: Display the Annual Income dropdown" }] }, async () => {
        await expect(page.locator('[data-testid="register-annual-income"]')).toBeVisible();
    });

    test('should show "Select Option" as the default for Annual Income', { annotation: [{ type: 'testcase', description: "RF-27: Show \"Select Option\" as the default for Annual Income" }] }, async () => {
        // See the matching Industries test above for why this matches the
        // diacritic-independent prefix rather than the full word.
        await expect(page.locator('#mat-select-value-1 .mat-mdc-select-placeholder.mat-mdc-select-min-line.ng-star-inserted')).toContainText(/select option|اختر خيار/i);
    });

    // ── Navigation buttons ────────────────────────────────────────────────────

    test('should display the Back button', { annotation: [{ type: 'testcase', description: "RF-28: Display the Back button" }] }, async () => {
        await expect(page.getByRole('button', { name: /back|رجوع/i })).toBeVisible();
    });

    test('should display the Next button', { annotation: [{ type: 'testcase', description: "RF-29: Display the Next button" }] }, async () => {
        await expect(page.getByRole('button', { name: /next|التالي/i })).toBeVisible();
    });

    test('should keep Next disabled when required fields are empty', { annotation: [{ type: 'testcase', description: "RF-30: Keep Next disabled when required fields are empty" }] }, async () => {
        await expect(page.getByRole('button', { name: /next|التالي/i })).toBeDisabled();
    });

    // ── Footer ────────────────────────────────────────────────────────────────

    test('should display "Already have an account?" text', { annotation: [{ type: 'testcase', description: "RF-31: Display \"Already have an account?\" text" }] }, async () => {
        await expect(page.locator('#login-line.new-user span').filter({ visible: true }).first()).toBeVisible();
    });

    test('should display the Log In link', { annotation: [{ type: 'testcase', description: "RF-32: Display the Log In link" }] }, async () => {
        await expect(financial.loginLink).toContainText(/log.?in|تسجيل الدخول/i);
    });

    test('should display "By continuing, you agree to our" text', { annotation: [{ type: 'testcase', description: "RF-33: Display \"By continuing, you agree to our\" text" }] }, async () => {
        // .filter({ visible: true }) is required here — like the "Already have an
        // account?" test above, .first() alone can land on a hidden duplicate
        // (Angular CDK a11y live-announcer clone) instead of the rendered span.
        await expect(
            page.locator('#login-line span', { hasText: /By continuing, you agree to our|بالمتابعة، فإنك توافق على/i })
                .filter({ visible: true }).first()
        ).toBeVisible();
    });

    test('should display Terms & Conditions link', { annotation: [{ type: 'testcase', description: "RF-34: Display Terms & Conditions link" }] }, async () => {
        await expect(page.locator('span.text-primary.link').filter({ hasText: /terms & conditions|الشروط والأحكام/i }).filter({ visible: true }).first()).toBeVisible();
    });

    test('should display Privacy Policy link', { annotation: [{ type: 'testcase', description: "RF-35: Display Privacy Policy link" }] }, async () => {
        await expect(page.locator('span.text-primary.link').filter({ hasText: /privacy policy|سياسة الخصوصية/i }).filter({ visible: true }).first()).toBeVisible();
    });
});
