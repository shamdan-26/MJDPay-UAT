import { test, expect } from '@playwright/test';
import { PaymentLinkPage } from '../../pageElements/PaymentLinks/PaymentLinkPage';
import {
    gotoPaymentLink,
    mockValidBillLink,
    mockValidWalletLink,
    mockInvalidLink,
    mockGuestSessionJwt,
    mockGuestWalletPaymentSuccess,
    mockGuestBillPaymentSuccess,
    mockGuestWalletPaymentInvalidCode,
    mockGuestJwtWrongLink,
    VALID_BILL_TOKEN,
    VALID_WALLET_TOKEN,
    EXPIRED_TOKEN,
    GUEST_WALLET_QR_TOKEN,
} from '../PaymentLinkHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Guest Flow (unauthenticated payment via public link / QR) — MOCK ONLY.
// Targets the current guest-flow ticket set: EMI-5424 (payment-link resolution
// & guest session handling for bills & wallets), EMI-5446 (guest JWT
// generation), EMI-5523 (guest bill payment processing), and the regression
// tickets EMI-5551 / EMI-5640 / EMI-5653 / EMI-5860 (guest wallet-QR payment
// failures found in UAT). See docs/manual-test-cases/B2B-Transactions.md
// section F (GF-01..GF-15) for the manual case list this suite maps to.
//
// Same caveat as PaymentLinkResolution.spec.ts: the Customer-app URL shape and
// API paths are best-effort guesses (no page object/helper existed anywhere in
// this Business Portal repo before that file) — reconcile against the real DOM
// on first live run.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Guest Flow — Wallet Payment Link Resolution (GF-01, GF-02)', () => {
    test('GF-02: a guest with no session should resolve a valid wallet link and see a sanitized summary', async ({ page }) => {
        await mockValidWalletLink(page);
        await mockGuestSessionJwt(page, GUEST_WALLET_QR_TOKEN);
        await gotoPaymentLink(page, GUEST_WALLET_QR_TOKEN);

        const link = new PaymentLinkPage(page);
        await expect(link.summarySection).toBeVisible({ timeout: 15000 });
        // Sanitized summary only — no internal identifiers should leak into the page.
        await expect(page.getByText(/internal|profileId|walletId/i)).not.toBeVisible();
    });
});

test.describe('Guest Flow — Bill Payment Link Resolution (GF-03)', () => {
    test('GF-03: a guest should resolve a valid bill link and see a sanitized bill summary', async ({ page }) => {
        await mockValidBillLink(page);
        await mockGuestSessionJwt(page, VALID_BILL_TOKEN);
        await gotoPaymentLink(page, VALID_BILL_TOKEN);

        const link = new PaymentLinkPage(page);
        await expect(link.summarySection).toBeVisible({ timeout: 15000 });
        await expect(link.linkTypeLabel).toBeVisible();
    });
});

test.describe('Guest Flow — Expired / Disabled Links Rejected (GF-05, GF-06)', () => {
    test('GF-05: an expired guest link should show an invalid/expired message and never resolve a summary', async ({ page }) => {
        await mockInvalidLink(page, EXPIRED_TOKEN);
        await gotoPaymentLink(page, EXPIRED_TOKEN);

        const link = new PaymentLinkPage(page);
        await expect(link.invalidLinkError).toBeVisible({ timeout: 15000 });
        await expect(link.summarySection).not.toBeVisible();
    });

    test('GF-06: a disabled/already-paid bill link should be rejected before payment', async ({ page }) => {
        await page.route(`**/emi-profile/api/v1/payment-links/${VALID_BILL_TOKEN}`, route =>
            route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ message: 'Bill already paid' }) })
        );
        await gotoPaymentLink(page, VALID_BILL_TOKEN);

        const link = new PaymentLinkPage(page);
        await expect(link.invalidLinkError.or(page.getByText(/already paid/i))).toBeVisible({ timeout: 15000 });
    });
});

test.describe('Guest Flow — Regression: Wallet QR Scan Resolves (EMI-5551, GF-07)', () => {
    test('GF-07: scanning a valid wallet QR as a guest must NOT show "Payment link not found"', async ({ page }) => {
        await mockValidWalletLink(page);
        await gotoPaymentLink(page, GUEST_WALLET_QR_TOKEN);

        const link = new PaymentLinkPage(page);
        await expect(link.summarySection).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/payment link not found/i)).not.toBeVisible();
    });
});

test.describe('Guest Flow — Regression: Wallet Payment Completes (EMI-5640, EMI-5860, GF-08, GF-10)', () => {
    test('GF-08 / GF-10: a guest wallet payment must complete without a generic "Payment Failed" or "invalid wallet code" error', async ({ page }) => {
        await mockValidWalletLink(page);
        await mockGuestWalletPaymentSuccess(page);
        await gotoPaymentLink(page, GUEST_WALLET_QR_TOKEN);

        const link = new PaymentLinkPage(page);
        await expect(link.summarySection).toBeVisible({ timeout: 15000 });
        await expect(link.amountInput).toBeVisible({ timeout: 10000 });
        await link.amountInput.fill('50');
        await link.continueButton.click();

        await expect(page.getByText(/wallet payment failed/i)).not.toBeVisible();
        await expect(page.getByText(/invalid wallet code/i)).not.toBeVisible();
        await expect(link.resultHeading.or(link.resultSuccessIcon)).toBeVisible({ timeout: 15000 });
    });

    // Documents the pre-fix regression explicitly, so a future revert is caught immediately
    // rather than only failing the positive assertion above.
    test('GF-10 (regression guard): "invalid wallet code" mock reproduces the known bug shape', async ({ page }) => {
        await mockValidWalletLink(page);
        await mockGuestWalletPaymentInvalidCode(page);
        await gotoPaymentLink(page, GUEST_WALLET_QR_TOKEN);

        const link = new PaymentLinkPage(page);
        await expect(link.amountInput).toBeVisible({ timeout: 10000 });
        await link.amountInput.fill('50');
        await link.continueButton.click();

        // This branch is expected to surface the failure banner when the backend mock
        // simulates the EMI-5860 bug — confirms our detection assertion above is meaningful.
        await expect(page.getByText(/invalid wallet code/i)).toBeVisible({ timeout: 15000 });
    });
});

test.describe('Guest Flow — Regression: Location Permission Popup Does Not Block Payment (EMI-5653, GF-09)', () => {
    test('GF-09: a location-permission prompt should not prevent the guest from completing payment', async ({ browser }) => {
        const context = await browser.newContext({ permissions: [] }); // no geolocation granted — triggers the browser prompt path
        const page = await context.newPage();

        await mockValidWalletLink(page);
        await mockGuestWalletPaymentSuccess(page);
        await gotoPaymentLink(page, GUEST_WALLET_QR_TOKEN);

        const link = new PaymentLinkPage(page);
        await expect(link.summarySection).toBeVisible({ timeout: 15000 });
        await expect(link.amountInput).toBeVisible({ timeout: 10000 });
        await link.amountInput.fill('25');
        await link.continueButton.click();

        await expect(link.resultHeading.or(link.resultSuccessIcon)).toBeVisible({ timeout: 15000 });
        await context.close();
    });
});

test.describe('Guest Flow — Bill Payment Processing (EMI-5523, GF-11)', () => {
    test('GF-11: a guest should be able to complete payment on a valid bill link', async ({ page }) => {
        await mockValidBillLink(page);
        await mockGuestBillPaymentSuccess(page);
        await gotoPaymentLink(page, VALID_BILL_TOKEN);

        const link = new PaymentLinkPage(page);
        await expect(link.summarySection).toBeVisible({ timeout: 15000 });

        if (await link.continueButton.isVisible({ timeout: 5000 }).catch(() => false)) {
            await link.continueButton.click();
        }

        await expect(link.resultHeading.or(link.resultSuccessIcon)).toBeVisible({ timeout: 15000 });
    });
});

test.describe('Guest Flow — Session Security (EMI-5446, GF-13, GF-14)', () => {
    test('GF-13: no internal/sensitive fields should appear in the guest payment summary', async ({ page }) => {
        await mockValidBillLink(page);
        await gotoPaymentLink(page, VALID_BILL_TOKEN);

        const link = new PaymentLinkPage(page);
        await expect(link.summarySection).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/stack trace|internal server|sql|profileId|ownerId/i)).not.toBeVisible();
    });

    test('GF-14: a guest JWT scoped to one link must be rejected when used against a different link\'s payment endpoint', async ({ page }) => {
        await mockValidWalletLink(page);
        await mockGuestJwtWrongLink(page);
        await gotoPaymentLink(page, GUEST_WALLET_QR_TOKEN);

        const link = new PaymentLinkPage(page);
        await expect(link.amountInput).toBeVisible({ timeout: 10000 });
        await link.amountInput.fill('10');
        await link.continueButton.click();

        await expect(link.resultFailureIcon.or(page.getByText(/unauthorized/i))).toBeVisible({ timeout: 15000 });
    });
});
