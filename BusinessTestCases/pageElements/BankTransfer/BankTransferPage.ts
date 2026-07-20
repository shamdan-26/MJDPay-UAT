import { Page, Locator, expect } from '@playwright/test';
import { TransactionsPage } from '../Shared/TransactionsPage';

export class BankTransferPage {
    readonly page: Page;
    readonly bankTransferButton: Locator;
    readonly inputAmount: Locator;
    readonly proceedButton: Locator;
    readonly proceedButtonInSummary: Locator;
    readonly summaryCancelButton: Locator;
    readonly Successful_OkButton: Locator;
    readonly useFullBalanceToggle: Locator;
    readonly tnxp: TransactionsPage;

    // ---------- Redesigned Cashout screen (Amount → Confirmation → OTP) ----------
    readonly ibanCardValue: Locator;
    readonly ibanCardBank: Locator;
    readonly ibanCardCheck: Locator;
    readonly ibanCardLabel: Locator;
    readonly otpRecapIban: Locator;
    readonly otpRecapTotal: Locator;

    // ---------- Amount page — page hero, balance card, section header ----------
    readonly pageTitle: Locator;
    readonly pageSubtitle: Locator;
    readonly balanceCardLabel: Locator;
    readonly balanceAmount: Locator;
    readonly balanceWalletCode: Locator;
    readonly balanceTopupButton: Locator;
    readonly balanceQrButton: Locator;
    readonly balanceSettingsButton: Locator;
    readonly sectionStepBadge: Locator;
    readonly sectionTitle: Locator;
    readonly sectionDescription: Locator;
    readonly amountFieldTitle: Locator;
    readonly fullBalanceToggleLabel: Locator;
    readonly amountCurrencyIcon: Locator;
    readonly quickAmountLabel: Locator;
    readonly presetAmountChips: Locator;

    // ---------- Variables ----------
    public balanceBeforeBankTransferVar = 0;
    private selectedAmount = 0;

    constructor(page: Page) {
        this.page = page;

        // Locators mapped from Java elements
        this.bankTransferButton = page.locator('#balance-transfer-text');
        this.inputAmount = page.getByTestId('amount-input').or(page.locator('#input_set_amount'));
        this.proceedButton = page.getByTestId('bank-amount-proceed-btn')
            .or(page.locator('button.mp-btn-cta, #sa_button button, button:has-text("Proceed")')).first();
        this.proceedButtonInSummary = page.getByTestId('bank-summary-next-btn')
            .or(page.getByRole('button', { name: /Next/i }))
            .or(page.locator('button:has-text("Next")')).first();
        this.summaryCancelButton = page.getByTestId('bank-summary-cancel-btn')
            .or(page.locator('button.btn-outline-primary:has-text("Cancel")'))
            .or(page.locator('button.btn.btn-outline-primary.custom-btn', { hasText: 'Cancel' }));
        this.Successful_OkButton = page.locator('button.mp-btn-wide:has-text("Ok")')
            .or(page.locator('button#submit_btn_info', { hasText: 'Ok' })); this.useFullBalanceToggle = page.locator('#use-full-balance-toggle');

        this.ibanCardValue = page.locator('.mp-iban-card__value');
        this.ibanCardBank  = page.locator('.mp-iban-card__bank');
        this.ibanCardCheck = page.locator('.mp-iban-card__status svg');
        this.ibanCardLabel = page.locator('.mp-iban-card__label');
        this.otpRecapIban  = page.locator('.mp-otp-recap__v');
        this.otpRecapTotal = page.locator('.mp-otp-recap__amt .money-amount');

        this.pageTitle             = page.locator('.mp-page-hero h1');
        this.pageSubtitle          = page.locator('.mp-page-hero p');
        this.balanceCardLabel      = page.locator('.mp-bal-label');
        this.balanceAmount         = page.locator('.mp-bal-amount');
        this.balanceWalletCode     = page.locator('.mp-bal-code');
        this.balanceTopupButton    = page.locator('#btn_top_up_compact');
        this.balanceQrButton       = page.locator('button[aria-label="generate QR Code"]');
        this.balanceSettingsButton = page.locator('button[aria-label="wallet settings"]');
        this.sectionStepBadge      = page.locator('.mp-sec-num');
        this.sectionTitle          = page.locator('.mp-sec-title');
        this.sectionDescription    = page.locator('.mp-sec-desc');
        this.amountFieldTitle      = page.locator('.mp-amount-title');
        this.fullBalanceToggleLabel = page.locator('.mp-amount-toggle-label');
        this.amountCurrencyIcon    = page.locator('.mp-amount-currency');
        this.quickAmountLabel      = page.locator('.mp-amount-quick-label');
        this.presetAmountChips     = page.locator('.mp-amount-chip');

        // Instantiate TransactionsPage just like `TransactionsPage tnxp = new TransactionsPage(driver);`
        this.tnxp = new TransactionsPage(page);
    }

    // Predefined amounts locator helper
    private predefinedAmounts(): Locator {
        return this.presetAmountChips;
    }

    // ---------- Actions ----------
    async clickBankTransferButton() {
        await expect(this.bankTransferButton).toBeEnabled({ timeout: 15000 });
        await this.bankTransferButton.click();
    }

    async enterAmount(amount: string) {
        await expect(this.inputAmount).toBeVisible({ timeout: 15000 });
        await this.inputAmount.clear();
        await this.inputAmount.pressSequentially(amount);
    }

    async pasteAmount(amount: string) {
        await expect(this.inputAmount).toBeVisible({ timeout: 15000 });
        await this.inputAmount.clear();

        // Simulate native paste event so frontend event listeners can trigger and validate it natively
        await this.inputAmount.evaluate((element: HTMLInputElement, pastedText: string) => {
            const dataTransfer = new DataTransfer();
            dataTransfer.setData('text/plain', pastedText);
            const event = new ClipboardEvent('paste', {
                clipboardData: dataTransfer,
                bubbles: true,
                cancelable: true,
            });
            element.dispatchEvent(event);

            // If the frontend does not cancel the event, we simulate the browser's default behavior
            if (!event.defaultPrevented) {
                // Use React-compatible value setter to ensure frameworks register the change correctly.
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                if (setter) {
                    setter.call(element, pastedText);
                } else {
                    element.value = pastedText;
                }
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, amount);
    }

    async clickProceedButton() {
        await expect(this.proceedButton).toBeEnabled({ timeout: 15000 });
        await this.proceedButton.click();
    }

    async clickProceedButtonInSummary() {
        // Allow dynamic commission/VAT details to compute and UI to settle
        await this.page.waitForTimeout(2000);
        await expect(this.proceedButtonInSummary).toBeVisible({ timeout: 15000 });
        await expect(this.proceedButtonInSummary).toBeEnabled({ timeout: 15000 });
        await this.proceedButtonInSummary.click();
    }

    async clickSummaryCancelButton() {
        await expect(this.summaryCancelButton.first()).toBeVisible({ timeout: 15000 });
        await expect(this.summaryCancelButton.first()).toBeEnabled({ timeout: 15000 });
        await this.summaryCancelButton.first().click();
    }


    // ---------- Confirmation summary (Transaction Type / Bank / IBAN / Original Amount / commission / VAT / Total) ----------
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
     * Commission/VAT populate asynchronously a moment after the summary section
     * first appears (it briefly shows 0 while the backend calculation is in
     * flight, and on this dev environment that calculation has been observed
     * taking anywhere from ~1s to 30+s). Poll the total until three
     * consecutive reads agree — two-in-a-row can still land on the transient
     * placeholder zero — before trusting any of the money rows.
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

    async clickSuccessful_OkButton() {
        // Wait specifically for the success element or dialog button to be visible
        await this.Successful_OkButton.waitFor({ state: 'visible', timeout: 15000 });
        await expect(this.Successful_OkButton).toBeEnabled({ timeout: 15000 });
        await this.Successful_OkButton.click();
    }

    async clickUseFullBalanceToggle() {
        await expect(this.useFullBalanceToggle).toBeEnabled({ timeout: 15000 });
        await this.useFullBalanceToggle.click();
    }

    // ---------- Predefined Amount Selection ----------
    /**
     * Picks a random preset chip. If maxAmount is given (e.g. the current
     * balance), only chips at or below it are eligible — otherwise a shared
     * test account whose balance has been drawn down by earlier tests in the
     * same run can randomly land on a preset it can no longer afford.
     */
    async selectRandomPredefinedAmount(maxAmount?: number) {
        const amounts = this.predefinedAmounts();
        await expect(amounts.first()).toBeVisible({ timeout: 15000 });

        const count = await amounts.count();
        if (count === 0) {
            throw new Error("No predefined amounts found");
        }

        const candidates: { index: number; value: number }[] = [];
        for (let i = 0; i < count; i++) {
            const text = (await amounts.nth(i).textContent()) ?? "";
            const value = parseFloat(text.replace(/[^0-9.]/g, ""));
            if (maxAmount === undefined || value <= maxAmount) {
                candidates.push({ index: i, value });
            }
        }
        if (candidates.length === 0) {
            throw new Error(`No predefined amount is <= ${maxAmount}`);
        }

        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        const element = amounts.nth(chosen.index);

        await expect(element).toBeEnabled();
        await element.click();

        this.selectedAmount = chosen.value;
    }

    // ---------- Balance Checks ----------
    async getBalanceBeforeBankTransfer(): Promise<number> {
        const balanceLocator = this.page.locator('.mp-bal-amount').or(this.page.locator('#balance-amount'));
        await expect(balanceLocator).toBeVisible({ timeout: 15000 });

        // Wait for the balance text to be populated (non-empty containing a digit)
        await expect(balanceLocator).toContainText(/\d/, { timeout: 15000 });

        const balanceText = (await balanceLocator.textContent())?.trim() ?? "";
        console.log(`Balance raw text: [${balanceText}]`);

        const numericBalance = balanceText.replace(/[^\d.]/g, "");
        if (numericBalance === "") {
            throw new Error(`Balance text is empty or not numeric: ${balanceText}`);
        }

        this.balanceBeforeBankTransferVar = parseFloat(numericBalance);
        console.log(`Balance before bank transfer: ${this.balanceBeforeBankTransferVar}`);
        return this.balanceBeforeBankTransferVar;
    }

    async actual_BalanceAfter(): Promise<number> {
        const balanceLocator = this.page.locator('.mp-bal-amount').or(this.page.locator("//div//span[@id='balance-amount']"));
        await expect(balanceLocator).toBeVisible({ timeout: 15000 });

        const balanceText = (await balanceLocator.textContent())?.trim() ?? "";
        console.log(`Balance raw text: [${balanceText}]`);

        const numericBalance = balanceText.replace(/[^\d.]/g, "");
        if (numericBalance === "") {
            throw new Error(`Balance text is empty or not numeric: ${balanceText}`);
        }

        const balanceAfter = parseFloat(numericBalance);
        console.log(`Actual balance after Bank Transfer: ${balanceAfter}`);
        return balanceAfter;
    }

    expected_BalanceAfter(amountStr: string): number {
        const cleaned = amountStr.replace(/[^\d.]/g, "");
        const amount = parseFloat(cleaned);
        return this.balanceBeforeBankTransferVar - amount;
    }

    async checkBalanceAfterBankTransfer(amountStr: string) {
        const actual = await this.actual_BalanceAfter();
        const expected = this.expected_BalanceAfter(amountStr);
        expect(actual).toBeCloseTo(expected, 3);
    }

    expected_BalanceAfter_the_Selected_Amount(): number {
        return Math.round((this.balanceBeforeBankTransferVar - this.selectedAmount) * 100.0) / 100.0;
    }

    async checkBalanceAfterBankTransferBySelectAmount() {
        const actual = await this.actual_BalanceAfter();
        const expected = this.expected_BalanceAfter_the_Selected_Amount();
        expect(actual).toBeCloseTo(expected, 2);
    }

    async checkBalanceRemainsUnchanged() {
        const actual = await this.actual_BalanceAfter();
        console.log(`Verifying balance remained unchanged. Expected [${this.balanceBeforeBankTransferVar}], Actual [${actual}]`);
        expect(actual).toBeCloseTo(this.balanceBeforeBankTransferVar, 3);
    }

    // ---------- Transactions Status ----------
    async verifyLastTransactionFailed() {
        const status = await this.tnxp.getLastTransactionStatus();
        console.log(`Last Transaction Status: ${status}`);

        expect(status).toBe("FAILED");
        console.log("Transaction is FAILED → TC Passed as expected.");
    }

    // ---------- Getters ----------
    async getAmountValue(): Promise<string> {
        try {
            await this.inputAmount.waitFor({ state: 'visible', timeout: 5000 });
            return (await this.inputAmount.inputValue())?.trim() ?? "";
        } catch (error) {
            console.log("Amount input field not found or not visible.");
            return "";
        }
    }

    // ---------- Validations ----------
    async assertInvalidAmountNotAccepted(amount: string, amountValidation: string) {
        console.log(`[Negative Flow] Testing Input: "${amount}" | Type: ${amountValidation}`);

        // 1. Simulate real keyboard keystrokes (for negative numbers, characters, or leading zeros)
        await this.enterAmount(amount);

        // 2. Retrieve the actual value that settled in the input field after the typing attempt
        const enteredAmount = await this.getAmountValue();

        // 3. Unified Assertion: Since the UI blocks invalid inputs (signs, letters, zeros) from appearing,
        // the value inside the field must never match the expected invalid input.
        expect(enteredAmount).not.toBe(amount);
        console.log(`Passed: UI Filter successfully blocked the input. Field value is currently: [${enteredAmount}]`);

        // 4. Double Validation: Ensure that if the field remains empty or restricted, 
        // the proceed button is strictly disabled.
        if (enteredAmount === "" || enteredAmount === "0" || enteredAmount === "0.00") {
            await expect(this.proceedButton).toBeDisabled({ timeout: 5000 });
            console.log("Passed: Proceed button is correctly DISABLED for this invalid case.");
        }
    }
}
