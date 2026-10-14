import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { VALID_PASSWORD } from '../LoginHelper';
import { signIn } from '../helpers/loginApi';
import { AdminOtpConfigPage, createAdminContext } from '../../pageElements/Shared/AdminOtpConfigPage';
import { AdminBusinessAccountsPage } from '../../pageElements/UserManagement/AdminBusinessAccountsPage';

// ─────────────────────────────────────────────────────────────────────────────
// Login ⇄ Admin Portal: an admin's status change on a business account must take effect on the next sign-in.
//   Deactivate (Admin → Accounts → Business → details) → sign-in rejected → Activate → sign-in works again.
// Needs a disposable business account that signs in with the shared password:
//   INTEGRATION_COMPANY / INTEGRATION_MOBILE   (local digits, e.g. 5xxxxxxxx)
// Skips when unset. afterAll always tries to re-activate so the account is left usable.
// The admin OTP-configuration check for Login lives in ../../OtpAdminConfig/.
// ─────────────────────────────────────────────────────────────────────────────

const COMPANY = process.env['INTEGRATION_COMPANY'] ?? '';
const MOBILE = process.env['INTEGRATION_MOBILE'] ?? '';

test.describe('Login — Admin status integration', { tag: ['@login', '@integration'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'integration' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.skip(!COMPANY || !MOBILE, 'Set INTEGRATION_COMPANY and INTEGRATION_MOBILE (a disposable business account) to run these tests');

    let adminContext: BrowserContext;
    let admin: Page;
    let accounts: AdminBusinessAccountsPage;
    let deactivated = false;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(120_000);
        adminContext = await createAdminContext(browser);
        admin = await adminContext.newPage();
        await new AdminOtpConfigPage(admin).login();
        accounts = new AdminBusinessAccountsPage(admin);
        await accounts.goto();
    });

    test.afterAll(async () => {
        try {
            if (deactivated) {
                await accounts.goto();
                const details = await accounts.openAccountDetails(MOBILE);
                await details.setActiveStatus('Activate');
                await expect(details.activeStatusInput).toHaveValue(/activate/i);
            }
        } finally {
            await adminContext?.close();
        }
    });

    test('baseline: the account can sign in while active', { annotation: [{ type: 'testcase', description: "LG-INT-01: Baseline: the account can sign in while active" }] }, async ({ request }) => {
        const res = await signIn(request, COMPANY, MOBILE, VALID_PASSWORD);
        expect(res.status(), await res.text()).toBe(200);
    });

    test('should reject sign-in after an admin deactivates the account', { annotation: [{ type: 'testcase', description: "LG-INT-02: Should reject sign-in after an admin deactivates the account" }] }, async ({ request }) => {
        await accounts.goto();
        const details = await accounts.openAccountDetails(MOBILE);
        await details.setActiveStatus('Deactivate');
        deactivated = true;
        await expect(details.activeStatusInput).toHaveValue(/deactivate/i);
        const res = await signIn(request, COMPANY, MOBILE, VALID_PASSWORD);
        expect(res.status(), 'deactivated account must not sign in').toBeGreaterThanOrEqual(400);
        expect(res.status()).toBeLessThan(500);
    });

    test('should show a generic error in the UI for a deactivated account (no status detail leaked)', { annotation: [{ type: 'testcase', description: "LG-INT-03: Should show a generic error in the UI for a deactivated account (no status detail leaked)" }] }, async ({ page, loginPage, otp }) => {
        await loginPage.goto((process.env['BASE_URL'] ?? 'https://dev-emi.dg-cash.app') + '/business/auth/login');
        await loginPage.fillAndSubmit(COMPANY, MOBILE, VALID_PASSWORD);
        await expect(otp.heading).not.toBeVisible({ timeout: 15000 });
        await expect(page.locator('body')).not.toContainText(/stack|exception|sql/i);
    });

    test('should allow sign-in again after the admin re-activates the account', { annotation: [{ type: 'testcase', description: "LG-INT-04: Should allow sign-in again after the admin re-activates the account" }] }, async ({ request }) => {
        await accounts.goto();
        const details = await accounts.openAccountDetails(MOBILE);
        await details.setActiveStatus('Activate');
        await expect(details.activeStatusInput).toHaveValue(/activate/i);
        deactivated = false;
        const res = await signIn(request, COMPANY, MOBILE, VALID_PASSWORD);
        expect(res.status(), await res.text()).toBe(200);
    });
});
