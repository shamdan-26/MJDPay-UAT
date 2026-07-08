import { Page, Locator, expect } from '@playwright/test';

export class TopupPage {
    readonly page: Page;

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

    // ---------- Amount field ----------
    readonly inputAmount: Locator;
    readonly amountCurrencyIcon: Locator;
    readonly quickAmountLabel: Locator;
    readonly presetAmountChips: Locator;

    // ---------- Disclaimer & proceed ----------
    readonly disclaimerText: Locator;
    readonly proceedButton: Locator;

    // ---------- Summary step (shares "mp-sum-row"/"mp-page-hero" components with BankTransfer) ----------
    readonly summaryCancelButton: Locator;
    readonly summaryNextButton: Locator;

    constructor(page: Page) {
        this.page = page;

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

        this.inputAmount        = page.locator('#input_set_amount').or(page.locator('input[placeholder="0.00"]'));
        this.amountCurrencyIcon = page.locator('.mp-amount-currency');
        this.quickAmountLabel   = page.locator('.mp-amount-quick-label');
        this.presetAmountChips  = page.locator('.mp-amount-chip');

        this.disclaimerText = page.getByText(/disclaimer:\s*top up is powered by hyper pay/i);
        this.proceedButton  = page.locator('button.mp-btn-cta, button:has-text("Proceed")').first();

        this.summaryCancelButton = page.locator('button.btn-outline-primary:has-text("Cancel")')
            .or(page.getByRole('button', { name: /^cancel$/i }));
        this.summaryNextButton = page.getByRole('button', { name: /^next$/i })
            .or(page.locator('button:has-text("Next")'));
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

    async selectPaymentMethod(method: 'mada' | 'visa' | 'master') {
        const option = method === 'mada' ? this.madaOption : method === 'visa' ? this.visaOption : this.masterOption;
        await expect(option).toBeVisible({ timeout: 15000 });
        await option.click();
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
}
