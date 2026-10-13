import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { AdminOtpConfigPage, OTP_OPERATION, createAdminContext } from '../pageElements/Shared/AdminOtpConfigPage';

// ─────────────────────────────────────────────────────────────────────────────
// Admin OTP configuration — shared across modules.
//
// The Admin Portal (System Configurations → OTP → Function OTP) governs which OTP *setting* each
// operation uses. These operations are platform-mandated: in the default setting their checkbox
// must be present, checked and disabled — an admin can neither turn their OTP off nor move them
// off a setting from this screen. One admin login and one "Edit Operations" modal serve every
// module's check (the admin SPA is a separate app from the merchant portal, so session.json and
// the fixtures.ts `page` don't apply). Each check carries its module tag, so
// `--grep @login`, `--grep @registration` or `--grep @transactions` still selects it.
//
// Operation codes were read live from the dev modal (2026-10-12). Operations that are NOT locked
// on there (ACTIVATE_EMAIL, PHYSICAL_CARD, UnlockAdminAccountviaEmail) are deliberately excluded.
// ─────────────────────────────────────────────────────────────────────────────

const LOCKED_ON_OPERATIONS: ReadonlyArray<{ module: string; tag: string; code: string; label: string }> = [
    { module: 'Login',           tag: '@login',          code: OTP_OPERATION.LOGIN,                    label: 'LOGIN' },
    { module: 'Registration',    tag: '@registration',   code: OTP_OPERATION.REGISTRATION,             label: 'registration' },
    { module: 'ForgotPassword',  tag: '@forgotpassword', code: OTP_OPERATION.FORGET_PASSWORD,          label: 'forgot password' },
    { module: 'Beneficiary',     tag: '@beneficiary',    code: OTP_OPERATION.ADD_BENEFICIARY,          label: 'add beneficiary' },
    { module: 'Transactions',    tag: '@transactions',   code: OTP_OPERATION.TRANSACTION_TOPUP,        label: 'top-up transaction' },
    { module: 'Transactions',    tag: '@transactions',   code: OTP_OPERATION.TRANSACTION_BILL_PAYMENT, label: 'bill-payment transaction' },
    { module: 'Transactions',    tag: '@transactions',   code: OTP_OPERATION.BANK_TRANSFER,            label: 'bank transfer' },
    { module: 'Transactions',    tag: '@transactions',   code: OTP_OPERATION.WALLET_PAYMENT,           label: 'wallet payment' },
    { module: 'Transactions',    tag: '@transactions',   code: OTP_OPERATION.OTC_TRANSACTION,          label: 'OTC transaction' },
    { module: 'Transactions',    tag: '@transactions',   code: OTP_OPERATION.CARD_TRANSACTIONS,        label: 'card transactions' },
];

test.describe('Admin OTP Configuration — mandated operations are locked on', { tag: ['@integration', '@otp-config'], annotation: [{ type: 'feature', description: 'OtpAdminConfig' }, { type: 'layer', description: 'integration' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(120000);

    let context: BrowserContext;
    let page: Page;
    let adminOtp: AdminOtpConfigPage;

    test.beforeAll(async ({ browser }) => {
        // Geolocation must be granted up front or the admin SPA's permission
        // overlay blocks the login form — browser.newPage() wouldn't inherit it.
        context = await createAdminContext(browser);
        page = await context.newPage();
        adminOtp = new AdminOtpConfigPage(page);
        await adminOtp.login();
        await adminOtp.gotoOtpConfiguration();
        await adminOtp.openFirstSettingOperations();
    });

    test.afterAll(async () => {
        await context.close();
    });

    for (const op of LOCKED_ON_OPERATIONS) {
        test(`${op.module}: ${op.label} OTP operation is locked on (checked and not editable) in the default OTP setting`, { tag: [op.tag] }, async () => {
            await expect(adminOtp.operationsModalHeader).toBeVisible();
            await adminOtp.expectOperationLockedOn(op.code);
        });
    }
});
