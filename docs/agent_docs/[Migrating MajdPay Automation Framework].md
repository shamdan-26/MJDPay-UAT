# Migrating MajdPay Automation Framework

This document serves as a complete summary of the migration journey, key prompts, resolved challenges, and final stable code implementations for the **MajdPay e-wallet automation project**. This migration transitions the legacy automation codebase from **Selenium + Java + TestNG** to **Playwright + TypeScript**, following strict design rules defined in [MIGRATION_RULES.md](file:///c:/Users/Hibaalrimawi/OneDrive%20-%20Digital%20Cash/Desktop/playwright/majdpay-automation-playwright-testing-3/MIGRATION_RULES.md).

---

## 1. Context and Goals

MajdPay is an Electronic Money Institution (EMI) platform. The primary goal of the migration is to replace legacy Selenium code with a modern, resilient, type-safe, and asynchronous test automation suite in Playwright and TypeScript.

### Primary Objectives:
*   **Asynchronous POM Pattern**: Migrate all Page Objects and Test Specifications to use Playwright's `async/await` paradigm and native auto-waiting.
*   **Agnostic Data-Driven Test Loops**: Leverage JSON test datasets to execute multiple tests dynamically inside a single spec runner loop.
*   **Robust Payment Gateway & Iframe Handling**: Securely interact with dynamic iframe payment contexts (such as HyperPay for MADA, VISA, and Mastercard).
*   **Resilient Ledger/Balance Integrity**: Assert post-transaction wallet balances by handling asynchronous backend ledger updates and API synchronization delays via page reload loops.

---

## 2. Chronological Prompts and Key Requests

Throughout this migration workspace, we addressed the following requirements and challenges:

1.  **Balance Sync Reload**: Reload the page before checking the wallet balance after a successful Top-up to force an API balance sync.
2.  **Iframe and Authentication Submit Resolution**: Resolve the payment submit difference in Step 9 between MADA/Mastercard and VISA (which uses HyperPay iframe rendering and sometimes launches popups/3DS checks).
3.  **Strict Mode Violations on Side Nav Links**: Solve Playwright strict mode exceptions when navigating to the transactions list (where fuzzy text matches resolved to multiple DOM elements).
4.  **Updated DOM Elements & Custom Locators**: Adjust button locators in `HomePage` and `TopupPage` to map to static element IDs (e.g., `#quick-bank`, `#sideNav-menu-item-0` for Home, `#sideNav-menu-item-1` for Transactions, and custom CTA button classes).
5.  **Top-up Amount Field Localized Validation (8 New Cases)**: Add data-driven test cases validating edge-case user inputs (negative amounts, zero, invalid characters, float decimal limits, and clipboard paste actions).
6.  **Cancellation Test Cases (2 New Cases)**: Verify wallet balance integrity and ledger state when transactions are cancelled via browser reload/navigation away (`REFRESH`) or by clicking the summary modal's cancel button (`CANCEL_BUTTON`).
7.  **Pre-cancellation Balance Initialization**: Ensure pre-transaction balances (`balanceBeforeTopupVar`) are captured immediately after logging in, preventing incorrect default balance checks.
8.  **v6.2.0 HTML Balance Updates**: Refactor wallet balance locators globally across `TopupPage`, `HomePage`, and `BankTransferPage` to support the new class `.mp-bal-amount` with legacy fallbacks.

---

## 3. Key Technical Challenges and Solutions

### Challenge A: Payment Method Selection Gated Amount Input
**Issue**: The updated UI disabled or hid the amount input field until a payment method was selected.
**Solution**: Refactored the step sequence inside `TopupTests.spec.ts` and `TopupPage.ts` (`performTopup`) to select the payment method (Step 4) *before* entering the amount (Step 5).

### Challenge B: Playwright Strict Mode Violations
**Issue**: Using fuzzy locators like `.getByRole('link', { name: /transactions/i })` matched multiple elements (e.g., the parent `a` tag, an inner `span` containing icon/text, and utility labels), crashing the test.
**Solution**: Mapped side navigation locators to their explicit unique element IDs on the new DOM structure (`#sideNav-menu-item-0` for Home, `#sideNav-menu-item-1` for Transactions).

### Challenge C: Asynchronous Ledger Updates (Balance Sync)
**Issue**: Ledger API balance updates are occasionally processed asynchronously on the UAT backend, causing immediate balance assertions to fail.
**Solution**: 
1.  Implemented an unconditional `page.reload()` in `TopupTests.spec.ts` immediately after the gateway transaction completes.
2.  Refactored `actual_BalanceAfter()` in `TopupPage.ts` to execute a polling reload loop (up to 3 reloads with 4-second delays) to wait for the API balance sync to complete if the balance remains unchanged from the pre-transaction state.

### Challenge D: HyperPay Gateway Iframe Interactivity
**Issue**: GATEWAY simulated 3DS checks and card inputs load inside dynamically generated iframe windows, sometimes on popup tabs.
**Solution**: Used Playwright's `page.context().waitForEvent('page')` to handle multi-window redirection, and utilized `page.frameLocator(...)` to scope inside payment iframes (e.g., `card_` name-prefixes).

---

## 4. Final Production-Ready Code Solutions

### A. Home Page Object Model: `tests/pageObjects/HomePage.ts`
[HomePage.ts](file:///c:/Users/Hibaalrimawi/OneDrive%20-%20Digital%20Cash/Desktop/playwright/majdpay-automation-playwright-testing-3/tests/pageObjects/HomePage.ts)

```typescript
import { Page, Locator, expect } from '@playwright/test';

export class HomePage {
    readonly page: Page;
    readonly profileIcon: Locator;
    readonly logoutButton: Locator;
    readonly TopupButton: Locator;
    readonly ManageUsers_NavButton: Locator;
    readonly Bills_NavButton: Locator;
    readonly BillPayment_NavButton: Locator;
    readonly BillReport_NavButton: Locator;
    readonly Transactions_NavButton: Locator;
    readonly transferButton: Locator;
    readonly W2WTransferButton: Locator;
    readonly Home_NavButton: Locator;
    readonly currentBalance: Locator;

    constructor(page: Page) {
        this.page = page;

        this.Home_NavButton = page.locator('#sideNav-menu-item-0');

        this.profileIcon = page.locator("button#userSettings-image-container")
            .or(page.locator("#userSettings-image-container"))
            .or(page.locator("//*[@id='ddl_profile']/img"));

        this.logoutButton = page.locator("button#logout")
            .or(page.locator("#btn_profile_logout"));

        this.TopupButton = page.locator("#quick-topup")
            .or(page.locator("#btn_top_up"))
            .or(page.getByRole('link', { name: /top up/i }))
            .or(page.getByText(/top up/i));

        this.ManageUsers_NavButton = page.getByRole('button', { name: /manage accounts/i })
            .or(page.getByText(/manage accounts/i))
            .or(page.locator("(//span[@class='icon'])[4]"));

        this.Bills_NavButton = page.getByRole('button', { name: /^bills$/i })
            .or(page.getByText(/^bills$/i))
            .or(page.locator("(//span[@class='icon'])[5]"));

        this.BillPayment_NavButton = page.getByRole('link', { name: /bill payment/i })
            .or(page.getByText(/bill payment/i))
            .or(page.locator("(//span[@class='mdc-list-item__content'])[11]"));

        this.BillReport_NavButton = page.getByRole('link', { name: /bill reports?/i })
            .or(page.getByText(/bill reports?/i))
            .or(page.locator("(//span[@class='mdc-list-item__content'])[12]"));

        this.Transactions_NavButton = page.locator('#sideNav-menu-item-1');

        this.transferButton = page.locator("#quick-bank");
        this.W2WTransferButton = page.locator('#quick-transfer')
            .or(page.getByRole('button', { name: /wallet transfer/i }));

        this.currentBalance = page.locator(".mp-bal-amount").or(page.locator("//div[@class='price']//span[@id='balance-amount']"));
    }

    async clickTopupButton() {
        await expect(this.TopupButton).toBeEnabled({ timeout: 30000 });
        await this.TopupButton.click();
    }

    async clickTransferButton() {
        await expect(this.transferButton).toBeEnabled({ timeout: 30000 });
        await this.transferButton.click();
    }

    async clickW2WTransferButton() {
        await expect(this.W2WTransferButton).toBeEnabled({ timeout: 30000 });
        await this.W2WTransferButton.click();
    }

    async clickManageUsers_NavButton() {
        await expect(this.ManageUsers_NavButton).toBeEnabled({ timeout: 30000 });
        await this.ManageUsers_NavButton.click();
    }

    async clicBills_NavButton() {
        await expect(this.Bills_NavButton).toBeEnabled({ timeout: 30000 });
        await this.Bills_NavButton.click();
    }

    async clickBillPayment_NavButton() {
        await expect(this.BillPayment_NavButton).toBeEnabled({ timeout: 30000 });
        await this.BillPayment_NavButton.click();
    }

    async clicBillReport_NavButton() {
        const intermediate = this.page.locator("(//span[@class='mdc-list-item__content'])[10]");
        await expect(intermediate).toBeVisible({ timeout: 30000 });

        await expect(this.BillReport_NavButton).toBeEnabled({ timeout: 30000 });
        await this.BillReport_NavButton.click();
    }

    async clicTransactions_NavButton() {
        await expect(this.Transactions_NavButton).toBeVisible({ timeout: 30000 });
        await expect(this.Transactions_NavButton).toBeEnabled({ timeout: 30000 });
        await this.Transactions_NavButton.click();
    }

    async clickHome_NavButton() {
        await expect(this.Home_NavButton).toBeVisible({ timeout: 30000 });
        await expect(this.Home_NavButton).toBeEnabled({ timeout: 30000 });
        await this.Home_NavButton.click();
    }

    async getWalletBalance(): Promise<number> {
        await expect(this.currentBalance).toContainText(/\d/, { timeout: 30000 });
        const balanceText = (await this.currentBalance.textContent())?.trim() ?? "";
        console.log(`Raw wallet balance text: [${balanceText}]`);

        const cleanedText = balanceText.replace(/[^\d.]/g, "");
        if (cleanedText === "") {
            throw new Error(`Wallet balance text is empty or not numeric: ${balanceText}`);
        }
        const walletBalance = parseFloat(cleanedText);
        console.log(`Wallet Balance: ${walletBalance}`);
        return walletBalance;
    }
}
```

### B. Top-up Page Object Model: `tests/pageObjects/TopupPage.ts`
[TopupPage.ts](file:///c:/Users/Hibaalrimawi/OneDrive%20-%20Digital%20Cash/Desktop/playwright/majdpay-automation-playwright-testing-3/tests/pageObjects/TopupPage.ts)

```typescript
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

    setActivePage(page: Page) {
        this.activePage = page;
    }

    resetActivePage() {
        this.activePage = this.page;
    }

    get enterAmount(): Locator {
        return this.activePage.locator("//div//input[@id='input_set_amount']");
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
        return this.activePage.locator("button.mp-btn-cta").or(this.activePage.locator("//div/button[@class='btn btn-primary mp-btn-cta ng-star-inserted']"));
    }

    get NextButtonInTopupSummary(): Locator {
        return this.activePage.locator("button.btn-primary:has-text('Next')").or(this.activePage.locator("//button[@class = 'btn btn-primary']"));
    }

    get summaryCancelButton(): Locator {
        return this.activePage.locator('button.btn-outline-primary:has-text("Cancel")')
            .or(this.activePage.locator('button.btn.btn-outline-primary.custom-btn', { hasText: 'Cancel' }));
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
        return this.activePage.locator("button.mp-btn-wide:has-text('Ok')").or(this.activePage.locator("//div/button[contains(text(), ' Ok ')]"));
    }

    get submitButton_MADA_MASTER(): Locator {
        return this.activePage
            .frameLocator('iframe[name^="card_"]')
            .locator('button[type="submit"]:has-text("Submit"), button.btn-primary');
    }

    get toastErrorMessageLimitation(): Locator {
        return this.activePage.locator("//div[@data-pc-section='detail']");
    }

    get paymentMethods_RequiredError(): Locator {
        return this.activePage.locator("//div[@id='error_content-paymentMethodId']");
    }

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

        await this.enterAmount.evaluate((element: HTMLInputElement, pastedText: string) => {
            const dataTransfer = new DataTransfer();
            dataTransfer.setData('text/plain', pastedText);
            const event = new ClipboardEvent('paste', {
                clipboardData: dataTransfer,
                bubbles: true,
                cancelable: true,
            });
            element.dispatchEvent(event);

            if (!event.defaultPrevented) {
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

    async setCVV(CVV: string) {
        await expect(this.CVV_Input).toBeVisible({ timeout: 15000 });
        await this.CVV_Input.fill(CVV);
    }

    async clickPay_nowButton() {
        await expect(this.Pay_nowButton).toBeVisible({ timeout: 15000 });
        await this.Pay_nowButton.click();
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
        await this.page.waitForTimeout(3000);
        await expect(this.submitButton_MADA_MASTER).toBeVisible({ timeout: 20000 });
        await this.submitButton_MADA_MASTER.click();
    }

    async balanceBeforeTopup() {
        const balanceLocator = this.page.locator(".mp-bal-amount").or(this.page.locator("//div[@class='price']//span[@id='balance-amount']"));
        await expect(balanceLocator).toBeVisible({ timeout: 15000 });
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

    async Select_Amount() {
        const elementIds = ["amount_500", "amount_1000", "amount_2000", "amount_5000", "amount_10000"];
        const selectedId = elementIds[Math.floor(Math.random() * elementIds.length)];
        const selectedElement = this.page.locator(`#${selectedId}`);

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

    async checkBalanceAfterTopup_Safe(amount: string) {
        const actual = await this.actual_BalanceAfter();
        const expected = this.expected_BalanceAfter(amount);

        const actualRounded = Math.round(actual * 100) / 100;
        const expectedRounded = Math.round(expected * 100) / 100;

        console.log(`Expected Balance: ${expectedRounded} | Actual Balance: ${actualRounded}`);
        expect(actualRounded).toBe(expectedRounded);
    }

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

    async selectGatewayReturnCode(value: string) {
        await this.activePage.waitForTimeout(3000);
        const frame = this.activePage.frameLocator('iframe[name^="card_"]').last();
        const selectDropdown = frame.locator('select[name="returnCode"]');

        await expect(selectDropdown).toBeVisible({ timeout: 20000 });
        await selectDropdown.selectOption(value);
    }

    async assertFailedPopup() {
        const titleLocator = this.page.getByRole('heading', { name: /Payment Failed/i })
            .or(this.page.getByText(/Payment Failed/i));
        await expect(titleLocator.first()).toBeVisible({ timeout: 15000 });

        const descLocator = this.page.getByText(/Unfortunately, your payment was not successful/i);
        await expect(descLocator.first()).toBeVisible({ timeout: 15000 });
    }

    async assertPendingPopup() {
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
```

### C. Top-up Spec Runner: `tests/testCases/TopupTests.spec.ts`
[TopupTests.spec.ts](file:///c:/Users/Hibaalrimawi/OneDrive%20-%20Digital%20Cash/Desktop/playwright/majdpay-automation-playwright-testing-3/tests/testCases/TopupTests.spec.ts)

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pageObjects/LoginPage';
import { TopupPage } from '../pageObjects/TopupPage';
import { HomePage } from '../pageObjects/HomePage';
import { TransactionsPage } from '../pageObjects/TransactionsPage';

const topupData = require('../../data/topupData.json');

type TopupTestData = {
    testName: string;
    execute: boolean;
    companyNumber: string;
    mobileNumber: string;
    password: string;
    amount: string;
    paymentMethod: string;
    cardNumber: string;
    expiry: string;
    holder: string;
    cvv: string;
    otpCode?: string;
    isSelectAmount?: boolean;
    expectDisabled?: boolean;
    returnCode?: string;
    expectedStatus?: string;
    amountInput?: string;
    expectedValue?: string;
    isNegativeFlow?: boolean;
    isButtonDisabled?: boolean;
    isClipboardTest?: boolean;
    cancelType?: string;
};

const dataSets = topupData as TopupTestData[];

test.describe.serial('MajdPay Wallet Top-up Tests', () => {
    test.setTimeout(180000);

    for (const data of dataSets) {
        if (!data.execute) continue;

        test(`${data.testName} `, async ({ page }) => {
            const loginPage = new LoginPage(page);
            const topupPage = new TopupPage(page);
            const homePage = new HomePage(page);

            // Step 1: Login
            console.log("Step 1: Open login page");
            await loginPage.navigate();
            await loginPage.login(data.companyNumber, data.mobileNumber, data.password);

            if (await loginPage.isOTPScreenDisplayed()) {
                console.log("Handling OTP screen...");
                const otpCode = data.otpCode ?? "0000";
                await loginPage.enterOTP(otpCode);
                await loginPage.verifyButton.click();
            }

            await loginPage.assertLoginSuccess();

            // Handle potential session expired dialog
            const sessionExpiredDialog = page.getByRole('dialog').filter({ hasText: /session expired/i }).first();
            if (await sessionExpiredDialog.isVisible().catch(() => false)) {
                console.log("Session expired dialog found, re-logging in...");
                const okButton = sessionExpiredDialog.getByRole('button', { name: /^ok$/i }).first();
                await okButton.click();
                await loginPage.navigate();
                await loginPage.login(data.companyNumber, data.mobileNumber, data.password);
                if (await loginPage.isOTPScreenDisplayed()) {
                    const otpCode = data.otpCode ?? "0000";
                    await loginPage.enterOTP(otpCode);
                    await loginPage.verifyButton.click();
                }
                await loginPage.assertLoginSuccess();
            }

            // Capture balance before top-up
            if (data.amountInput === undefined || data.cancelType !== undefined) {
                console.log("Step 2: Capturing balance before top-up");
                await topupPage.balanceBeforeTopup();
            }

            // Pre-cancellation ledger state capture
            let initialLastTxnAmount = "";
            let initialLastTxnStatus = "";
            if (data.cancelType !== undefined) {
                console.log("Pre-cancellation Step: Capturing initial last transaction row state");
                await homePage.clicTransactions_NavButton();
                const transactionsPage = new TransactionsPage(page);
                await page.waitForTimeout(2000);
                await page.reload({ waitUntil: 'networkidle' }).catch(() => null);
                initialLastTxnAmount = (await transactionsPage.lastTransactionAmount.textContent().catch(() => "")) ?? "";
                initialLastTxnStatus = (await transactionsPage.lastTransactionStatus.textContent().catch(() => "")) ?? "";
                console.log(`Initial transaction row state: Amount [${initialLastTxnAmount}], Status [${initialLastTxnStatus}]`);

                // Go back home to topup screen
                await homePage.clickHome_NavButton();
            }

            // Step 3: Open Top-up screen
            console.log("Step 3: Navigating to top-up menu");
            await homePage.clickTopupButton();

            // Step 4: Select Payment Method (Reordered: payment method selection gates amount entry)
            console.log(`Step 4: Selecting payment method: ${data.paymentMethod}`);
            const method = data.paymentMethod.toUpperCase();
            if (method === 'MADA') {
                await topupPage.click_MADA_paymentMethod();
            } else if (method === 'MASTER') {
                await topupPage.click_MASTER_paymentMethod();
            } else if (method === 'VISA') {
                await topupPage.click_VISA_paymentMethod();
            } else {
                throw new Error(`Unknown payment method: ${data.paymentMethod}`);
            }

            // Localized UI Validation checks for amount field
            if (data.amountInput !== undefined && data.cancelType === undefined) {
                console.log(`Executing localized UI validation check for: ${data.testName}`);
                if (data.isClipboardTest) {
                    await topupPage.pasteAmount(data.amountInput);
                } else {
                    await topupPage.enterAmountKeyboard(data.amountInput);
                }

                const actualValue = await topupPage.getAmountValue();
                console.log(`Expected Value: "${data.expectedValue}", Actual Value: "${actualValue}"`);
                expect(actualValue).toBe(data.expectedValue);

                if (data.isButtonDisabled) {
                    await expect(topupPage.proceedButton).toBeDisabled({ timeout: 5000 });
                } else {
                    await expect(topupPage.proceedButton).toBeEnabled({ timeout: 5000 });
                }
                return;
            }

            // Step 5: Set Amount
            if (data.cancelType !== undefined) {
                await topupPage.enterAmountKeyboard(data.amountInput!);
            } else if (data.isSelectAmount) {
                await topupPage.Select_Amount();
            } else {
                await topupPage.setAmount(data.amount);
            }

            // Step 6: Proceed to payment details
            await topupPage.clickProceedButton();

            // Handling Top-up Cancellation Flow
            if (data.cancelType !== undefined) {
                await page.waitForTimeout(2000);
                await expect(topupPage.NextButtonInTopupSummary).toBeVisible({ timeout: 15000 });

                if (data.cancelType === 'REFRESH') {
                    console.log("Simulating cancellation via page reload...");
                    await page.reload();
                    await page.waitForLoadState('networkidle').catch(() => null);
                } else if (data.cancelType === 'CANCEL_BUTTON') {
                    console.log("Simulating cancellation via Summary Cancel button...");
                    await topupPage.clickSummaryCancelButton();
                }

                await expect(topupPage.NextButtonInTopupSummary).not.toBeVisible({ timeout: 5000 });
                await topupPage.checkBalanceRemainsUnchanged();

                await homePage.clicTransactions_NavButton();
                const transactionsPage = new TransactionsPage(page);
                await page.waitForTimeout(2000);
                await page.reload({ waitUntil: 'networkidle' }).catch(() => null);
                const postLastTxnAmount = (await transactionsPage.lastTransactionAmount.textContent().catch(() => "")) ?? "";
                const postLastTxnStatus = (await transactionsPage.lastTransactionStatus.textContent().catch(() => "")) ?? "";
                expect(postLastTxnAmount).toBe(initialLastTxnAmount);
                expect(postLastTxnStatus).toBe(initialLastTxnStatus);
                return;
            }

            const [popup] = await Promise.all([
                page.context().waitForEvent('page'),
                topupPage.clickNextButtonInTopupSummary()
            ]);

            topupPage.setActivePage(popup);
            await popup.waitForLoadState('load');

            // Step 7: Fill card details in the popup window
            await topupPage.setCardNumberInput(data.cardNumber);
            await topupPage.setExpiryDate(data.expiry);
            await topupPage.setCardHolder(data.holder);
            await topupPage.setCVV(data.cvv);

            // Step 8: Assert button status / Click pay
            if (data.expectDisabled) {
                await topupPage.assertPayNowButtonIsDisabled();
                await popup.close();
                return;
            }

            await topupPage.clickPay_nowButton();

            if (data.returnCode) {
                await topupPage.selectGatewayReturnCode(data.returnCode);
            }

            // Step 9: Handle payment authentication frame
            if (method === 'MADA' || method === 'MASTER') {
                await topupPage.clickSubmitButton_MADA_MASTER();
            } else if (method === 'VISA') {
                if (await topupPage.isHyperpayScreenDisplayed()) {
                    await topupPage.clickSubmitButton();
                }
            }

            await popup.waitForEvent('close', { timeout: 30000 }).catch(() => null);

            topupPage.resetActivePage();

            // Step 10: Handle OTP verification after payment
            if (await loginPage.isOTPScreenDisplayed()) {
                const otpCode = data.otpCode ?? "0000";
                await loginPage.enterOTP(otpCode);
                await loginPage.verifyButton.click();
            }

            // Step 11: Confirm and check payment result
            if (data.expectedStatus === 'FAILED') {
                await topupPage.assertFailedPopup();
                await topupPage.clickOkButton();
                await topupPage.checkBalanceRemainsUnchanged();

                await homePage.clicTransactions_NavButton();
                const transactionsPage = new TransactionsPage(page);
                await page.waitForTimeout(2000);
                await page.reload({ waitUntil: 'networkidle' }).catch(() => null);

                const status = await transactionsPage.getLastTransactionStatus();
                expect(status.toUpperCase()).toBe("FAILED");
                return;
            }

            if (data.expectedStatus === 'PENDING') {
                await topupPage.assertPendingPopup();
                await topupPage.clickOkButton();
                await topupPage.checkBalanceRemainsUnchanged();

                await homePage.clicTransactions_NavButton();
                const transactionsPage = new TransactionsPage(page);
                await page.waitForTimeout(2000);
                await page.reload({ waitUntil: 'networkidle' }).catch(() => null);

                const status = await transactionsPage.getLastTransactionStatus();
                expect(status.toUpperCase()).toBe("PENDING");
                return;
            }

            await topupPage.clickOkButton();

            console.log("Reloading the page to force API balance sync");
            await page.reload();
            await page.waitForLoadState('networkidle').catch(() => null);

            // Step 12: Validate balance updated correctly
            if (data.isSelectAmount) {
                await topupPage.checkBalanceAfterTopupBySelectAmount();
            } else {
                await topupPage.checkBalanceAfterTopup_Safe(data.amount);
            }
        });
    }
});
```
