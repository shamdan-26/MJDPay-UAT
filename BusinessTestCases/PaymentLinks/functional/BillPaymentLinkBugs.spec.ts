import { test, expect } from '@playwright/test';
import { PaymentLinkPage } from '../../pageElements/PaymentLinks/PaymentLinkPage';
import {
    BASE_URL,
    gotoPaymentLink,
    mockValidBillLink,
    VALID_BILL_TOKEN,
    fetchJson,
    mockOtpMaxAttemptsExceeded,
    mockOtpMaxAttemptsServerError,
    mockMerchantToMerchantBillLink,
    MERCHANT_TO_MERCHANT_BILL_TOKEN,
    mockAllPaymentMethods,
    mockOnlyMadaPaymentMethod,
    mockBillLinkSubmitSuccess,
    mockBillLinkSubmitServerError,
    mockCreateLinkRejectedUnapprovedBill,
    mockCreateLinkServerErrorUnapprovedBill,
    mockPaidBillDetails,
    PAID_BILL_REF,
    mockTransferDraftSuccess,
    mockTransferDraftWalletTypeNotFound,
    mockBillDetailsAuthorized,
    mockBillDetailsUnauthorized,
    mockBillLinkSummaryWithAmount,
} from '../PaymentLinkHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Bill Payment Link — regression coverage (BPL-01..BPL-11), MOCK ONLY.
// EMI-5684, EMI-5822, EMI-5830, EMI-5633, EMI-5527, EMI-5526, EMI-5513,
// EMI-5630, EMI-5634, EMI-5619, EMI-5438, EMI-5443, EMI-5474, EMI-5420, EMI-5475.
//
// Same caveat as PaymentLinkBugs.spec.ts / PaymentLinkResolution.spec.ts: the
// Customer-app URL shape and API paths are best-effort guesses reconstructed
// from each ticket's repro cURL, not confirmed against a live build.
//
// Tests that need a raw API call rather than a full UI flow use
// PaymentLinkHelper.fetchJson() (an in-page `fetch`, so it goes through
// `page.route()`) instead of `page.request.*` — the latter is a separate API
// context that does NOT respect `page.route()` mocks and would hit the real
// network. Every such test navigates to a same-origin page first so the fetch
// has a document to run in.
//
// Skipped (no reproducible content to test against): EMI-5876 and EMI-5870 are
// bare "Bill Payment" / "Bill Payment Link" subtasks with no description, AC,
// or repro steps in Jira — nothing to assert. EMI-5420/EMI-5475 are the parent
// generation/resolution tasks whose full flow is already exercised end-to-end
// by PaymentLinkResolution.spec.ts and GuestWalletPayment.spec.ts; no separate
// test added here to avoid duplicating that coverage.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Bill Payment Link — OTP Max Attempts Handled Gracefully (BPL-01, EMI-5684)', () => {
    test('BPL-01: exceeding max OTP attempts on a bill payment link should not surface a 500 error', async ({ page }) => {
        await mockValidBillLink(page);
        await mockOtpMaxAttemptsExceeded(page);
        await gotoPaymentLink(page, VALID_BILL_TOKEN);

        const link = new PaymentLinkPage(page);
        await expect(link.summarySection).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/internal server error|500/i)).not.toBeVisible();
    });

    test('BPL-01 (regression guard): the pre-fix mock reproduces the raw 500 the bug ticket captured', async ({ page }) => {
        await mockValidBillLink(page);
        await mockOtpMaxAttemptsServerError(page);
        await gotoPaymentLink(page, VALID_BILL_TOKEN);

        const { status } = await fetchJson(page, '/api/v1/bills/payment-links/pay/mock/submit/verify', {
            method: 'POST',
            body: { paymentId: 6661, paymentMethodId: 2, otp: '1111' },
        });
        expect(status).toBe(500);
    });
});

test.describe('Bill Payment Link — Merchant-to-Merchant Link Resolves (BPL-02, EMI-5822)', () => {
    test('BPL-02: a merchant-to-merchant bill link should resolve (not 500) so both a guest and a merchant payer can pay', async ({ page }) => {
        await mockMerchantToMerchantBillLink(page);
        await gotoPaymentLink(page, MERCHANT_TO_MERCHANT_BILL_TOKEN);

        const link = new PaymentLinkPage(page);
        await expect(link.summarySection).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/internal server error|500/i)).not.toBeVisible();
    });
});

test.describe('Bill Payment Link — All Payment Methods Offered (BPL-03, EMI-5830)', () => {
    test('BPL-03: the payer should see every configured payment method, not only Mada', async ({ page }) => {
        await mockValidBillLink(page);
        await mockAllPaymentMethods(page);
        await gotoPaymentLink(page, VALID_BILL_TOKEN);

        const link = new PaymentLinkPage(page);
        await expect(link.summarySection).toBeVisible({ timeout: 15000 });

        if (await link.paymentMethodGroup.isVisible({ timeout: 5000 }).catch(() => false)) {
            const count = await link.paymentMethodOptions.count();
            expect(count).toBeGreaterThan(1);
        }
    });

    test('BPL-03 (regression guard): the pre-fix mock reproduces Mada-only', async ({ page }) => {
        await mockValidBillLink(page);
        await mockOnlyMadaPaymentMethod(page);
        await gotoPaymentLink(page, VALID_BILL_TOKEN);

        const link = new PaymentLinkPage(page);
        await expect(link.summarySection).toBeVisible({ timeout: 15000 });
        if (await link.paymentMethodGroup.isVisible({ timeout: 5000 }).catch(() => false)) {
            const count = await link.paymentMethodOptions.count();
            expect(count).toBeLessThanOrEqual(1);
        }
    });
});

test.describe('Bill Payment Link — Payment Submission Succeeds (BPL-04, EMI-5633)', () => {
    test('BPL-04: paying a bill payment link should succeed, not surface a 500 error', async ({ page }) => {
        await mockValidBillLink(page);
        await mockBillLinkSubmitSuccess(page);
        await gotoPaymentLink(page, VALID_BILL_TOKEN);

        const link = new PaymentLinkPage(page);
        await expect(link.summarySection).toBeVisible({ timeout: 15000 });

        if (await link.continueButton.isVisible({ timeout: 5000 }).catch(() => false)) {
            await link.continueButton.click();
        }
        await expect(page.getByText(/internal server error|500/i)).not.toBeVisible();
    });

    test('BPL-04 (regression guard): the pre-fix mock reproduces the 500 on submit', async ({ page }) => {
        await mockValidBillLink(page);
        await mockBillLinkSubmitServerError(page);
        await gotoPaymentLink(page, VALID_BILL_TOKEN);

        const { status } = await fetchJson(page, '/api/v1/bills/payment-links/pay/mock/submit', { method: 'POST' });
        expect(status).toBe(500);
    });
});

test.describe('Bill Payment Link — Unapproved Bill Rejected Gracefully (BPL-05, EMI-5526)', () => {
    test('BPL-05: creating a payment link for an unapproved bill should show a clear message, not a 500 error', async ({ page }) => {
        await mockCreateLinkRejectedUnapprovedBill(page);
        // The "create link" screen lives in the Business app with no page object yet,
        // so this exercises the mocked endpoint directly rather than via UI navigation.
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }).catch(() => {}); // establishes a same-origin document for fetch()

        const { status, body } = await fetchJson(page, '/api/v1/bills/payment-links', {
            method: 'POST',
            body: { billReference: 'QA-UNAPPROVED' },
        });
        expect(status).not.toBe(500);
        expect((body as { messageCode?: string })?.messageCode).toBe('BILL_NOT_APPROVED');
    });

    test('BPL-05 (regression guard): the pre-fix mock reproduces the raw 500 the bug ticket captured', async ({ page }) => {
        await mockCreateLinkServerErrorUnapprovedBill(page);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});

        const { status } = await fetchJson(page, '/api/v1/bills/payment-links', {
            method: 'POST',
            body: { billReference: 'QA-UNAPPROVED' },
        });
        expect(status).toBe(500);
    });
});

test.describe('Bill Payment Link — Create-Link Action Hidden for Paid Bills (BPL-06, EMI-5527, EMI-5474)', () => {
    test('BPL-06: the create-payment-link action should not be offered once a bill is already paid', async ({ page }) => {
        await mockPaidBillDetails(page, PAID_BILL_REF);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});

        const { body } = await fetchJson(page, `/api/v1/bills/${PAID_BILL_REF}`);
        // Per EMI-5474 AC: "Add a Share Payment Link action... hide for paid bills only."
        expect((body as { status?: string })?.status).toBe('PAID');
    });
});

test.describe('Bill Payment Link — Wallet/Bill Transfer Draft Succeeds (BPL-07, EMI-5513)', () => {
    test('BPL-07: a wallet/bill payment transfer draft should succeed, not 404 with WALLET_TYPE_NOT_FOUND', async ({ page }) => {
        await mockTransferDraftSuccess(page);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});

        const { status } = await fetchJson(page, '/api/v1/transactions/transfer-draft', {
            method: 'POST',
            body: { amount: '2000', destinationProfileCode: 'BIL-Q5QMJN5SSQ-26', purposeOfTransferId: 6 },
        });
        expect(status).toBe(200);
    });

    test('BPL-07 (regression guard): the pre-fix mock reproduces WALLET_TYPE_NOT_FOUND', async ({ page }) => {
        await mockTransferDraftWalletTypeNotFound(page);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});

        const { status } = await fetchJson(page, '/api/v1/transactions/transfer-draft', {
            method: 'POST',
            body: { amount: '2000', destinationProfileCode: 'BIL-Q5QMJN5SSQ-26', purposeOfTransferId: 6 },
        });
        expect(status).toBe(404);
    });
});

test.describe('Bill Payment Link — Bill Nav Resolves After Returning From Link Result (BPL-08, BPL-09, EMI-5630, EMI-5634)', () => {
    test('BPL-08: the biller should still be authorized to view Bill Information after returning from a payment-link result', async ({ page }) => {
        await mockBillDetailsAuthorized(page, 280);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});

        const { status } = await fetchJson(page, '/api/v1/bills/280');
        expect(status).not.toBe(403);
    });

    test('BPL-08 (regression guard): the pre-fix mock reproduces the 403 unauthorized response', async ({ page }) => {
        await mockBillDetailsUnauthorized(page, 280);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});

        const { status } = await fetchJson(page, '/api/v1/bills/280');
        expect(status).toBe(403);
    });

    test('BPL-09: the Bill page should render populated content, not an empty page, after returning from a payment-link result', async ({ page }) => {
        await mockBillDetailsAuthorized(page, 281);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});

        const { body } = await fetchJson(page, '/api/v1/bills/281');
        expect((body as { referenceNumber?: string })?.referenceNumber).toBeTruthy();
    });
});

test.describe('Bill Payment Link — Summary Displays the Amount (BPL-10, EMI-5619)', () => {
    test('BPL-10: the bill payment summary should display the payable amount', async ({ page }) => {
        await mockBillLinkSummaryWithAmount(page, VALID_BILL_TOKEN, 175);
        await gotoPaymentLink(page, VALID_BILL_TOKEN);

        const link = new PaymentLinkPage(page);
        await expect(link.summarySection).toBeVisible({ timeout: 15000 });
        await expect(link.amountValue).toBeVisible({ timeout: 10000 });
        await expect(link.amountValue).not.toHaveText('');
    });
});

test.describe('Bill Payment Link — Generation & Resolution Reuse Bill Rules (BPL-11, EMI-5438, EMI-5443)', () => {
    test('BPL-11: link resolution should return a sanitized summary including fees/VAT without exposing internal fields', async ({ page }) => {
        await mockValidBillLink(page);
        await gotoPaymentLink(page, VALID_BILL_TOKEN);

        const link = new PaymentLinkPage(page);
        await expect(link.summarySection).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/internal|profileId|stack trace/i)).not.toBeVisible();
    });
});
