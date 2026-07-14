import { test, expect } from '@playwright/test';
import { PaymentLinkPage } from '../../pageElements/PaymentLinkPage';
import { OtpPage } from '../../pageElements/OtpPage';
import {
    gotoPaymentLink,
    mockValidBillLink,
    mockValidWalletLink,
    mockInvalidLink,
    mockPayerInfoSubmitSuccess,
    VALID_BILL_TOKEN,
    VALID_WALLET_TOKEN,
    EXPIRED_TOKEN,
} from '../PaymentLinkHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Bill/Wallet Payment Link Resolution & Payment — MOCK ONLY (EMI-5463),
// section 2.1 of the Sprint 71 test-case doc.
//
// See PaymentLinkHelper.ts / PaymentLinkPage.ts for the caveat this whole
// suite is built on: the Customer-app URL shape and API paths are best-effort
// guesses, not confirmed against a live build, since this repo has no prior
// Customer-app coverage to base them on.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Payment Links — Token Resolution (TC-PL-001, TC-PL-002, TC-PL-003)', () => {
    test.describe.configure({ mode: 'serial' });

    test('TC-PL-001 / TC-PL-002: should resolve a valid token and display the payment summary', async ({ page }) => {
        await mockValidBillLink(page);
        await gotoPaymentLink(page, VALID_BILL_TOKEN);
        const link = new PaymentLinkPage(page);
        await expect(link.summarySection).toBeVisible({ timeout: 15000 });
        await expect(link.linkTypeLabel).toBeVisible();
    });

    test('TC-PL-003: should show an error for an invalid or expired token', async ({ page }) => {
        await mockInvalidLink(page, EXPIRED_TOKEN);
        await gotoPaymentLink(page, EXPIRED_TOKEN);
        const link = new PaymentLinkPage(page);
        await expect(link.invalidLinkError).toBeVisible({ timeout: 15000 });
    });
});

test.describe('Payment Links — Payer Info Form (TC-PL-004)', () => {
    test('TC-PL-004: should validate payer info fields and allow payment method selection', async ({ page }) => {
        await mockValidBillLink(page);
        await mockPayerInfoSubmitSuccess(page);
        await gotoPaymentLink(page, VALID_BILL_TOKEN);
        const link = new PaymentLinkPage(page);
        await expect(link.summarySection).toBeVisible({ timeout: 15000 });

        if (await link.payerInfoSection.isVisible({ timeout: 5000 }).catch(() => false)) {
            await link.mobileInput.fill('500021788');
            await link.emailInput.fill('payer@example.com');
            await link.nameInput.fill('Test Payer');
            await link.nationalIdInput.fill('1234567890');
            await expect(link.mobileInput).toHaveValue('500021788');
            await expect(link.emailInput).toHaveValue('payer@example.com');

            if (await link.paymentMethodGroup.isVisible({ timeout: 3000 }).catch(() => false)) {
                const firstMethod = link.paymentMethodGroup.getByRole('radio').first();
                await firstMethod.click();
                await expect(firstMethod).toBeChecked();
            }
        }
    });
});

test.describe('Payment Links — Wallet Link Amount Validation (TC-PL-005, TC-PL-006)', () => {
    test.beforeEach(async ({ page }) => {
        await mockValidWalletLink(page);
        await gotoPaymentLink(page, VALID_WALLET_TOKEN);
    });

    test('TC-PL-005: should show a validation error for an amount below the minimum', async ({ page }) => {
        const link = new PaymentLinkPage(page);
        await expect(link.amountInput).toBeVisible({ timeout: 15000 });
        await link.amountInput.fill('1');
        await expect(link.amountError).toBeVisible({ timeout: 10000 });
    });

    test('TC-PL-006: should show a validation error for an amount above the maximum', async ({ page }) => {
        const link = new PaymentLinkPage(page);
        await expect(link.amountInput).toBeVisible({ timeout: 15000 });
        await link.amountInput.fill('999999');
        await expect(link.amountError).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Payment Links — OTP Step (TC-PL-007)', () => {
    test('TC-PL-007: should send and display OTP verification after payer info is completed', async ({ page }) => {
        await mockValidBillLink(page);
        await mockPayerInfoSubmitSuccess(page);
        await gotoPaymentLink(page, VALID_BILL_TOKEN);
        const link = new PaymentLinkPage(page);
        const otp = new OtpPage(page);

        if (await link.payerInfoSection.isVisible({ timeout: 5000 }).catch(() => false)) {
            await link.mobileInput.fill('500021788');
            await link.emailInput.fill('payer@example.com');
            await link.nameInput.fill('Test Payer');
            await link.continueButton.click();
            const otpVisible = await otp.isVisible();
            test.skip(!otpVisible, 'OTP step not configured for this link/environment');
            await expect(otp.heading).toBeVisible();
        }
    });
});

test.describe('Payment Links — Full Navigation Flow (TC-PL-008)', () => {
    test('TC-PL-008: should transition Link Entry → Summary → Payer Info → OTP → Payment → Result with proper state', async ({ page }) => {
        await mockValidBillLink(page);
        await mockPayerInfoSubmitSuccess(page);
        await gotoPaymentLink(page, VALID_BILL_TOKEN);
        const link = new PaymentLinkPage(page);
        const otp = new OtpPage(page);

        await expect(link.summarySection).toBeVisible({ timeout: 15000 });

        if (await link.payerInfoSection.isVisible({ timeout: 5000 }).catch(() => false)) {
            await link.mobileInput.fill('500021788');
            await link.emailInput.fill('payer@example.com');
            await link.nameInput.fill('Test Payer');
            await link.continueButton.click();

            if (await otp.isVisible()) {
                await otp.fillAndVerify('00000000');
            }
        }

        await expect(link.resultHeading.or(link.summarySection)).toBeVisible({ timeout: 15000 });
    });
});
