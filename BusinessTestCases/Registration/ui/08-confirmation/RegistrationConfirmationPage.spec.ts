import { test, expect, Page } from '@playwright/test';
import { goToConfirmationStepMocked, goToContractStepMocked, apiError, json, CONTRACT_ACCEPT } from '../../helpers/RegistrationHelper';
import { RegistrationConfirmationPage } from '../../../pageElements/Registration/RegistrationConfirmationPage';
import { RegistrationContractPage } from '../../../pageElements/Registration/RegistrationContractPage';

// ─────────────────────────────────────────────────────────────────────────────
// Registration — Confirmation screen (final screen after "Submit and finish"): elements, layout, theme, responsive
// behaviour and the states around the submit call. Reached with no real OTP and no pool identity: OTP bypass +
// Business Info answered with "products assigned" flags (resumes at Contract) + the contract/accept call mocked 200.
// The live end-to-end behaviour (DB state, notifications, Back/refresh, double submit) is covered by
// functional/08-confirmation/RegistrationConfirmation.spec.ts; this file is element / layout / state only.
//
// Written against the locators in RegistrationConfirmationPage.ts (confirmed live on dev 2026-10-09, Arabic default).
// The mocked accept body ({}) is unconfirmed — if the app needs fields from the real response, adjust
// goToConfirmationStepMocked in helpers/registrationMocks.ts.
// ─────────────────────────────────────────────────────────────────────────────

const TAGS = { tag: ['@registration', '@confirmation', '@ui'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'ui' }] };

test.describe('Registration — Confirmation screen', TAGS, () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let confirmation: RegistrationConfirmationPage;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(150_000);
        const context = await browser.newContext();
        page = await context.newPage();
        await goToConfirmationStepMocked(page);
        confirmation = new RegistrationConfirmationPage(page);
    });

    test.afterAll(async () => { await page.close(); });

    // ── Content ──────────────────────────────────────────────────────────────

    test('should display the "registration request received" heading', { annotation: [{ type: 'testcase', description: "RG-CONF-01: Display the registration request received heading" }] }, async () => {
        await expect(confirmation.heading).toBeVisible();
        await expect(confirmation.heading).toContainText('تم استلام طلب التسجيل');
    });

    test('should display the account-ready message', { annotation: [{ type: 'testcase', description: "RG-CONF-02: Display the account-ready message" }] }, async () => {
        await expect(confirmation.message).toBeVisible();
        await expect(confirmation.message).toContainText('حسابك جاهز');
    });

    test('should tell the applicant to check their email', { annotation: [{ type: 'testcase', description: "RG-CONF-03: Tell the applicant to check their email" }] }, async () => {
        await expect(page.getByText(/يرجى مراجعة بريدك الإلكتروني/)).toBeVisible();
    });

    test('should display the Login button with its Arabic label and keep it enabled', { annotation: [{ type: 'testcase', description: "RG-CONF-04: Display the Login button with its Arabic label and keep it enabled" }] }, async () => {
        await expect(confirmation.loginButton).toBeVisible();
        await expect(confirmation.loginButton).toBeEnabled();
        await expect(confirmation.loginButton).toContainText('سجّل الدخول إلى حسابك');
    });

    test('should offer exactly one next action', { annotation: [{ type: 'testcase', description: "RG-CONF-05: Offer exactly one next action" }] }, async () => {
        await expect(page.getByTestId('register-finish-login-btn')).toHaveCount(1);
        await expect(page.getByTestId('register-contract-submit-btn')).toHaveCount(0);
        await expect(page.getByTestId('register-contract-accept-checkbox')).toHaveCount(0);
    });

    test('should not show any input field', { annotation: [{ type: 'testcase', description: "RG-CONF-06: Not show any input field" }] }, async () => {
        await expect(page.getByRole('textbox')).toHaveCount(0);
        await expect(page.getByRole('checkbox')).toHaveCount(0);
    });

    test('should not show raw translation keys or placeholder text', { annotation: [{ type: 'testcase', description: "RG-CONF-07: Not show raw translation keys or placeholder text" }] }, async () => {
        const text = await confirmation.bodyText();
        expect(text).not.toMatch(/\b[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}\b/);
        expect(text).not.toMatch(/undefined|null|NaN|\{\{|\}\}/);
    });

    // ── Header ───────────────────────────────────────────────────────────────

    test('should display the language buttons in the header', { annotation: [{ type: 'testcase', description: "RG-CONF-08: Display the language buttons in the header" }] }, async () => {
        await expect(confirmation.enButton).toBeVisible();
        await expect(confirmation.arabicButton).toBeVisible();
    });

    test('should display the theme toggle in the header', { annotation: [{ type: 'testcase', description: "RG-CONF-09: Display the theme toggle in the header" }] }, async () => {
        await expect(confirmation.themeToggle).toBeVisible();
    });

    // ── Layout ───────────────────────────────────────────────────────────────

    test('should lay the page out right-to-left in Arabic', { annotation: [{ type: 'testcase', description: "RG-CONF-10: Lay the page out right-to-left in Arabic" }] }, async () => {
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    });

    test('should stack heading, message and Login button top to bottom', { annotation: [{ type: 'testcase', description: "RG-CONF-11: Stack heading, message and Login button top to bottom" }] }, async () => {
        const [h, m, b] = await Promise.all([confirmation.heading.boundingBox(), confirmation.message.boundingBox(), confirmation.loginButton.boundingBox()]);
        expect(h && m && b, 'all three elements have a box').toBeTruthy();
        expect(h!.y).toBeLessThan(m!.y);
        expect(m!.y).toBeLessThan(b!.y);
    });

    test('should centre the content horizontally', { annotation: [{ type: 'testcase', description: "RG-CONF-12: Centre the content horizontally" }] }, async () => {
        const viewportWidth = page.viewportSize()?.width ?? 1280;
        const box = await confirmation.loginButton.boundingBox();
        expect(box).not.toBeNull();
        expect(Math.abs(box!.x + box!.width / 2 - viewportWidth / 2)).toBeLessThan(viewportWidth * 0.1);
    });

    test('should not overflow the page horizontally', { annotation: [{ type: 'testcase', description: "RG-CONF-13: Not overflow the page horizontally" }] }, async () => {
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
    });

    // ── Theme ────────────────────────────────────────────────────────────────

    test('should switch theme and keep the message and button readable', { annotation: [{ type: 'testcase', description: "RG-CONF-14: Switch theme and keep the message and button readable" }] }, async () => {
        const themeState = () => page.evaluate(() => `${document.documentElement.className}|${document.body.className}|${document.documentElement.dataset['theme'] ?? ''}|${getComputedStyle(document.body).backgroundColor}`);
        const before = await themeState();
        await confirmation.themeToggle.click();
        await expect.poll(themeState, { timeout: 5000 }).not.toBe(before);
        await expect(confirmation.heading).toBeVisible();
        await expect(confirmation.message).toBeVisible();
        await expect(confirmation.loginButton).toBeVisible();
        await confirmation.themeToggle.click();
        await expect.poll(themeState, { timeout: 5000 }).toBe(before);
    });

    // ── Keyboard ─────────────────────────────────────────────────────────────

    test('should make the Login button reachable by keyboard', { annotation: [{ type: 'testcase', description: "RG-CONF-15: Make the Login button reachable by keyboard" }] }, async () => {
        await confirmation.loginButton.focus();
        await expect(confirmation.loginButton).toBeFocused();
    });

    // ── Leaving (last: navigates away) ───────────────────────────────────────

    test('should open the Login page when the Login button is clicked', { annotation: [{ type: 'testcase', description: "RG-CONF-16: Open the Login page when the Login button is clicked" }] }, async () => {
        await confirmation.loginButton.click();
        await expect(page).toHaveURL(/\/business\/auth\/login/, { timeout: 20000 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Responsive — each viewport gets its own page (a fresh mocked climb).
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration — Confirmation screen: responsive', TAGS, () => {
    const VIEWPORTS = [
        { name: 'phone (375×667)', width: 375, height: 667 },
        { name: 'tablet (768×1024)', width: 768, height: 1024 },
    ];

    for (const vp of VIEWPORTS) {
        test(`should keep heading, message and Login button visible without horizontal scroll on ${vp.name}`, { annotation: [{ type: 'testcase', description: "RG-CONF-17: Keep heading, message and Login button visible without horizontal scroll on small screens" }] }, async ({ page }) => {
            test.setTimeout(150_000);
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await goToConfirmationStepMocked(page);
            const confirmation = new RegistrationConfirmationPage(page);
            await expect(confirmation.heading).toBeVisible();
            await expect(confirmation.message).toBeVisible();
            await confirmation.loginButton.scrollIntoViewIfNeeded();
            await expect(confirmation.loginButton).toBeInViewport();
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
            expect(overflow).toBeLessThanOrEqual(1);
        });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// States around the submit call — the confirmation must only appear on success.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration — Confirmation screen: submit states', TAGS, () => {
    test('should not show the confirmation when the submit call fails (500)', { annotation: [{ type: 'testcase', description: "RG-CONF-18: Not show the confirmation when the submit call fails" }] }, async ({ page }) => {
        test.setTimeout(150_000);
        const err = apiError(500, 'INTERNAL_ERROR');
        await page.route(CONTRACT_ACCEPT, route => json(route, err.status, err.body));
        await goToContractStepMocked(page);
        const contract = new RegistrationContractPage(page);
        const confirmation = new RegistrationConfirmationPage(page);
        await contract.agreeCheckbox.check();
        await contract.submitButton.click();
        await expect(confirmation.loginButton).toHaveCount(0, { timeout: 10000 });
        await expect(contract.submitButton).toBeVisible();
    });

    test('should show the confirmation only after the submit call answers', { annotation: [{ type: 'testcase', description: "RG-CONF-19: Show the confirmation only after the submit call answers" }] }, async ({ page }) => {
        test.setTimeout(150_000);
        let release!: () => void;
        const gate = new Promise<void>(resolve => { release = resolve; });
        await page.route(CONTRACT_ACCEPT, async route => { await gate; await json(route, 200, {}); });
        await goToContractStepMocked(page);
        const contract = new RegistrationContractPage(page);
        const confirmation = new RegistrationConfirmationPage(page);
        await contract.agreeCheckbox.check();
        await contract.submitButton.click();
        await expect(confirmation.loginButton).toHaveCount(0);
        release();
        await confirmation.waitForLoad();
        await expect(confirmation.message).toBeVisible();
    });
});
