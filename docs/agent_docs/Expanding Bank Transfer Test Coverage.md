# Expanding Bank Transfer Test Coverage

## 1. Overall Context and Goals
The primary objective of this session was to drastically expand the automation test coverage for the MajdPay Bank Transfer module. We adopted the mindset of a "Senior FinTech QA Automation Expert" strictly enforcing zero-tolerance policies on unasserted UI behaviors, unhandled input fields, and localization gaps. 

The main goal was to ideate, document, and implement exactly 30 highly specific test cases extending the basic coverage to deeply scrutinize:
- UI Fields Verification & Micro-interactions
- Input Sanitization & Extreme Boundaries
- Localization Contexts (Arabic / English integrations)

## 2. Key Prompts and Workflow Iterations
* **Initial Test Design Generation:** 
  You requested 30 new test cases for Bank Transfer based on the `Senior_QA_Automation_Expert.md` persona rules. 
* **Architectural Correction:** 
  I initially assumed standard external bank transfer inputs (Beneficiary Name, IBAN). You correctly redirected me: *"The test cases are not correct; bank transfer does not have a BeneficiaryName field or IBAN."* I analyzed `BankTransferPage.ts` and realized it operates as a streamlined cash-out mechanism interacting solely with `input_set_amount`, `use-full-balance-toggle`, and predefined amount components.
* **Code Implementation & Compilation Check:** 
  You approved the revised, strictly mapped 30 test cases and requested the generation of the `ExtraBankTransferTests.spec.ts` suite with full component reuse and strict type safety verified via `npx tsc --noEmit`.
* **Dynamic Authentication Hook Fix:** 
  You noticed execution timed out at `LoginPage.ts:92` during the setup hook because it became stuck on the OTP verification layer. You requested a fix to mirror the dynamic login pattern from `PayBillTests.spec.ts`, utilizing `data.otpCode` for dynamic resolution and injecting `await page.waitForURL(/\/business\/auth\/login/i);` to safeguard against Angular component rendering lag.
* **Execution Orchestration Unlinking:** 
  A boundary test (`AmountField_Boundary_BelowMinLimit`) failed and consequently skipped the remaining 20 tests because of a `.serial` execution tag. You requested isolating the UI tests by switching the block to `test.describe.configure({ mode: 'default' });` and relying on a clean `beforeEach` navigation reset to recover state without skipping tests.
* **Persona Rules Update:** 
  To formalize this new behavior, you requested an explicit update to the `Senior_QA_Automation_Expert.md` file, encoding the "Conditional Suite Execution Isolation Rule," mandating `mode: 'default'` for UI suites and `.serial` exclusively for core functional transaction suites.

## 3. Final Code Solutions & Implementations

### ExtraBankTransferTests.spec.ts (Core Hook Architecture)
We established a robust execution shell that natively isolates UI testing states over a shared browser context:

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pageObjects/LoginPage';
import { HomePage } from '../../pageObjects/HomePage';
import { BankTransferPage } from '../../pageObjects/BankTransferPage';
import { ToastMessages } from '../../pageObjects/common/ToastMessages';

const bankTransferData = require('../../../data/BankTransferData.json');

test.describe('Bank Transfer - Extended UI and Localization Layout', () => {
    // Ensuring individual test isolation inside the file
    test.describe.configure({ mode: 'default' });
    test.setTimeout(180000);

    type BankTransferTestData = {
        description: string;
        execute: boolean;
        CN: string;
        mobile: string;
        pwd: string;
        Amount: string;
        otpCode?: string; // Type safety mapping for dynamic backend codes
    };

    const dataSets = bankTransferData as BankTransferTestData[];
    let page: import('@playwright/test').Page;
    let lp: LoginPage;
    let hp: HomePage;
    let bt: BankTransferPage;
    let toast: ToastMessages;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        lp = new LoginPage(page);
        hp = new HomePage(page);
        bt = new BankTransferPage(page);
        toast = new ToastMessages(page);

        // --- DYNAMIC LOGIN SECTION ---
        const data = dataSets.find(d => d.execute !== false) || dataSets[0];
        await lp.navigate();
        await lp.login(data.CN, data.mobile, data.pwd);

        if (await lp.isOTPScreenDisplayed()) {
            await page.waitForURL(/\/business\/auth\/login/i); // Mitigate Angular lag
            const otpCode = data.otpCode ?? ''; // Dynamic resolution mapped to utilities/data
            await lp.enterOTP(otpCode); 
            if (await lp.verifyButton.isVisible()) {
                await lp.verifyButton.click();
            }
        }
        await lp.assertLoginSuccess();
    });

    test.beforeEach(async () => {
        // --- ISOLATED TEST RECOVERY HOOK ---
        // Cleanly navigates back to the Bank Transfer page panel to protect state
        await page.goto('https://uat.majdpay.com/business/main/home');
        await page.waitForLoadState('domcontentloaded');
        await hp.clickTransferButton();
    });

    // ... [Followed by the 30 Isolated Assertive Test Cases targeting exact UI components]
});
```

### Senior_QA_Automation_Expert.md (New Engineering Constraint)
Added the following strict execution constraint under the `Resiliency & Interruption Flows` section to guide future automated developments:

> **Conditional Suite Execution Isolation Rule:** You must dynamically differentiate between UI/Sanitization suites and Core Functionality suites:
> - **For UI, Input Sanitization, and Localization Suites:** Always design test blocks to execute independently (`mode: 'default'`). If an individual input or layout assertion fails, the suite MUST NOT skip the remaining test cases, allowing full visibility over all fields.
> - **For Core Functionality and Financial Transaction Lifecycle Suites** (e.g., Pay Bill, W2W, Bank Transfer execution): You MUST enforce strict sequential cascade constraints (`test.describe.serial`). If a primary functional step fails (e.g., initial payment submission), the runner must immediately SKIP all subsequent assertion steps to protect database state integrity and prevent false-positive ledger checks.
