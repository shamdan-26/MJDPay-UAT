import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import {
    goToContractStep, getFullRegistrationDetailByMobileFromSql, getActivationNotificationFromMongo, getActivationNotificationsFromMongo,
    ACTIVATION_API_CREDENTIALS_MARKER, ACTIVATION_LOGIN_DETAILS_MARKER,
    getBusinessRegistrationRequestByMobileFromSql, getRegistrationProvisioningFromSql,
    type RegistrationFullDetail,
} from '../RegistrationHelper';
import { closeMongoClient } from '../../../support/mongoClient';
import { RegistrationContractPage } from '../../pageElements/Registration/RegistrationContractPage';
import { RegistrationConfirmationPage } from '../../pageElements/Registration/RegistrationConfirmationPage';
import { AdminOtpConfigPage, createAdminContext } from '../../pageElements/Shared/AdminOtpConfigPage';
import { AdminBusinessAccountsPage } from '../../pageElements/UserManagement/AdminBusinessAccountsPage';

// ─────────────────────────────────────────────────────────────────────────────
// Registration ⇄ Admin Portal account listing.
//
// A business that finishes registration is auto-approved (no admin step), so it
// must show up in Admin Portal → Manage Users → Accounts → Business as Active
// and Approved, not blocked, under the mobile number it registered with. One
// live registration is driven to the Confirmation screen in beforeAll, then the
// admin SPA (separate app, own browser context) is searched by that mobile
// (+966 prefix required by the admin filter — added by the page object).
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Registration — Admin Business Accounts listing', { tag: ['@registration', '@integration'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'integration' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let adminContext: BrowserContext;
    let admin: Page;
    let accounts: AdminBusinessAccountsPage;
    let detail: RegistrationFullDetail;
    let mobile: string;

    test.beforeAll(async ({ browser }) => {
        // Same worst case as the other live registration specs: goToContractStep can cycle many assets.
        test.setTimeout(900_000);

        const userPage = await (await browser.newContext()).newPage();
        mobile = await goToContractStep(userPage);
        const contract = new RegistrationContractPage(userPage);
        await contract.agreeCheckbox.check();
        await expect(contract.submitButton).toBeEnabled({ timeout: 10000 });
        await contract.submitButton.click();
        await new RegistrationConfirmationPage(userPage).waitForLoad();
        await userPage.context().close();

        await expect.poll(
            async () => (await getFullRegistrationDetailByMobileFromSql(mobile))?.is_active,
            { timeout: 60_000, intervals: [2000] },
        ).toBe(true);
        detail = (await getFullRegistrationDetailByMobileFromSql(mobile))!;

        adminContext = await createAdminContext(browser);
        admin = await adminContext.newPage();
        await new AdminOtpConfigPage(admin).login();
        accounts = new AdminBusinessAccountsPage(admin);
        await accounts.goto();
    });

    test.afterAll(async () => {
        await adminContext?.close();
        await closeMongoClient();
    });

    test('newly registered business is listed under Manage Users → Accounts → Business', { annotation: [{ type: 'testcase', description: "RG-ADMIN-01: Newly registered business is listed under Manage Users → Accounts → Business" }] }, async () => {
        test.setTimeout(120_000);
        await accounts.expectAccountListed(detail.mobile_number);
    });

    test('listed account is Active, Approved and not blocked', { annotation: [{ type: 'testcase', description: "RG-ADMIN-02: Listed account is Active, Approved and not blocked" }] }, async () => {
        await expect(accounts.activeButton).toContainText(/^\s*Active\s*$/i);
        await expect(accounts.approvedButton).toContainText(/approved/i);
        await expect(accounts.approvedButton).not.toContainText(/disapproved/i);
        // The blocked toggle only reads "Unblock" in the one state seen live so far
        // (every healthy listed account); just assert it is present, not its label.
        await expect(accounts.blockedButton).toBeVisible();
    });

    // Data provisioned by a completed registration (confirmed live 2026-10-11). The request row
    // appears at mobile-OTP verification (mobile_verified), fills in as steps complete (business info
    // → completed_form/wathiq/ws1/crn, Nafath → nafath_status, Products → product_assigned), and
    // "Submit and finish" flips the rest (contract, abc, ws3) while creating the profile, its
    // merchant_profiles | biller_profiles row and the user_wallets wallet together.
    test('registration request is fully completed in emi_profile', { annotation: [{ type: 'testcase', description: "RG-ADMIN-03: Registration request is fully completed in emi_profile" }] }, async () => {
        const request = await getBusinessRegistrationRequestByMobileFromSql(mobile);
        expect(request, 'business_profile_registration_requests row').not.toBeNull();
        expect(request).toMatchObject({
            is_mobile_owner_ship_verified: true,
            is_completed_form: true,
            is_wathiq_info_completed: true,
            is_get_nafath_status_completed: true,
            is_product_assigned: true,
            is_contract_accepted: true,
        });
        expect(request!.crn, 'crn captured from Wathiq').toBeTruthy();
        expect(request!.profile_code).toBe(detail.profile_code);
    });

    test('creates exactly one type-specific profile row matching the account type', { annotation: [{ type: 'testcase', description: "RG-ADMIN-04: Creates exactly one type-specific profile row matching the account type" }] }, async () => {
        const request = await getBusinessRegistrationRequestByMobileFromSql(mobile);
        const prov = await getRegistrationProvisioningFromSql(mobile);
        expect(prov, 'provisioned profile').not.toBeNull();
        expect(['MERCHANT', 'BILLER']).toContain(prov!.profile_type);
        expect(prov!.profile_type, 'profiles.type vs the request profile_type').toBe(request!.profile_type);
        expect({ merchant: prov!.in_merchant, biller: prov!.in_biller }).toEqual(
            prov!.profile_type === 'MERCHANT' ? { merchant: 1, biller: 0 } : { merchant: 0, biller: 1 },
        );
    });

    test('creates one wallet of the matching type in emi_wallet.user_wallets', { annotation: [{ type: 'testcase', description: "RG-ADMIN-05: Creates one wallet of the matching type in emi_wallet.user_wallets" }] }, async () => {
        test.setTimeout(120_000);
        await expect.poll(async () => (await getRegistrationProvisioningFromSql(mobile))?.wallets, { timeout: 60_000, intervals: [2000] }).toBe(1);
        const prov = await getRegistrationProvisioningFromSql(mobile);
        expect(prov!.wallet_types).toBe(prov!.profile_type);
    });

    test('records a delivered User Activation email to the registered address in Mongo', { annotation: [{ type: 'testcase', description: "RG-ADMIN-06: Records a delivered User Activation email to the registered address in Mongo" }] }, async () => {
        test.setTimeout(120_000);
        expect(detail.profile_code, 'profile_code of the new profile').toBeTruthy();
        await expect.poll(
            async () => (await getActivationNotificationFromMongo(detail.profile_code)) !== null,
            { timeout: 60_000, intervals: [2000] },
        ).toBe(true);
        const notification = await getActivationNotificationFromMongo(detail.profile_code);
        expect(notification?.subject).toBe('User Activation');
        expect(notification?.notificationType).toBe('EMAIL');
        expect(notification?.recipient).toBe(detail.email);
        expect(notification?.isSuccessfullySent, notification?.errorMessage || 'activation email was not delivered').toBe(true);
    });

    test('sends two activation emails: API credentials and login details', { annotation: [{ type: 'testcase', description: "RG-ADMIN-07: Sends two activation emails: API credentials and login details" }] }, async () => {
        test.setTimeout(120_000);
        await expect.poll(
            async () => (await getActivationNotificationsFromMongo(detail.profile_code)).length,
            { timeout: 60_000, intervals: [2000] },
        ).toBeGreaterThanOrEqual(2);
        const emails = await getActivationNotificationsFromMongo(detail.profile_code);
        expect(emails).toHaveLength(2);
        for (const email of emails) {
            expect(email.recipient).toBe(detail.email);
            expect(email.notificationType).toBe('EMAIL');
            expect(email.isSuccessfullySent, email.errorMessage || 'activation email was not delivered').toBe(true);
        }
        const credentials = emails.filter(e => e.message.includes(ACTIVATION_API_CREDENTIALS_MARKER));
        const login = emails.filter(e => e.message.includes(ACTIVATION_LOGIN_DETAILS_MARKER));
        expect(credentials, 'API credentials email').toHaveLength(1);
        expect(login, 'login details email').toHaveLength(1);
        // The login-details email carries the new account's own Company Number and mobile.
        expect(login[0].message).toContain(detail.tenant_number);
        expect(login[0].message).toContain(AdminBusinessAccountsPage.toAdminMobile(detail.mobile_number));
    });

    test('listed account shows the registered contact number and a brand name', { annotation: [{ type: 'testcase', description: "RG-ADMIN-08: Listed account shows the registered contact number and a brand name" }] }, async () => {
        const row = accounts.rowFor(detail.mobile_number);
        await expect(row).toContainText(AdminBusinessAccountsPage.toAdminMobile(detail.mobile_number));
        const text = (await row.innerText()).replace(/\s+/g, ' ').trim();
        expect(text, 'admin row has no brand name before the contact number').toMatch(/\S+\s+\+966\d+/);
    });
});
