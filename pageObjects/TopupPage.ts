import { Page, Locator, FrameLocator, expect } from '@playwright/test';
import { HomePage } from './HomePage';
import { TransactionsPage } from './TransactionsPage';
import { LoginPage } from './LoginPage';

export class TopupPage {
    readonly page: Page;
    private activePage: Page;

    private balanceBeforeTopupVar = 0;
    private balanceBeforeText = "";
    private theSelectedAmount = 0;

    constructor(page: Page) {
        this.page = page;
        this.activePage = page;
    }

    /**
     * Set the current active page/popup scope to handle operations on separate windows/popups.
     */
    setActivePage(page: Page) {
        this.activePage = page;
    }

    /**
     * Reset the active page scope back to the main page.
     */
    resetActivePage() {
        this.activePage = this.page;
    }

    // ---------- Dynamic Locators (Getters to auto-target activePage) ----------

    get enterAmount(): Locator {
        return this.activePage.getByTestId('amount-input');
    }

    get MADA_paymentMethod(): Locator {
        return this.activePage.locator("button.mp-method-option--mada");
    }

    get VISA_paymentMethod(): Locator {
        return this.activePage.locator("button.mp-method-option--visa");
    }

    get MASTER_paymentMethod(): Locator {
        return this.activePage.locator("button.mp-method-option--master");
    }

    get proceedButton(): Locator {
        return this.activePage.getByTestId('topup-proceed-btn');
    }

    get NextButtonInTopupSummary(): Locator {
        return this.activePage.getByTestId('topup-summary-next-btn')
            .or(this.activePage.getByTestId('topup-summary-modal-next-btn'));
    }

    get summaryCancelButton(): Locator {
        return this.activePage.getByTestId('topup-summary-cancel-btn')
            .or(this.activePage.getByTestId('topup-summary-modal-cancel-btn'));
    }

    get iframeElement_cardNumber(): Locator {
        return this.activePage.locator("//iframe[@placeholder='Card Number']");
    }

    get cardNumberInput(): Locator {
        return this.activePage.frameLocator("//iframe[@placeholder='Card Number']").locator("//input[@placeholder='Card Number']");
    }

    get expiry_Date(): Locator {
        return this.activePage.locator("//input[@placeholder='MM / YY']");
    }

    get card_Holder(): Locator {
        return this.activePage.locator("//input[@placeholder='Card holder']");
    }

    get iframeElement_CVV(): Locator {
        return this.activePage.locator("//iframe[@placeholder='CVV']");
    }

    get CVV_Input(): Locator {
        return this.activePage.frameLocator("//iframe[@placeholder='CVV']").locator("//input[@placeholder='CVV']");
    }

    get Pay_nowButton(): Locator {
        return this.activePage.locator("//button[contains(text(),'Pay now')]");
    }

    get iframeElement_pay(): Locator {
        return this.activePage.locator("//iframe[@class='wpwl-target']");
    }

    get submitButton(): Locator {
        return this.activePage.frameLocator("//iframe[@class='wpwl-target']").locator("//form//input[@value='Pay']");
    }

    get Successful_Payment_OkButton(): Locator {
        return this.activePage.getByTestId('topup-result-ok-btn');
    }

    get submitButton_MADA_MASTER(): Locator {
        return this.activePage
            .frameLocator('iframe[name^="card_"]')
            .locator('button[type="submit"]:has-text("Submit"), button.btn-primary');
    }

    get toastErrorMessageLimitation(): Locator {
        return this.activePage.getByTestId('toast-message');
    }

    get paymentMethods_RequiredError(): Locator {
        return this.activePage.locator("//div[@id='error_content-paymentMethodId']");
    }

    // ---------- Action Methods ----------

    async setAmount(amount: string) {
        await expect(this.enterAmount).toBeVisible({ timeout: 15000 });
        await this.enterAmount.fill(amount);
    }

    async enterAmountKeyboard(amount: string) {
        await expect(this.enterAmount).toBeVisible({ timeout: 15000 });
        await this.enterAmount.clear();
        await this.enterAmount.pressSequentially(amount);
    }

    async pasteAmount(amount: string) {
        await expect(this.enterAmount).toBeVisible({ timeout: 15000 });
        await this.enterAmount.clear();

        // Simulate native paste event so frontend event listeners can trigger and validate it natively
        await this.enterAmount.evaluate((element: HTMLInputElement, pastedText: string) => {
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

    async click_MADA_paymentMethod() {
        await expect(this.MADA_paymentMethod).toBeVisible({ timeout: 15000 });
        await this.MADA_paymentMethod.click();
    }

    async click_VISA_paymentMethod() {
        await expect(this.VISA_paymentMethod).toBeVisible({ timeout: 15000 });
        await this.VISA_paymentMethod.click();
    }

    async click_MASTER_paymentMethod() {
        await expect(this.MASTER_paymentMethod).toBeVisible({ timeout: 15000 });
        await this.MASTER_paymentMethod.click();
    }

    async clickProceedButton() {
        await expect(this.proceedButton).toBeVisible({ timeout: 15000 });
        await this.proceedButton.click();
    }

    async clickNextButtonInTopupSummary() {
        await expect(this.NextButtonInTopupSummary).toBeVisible({ timeout: 15000 });
        await this.NextButtonInTopupSummary.click();
    }

    async clickSummaryCancelButton() {
        await expect(this.summaryCancelButton).toBeVisible({ timeout: 15000 });
        await expect(this.summaryCancelButton).toBeEnabled({ timeout: 15000 });
        await this.summaryCancelButton.click();
    }

    switchToDefaultContent() {
        // No-op in Playwright (automatically scoped via frameLocator)
    }

    switchToIframeCardNumber() {
        // No-op in Playwright (handled natively via getters)
    }

    async setCardNumberInput(CNInput: string) {
        await expect(this.cardNumberInput).toBeVisible({ timeout: 15000 });
        await this.cardNumberInput.fill(CNInput);
    }

    async setExpiryDate(expiryDate: string) {
        await expect(this.expiry_Date).toBeVisible({ timeout: 15000 });
        await this.expiry_Date.fill(expiryDate);
    }

    async setCardHolder(cardHolder: string) {
        await expect(this.card_Holder).toBeVisible({ timeout: 15000 });
        await this.card_Holder.fill(cardHolder);
    }

    switchToIframeElement_CVV() {
        // No-op in Playwright
    }

    async setCVV(CVV: string) {
        await expect(this.CVV_Input).toBeVisible({ timeout: 15000 });
        await this.CVV_Input.fill(CVV);
    }

    async clickPay_nowButton() {
        await expect(this.Pay_nowButton).toBeVisible({ timeout: 15000 });
        await this.Pay_nowButton.click();
    }

    switchToIframeElement_pay() {
        // No-op in Playwright
    }

    async clickSubmitButton() {
        await expect(this.submitButton).toBeVisible({ timeout: 15000 });
        await this.submitButton.click();
    }

    async isHyperpayScreenDisplayed(): Promise<boolean> {
        try {
            await this.iframeElement_pay.waitFor({ state: 'attached', timeout: 5000 });
            return true;
        } catch (e) {
            return false;
        }
    }

    async clickOkButton() {
        await expect(this.Successful_Payment_OkButton).toBeVisible({ timeout: 20000 });
        await this.Successful_Payment_OkButton.click();
    }

    async clickSubmitButton_MADA_MASTER() {
        // 1. Wait for a moment to allow the 3DS authentication context to load inside the iframe
        await this.page.waitForTimeout(3000);

        // 2. Assert visibility with an extended timeout for safe gateway rendering
        await expect(this.submitButton_MADA_MASTER).toBeVisible({ timeout: 20000 });

        // 3. Click the button safely
        await this.submitButton_MADA_MASTER.click();
    }

    // ---------- Balance Operations ----------

    async balanceBeforeTopup() {
        const balanceLocator = this.page.locator(".mp-bal-amount").or(this.page.locator("//div[@class='price']//span[@id='balance-amount']"));
        await expect(balanceLocator).toBeVisible({ timeout: 15000 });

        // Wait for text to be non-empty
        await expect(balanceLocator).not.toHaveText("", { timeout: 15000 });

        this.balanceBeforeText = (await balanceLocator.textContent())?.trim() ?? "";
        console.log(`Balance raw text before: [${this.balanceBeforeText}]`);

        const balanceBeforeStr = this.balanceBeforeText.replace(/[^\d.]/g, "");
        if (balanceBeforeStr === "") {
            throw new Error("Balance value is empty or not loaded yet");
        }

        this.balanceBeforeTopupVar = parseFloat(balanceBeforeStr);
        console.log(`Balance before Topup: ${this.balanceBeforeTopupVar}`);
    }

    async actual_BalanceAfter(): Promise<number> {
        let currentBalance = 0;
        try {
            currentBalance = await this.readBalanceValue();
        } catch (e) {
            currentBalance = this.balanceBeforeTopupVar;
        }

        let retries = 3;
        while (currentBalance === this.balanceBeforeTopupVar && retries > 0) {
            console.log(`Balance did not change from pre-transaction value (${this.balanceBeforeTopupVar}). Retrying reload in 4s... (Attempts left: ${retries})`);
            await this.page.waitForTimeout(4000);
            await this.page.reload({ waitUntil: 'networkidle' }).catch(() => null);
            try {
                currentBalance = await this.readBalanceValue();
            } catch (e) {
                currentBalance = this.balanceBeforeTopupVar;
            }
            retries--;
        }

        console.log(`Balance after retry polling: [${currentBalance}]`);
        return currentBalance;
    }

    expected_BalanceAfter(amount: string): number {
        const cleaned = amount.replace(/[^\d.]/g, "");
        return this.balanceBeforeTopupVar + parseFloat(cleaned);
    }

    async checkBalanceAfterTopup(amount: string) {
        const actual = await this.actual_BalanceAfter();
        const expected = this.expected_BalanceAfter(amount);
        expect(actual).toBeCloseTo(expected, 3);
    }

    // ---------- Predefined Amount Selection ----------

    async Select_Amount() {
        const chipValues = ["500", "1000", "2000", "5000", "10000"];
        const selectedValue = chipValues[Math.floor(Math.random() * chipValues.length)];
        const selectedElement = this.page.getByTestId(`amount-chip-${selectedValue}`);

        await expect(selectedElement).toBeVisible({ timeout: 15000 });
        const text = await selectedElement.textContent() ?? "";
        this.theSelectedAmount = parseFloat(text.replace(/[^0-9.]/g, ""));

        await selectedElement.click();
    }

    expected_BalanceAfter_the_Selected_Amount(): number {
        return this.balanceBeforeTopupVar + this.theSelectedAmount;
    }

    async checkBalanceAfterTopupBySelectAmount() {
        const actual = await this.actual_BalanceAfter();
        const expected = this.expected_BalanceAfter_the_Selected_Amount();
        expect(actual).toBeCloseTo(expected, 3);
    }

    // ---------- Safe Balance Assertions ----------

    async checkBalanceAfterTopup_Safe(amount: string) {
        const actual = await this.actual_BalanceAfter();
        const expected = this.expected_BalanceAfter(amount);

        const actualRounded = Math.round(actual * 100) / 100;
        const expectedRounded = Math.round(expected * 100) / 100;

        console.log(`Expected Balance: ${expectedRounded} | Actual Balance: ${actualRounded}`);
        expect(actualRounded).toBe(expectedRounded);
    }

    // ---------- Commission & VAT Calculation ----------

    static calculateNetTopupAmount(topupAmount: number, commissionValue: number, vatValue: number, commissionType: string): number {
        let commissionAmount = 0;
        if (commissionType.toUpperCase() === 'PERCENT' || commissionType.toUpperCase() === 'PERCENTAGE') {
            commissionAmount = topupAmount * (commissionValue / 100);
        } else {
            commissionAmount = commissionValue;
        }
        const vatAmount = commissionAmount * (vatValue / 100);
        return topupAmount - commissionAmount - vatAmount;
    }

    async verifyBalanceAfterTopupWithCommissionVAT(amount: string, commission: string, vatPercent: string, commissionType: string) {
        const topupAmount = parseFloat(amount);
        const commissionValue = parseFloat(commission);
        const vatValue = parseFloat(vatPercent);

        const netAmount = TopupPage.calculateNetTopupAmount(topupAmount, commissionValue, vatValue, commissionType);
        const expectedBalance = this.balanceBeforeTopupVar + netAmount;
        const actualBalance = await this.actual_BalanceAfter();

        console.log(`Expected Balance = ${expectedBalance} | Actual Balance = ${actualBalance}`);
        expect(actualBalance).toBeCloseTo(expectedBalance, 2);
    }

    // ---------- Hyperpay Multi-window Handling ----------

    async handleHyperpayNewWindow(CNInput: string, expiryDate: string, cardHolder: string, CVV: string) {
        // Wait for popup event to capture new window handle
        const [popup] = await Promise.all([
            this.page.context().waitForEvent('page'),
            this.clickPay_nowButton()
        ]);

        // Perform actions within new window context
        this.setActivePage(popup);
        await this.setCardNumberInput(CNInput);
        await this.setExpiryDate(expiryDate);
        await this.setCardHolder(cardHolder);
        await this.setCVV(CVV);

        // Reset context back to main page
        this.resetActivePage();
    }

    // ---------- Assertions & Validations ----------

    async assertPayNowButtonIsDisabled() {
        try {
            await expect(this.Pay_nowButton).toBeDisabled({ timeout: 5000 });
            console.log("Assertion Passed: Pay Now button is disabled as expected.");
        } catch (error) {
            const isVisible = await this.Pay_nowButton.isVisible();
            if (!isVisible) {
                console.log("Pay Now button not visible/found — considered DISABLED (valid behavior).");
            } else {
                throw new Error("Pay Now button is ENABLED but should be DISABLED for invalid card data!");
            }
        }
    }

    async verifyLastTransactionFailed() {
        const tnxp = new TransactionsPage(this.page);
        const status = await tnxp.getLastTransactionStatus();
        console.log(`Last Transaction Status: ${status}`);
        expect(status).toBe("FAILED");
        console.log("Transaction is FAILED → TC Passed as expected.");
    }

    async getAmountValue(): Promise<string> {
        try {
            await expect(this.enterAmount).toBeVisible({ timeout: 5000 });
            return (await this.enterAmount.inputValue()).trim();
        } catch (error) {
            console.log("Amount input field not found or not visible.");
            return "";
        }
    }

    async assertInvalidAmountNotAccepted(amount: string, amountValidation: string) {
        console.log(`Verifying invalid amount: ${amount} (Type: ${amountValidation})`);
        await this.setAmount(amount);

        const enteredAmount = await this.getAmountValue();
        expect(enteredAmount === "" || enteredAmount !== amount).toBeTruthy();
        console.log(`Invalid amount correctly NOT accepted: ${amount} (Type: ${amountValidation})`);
    }

    async assertProceedButtonIsDisabled() {
        console.log("Verifying that proceed button is disabled");
        await expect(this.proceedButton).toBeDisabled({ timeout: 10000 });
        console.log("Proceed button is correctly DISABLED");
    }

    async assertPaymentMethodIsRequired() {
        await expect(this.paymentMethods_RequiredError).toBeVisible({ timeout: 10000 });
        console.log("Payment Method required error is displayed as expected.");
    }

    async getBalanceBeforeTopup(): Promise<number> {
        const balanceLocator = this.page.locator(".mp-bal-amount").or(this.page.locator("//div//span[@id='balance-amount']"));
        await expect(balanceLocator).toBeVisible({ timeout: 15000 });
        const text = await balanceLocator.textContent() ?? "";
        return parseFloat(text.replace(/[^\d.]/g, ""));
    }

    async performTopup(amount: number, CNInput: string, expiryDate: string, cardHolder: string, CVV: string) {
        console.log(`Starting Topup with amount: ${amount}`);
        const hp = new HomePage(this.page);
        await hp.clickTopupButton();

        await this.click_VISA_paymentMethod();
        await this.setAmount(amount.toString());

        // Capture popup window
        await this.clickProceedButton();
        const [popup] = await Promise.all([
            this.page.waitForEvent('popup'),
            this.clickNextButtonInTopupSummary()
        ]);

        this.setActivePage(popup);

        await this.setCardNumberInput(CNInput);
        await this.setExpiryDate(expiryDate);
        await this.setCardHolder(cardHolder);
        await this.setCVV(CVV);

        await this.clickPay_nowButton();

        if (await this.isHyperpayScreenDisplayed()) {
            await this.clickSubmitButton();
        }

        this.resetActivePage();

        const lp = new LoginPage(this.page);
        if (await lp.isOTPScreenDisplayed()) {
            await lp.enterOTP("0000");
            await lp.verifyButton.click();
        }

        await this.clickOkButton();
        console.log("Topup completed successfully");
    }

    async EnterAmountAndClickProccedButton(amount: number) {
        console.log(`Starting Topup with amount: ${amount}`);
        const hp = new HomePage(this.page);
        await hp.clickTopupButton();

        await this.click_VISA_paymentMethod();
        await this.setAmount(amount.toString());
        await this.clickProceedButton();
    }

    async assertTopupBlocked() {
        console.log("Asserting that topup is BLOCKED due to wallet limits (Toast OR Dialog)");

        const dialogError = this.page.locator("//*[@id='mat-mdc-dialog-0']/div/div");
        const limitErrorLocator = this.toastErrorMessageLimitation.or(dialogError);

        await expect(limitErrorLocator.first()).toBeVisible({ timeout: 10000 });

        let errorText = "";
        if (await dialogError.isVisible()) {
            errorText = await dialogError.textContent() ?? "";
            console.log(`Wallet limit error displayed as DIALOG: ${errorText}`);
        } else {
            errorText = await this.toastErrorMessageLimitation.textContent() ?? "";
            console.log(`Wallet limit error displayed as TOAST: ${errorText}`);
        }

        expect(errorText.toLowerCase()).toContain("limit");
        console.log("Correct wallet limit error displayed (Toast OR Dialog)");

        const iframeLocator = this.page.locator("iframe[name='card-number']");
        await expect(iframeLocator).not.toBeVisible({ timeout: 5000 });
        console.log("Payment iframe is not displayed – topup is correctly blocked");
    }

    async assertTopupAllowed() {
        console.log("Asserting that topup is ALLOWED and within wallet limits");

        await this.page.waitForTimeout(1500);

        const iframeLocator = this.page.locator("iframe");
        const iframeCount = await iframeLocator.count();
        expect(iframeCount).toBeGreaterThan(0);
        console.log(`Payment iframe count found: ${iframeCount}`);

        const toastLocator = this.page.locator("//div[contains(@class,'p-toast-detail')]");
        const dialogLocator = this.page.locator("//*[@id='mat-mdc-dialog-0']/div/div");

        await expect(toastLocator).not.toBeVisible({ timeout: 2000 });
        await expect(dialogLocator).not.toBeVisible({ timeout: 2000 });
        console.log("No wallet limit error displayed – topup is correctly allowed");
    }

    async selectGatewayReturnCode(value: string) {
        // 1. Wait for the simulator gateway to completely render the elements
        await this.activePage.waitForTimeout(3000);

        // 2. Access the active payment iframe by name prefix
        const frame = this.activePage.frameLocator('iframe[name^="card_"]').last();
        const selectDropdown = frame.locator('select[name="returnCode"]');

        // 3. Assert visibility with a robust timeout and select option by value ("2", "3", "4", "5")
        await expect(selectDropdown).toBeVisible({ timeout: 20000 });
        await selectDropdown.selectOption(value);
    }

    async assertFailedPopup() {
        console.log("Asserting that payment failed popup displays");
        const titleLocator = this.page.getByRole('heading', { name: /Payment Failed/i })
            .or(this.page.getByText(/Payment Failed/i));
        await expect(titleLocator.first()).toBeVisible({ timeout: 15000 });

        const descLocator = this.page.getByText(/Unfortunately, your payment was not successful/i);
        await expect(descLocator.first()).toBeVisible({ timeout: 15000 });
    }

    async assertPendingPopup() {
        console.log("Asserting that payment pending popup displays");
        const titleLocator = this.page.getByRole('heading', { name: /Payment Pending Confirmation/i })
            .or(this.page.getByText(/Payment Pending Confirmation/i));
        await expect(titleLocator.first()).toBeVisible({ timeout: 15000 });

        const descLocator = this.page.getByText(/Your payment is currently pending confirmation/i);
        await expect(descLocator.first()).toBeVisible({ timeout: 15000 });
    }

    async readBalanceValue(): Promise<number> {
        const balanceLocator = this.page.locator(".mp-bal-amount").or(this.page.locator("//div[@class='price']//span[@id='balance-amount']"));
        await expect(balanceLocator).toBeVisible({ timeout: 15000 });
        const text = await balanceLocator.textContent() ?? "";
        const cleaned = text.replace(/[^\d.]/g, "");
        if (cleaned === "") {
            throw new Error("Balance text is empty or not loaded");
        }
        return parseFloat(cleaned);
    }

    async checkBalanceRemainsUnchanged() {
        const actual = await this.readBalanceValue();
        console.log(`Verifying balance remained unchanged. Expected [${this.balanceBeforeTopupVar}], Actual [${actual}]`);
        expect(actual).toBeCloseTo(this.balanceBeforeTopupVar, 3);
    }
}