import { Page, Locator, expect } from '@playwright/test';
import { TransactionsPage } from '../Shared/TransactionsPage';

export class TopupPage {
    readonly page: Page;
    /** Scopes card/gateway locators to a popup window opened mid-flow; see setActivePage. */
    private activePage: Page;

    private balanceBeforeTopupVar = 0;
    private selectedChipAmount = 0;

    // ---------- Page hero ----------
    readonly pageTitle: Locator;
    readonly pageSubtitle: Locator;

    // ---------- Balance card (shared "mp-" component also seen on BankTransfer) ----------
    readonly balanceCardLabel: Locator;
    readonly balanceAmount: Locator;
    readonly balanceWalletCode: Locator;
    readonly balanceQrButton: Locator;
    readonly balanceSettingsButton: Locator;

    // ---------- Payment methods ----------
    readonly paymentMethodsLabel: Locator;
    readonly madaOption: Locator;
    readonly visaOption: Locator;
    readonly masterOption: Locator;
    readonly paymentMethodOptions: Locator;

    // ---------- Amount field (shared app-amount-field — QA-DATA-TESTID-HANDOFF.md section 3) ----------
    readonly inputAmount: Locator;
    readonly amountCurrencyIcon: Locator;
    readonly quickAmountLabel: Locator;
    readonly presetAmountChips: Locator;

    // ---------- Disclaimer & proceed ----------
    readonly disclaimerText: Locator;
    readonly proceedButton: Locator;

    // ---------- Summary step — inline and modal variants (section 4.5) ----------
    readonly summaryCancelButton: Locator;
    readonly summaryNextButton: Locator;

    // ---------- Result ----------
    readonly resultOkButton: Locator;

    // ---------- Payment gateway popup (third-party Hyperpay iframe — no app testids) ----------
    // Not readonly: setActivePage() re-resolves these against the popup window.
    cardNumberInput: Locator;
    expiryDateInput: Locator;
    cardHolderInput: Locator;
    cvvInput: Locator;
    payNowButton: Locator;
    private hyperpayIframe: Locator;
    private hyperpaySubmitButton: Locator;
    private cardSchemeSubmitButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.activePage = page;

        this.pageTitle    = page.locator('.mp-page-hero h1');
        this.pageSubtitle = page.locator('.mp-page-hero p');

        this.balanceCardLabel      = page.locator('.mp-bal-label');
        this.balanceAmount         = page.locator('.mp-bal-amount');
        this.balanceWalletCode     = page.locator('.mp-bal-code');
        this.balanceQrButton       = page.locator('button[aria-label="generate QR Code"]');
        this.balanceSettingsButton = page.locator('button[aria-label="wallet settings"]');

        this.paymentMethodsLabel  = page.getByText('Payment Methods', { exact: false }).first();
        this.madaOption   = page.getByRole('radio', { name: /mada/i }).or(page.locator('label', { hasText: /mada/i })).first();
        this.visaOption   = page.getByRole('radio', { name: /visa/i }).or(page.locator('label', { hasText: /visa/i })).first();
        this.masterOption = page.getByRole('radio', { name: /master/i }).or(page.locator('label', { hasText: /master/i })).first();
        this.paymentMethodOptions = page.getByRole('radio');

        this.inputAmount        = page.getByTestId('amount-input')
            .or(page.locator('#input_set_amount'))
            .or(page.locator('input[placeholder="0.00"]'));
        this.amountCurrencyIcon = page.locator('.mp-amount-currency');
        this.quickAmountLabel   = page.locator('.mp-amount-quick-label');
        this.presetAmountChips  = page.locator('.mp-amount-chip');

        this.disclaimerText = page.getByText(/disclaimer:\s*top up is powered by hyper pay/i);
        this.proceedButton  = page.getByTestId('topup-proceed-btn')
            .or(page.locator('button.mp-btn-cta, button:has-text("Proceed")')).first();

        this.summaryCancelButton = page.getByTestId('topup-summary-cancel-btn')
            .or(page.getByTestId('topup-summary-modal-cancel-btn'))
            .or(page.locator('button.btn-outline-primary:has-text("Cancel")'))
            .or(page.getByRole('button', { name: /^cancel$/i }));
        this.summaryNextButton = page.getByTestId('topup-summary-next-btn')
            .or(page.getByTestId('topup-summary-modal-next-btn'))
            .or(page.getByRole('button', { name: /^next$/i }))
            .or(page.locator('button:has-text("Next")'));

        this.resultOkButton = page.getByTestId('topup-result-ok-btn');

        // Card fields live inside the Hyperpay popup window once opened —
        // resolved against `activePage`, defaulted to the main page.
        this.cardNumberInput = this.page.frameLocator("iframe[placeholder='Card Number']")
            .locator("input[placeholder='Card Number']");
        this.expiryDateInput = this.page.locator("input[placeholder='MM / YY']");
        this.cardHolderInput = this.page.locator("input[placeholder='Card holder']");
        this.cvvInput = this.page.frameLocator("iframe[placeholder='CVV']").locator("input[placeholder='CVV']");
        this.payNowButton = this.page.getByRole('button', { name: /pay now/i });
        this.hyperpayIframe = this.page.locator('iframe.wpwl-target');
        this.hyperpaySubmitButton = this.page.frameLocator('iframe.wpwl-target').locator('form input[value="Pay"]');
        this.cardSchemeSubmitButton = this.page.frameLocator('iframe[name^="card_"]')
            .locator('button[type="submit"]:has-text("Submit"), button.btn-primary');
    }

    /** Scopes gateway-popup locators (card fields, Pay Now, submit) to `popup` until reset. */
    setActivePage(popup: Page): void {
        this.activePage = popup;
        this.cardNumberInput = popup.frameLocator("iframe[placeholder='Card Number']").locator("input[placeholder='Card Number']");
        this.expiryDateInput = popup.locator("input[placeholder='MM / YY']");
        this.cardHolderInput = popup.locator("input[placeholder='Card holder']");
        this.cvvInput = popup.frameLocator("iframe[placeholder='CVV']").locator("input[placeholder='CVV']");
        this.payNowButton = popup.getByRole('button', { name: /pay now/i });
        this.hyperpayIframe = popup.locator('iframe.wpwl-target');
        this.hyperpaySubmitButton = popup.frameLocator('iframe.wpwl-target').locator('form input[value="Pay"]');
        this.cardSchemeSubmitButton = popup.frameLocator('iframe[name^="card_"]')
            .locator('button[type="submit"]:has-text("Submit"), button.btn-primary');
    }

    resetActivePage(): void {
        this.setActivePage(this.page);
    }

    async getAmountValue(): Promise<string> {
        try {
            await this.inputAmount.waitFor({ state: 'visible', timeout: 5000 });
            return (await this.inputAmount.inputValue())?.trim() ?? '';
        } catch {
            console.log('Amount input field not found or not visible.');
            return '';
        }
    }

    async enterAmount(amount: string) {
        await expect(this.inputAmount).toBeVisible({ timeout: 15000 });
        await this.inputAmount.clear();
        await this.inputAmount.pressSequentially(amount);
    }

    /** Simulates a native clipboard paste so the field's own input-filtering logic is exercised. */
    async pasteAmount(amount: string) {
        await expect(this.inputAmount).toBeVisible({ timeout: 15000 });
        await this.inputAmount.clear();
        await this.inputAmount.evaluate((element: HTMLInputElement, pastedText: string) => {
            const dataTransfer = new DataTransfer();
            dataTransfer.setData('text/plain', pastedText);
            const event = new ClipboardEvent('paste', { clipboardData: dataTransfer, bubbles: true, cancelable: true });
            element.dispatchEvent(event);
            if (!event.defaultPrevented) {
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                setter ? setter.call(element, pastedText) : (element.value = pastedText);
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, amount);
    }

    /** Asserts the field rejected/stripped an invalid amount rather than accepting it verbatim. */
    async assertInvalidAmountNotAccepted(amount: string) {
        await this.enterAmount(amount);
        const entered = await this.getAmountValue();
        expect(entered === '' || entered !== amount).toBeTruthy();
    }

    async selectPaymentMethod(method: 'mada' | 'visa' | 'master') {
        const option = method === 'mada' ? this.madaOption : method === 'visa' ? this.visaOption : this.masterOption;
        await expect(option).toBeVisible({ timeout: 15000 });
        await option.click();
    }

    /** Clicks a preset amount chip (500/1000/2000/5000/10000) and records its value for balance assertions. */
    async selectRandomPresetChip(): Promise<number> {
        const chipValues = [500, 1000, 2000, 5000, 10000];
        const value = chipValues[Math.floor(Math.random() * chipValues.length)]!;
        const chip = this.page.getByTestId(`amount-chip-${value}`);
        await expect(chip).toBeVisible({ timeout: 15000 });
        await chip.click();
        this.selectedChipAmount = value;
        return value;
    }

    async clickProceedButton() {
        await expect(this.proceedButton).toBeEnabled({ timeout: 15000 });
        await this.proceedButton.click();
    }

    // ---------- Summary step (Transaction Type / Payment Method / Original Amount / Commission / VAT / Total) ----------
    private summaryRow(label: string): Locator {
        return this.page.locator('.mp-sum-row').filter({
            has: this.page.locator('span', { hasText: new RegExp(`^\\s*${label}\\s*$`, 'i') }),
        });
    }

    async getSummaryText(label: string): Promise<string> {
        const row = this.summaryRow(label);
        await expect(row).toBeVisible({ timeout: 15000 });
        return (await row.locator('span').last().innerText()).trim();
    }

    async getSummaryMoney(label: string): Promise<number> {
        const row = this.summaryRow(label);
        const moneyAmount = row.locator('.money-amount');
        await expect(moneyAmount).toBeVisible({ timeout: 15000 });
        return parseFloat((await moneyAmount.innerText()).trim());
    }

    /**
     * Commission/VAT populate asynchronously right after the summary first
     * renders (same transient-zero behavior as BankTransfer's confirmation
     * step) — poll until three consecutive reads agree before trusting them.
     */
    async waitForSummaryToSettle(maxAttempts = 30, intervalMs = 1000): Promise<void> {
        let previous = Number.NaN;
        let stableCount = 0;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const current = await this.getSummaryMoney('Total amount to be sent');
            stableCount = current === previous ? stableCount + 1 : 1;
            previous = current;
            if (stableCount >= 3) return;
            await this.page.waitForTimeout(intervalMs);
        }
    }

    async clickSummaryCancelButton() {
        await expect(this.summaryCancelButton).toBeVisible({ timeout: 15000 });
        await expect(this.summaryCancelButton).toBeEnabled({ timeout: 15000 });
        await this.summaryCancelButton.click();
    }

    async clickSummaryNextButton() {
        await expect(this.summaryNextButton).toBeVisible({ timeout: 15000 });
        await expect(this.summaryNextButton).toBeEnabled({ timeout: 15000 });
        await this.summaryNextButton.click();
    }

    /** Clicks Next and waits for the Hyperpay popup window to open, scoping card-field locators to it. */
    async clickSummaryNextAndCapturePopup(): Promise<Page> {
        const [popup] = await Promise.all([
            this.page.context().waitForEvent('page'),
            this.clickSummaryNextButton(),
        ]);
        this.setActivePage(popup);
        await popup.waitForLoadState('load');
        return popup;
    }

    // ---------- Payment gateway (Hyperpay popup) ----------

    async fillCardDetails(cardNumber: string, expiry: string, holder: string, cvv: string) {
        await expect(this.cardNumberInput).toBeVisible({ timeout: 15000 });
        await this.cardNumberInput.fill(cardNumber);
        await this.expiryDateInput.fill(expiry);
        await this.cardHolderInput.fill(holder);
        await this.cvvInput.fill(cvv);
    }

    async clickPayNowButton() {
        await expect(this.payNowButton).toBeVisible({ timeout: 15000 });
        await this.payNowButton.click();
    }

    async assertPayNowButtonIsDisabled() {
        await expect(this.payNowButton).toBeDisabled({ timeout: 5000 });
    }

    async isHyperpayScreenDisplayed(): Promise<boolean> {
        return this.hyperpayIframe.waitFor({ state: 'attached', timeout: 5000 }).then(() => true).catch(() => false);
    }

    async clickHyperpaySubmitButton() {
        await expect(this.hyperpaySubmitButton).toBeVisible({ timeout: 15000 });
        await this.hyperpaySubmitButton.click();
    }

    /** MADA/MASTER route through a 3DS iframe named "card_*" rather than the Hyperpay `.wpwl-target` one. */
    async clickCardSchemeSubmitButton() {
        await this.activePage.waitForTimeout(3000);
        await expect(this.cardSchemeSubmitButton).toBeVisible({ timeout: 20000 });
        await this.cardSchemeSubmitButton.click();
    }

    /** Selects a return code (2=failed, 3=pending, 4=limit exceeded, 5=too many tries) on the UAT gateway simulator. */
    async selectGatewayReturnCode(value: string) {
        await this.activePage.waitForTimeout(3000);
        const dropdown = this.activePage.frameLocator('iframe[name^="card_"]').last().locator('select[name="returnCode"]');
        await expect(dropdown).toBeVisible({ timeout: 20000 });
        await dropdown.selectOption(value);
    }

    async clickResultOkButton() {
        await expect(this.resultOkButton).toBeVisible({ timeout: 20000 });
        await this.resultOkButton.click();
    }

    async assertFailedPopup() {
        const title = this.page.getByRole('heading', { name: /payment failed/i }).or(this.page.getByText(/payment failed/i));
        await expect(title.first()).toBeVisible({ timeout: 15000 });
    }

    async assertPendingPopup() {
        const title = this.page.getByRole('heading', { name: /payment pending confirmation/i })
            .or(this.page.getByText(/payment pending confirmation/i));
        await expect(title.first()).toBeVisible({ timeout: 15000 });
    }

    // ---------- Balance tracking ----------

    async getBalanceBeforeTopup(): Promise<number> {
        await expect(this.balanceAmount).toContainText(/\d/, { timeout: 15000 });
        const text = (await this.balanceAmount.textContent()) ?? '';
        this.balanceBeforeTopupVar = parseFloat(text.replace(/[^\d.]/g, ''));
        return this.balanceBeforeTopupVar;
    }

    private async readBalance(): Promise<number> {
        await expect(this.balanceAmount).toContainText(/\d/, { timeout: 15000 });
        const text = (await this.balanceAmount.textContent()) ?? '';
        return parseFloat(text.replace(/[^\d.]/g, ''));
    }

    private async balanceAfterRetry(): Promise<number> {
        let current = await this.readBalance().catch(() => this.balanceBeforeTopupVar);
        let retries = 3;
        while (current === this.balanceBeforeTopupVar && retries > 0) {
            await this.page.waitForTimeout(4000);
            await this.page.reload({ waitUntil: 'networkidle' }).catch(() => null);
            current = await this.readBalance().catch(() => this.balanceBeforeTopupVar);
            retries--;
        }
        return current;
    }

    async checkBalanceAfterTopup(amount: string) {
        const actual = await this.balanceAfterRetry();
        const expected = this.balanceBeforeTopupVar + parseFloat(amount.replace(/[^\d.]/g, ''));
        expect(Math.round(actual * 100) / 100).toBe(Math.round(expected * 100) / 100);
    }

    async checkBalanceAfterTopupBySelectedChip() {
        const actual = await this.balanceAfterRetry();
        const expected = this.balanceBeforeTopupVar + this.selectedChipAmount;
        expect(Math.round(actual * 100) / 100).toBe(Math.round(expected * 100) / 100);
    }

    async checkBalanceRemainsUnchanged() {
        const actual = await this.readBalance();
        expect(actual).toBeCloseTo(this.balanceBeforeTopupVar, 3);
    }

    async verifyLastTransactionFailed() {
        const status = await new TransactionsPage(this.page).getLastTransactionStatus();
        expect(status.toUpperCase()).toBe('FAILED');
    }
}
