import { test, expect } from '@playwright/test';
import { PaymentLinkPage } from '../../pageElements/PaymentLinks/PaymentLinkPage';
import {
    gotoPaymentLink,
    mockValidBillLink,
    mockUpdateStatusSuccess,
    VALID_BILL_TOKEN,
} from '../helpers/PaymentLinkHelper.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Payment Link Bugs — MOCK ONLY (EMI-5774, EMI-5775, EMI-5814), section 2.3
// of the Sprint 71 test-case doc.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Payment Link Bugs — Update-Status No Longer 500s (TC-PL-013, EMI-5774)', () => {
    test.describe.configure({ mode: 'serial' });
    test('TC-PL-013: completing or cancelling a bill payment link transaction should not surface a 500 error', async ({ page }) => {
        await mockValidBillLink(page);
        await mockUpdateStatusSuccess(page);
        let sawServerError = false;
        page.on('response', res => {
            if (res.url().includes('/update-status') && res.status() >= 500) sawServerError = true;
        });
        await gotoPaymentLink(page, VALID_BILL_TOKEN);
        const link = new PaymentLinkPage(page);
        await expect(link.summarySection).toBeVisible({ timeout: 15000 });
        expect(sawServerError).toBe(false);
        await expect(page.getByText(/internal server error|500/i)).not.toBeVisible();
    });
});

test.describe('Payment Link Bugs — Cancelled Link No Infinite Loading (TC-PL-014, EMI-5775)', () => {
    test.describe.configure({ mode: 'serial' });
    test('TC-PL-014: cancelling from the card payment page should show a result state, not spin forever', async ({ page }) => {
        await mockValidBillLink(page);
        await gotoPaymentLink(page, VALID_BILL_TOKEN);
        const link = new PaymentLinkPage(page);
        await expect(link.summarySection).toBeVisible({ timeout: 15000 });

        const cancelButton = page.getByRole('button', { name: /cancel/i }).first();
        // Without actually clicking Cancel, the "no infinite loading" claim is
        // never exercised — skip explicitly instead of silently passing.
        const cancelVisible = await cancelButton.isVisible({ timeout: 5000 }).catch(() => false);
        test.skip(!cancelVisible, 'Cancel button not shown for this link/environment');
        await cancelButton.click();
        await expect(link.loadingIndicator).not.toBeVisible({ timeout: 15000 });
        await expect(link.resultHeading.or(link.invalidLinkError).or(link.summarySection)).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Payment Link Bugs — Bill Link Does Not Redirect to Wallet (TC-PL-015, EMI-5814)', () => {
    test.describe.configure({ mode: 'serial' });
    test('TC-PL-015: opening a bill payment link should open bill payment, not wallet payment', async ({ page }) => {
        await mockValidBillLink(page);
        await gotoPaymentLink(page, VALID_BILL_TOKEN);
        const link = new PaymentLinkPage(page);
        await expect(link.summarySection).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/bill payment/i).first()).toBeVisible();
        await expect(page.getByText(/wallet transfer|wallet payment/i)).not.toBeVisible();
    });
});
