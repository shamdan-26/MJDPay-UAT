import { Page, Locator, expect } from '@playwright/test';
import { TransactionsPage } from './TransactionsPage';

export class BankTransferPage {
    readonly page: Page;
    readonly bankTransferButton: Locator;
    readonly inputAmount: Locator;
    readonly proceedButton: Locator;
    readonly proceedButtonInSummary: Locator;
    readonly summaryCancelButton: Locator;
    readonly summaryCloseIcon: Locator;
    readonly Successful_OkButton: Locator;
    readonly useFullBalanceToggle: Locator;
    readonly tnxp: TransactionsPage;

    // ---------- Variables ----------
    public balanceBeforeBankTransferVar = 0;
    private selectedAmount = 0;

    constructor(page: Page) {
        this.page = page;

        // Locators mapped from Java elements
        this.bankTransferButton = page.locator('#balance-transfer-text');
        this.inputAmount = page.locator('#input_set_amount');
        this.proceedButton = page.locator('#sa_button button');
        this.proceedButtonInSummary = page.locator('button.btn-primary.custom-btn', { hasText: 'Next' });
        this.summaryCancelButton = page.locator('button.btn.btn-outline-primary.custom-btn', { hasText: 'Cancel' });
        this.summaryCloseIcon = page.locator('mat-icon.mat-icon.material-icons', { hasText: 'close' });
        this.Successful_OkButton = page.locator('button#submit_btn_info', { hasText: 'Ok' }); this.useFullBalanceToggle = page.locator('#use-full-balance-toggle');

        // Instantiate TransactionsPage just like `TransactionsPage tnxp = new TransactionsPage(driver);`
        this.tnxp = new TransactionsPage(page);
    }

    // Predefined amounts locator helper
    private predefinedAmounts(): Locator {
        return this.page.locator("//button[contains(@id,'amount_')]");
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

    async clickSummaryCloseIcon() {
        await expect(this.summaryCloseIcon.first()).toBeVisible({ timeout: 15000 });
        await expect(this.summaryCloseIcon.first()).toBeEnabled({ timeout: 15000 });
        await this.summaryCloseIcon.first().click();
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
    async selectRandomPredefinedAmount() {
        const amounts = this.predefinedAmounts();
        await expect(amounts.first()).toBeVisible({ timeout: 15000 });

        const count = await amounts.count();
        if (count === 0) {
            throw new Error("No predefined amounts found");
        }

        const index = Math.floor(Math.random() * count);
        const element = amounts.nth(index);

        await expect(element).toBeEnabled();
        const text = await element.textContent() ?? "";
        await element.click();

        this.selectedAmount = parseFloat(text.replace(/[^0-9.]/g, ""));
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
