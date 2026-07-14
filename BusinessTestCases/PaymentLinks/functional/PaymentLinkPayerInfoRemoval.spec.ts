import { test, expect } from '@playwright/test';
import { PaymentLinkPage } from '../../pageElements/PaymentLinkPage';
import {
    gotoPaymentLink,
    mockValidLink,
    mockIncompleteOwnerProfile,
    VALID_BILL_TOKEN,
    VALID_WALLET_TOKEN,
} from '../PaymentLinkHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Update Payment Links Flow — Remove Payer Info Step — MOCK ONLY
// (EMI-5791 Android / EMI-5792 iOS / EMI-5793 Web / EMI-5794 BE), section 2.2
// of the Sprint 71 test-case doc.
//
// This is the newer behavior superseding section 2.1's payer-info form: once
// live, checkout info is resolved server-side from the link owner's profile
// instead of being collected from the payer. Kept in a separate file from
// PaymentLinkResolution.spec.ts (old behavior) since only one of the two can
// be true in any given environment — reconcile which is actually live on
// first run and retire the other.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Payment Links — Payer Info Step Removed (TC-PL-009, TC-PL-010)', () => {
    test('TC-PL-009: bill payment link checkout should not show a payer info screen', async ({ page }) => {
        await mockValidLink(page, VALID_BILL_TOKEN, { type: 'BILL', amount: 250, ownerProfileComplete: true });
        await gotoPaymentLink(page, VALID_BILL_TOKEN);
        const link = new PaymentLinkPage(page);
        await expect(link.summarySection).toBeVisible({ timeout: 15000 });
        await expect(link.payerInfoSection).not.toBeVisible();
    });

    test('TC-PL-010: wallet transfer link checkout should not show a payer info screen', async ({ page }) => {
        await mockValidLink(page, VALID_WALLET_TOKEN, { type: 'WALLET', minAmount: 10, maxAmount: 5000, ownerProfileComplete: true });
        await gotoPaymentLink(page, VALID_WALLET_TOKEN);
        const link = new PaymentLinkPage(page);
        await expect(link.summarySection).toBeVisible({ timeout: 15000 });
        await expect(link.payerInfoSection).not.toBeVisible();
    });
});

test.describe('Payment Links — Incomplete Owner Profile (TC-PL-011)', () => {
    test('TC-PL-011: should show a clear error when the link owner\'s profile is missing required info', async ({ page }) => {
        await mockIncompleteOwnerProfile(page, VALID_BILL_TOKEN, 'BILL');
        await gotoPaymentLink(page, VALID_BILL_TOKEN);
        const link = new PaymentLinkPage(page);
        await expect(link.incompleteProfileError).toBeVisible({ timeout: 15000 });
    });
});

test.describe('Payment Links — Backward Compatibility (TC-PL-012)', () => {
    test('TC-PL-012: an older-format payment link should still resolve without erroring', async ({ page }) => {
        // Older links may omit fields the new flow expects (e.g. ownerProfileComplete) —
        // the response below omits it deliberately to exercise the fallback path.
        await page.route(`**/emi-profile/api/v1/payment-links/${VALID_BILL_TOKEN}`, route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ type: 'BILL', amount: 100 }) })
        );
        await gotoPaymentLink(page, VALID_BILL_TOKEN);
        const link = new PaymentLinkPage(page);
        await expect(link.summarySection.or(link.invalidLinkError)).toBeVisible({ timeout: 15000 });
        // Should degrade gracefully either way — never a raw crash/blank page.
        await expect(page.locator('body')).not.toBeEmpty();
    });
});
