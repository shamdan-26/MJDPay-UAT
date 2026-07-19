# Automation Registry

This file serves as our central, living registry for all automated test suites and individual test cases currently written in the project.

<!-- AUTOMATION_REGISTRY_START -->

## 1. Authentication (Login)
**File Reference:** `tests/testCases/LoginTests.spec.ts`

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| Login for user: valid credentials | Positive | Validates user dashboard navigation and API token generation after OTP input. |
| Login for user: Password visibility test credentials | Positive | Validates user dashboard navigation and API token generation after OTP input. |
| Validation: all fields empty | Negative | Validates mandatory field constraint and prevents login. |
| Validation: company number empty | Negative | Validates mandatory field constraint and prevents login. |
| Validation: mobile number empty | Negative | Validates mandatory field constraint and prevents login. |
| Validation: password empty | Negative | Validates mandatory field constraint and prevents login. |
| Validation: Invalid Mobile Number (Unregistered) | Negative | Asserts 'User not found' toast error. |
| Validation: Invalid Password | Negative | Asserts 'Invalid credentials, please try again.' toast error. |
| Validation: Invalid Company Number | Negative | Asserts 'User not found' toast error. |
| Validation: Mobile Starts Without 5 | Negative | Asserts mobile number format validation error. |
| Validation: Mobile Number Length (Too Short) | Negative | Asserts mobile number minimum length validation. |
| Validation: Mobile Number Length (Too Long) | Negative | Asserts maximum length truncation (max 9 digits). |
| Validation: Alphabetical Characters in Mobile Field | Negative | Asserts field restricts alphabetical characters to empty value. |
| Validation: Login in Arabic Language | Positive | Asserts Arabic language UI rendering and title visibility. |
| Login in Light Mode (Default) | Positive | Asserts light mode is active and completes login. |
| Login in Dark Mode | Positive | Asserts dark mode is toggled successfully and completes login. |
| Login in English Language (Default) | Positive | Asserts English language is active and completes login. |
| Merchant - Verify that the text inside the password field is masked by default | Positive | Asserts password field is masked by default (`type="password"`). |
| Merchant - Show the password | Positive | Asserts password visibility toggle changes type to `text`. |
| Merchant - Hide the password | Positive | Asserts password visibility toggle changes type back to `password`. |

## 2. Wallet-to-Wallet (W2W) Transfer
**File Reference:** `tests/testCases/W2WTransferTests.spec.ts`

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| W2W_Transfer_Valid_Whole_Amount_Updates_Balances | Positive | Asserts sender debited and receiver credited for whole amount. |
| W2W_Transfer_Valid_Decimal_Amount_Updates_Balances | Positive | Asserts sender debited and receiver credited for decimal amount. |
| W2W_Transfer_Transaction_Appears_In_Transaction_Table | Positive | Asserts transaction appears with `SUCCESS` status in ledger. |
| W2W_Transfer_InvalidCRN_NonExistent | Negative | Asserts "No recipient found" toast error. |
| W2W_Transfer_InvalidCRN_IsSame_For_Sender_And_Receiver | Negative | Asserts "No recipient found" toast error for self-transfer. |
| W2W_Transfer_InvalidCRN_Empty | Negative | Asserts Check Recipient button is disabled. |
| W2W_CRN_Validation_LessThan_10_Digits | Negative | Asserts Check Recipient button is disabled. |
| W2W_CRN_Validation_Valid_10_to_15_Digits | Positive | Asserts Check Recipient button is enabled. |
| W2W_CRN_Validation_HardLimit_16_Digits | Negative | Asserts UI input is truncated to 15 digits. |
| W2W_CRN_Validation_Rejects_Alphabetic | Negative | Asserts field clears alphabetic input and button is disabled. |
| W2W_CRN_Validation_Rejects_SpecialChars | Negative | Asserts field clears special chars and button is disabled. |
| W2W_CRN_Validation_Rejects_Spaces | Negative | Asserts UI input removes spaces. |
| W2W_AmountValidation_Negative_Amount | Negative | Asserts UI input removes negative sign. |
| W2W_AmountValidation_Zero_Amount | Negative | Asserts Proceed button is disabled. |
| W2W_AmountValidation_Alphabetical_Characters | Negative | Asserts Proceed button is disabled and input clears. |
| W2W_AmountValidation_Special_Characters | Negative | Asserts Proceed button is disabled and input clears. |
| W2W_AmountValidation_Valid_Float_2_Decimals | Positive | Asserts input accepts 2 decimals and button is enabled. |
| W2W_AmountValidation_Valid_Float_1_Decimal | Positive | Asserts input accepts 1 decimal and button is enabled. |
| W2W_AmountValidation_Invalid_Float_3_Decimals | Negative | Asserts input truncates to 2 decimals. |
| W2W_AmountValidation_Clipboard_Paste | Positive | Asserts pasting valid amount works and enables button. |
| W2W_Transfer_Insufficient_Fund | Negative | Asserts "Insufficient fund" toast error correctly displayed. |

## 3. Bank Transfer
**File Reference:** `tests/testCases/BankTransferTests.spec.ts`

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| BankTransfer_with_Enter_Amount \| Amount Type: Standard | Positive | Asserts successful balance deduction for standard amount. |
| BankTransfer_with_Select_Amount \| Amount Type: Predefined | Positive | Asserts successful balance deduction for predefined amount. |
| BankTransfer_with_Invalid_OTP_Fails \| Amount Type: Failure Flow Invalid OTP | Negative | Asserts failed ledger entry for invalid OTP authorization. |
| BankTransfer_verifyAmountField_PreventsInvalidInput \| Amount Type: Negative Flow | Negative | Asserts invalid amount triggers UI field validation. |
| BankTransfer_Insufficient_Fund \| Amount Type: Insufficient Balance Check | Negative | Asserts "Insufficient fund" toast message is displayed. |
| BankTransfer_verifyAmountField_PreventsZeroAmount \| Amount Type: Zero Amount Test | Negative | Asserts zero amount is prevented from executing. |
| BankTransfer_verifyAmountField_PreventsInvalidChars \| Amount Type: Invalid Characters Test | Negative | Asserts alphabetic/special chars are prevented. |
| BankTransfer_AmountValidation \| Amount Type: Valid Float 2 Decimals | Positive | Asserts accepted float with 2 decimals deduction. |
| BankTransfer_AmountValidation \| Amount Type: Valid Float 1 Decimal | Positive | Asserts accepted float with 1 decimal deduction. |
| BankTransfer_AmountValidation \| Amount Type: Invalid Float 3 Decimals | Negative | Asserts float with 3 decimals is truncated/rejected. |
| BankTransfer_AmountValidation \| Amount Type: Copy and Paste Amount | Positive | Asserts valid paste enables proceed button. |
| BankTransfer_AmountValidation \| Amount Type: Copy and Paste Invalid Amount | Negative | Asserts invalid paste clears field and disables button. |
| BankTransfer_CancelTransaction \| Amount Type: Cancel via Page Refresh | Negative | Asserts balance is completely unchanged after page reload. |
| BankTransfer_CancelTransaction \| Amount Type: Cancel via Summary Cancel Button | Negative | Asserts balance is completely unchanged after summary cancellation. |

## 4. Bill Payment
**File Reference:** `tests/testCases/PayBillTests.spec.ts`
*(Data-driven via `approved received bill` variation)*

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| Verify successful payment submission popup | Positive | Asserts the dynamic popup rendering for bill payment. |
| Verify wallet balance decrease after bill payment | Positive | Enforces dynamic balance check: `NewBalance = OldBalance - BillAmount`. |
| Verify transaction record creation and success status in transactions table | Positive | Identifies correct ledger row creation verifying amount and final `SUCCESS` status. |
| Verify bill payment with insufficient funds error message | Negative | First uses Bank Transfer to drain account, then asserts 'Insufficient fund' toast. |

## 5. Wallet Top-up
**File Reference:** `tests/testCases/TopupTests.spec.ts`

| Exact Test Title (From Code) | Test Type | Target Assertions & Verification Points |
| :--- | :--- | :--- |
| Topup_with_Enter_Amount_MADA | Positive | Completes MADA gateway interaction and confirms balance increment. |
| Topup_with_Enter_Amount_VISA | Positive | Completes VISA gateway interaction and confirms balance increment. |
| Topup_with_Enter_Amount_MASTER | Positive | Completes MASTER gateway interaction and confirms balance increment. |
| Topup_with_Select_Amount_VISA | Positive | Uses predefined amount, completes VISA gateway and confirms balance. |
| Topup_with_Valid_TwoDecimal_Amount_VISA | Positive | Completes topup with 2-decimal amount via VISA. |
| Topup_with_Invalid_Card_Data_PayNowDisabled | Negative | Asserts invalid card data disables "Pay Now" button in gateway. |
| Topup_Failed_User_Canceled\|From_The_HyperPay_Screen | Negative | Simulates user cancel (Code 2), asserts `FAILED` state in ledger. |
| Topup_Failed_Limit_Exceeded\|From_The_HyperPay_Screen | Negative | Simulates limit exceeded (Code 4), asserts `FAILED` state in ledger. |
| Topup_Failed_Too_Many_Tries\|From_The_HyperPay_Screen | Negative | Simulates too many tries (Code 5), asserts `FAILED` state in ledger. |
| Topup_Pending_Simulation\|From_The_HyperPay_Screen | Negative | Simulates pending (Code 3), asserts `PENDING` state in ledger. |
| Topup_verifyAmountField_PreventsInvalidInput | Negative | Asserts negative sign is stripped from amount input. |
| Topup_verifyAmountField_PreventsZeroAmount | Negative | Asserts zero amount clears field and disables proceed button. |
| Topup_verifyAmountField_PreventsInvalidChars | Negative | Asserts invalid chars clear field and disable proceed button. |
| Topup_AmountValidation_ValidFloat_2_Decimals | Positive | Asserts valid 2-decimal input is accepted. |
| Topup_AmountValidation_ValidFloat_1_Decimal | Positive | Asserts valid 1-decimal input is accepted. |
| Topup_AmountValidation_InvalidFloat_3_Decimals | Negative | Asserts 3-decimal input is truncated. |
| Topup_AmountValidation_CopyPaste_Valid | Positive | Asserts valid pasted amount is accepted. |
| Topup_AmountValidation_CopyPaste_Invalid | Negative | Asserts invalid pasted amount clears field and disables proceed button. |
| Topup_CancelTransaction_PageRefresh | Negative | Asserts page refresh cancels topup and leaves balance unchanged. |
| Topup_CancelTransaction_SummaryCancelButton | Negative | Asserts summary cancel button leaves balance unchanged. |

<!-- AUTOMATION_REGISTRY_END -->
