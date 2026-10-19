import { type Page, expect } from '@playwright/test';
import { BankTransferPage } from '../../pageElements/Shared/BankTransferPage.ts';
import { TopupPage } from '../../pageElements/Topup/TopupPage.ts';
import { OtpPage } from '../../pageElements/Shared/OtpPage.ts';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage.ts';
import { getOtpFromDb } from '../../Login/helpers/LoginHelper.ts';

export const BASE_URL  = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';
export const LOGIN_URL = `${BASE_URL}/business/auth/login`;
export const HOME_URL  = `${BASE_URL}/business/main/home`;

/**
 * Bilingual Confirmation-summary row labels. The Cashout flow renders in Arabic
 * by default on dev/UAT, so specs must locate summary rows by a language-neutral
 * pattern — a hardcoded English label never matches. Pass these to
 * `BankTransferPage.getSummaryText()` / `getSummaryMoney()`.
 */
export const SUMMARY_LABEL = {
    txnType:    /^\s*(Transaction Type|نوع العملية)\s*$/i,
    bank:       /^\s*(Bank|البنك)\s*$/i,
    iban:       /^\s*(IBAN|رقم الآيبان)\s*$/i,
    original:   /^\s*(Original Amount|المبلغ الأصلي)\s*$/i,
    commission: /^\s*(commission|العمولة)\s*$/i,
    vat:        /^\s*(VAT|ضريبة القيمة المضافة)\s*$/i,
    total:      /^\s*(Total amount to be sent|إجمالي المبلغ المراد إرساله)\s*$/i,
} as const;

/**
 * The Proceed click occasionally doesn't register on dev (the button stays
 * enabled on "proceed") — a hydration-timing flake independent of balance/
 * validation. Once it does register, the button goes disabled/"is-loading"
 * and the summary API can take well over 8s to resolve — observed anywhere
 * from ~1s to 45+s on this environment. So: retry the click only while the
 * button is still enabled (i.e. genuinely un-clicked), then wait out the
 * async summary calculation for as long as it takes.
 */
export async function proceedToConfirmation(page: Page, bt: BankTransferPage): Promise<void> {
    // The Confirmation step is reached once the summary rows render. Detect it
    // by the language-neutral .mp-sum-row container or the summary "Next"
    // button (testid-first, bilingual role fallback — the Cashout flow defaults
    // to Arabic on dev/UAT so a hardcoded English name never matches).
    const summaryReady = page.locator('.mp-sum-row').first();
    const nextButton = bt.proceedButtonInSummary;
    const reachedConfirmation = async () =>
        (await summaryReady.isVisible().catch(() => false)) ||
        (await nextButton.isVisible().catch(() => false));

    await bt.clickProceedButton();

    // Poll rather than retry once — on a slow/loaded dev backend a single
    // extra click after a fixed wait isn't always enough. Every retry click is
    // explicitly time-boxed: once the flow transitions the Amount-step button
    // detaches, and an un-timed click there hangs until the test timeout.
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
        if (await reachedConfirmation()) return;
        await page.waitForTimeout(2000);
        if (await bt.proceedButton.isEnabled({ timeout: 2000 }).catch(() => false)) {
            await bt.proceedButton.click({ timeout: 5000 }).catch(() => {});
        }
    }
    await expect(nextButton).toBeVisible({ timeout: 5000 });
}

// ── Ensuring a spendable balance ──────────────────────────────────────────────

/**
 * Generic MADA sandbox test card — the same one TopupFlow.spec.ts's happy-path
 * cases use. It's a HyperPay gateway-simulator card, not tied to any one
 * account, so it works regardless of which BankTransfer test account calls
 * `ensureNonZeroBalance`.
 */
const TOPUP_CARD = { number: '5541805721646120', expiry: '0528', holder: 'MADA TEST', cvv: '123' };

/**
 * Comfortably covers a whole BankTransfer spec file's worth of small debits
 * (this suite's amounts top out around 1000-2000 per transfer) without
 * needing a second top-up mid-run.
 */
const TOPUP_AMOUNT = '5000.00';

/**
 * Every BankTransfer test debits real money from a shared dev/UAT account. On
 * a freshly-drained account every debiting test fails (or silently no-ops)
 * for a reason that has nothing to do with the behavior under test. Call this
 * once per spec file's `beforeAll`, right after login — it checks the
 * Cashout balance and, if it's zero, funds the wallet via a real MADA
 * card top-up (mirroring TopupFlow.spec.ts's happy-path flow) before
 * returning. Leaves the browser back on the home dashboard; the caller's own
 * `beforeEach` re-navigates to Cashout per test as usual.
 */
/**
 * ⚠ KNOWN BROKEN — do not trust this retry as "fixed", see below.
 *
 * Originally assumed the same hydration-timing flake `proceedToConfirmation`
 * above retries for BankTransfer's Proceed button (click doesn't register,
 * so the payment popup never opens and `clickSummaryNextAndCapturePopup`
 * hangs on `context().waitForEvent('page')`). A standalone probe against the
 * live dev account (2026-09-12) disproved that: the click DOES register —
 * for THIS account/payment-method, clicking "Next" on the Top-up Summary
 * never opens a popup at all. It goes straight to an inline OTP screen
 * (heading "ملخص إضافة الأموال"), skipping card-number entry entirely —
 * unlike TopupFlow.spec.ts's dedicated test account (F2147/510203012),
 * which does get a card-entry popup. Likely a saved/default payment method
 * on this account, but unconfirmed.
 *
 * Worse: even past that, filling the dev-bypass OTP and "verifying" does NOT
 * complete the top-up — the app bounces back to the raw amount-entry screen
 * and the balance stays 0.00 after multiple reload-retries. Root cause not
 * found (dev OTP bypass possibly not universal for this operation code, a
 * truncated-OTP-length mismatch against the 6-box widget, an uncaptured
 * failure toast — all unconfirmed).
 *
 * NEEDS MANUAL INVESTIGATION with backend/account visibility before this
 * retry (or ensureNonZeroBalance's top-up branch generally) can be trusted.
 * Until then, expect BankTransfer specs to hang/fail their beforeAll hook
 * whenever the shared account's balance actually hits zero.
 */
async function clickSummaryNextWithRetry(topup: TopupPage): Promise<Page> {
    const deadline = Date.now() + 90000;
    let lastError: unknown;
    while (Date.now() < deadline) {
        try {
            return await topup.clickSummaryNextAndCapturePopup();
        } catch (error) {
            lastError = error;
            console.log('[ensureNonZeroBalance] top-up summary "Next" did not open the payment popup, retrying');
        }
    }
    throw lastError instanceof Error
        ? lastError
        : new Error('Top-up summary "Next" never opened the payment popup within the retry window.');
}

export async function ensureNonZeroBalance(page: Page, mobile: string): Promise<void> {
    const bt = new BankTransferPage(page);
    const quickActions = new HomepageQuickActionsPage(page);

    await page.goto(HOME_URL);
    await page.waitForLoadState('domcontentloaded');
    await quickActions.quickActionCashoutCard.click();
    await expect(bt.inputAmount).toBeVisible({ timeout: 15000 });

    const balance = await bt.getBalanceBeforeBankTransfer();
    if (balance > 0) return;

    console.log('[ensureNonZeroBalance] balance is 0 — funding the wallet via top-up');
    const topup = new TopupPage(page);
    const otp = new OtpPage(page);

    await page.goto(HOME_URL);
    await page.waitForLoadState('domcontentloaded');
    await quickActions.quickActionTopupCard.click();
    await expect(topup.inputAmount).toBeVisible({ timeout: 15000 });

    await topup.selectPaymentMethod('mada');
    await topup.enterAmount(TOPUP_AMOUNT);
    await topup.clickProceedButton();
    console.log('[ensureNonZeroBalance] step: proceeded past amount, opening payment popup');
    const popup = await clickSummaryNextWithRetry(topup);
    console.log('[ensureNonZeroBalance] step: payment popup opened, filling card details');
    await topup.fillCardDetails(TOPUP_CARD.number, TOPUP_CARD.expiry, TOPUP_CARD.holder, TOPUP_CARD.cvv);
    await topup.clickPayNowButton();
    await topup.clickCardSchemeSubmitButton();
    console.log('[ensureNonZeroBalance] step: card submitted, waiting for popup to close');
    await popup.waitForEvent('close', { timeout: 30000 }).catch(() => null);
    topup.resetActivePage();

    // Top-up's OTP is the inline widget (heading "ملخص إضافة الأموال" / "Top-up
    // Summary"), not the login-style "Enter OTP" dialog OtpPage.isVisible()
    // checks for — gate on the input boxes themselves instead, which both
    // widget shapes expose (see OtpPage.ts's own comment on this split).
    const otpShown = await otp.inputs.first()
        .waitFor({ state: 'visible', timeout: 15000 })
        .then(() => true)
        .catch(() => false);
    console.log(`[ensureNonZeroBalance] step: otpShown=${otpShown}`);
    if (otpShown) {
        await otp.fillAndVerify(await getOtpFromDb(mobile));
    }
    await topup.clickResultOkButton();
    console.log('[ensureNonZeroBalance] step: top-up result acknowledged');

    await page.goto(HOME_URL);
    await page.waitForLoadState('domcontentloaded');
}
