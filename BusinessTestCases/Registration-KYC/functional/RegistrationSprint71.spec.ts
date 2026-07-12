import { test, expect, Page } from '@playwright/test';
import { goToInfoStep, goToVerificationStep, nextCitizenAsset, REGISTER_URL, VALID_IBAN, VALID_VAT_NUMBER, mockFixedMerchantMode, mockAutoApprovedRegistration } from '../RegistrationHelper';
import { RegistrationInfoPage } from '../../pageElements/registration/RegistrationInfoPage';

// ─────────────────────────────────────────────────────────────────────────────
// Business Registration & Onboarding — MOCK ONLY, section 13 of the Sprint 71
// test-case doc (EMI-5748, EMI-5768, EMI-5777).
//
// TC-REG-003/004 ("Admin can still deactivate/suspend an auto-approved
// profile") are Admin Portal actions with no page objects or UI surface in
// this Business Portal repo (CLAUDE.md scopes this suite to uat.majdpay.com/
// business/...) and are intentionally not covered here rather than guessed.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Registration — Fixed Merchant Sign-Up Mode (TC-REG-005, TC-REG-006)', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let info: RegistrationInfoPage;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(60_000);
        const context = await browser.newContext();
        await context.grantPermissions(['geolocation'], { origin: new URL(REGISTER_URL).origin });
        page = await context.newPage();
        info = new RegistrationInfoPage(page);

        await mockFixedMerchantMode(page, true);
        const asset = nextCitizenAsset();
        await goToInfoStep(page, asset.mobile);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('TC-REG-005: should hide the "Sign Up As" profile-type selector and show a static "Signing up as Merchant" label', async () => {
        await expect(info.fixedMerchantLabel).toBeVisible({ timeout: 15000 });
        await expect(info.profileTypeGroup).not.toBeVisible();
    });

    test('TC-REG-006: should not allow the profile type to be changed in fixed-Merchant mode', async () => {
        await expect(info.billerCard).not.toBeVisible();
        await expect(info.customerCard).not.toBeVisible();
        await expect(info.freelancerCard).not.toBeVisible();
    });
});

test.describe('Registration — Fixed Merchant mode disabled (control)', () => {
    test('should show the normal profile-type selector when fixed-Merchant mode is off', async ({ browser }) => {
        const context = await browser.newContext();
        await context.grantPermissions(['geolocation'], { origin: new URL(REGISTER_URL).origin });
        const page = await context.newPage();
        const info = new RegistrationInfoPage(page);

        await mockFixedMerchantMode(page, false);
        const asset = nextCitizenAsset();
        await goToInfoStep(page, asset.mobile);

        await expect(info.profileTypeGroup).toBeVisible({ timeout: 15000 });
        await page.close();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Auto-approval / auto-activation / activation email — these are consequences
// of the final "Sign Up" submission, which sits behind the same NAFATH
// automation boundary documented in RegistrationE2EHappyPath.spec.ts and
// RegistrationPoSOnboarding.spec.ts ("cannot be completed from CI"). These
// tests follow that file's same feature-detection + graceful-skip pattern;
// the registration submission response itself is mocked so the assertions
// are deterministic on the rare environment where NAFATH auto-bypasses.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Registration — Auto-Approval, Auto-Activation & Activation Email (TC-REG-001, TC-REG-002, TC-REG-007)', () => {
    let page: Page;
    let signUpReached = false;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(180_000);
        const context = await browser.newContext();
        await context.grantPermissions(['geolocation'], { origin: new URL(REGISTER_URL).origin });
        page = await context.newPage();

        await mockAutoApprovedRegistration(page);
        await goToVerificationStep(page);

        const ibanInput = page.getByRole('textbox', { name: /iban/i });
        const vatInput  = page.getByRole('textbox', { name: /vat number/i });
        await ibanInput.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
        if (await ibanInput.isVisible().catch(() => false)) {
            await ibanInput.fill(VALID_IBAN);
            await vatInput.fill(VALID_VAT_NUMBER);
        }

        const signUpBtn = page.getByRole('button', { name: /sign up/i });
        signUpReached = await signUpBtn.isEnabled({ timeout: 10000 }).catch(() => false);
        if (signUpReached) await signUpBtn.click();
    }, 180_000);

    test.afterAll(async () => {
        await page.close();
    });

    const SKIP_MSG = 'Sign Up submission could not be reached/completed automatically in this environment (NAFATH boundary)';

    test('TC-REG-001: should reflect automatic approval without a manual admin step', async () => {
        test.skip(!signUpReached, SKIP_MSG);
        await expect(page.getByText(/approved|active/i).first()).toBeVisible({ timeout: 20000 });
        await expect(page.getByText(/pending review|awaiting approval/i)).not.toBeVisible();
    });

    test('TC-REG-002: should reflect the profile as immediately active for operations', async () => {
        test.skip(!signUpReached, SKIP_MSG);
        await expect(page.getByText(/active/i).first()).toBeVisible({ timeout: 20000 });
    });

    test('TC-REG-007: should show confirmation that the activation email was sent', async () => {
        test.skip(!signUpReached, SKIP_MSG);
        await expect(page.getByText(/email.*sent|check your email|activation email/i).first()).toBeVisible({ timeout: 20000 });
    });
});
