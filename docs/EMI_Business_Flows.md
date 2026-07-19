# Electronic Money Institution (EMI) Business Flows

This document consolidates the core business logic, rules, and functional domain knowledge of our EMI system as simulated by our automated test suite.

## 1. Wallet-to-Wallet (W2W) Core Logic

**Transaction Flow:**
1. The **Sender** (Merchant) inputs the **Receiver's** (Biller) unique Corporate Registration Number (CRN).
2. The system executes a "Check Recipient" API lookup to validate the CRN and resolve the recipient's name dynamically.
3. The sender inputs the transfer amount and selects a predefined **Purpose of Transfer** to classify the transaction (e.g., 'Item purchases') which helps bypass manual approval queues.
4. Following an OTP authorization, the network validates the transaction.

**Key Assertions & Verification:**
- **Dual-Balance Update Rule:** Simultaneously, the Sender's wallet balance MUST be strictly debited by the exact amount, and the Receiver's wallet balance MUST be credited by the identical amount.
- **Ledger Verification:** The transaction must register accurately in the Sender's transaction table (and subsequently the Receiver's) possessing a definitive `SUCCESS` status.

## 2. Bank Transfer & Account Draining

**Transaction Flow:**
- Allows users to cash out their digital wallet balance to a standard bank account via local or international rails.

**Business Purpose & Account Draining Strategy:**
- In automation, we utilize the **Full Balance Toggle** as a strategic state-manipulation technique.
- By triggering a Bank Transfer for the entirety of the wallet's balance, we effectively "drain" the account down to `0.00`.
- This creates the required pristine environmental state for triggering subsequent **Negative Test Scenarios**—ensuring the system correctly evaluates "Insufficient Funds" constraints on other features (like Bill Payments) without relying on static backend database resets.

## 3. Bill Payment Lifecycle

**Transaction Flow:**
The bill payment process interfaces dynamically with an external biller gateway. 

**Lifecycle States:**
- **Approved:** A bill has been acknowledged and validated by the issuer.
- **Pending:** The system reserves funds and awaits confirmation from the payment gateway/processor.
- **Success/Failed:** The final settlement state of the transaction.

**Ledger Synchronization Delay:**
- In the UAT environment, a "Ledger Synchronization Delay" is expected. 
- The transaction state may initially appear as `Pending` in the transactions table. The frontend requires a manual page reload or polling mechanism to fetch the final core settlement state once it successfully transitions to `Success`.

**Dynamic Core Math Balance Rule:**
Every successful bill payment must enforce the fundamental accounting formula:
`NewBalance = OldBalance - BillAmount`

*Note: Any variance in this math constitutes a critical ledger defect.*

## 4. Error Handling Constraints

**Insufficient Funds Constraints:**
- The system must preemptively calculate the wallet balance against any outbound request (W2W, Bank Transfer, Bill Pay, etc.).
- If the requested transfer amount exceeds the available wallet balance, the system must **immediately block** the request.
- The UI is mandated to display an explicit "Insufficient Funds" / "Insufficient Balance" toast notification. Crucially, the system must block the workflow from proceeding to the OTP phase or hitting external provider APIs.

**Data & Exception Handling in UAT:**
- The test suite relies on dynamically injected test data sets (e.g., OTP codes, CRNs, Amounts).
- If dynamic test data is missing, malformed, or if an environment (like UAT) undergoes a data-wipe resulting in "Non-Existent Recipient" errors, the system UI must reject the workflow gracefully.
- Expected behaviors include presenting "No recipient found" toast messages, disabling `Proceed` buttons, and clearing maliciously formatted clipboard pastes on amount input fields.
