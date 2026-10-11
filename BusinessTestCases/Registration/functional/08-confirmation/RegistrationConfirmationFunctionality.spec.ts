import { test, expect, Page } from '@playwright/test';
import {
    goToContractStep, goToInfoStep, REGISTER_URL,
    getFullRegistrationDetailByMobileFromSql, getActivationNotificationFromMongo,
    countProfilesByMobileFromSql, countActivationNotificationsFromMongo,
    getActivationNotificationsFromMongo, ACTIVATION_API_CREDENTIALS_MARKER, ACTIVATION_LOGIN_DETAILS_MARKER,
} from '../../RegistrationHelper';
import { RegistrationContractPage } from '../../../pageElements/Registration/RegistrationContractPage';
import { RegistrationConfirmationPage } from '../../../pageElements/Registration/RegistrationConfirmationPage';

// ─────────────────────────────────────────────────────────────────────────────
// Registration — Confirmation page (final screen after "Submit and finish").
// Manual cases RC-29..RC-42 (docs/manual-test-cases/Registration-Contract.md §D).
//
// One live registration is driven to the end in beforeAll and shared by every
// test (a full climb takes several minutes). Tests are ordered so the
// non-destructive ones run first; the last three leave the confirmation screen
// on purpose (click Login, browser Back, reload) and only assert that nothing
// re-opens the Contract step or resubmits.
//
// A second describe (own live registration) covers the double-click Submit
// (RC-38) and the English switch (RC-30 / LTR half of RC-31). Switching to EN on
// dev drops the applicant back to the start of the wizard instead of translating
// the confirmation (observed 2026-10-09), so that test is marked test.fail() —
// it documents the defect and starts failing the run once the app is fixed.
//
// RC-39's "log in" half stays manual: the confirmation says the login details
// are sent by email (dev SMTP is unreachable), so the spec asserts the profile
// is active/approved in the DB instead.
// ─────────────────────────────────────────────────────────────────────────────

const SUBMIT_PATH = '/register/contract/accept';

test.describe('Registration – Confirmation Page (Live)', { tag: ['@registration', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let confirmation: RegistrationConfirmationPage;
    let contract: RegistrationContractPage;
    let mobile: string;
    const submitRequests: string[] = [];

    test.beforeAll(async ({ browser }) => {
        // Same worst case as the Contract specs: goToContractStep can cycle many assets.
        test.setTimeout(900_000);
        const context = await browser.newContext();
        page = await context.newPage();
        mobile = await goToContractStep(page);
        contract = new RegistrationContractPage(page);
        confirmation = new RegistrationConfirmationPage(page);

        page.on('request', r => { if (r.method() === 'POST' && r.url().includes(SUBMIT_PATH)) submitRequests.push(r.url()); });
        await contract.agreeCheckbox.check();
        await expect(contract.submitButton).toBeEnabled({ timeout: 10000 });
        await contract.submitButton.click();
        await confirmation.waitForLoad();
    });

    test.afterAll(async () => { await page.close(); });

    test('should show the account-ready and check-email message in Arabic by default', { annotation: [{ type: 'testcase', description: "RC-29: Confirmation page is shown in Arabic by default with the account-ready and check-email message" }] }, async () => {
        await expect(confirmation.heading).toBeVisible();
        await expect(confirmation.message).toBeVisible();
        await expect(page.getByText(/يرجى مراجعة بريدك الإلكتروني/)).toBeVisible();
        expect(submitRequests).toHaveLength(1);
    });

    test('should lay the page out right-to-left in Arabic', { annotation: [{ type: 'testcase', description: "RC-31: Confirmation page layout is right-to-left in Arabic" }] }, async () => {
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    });

    test('should not use pending-review wording', { annotation: [{ type: 'testcase', description: "RC-32: Confirmation page does not use pending-review wording" }] }, async () => {
        const text = await confirmation.bodyText();
        expect(text).not.toMatch(/pending|under review|awaiting approval|قيد المراجعة|بانتظار|قيد الانتظار/i);
    });

    test('should no longer show the Contract step controls', { annotation: [{ type: 'testcase', description: "RC-34: Wizard step controls are gone on the confirmation page" }] }, async () => {
        await expect(contract.submitButton).toBeHidden();
        await expect(contract.agreeCheckbox).toBeHidden();
    });

    test('should not display the OTP, a password or sensitive data', { annotation: [{ type: 'testcase', description: "RC-40: Confirmation page does not display the password, OTP or other sensitive data" }] }, async () => {
        const text = await confirmation.bodyText();
        expect(text).not.toMatch(/00000000|password|كلمة المرور/i);
        expect(page.url()).not.toMatch(/otp|password|token/i);
    });

    test('should switch theme and keep the message readable', { annotation: [{ type: 'testcase', description: "RC-42: Confirmation page theme toggle switches theme and the message stays readable" }] }, async () => {
        const themeState = () => page.evaluate(() => `${document.documentElement.className}|${document.body.className}|${document.documentElement.dataset['theme'] ?? ''}|${getComputedStyle(document.body).backgroundColor}`);
        const before = await themeState();
        await confirmation.themeToggle.click();
        await expect.poll(themeState, { timeout: 5000 }).not.toBe(before);
        await expect(confirmation.message).toBeVisible();
        await expect(confirmation.loginButton).toBeVisible();
        await confirmation.themeToggle.click();
        await expect(confirmation.message).toBeVisible();
    });

    // ── Backend state after submission ────────────────────────────────────

    test('should leave the profile active and approved with no admin step', { annotation: [{ type: 'testcase', description: "RC-39: Profile is active after submission with no admin step" }] }, async () => {
        test.setTimeout(120_000);
        await expect.poll(async () => (await getFullRegistrationDetailByMobileFromSql(mobile))?.is_active, { timeout: 60_000, intervals: [2000] }).toBe(true);
        const detail = await getFullRegistrationDetailByMobileFromSql(mobile);
        expect(detail?.is_approved).toBe(true);
        expect(detail?.is_contract_accepted).toBe(true);
    });

    test('should record a User Activation notification for the new profile', { annotation: [{ type: 'testcase', description: "RC-41: A User Activation notification record exists for the new profile (delivery not asserted on dev)" }] }, async () => {
        test.setTimeout(120_000);
        const detail = await getFullRegistrationDetailByMobileFromSql(mobile);
        expect(detail?.profile_code, 'profile_code of the new profile').toBeTruthy();
        // isSuccessfullySent is deliberately not asserted: dev outbound SMTP is unreachable.
        await expect.poll(async () => (await getActivationNotificationFromMongo(detail!.profile_code)) !== null, { timeout: 60_000, intervals: [2000] }).toBe(true);
        const notification = await getActivationNotificationFromMongo(detail!.profile_code);
        expect(notification?.subject).toBe('User Activation');
        expect(notification?.recipient).toBeTruthy();
        expect(notification?.notificationType).toBeTruthy();
    });

    test('should not let the registered mobile re-open a completed registration', { annotation: [{ type: 'testcase', description: "RC-37: Opening the registration wizard again after submission does not reopen a completed registration" }] }, async () => {
        test.setTimeout(180_000);
        const again = await page.context().newPage();
        try {
            await again.goto(REGISTER_URL);
            // The mobile may be rejected up front or let through to Business Info — either way it
            // must never land on a live Contract step, and no second profile may appear.
            await goToInfoStep(again, mobile).catch(() => {});
            await again.waitForTimeout(2000);
            await expect(new RegistrationContractPage(again).submitButton).toBeHidden();
        } finally {
            await again.close();
        }
        expect(await countProfilesByMobileFromSql(mobile)).toBe(1);
    });

    // ── Leaving the screen ────────────────────────────────────────────────

    test('should show a Login control that opens the Login page', { annotation: [{ type: 'testcase', description: "RC-33: Confirmation page shows a control to continue to Login and it opens the Login page" }] }, async () => {
        await expect(confirmation.loginButton).toBeVisible();
        await expect(confirmation.loginButton).toContainText('سجّل الدخول');
        await confirmation.loginButton.click();
        await expect(page).toHaveURL(/\/business\/auth\/login/, { timeout: 20000 });
    });

    test('should not re-open the Contract step on browser Back', { annotation: [{ type: 'testcase', description: "RC-35: Browser Back from the confirmation page does not re-open the Contract step for editing" }] }, async () => {
        await page.goBack().catch(() => {});
        await page.waitForTimeout(2000);
        await expect(contract.submitButton).toBeHidden();
        expect(submitRequests).toHaveLength(1);
    });

    test('should not resubmit or return to the wizard on refresh', { annotation: [{ type: 'testcase', description: "RC-36: Refreshing does not resubmit the registration or return the applicant to the Contract step" }] }, async () => {
        if (page.url() === 'about:blank') await page.goto('/business/auth/register');
        await page.reload();
        await page.waitForTimeout(3000);
        await expect(contract.submitButton).toBeHidden();
        expect(submitRequests).toHaveLength(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Own live registration: double-click Submit, then the language switch (which
// destroys the confirmation state, so it runs last).
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Confirmation Page: Double Submit & Language (Live)', { tag: ['@registration', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let confirmation: RegistrationConfirmationPage;
    let mobile: string;
    const submitRequests: string[] = [];

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(900_000);
        const context = await browser.newContext();
        page = await context.newPage();
        mobile = await goToContractStep(page);
        const contract = new RegistrationContractPage(page);
        confirmation = new RegistrationConfirmationPage(page);

        page.on('request', r => { if (r.method() === 'POST' && r.url().includes(SUBMIT_PATH)) submitRequests.push(r.url()); });
        await contract.agreeCheckbox.check();
        await expect(contract.submitButton).toBeEnabled({ timeout: 10000 });
        // Two rapid clicks; the second may land on a button that has already gone, which is fine.
        await contract.submitButton.dblclick().catch(() => {});
        await confirmation.waitForLoad();
    });

    test.afterAll(async () => { await page.close(); });

    test('should create one profile and one notification when Submit is double-clicked', { annotation: [{ type: 'testcase', description: "RC-38: Clicking Submit and finish twice does not create two profiles" }] }, async () => {
        test.setTimeout(120_000);
        await expect(confirmation.message).toBeVisible();
        expect(submitRequests).toHaveLength(1);

        await expect.poll(async () => countProfilesByMobileFromSql(mobile), { timeout: 60_000, intervals: [2000] }).toBeGreaterThan(0);
        expect(await countProfilesByMobileFromSql(mobile)).toBe(1);

        const detail = await getFullRegistrationDetailByMobileFromSql(mobile);
        // A single submit sends two different "User Activation" emails (API credentials + login
        // details), so a double-click must still leave exactly that pair — one of each, no repeats.
        await expect.poll(async () => countActivationNotificationsFromMongo(detail!.profile_code), { timeout: 60_000, intervals: [2000] }).toBeGreaterThanOrEqual(2);
        await page.waitForTimeout(5000); // let a would-be duplicate dispatch land before counting
        const activations = await getActivationNotificationsFromMongo(detail!.profile_code);
        expect(activations).toHaveLength(2);
        expect(activations.filter(n => n.message.includes(ACTIVATION_API_CREDENTIALS_MARKER))).toHaveLength(1);
        expect(activations.filter(n => n.message.includes(ACTIVATION_LOGIN_DETAILS_MARKER))).toHaveLength(1);
    });

    // Known defect (observed 2026-10-09): clicking EN here reloads the wizard at its first step
    // instead of translating the confirmation. test.fail() records that; remove it once fixed.
    test('should show the confirmation in English and left-to-right after switching to EN', { annotation: [{ type: 'testcase', description: "RC-30: Confirmation page shows the same message in English after switching to EN (also the LTR half of RC-31)" }] }, async () => {
        test.fail(true, 'Switching to EN on the confirmation page drops back to the start of the wizard instead of translating it.');
        await confirmation.enButton.click();
        await expect(confirmation.loginButton).toBeVisible({ timeout: 5000 });
        await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
        await expect(page.locator('html')).toHaveAttribute('lang', 'en');
        expect(submitRequests).toHaveLength(1);
    });
});
