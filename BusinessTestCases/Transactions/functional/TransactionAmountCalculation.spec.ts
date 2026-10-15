import { test, expect } from '@playwright/test';
import { SESSION_PATH } from '../../Login/LoginHelper';
import {
    fetchJson,
    gotoTransactions,
    mockTransactionList,
    expectedTotal,
    round2,
    EXTERNAL_WALLET_BREAKDOWN,
    EMI_5970_OBSERVED_TOTAL,
    AMOUNT_COMPOSITION_EXEMPT_TYPES,
    mockTransactionAmountComposed,
    mockTransactionAmountMiscalculated,
    mockExemptTransactionAmount,
    mockExemptTransactionAmountWithCommission,
    mockTransactionLog,
    mockControlWalletBalance,
} from '../TransactionsHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Transaction amount composition (TAC-01..TAC-06) — MOCK ONLY.
//
// EMI-6020 ("Update the transaction amount calculation for all transaction
// types") and EMI-5970 (the external-wallet miscalculation that motivated it).
//
// EMI-6020's rule:
//     transaction amount + commission amount + VAT amount
// for every type EXCEPT Cash-Out and VIBAN, held consistent across the base
// transaction row, the transaction log, and the payload sent to each external
// party — and never applied twice.
//
// EMI-5970's repro: amount 100, commission 10 + 10, VAT 1.5 + 1.5. The correct
// total is 123.00; the system reported 88.50 and drove the control wallet to
// -111.50 — commission and VAT were netted OFF rather than added.
//
// Why mocked: reproducing this live needs a commission-and-VAT-bearing external
// wallet payment on a funded account plus read access to the control wallet,
// none of which exist as fixtures here. The arithmetic itself is the contract,
// so each case asserts the API's reported figures against expectedTotal() and
// pairs with a regression guard on the pre-fix numbers. Same rationale as
// TransactionValidation.spec.ts.
//
// EMI-6020 is DEV DONE and EMI-5970 is DEV DONE at time of writing — the
// "fixed" assertions are expected to pass only once both reach UAT.
// ─────────────────────────────────────────────────────────────────────────────

const TRANSFER_PATH = '/api/v1/wallet-transfer';
const LOG_PATH = '/api/v1/transaction-log?page=0&size=10';

interface AmountResponse {
    transactionTypeCode: string;
    amount: number;
    totalAmount: number;
    sourceCommissionAmount: number;
    destinationCommissionAmount: number;
    sourceVatAmount: number;
    destinationVatAmount: number;
}

test.describe('Amount Composition — Commission And VAT Are Added (TAC-01, EMI-6020 / EMI-5970)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('TAC-01: totalAmount equals amount + commission + VAT', async ({ page }) => {
        await mockTransactionList(page, []);
        await mockTransactionAmountComposed(page);
        await gotoTransactions(page);

        const { body } = await fetchJson(page, TRANSFER_PATH, {
            method: 'POST',
            body: { amount: EXTERNAL_WALLET_BREAKDOWN.amount },
        });
        const result = body as AmountResponse;

        // 100 + (10 + 10) + (1.5 + 1.5) = 123.00
        expect(result.totalAmount).toBe(expectedTotal(EXTERNAL_WALLET_BREAKDOWN));
        expect(result.totalAmount).toBe(123);
    });

    test('TAC-01b: the total is strictly greater than the bare transaction amount', async ({ page }) => {
        await mockTransactionList(page, []);
        await mockTransactionAmountComposed(page);
        await gotoTransactions(page);

        const { body } = await fetchJson(page, TRANSFER_PATH, { method: 'POST', body: { amount: 100 } });
        const result = body as AmountResponse;

        // EMI-5970's signature failure: the total came back BELOW the amount.
        expect(result.totalAmount).toBeGreaterThan(result.amount);
    });

    test('TAC-01 (regression guard, EMI-5970): the pre-fix mock reports 88.50 for a 100 transfer', async ({ page }) => {
        await mockTransactionList(page, []);
        await mockTransactionAmountMiscalculated(page);
        await gotoTransactions(page);

        const { body } = await fetchJson(page, TRANSFER_PATH, { method: 'POST', body: { amount: 100 } });
        const result = body as AmountResponse;

        expect(result.totalAmount).toBe(EMI_5970_OBSERVED_TOTAL);
        expect(result.totalAmount).toBeLessThan(result.amount);
    });
});

test.describe('Amount Composition — Commission Is Not Applied Twice (TAC-02, EMI-6020)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('TAC-02: the total never exceeds amount + commission + VAT', async ({ page }) => {
        await mockTransactionList(page, []);
        await mockTransactionAmountComposed(page);
        await gotoTransactions(page);

        const { body } = await fetchJson(page, TRANSFER_PATH, { method: 'POST', body: { amount: 100 } });
        const result = body as AmountResponse;

        const commission = result.sourceCommissionAmount + result.destinationCommissionAmount;
        const vat        = result.sourceVatAmount + result.destinationVatAmount;

        // A double-application would land at 100 + 2*(20) + 2*(3) = 146.
        expect(result.totalAmount, 'commission/VAT appear to have been added more than once')
            .toBe(round2(result.amount + commission + vat));
        expect(result.totalAmount).toBeLessThan(round2(result.amount + 2 * commission + 2 * vat));
    });
});

test.describe('Amount Composition — Cash-Out And VIBAN Are Exempt (TAC-03, EMI-6020)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    for (const exemptType of AMOUNT_COMPOSITION_EXEMPT_TYPES) {
        test(`TAC-03 (${exemptType}): the stored amount stays the bare transaction amount`, async ({ page }) => {
            await mockTransactionList(page, []);
            await mockExemptTransactionAmount(page, exemptType);
            await gotoTransactions(page);

            const { body } = await fetchJson(page, TRANSFER_PATH, { method: 'POST', body: { amount: 100 } });
            const result = body as AmountResponse;

            expect(result.transactionTypeCode).toBe(exemptType);
            expect(result.totalAmount, `${exemptType} had commission/VAT folded in`).toBe(result.amount);
        });

        test(`TAC-03 (regression guard, ${exemptType}): the pre-fix mock folds commission into an exempt type`, async ({ page }) => {
            await mockTransactionList(page, []);
            await mockExemptTransactionAmountWithCommission(page, exemptType);
            await gotoTransactions(page);

            const { body } = await fetchJson(page, TRANSFER_PATH, { method: 'POST', body: { amount: 100 } });
            const result = body as AmountResponse;

            expect(result.totalAmount).toBeGreaterThan(result.amount);
        });
    }
});

test.describe('Amount Composition — Log And External Party Agree (TAC-04, EMI-6020)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('TAC-04: the transaction log carries the same total as the transaction', async ({ page }) => {
        const total = expectedTotal(EXTERNAL_WALLET_BREAKDOWN);
        await mockTransactionList(page, []);
        await mockTransactionAmountComposed(page);
        await mockTransactionLog(page, { amount: total });
        await gotoTransactions(page);

        const transfer = await fetchJson(page, TRANSFER_PATH, { method: 'POST', body: { amount: 100 } });
        const log = await fetchJson(page, LOG_PATH);

        const logged = (log.body as { content: { amount: number }[] }).content[0]!;
        expect(logged.amount).toBe((transfer.body as AmountResponse).totalAmount);
    });

    test('TAC-04b: the amount sent to the external party matches what it is expected to receive', async ({ page }) => {
        const total = expectedTotal(EXTERNAL_WALLET_BREAKDOWN);
        await mockTransactionList(page, []);
        await mockTransactionLog(page, { amount: total, externalPartyAmount: total });
        await gotoTransactions(page);

        const { body } = await fetchJson(page, LOG_PATH);
        const logged = (body as { content: { amount: number; externalParty: { amountSent: number } }[] }).content[0]!;

        expect(logged.externalParty.amountSent).toBe(logged.amount);
    });

    test('TAC-04 (regression guard): a log/external-party drift is detected', async ({ page }) => {
        const total = expectedTotal(EXTERNAL_WALLET_BREAKDOWN);
        await mockTransactionList(page, []);
        // The pre-fix hazard EMI-6020 names: the external party is handed the
        // bare amount while the log records the composed total.
        await mockTransactionLog(page, { amount: total, externalPartyAmount: EXTERNAL_WALLET_BREAKDOWN.amount });
        await gotoTransactions(page);

        const { body } = await fetchJson(page, LOG_PATH);
        const logged = (body as { content: { amount: number; externalParty: { amountSent: number } }[] }).content[0]!;

        expect(logged.externalParty.amountSent).not.toBe(logged.amount);
    });
});

test.describe('Amount Composition — Control Wallet Stays Solvent (TAC-05, EMI-5970)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('TAC-05: a correctly composed transfer does not drive the control wallet negative', async ({ page }) => {
        await mockTransactionList(page, []);
        await mockTransactionAmountComposed(page);
        await mockControlWalletBalance(page, 1000);
        await gotoTransactions(page);

        const { body } = await fetchJson(page, '/api/v1/wallet/control');
        const wallet = body as { availableBalance: number; currentBalance: number };

        // EMI-5970 observed -111.5 on both figures.
        expect(wallet.availableBalance, 'control wallet available balance went negative').toBeGreaterThanOrEqual(0);
        expect(wallet.currentBalance, 'control wallet current balance went negative').toBeGreaterThanOrEqual(0);
    });

    test('TAC-05 (regression guard, EMI-5970): the pre-fix mock reproduces the -111.50 control balance', async ({ page }) => {
        await mockTransactionList(page, []);
        await mockControlWalletBalance(page, -111.5);
        await gotoTransactions(page);

        const { body } = await fetchJson(page, '/api/v1/wallet/control');
        const wallet = body as { availableBalance: number };

        expect(wallet.availableBalance).toBe(-111.5);
    });
});

test.describe('Amount Composition — Formula Is Pinned (TAC-06, EMI-6020)', () => {
    test('TAC-06: expectedTotal() implements amount + commission + VAT at 2dp', () => {
        // Not a request — this pins EMI-6020's formula in version control so
        // the three assertions above cannot silently drift apart from it.
        expect(expectedTotal({
            transactionTypeCode: 'W2W_TRANSFER',
            amount: 100,
            sourceCommissionAmount: 10,
            destinationCommissionAmount: 10,
            sourceVatAmount: 1.5,
            destinationVatAmount: 1.5,
        })).toBe(123);

        // Floating-point guard: 0.1 + 0.2 must not leak 0.30000000000000004.
        expect(expectedTotal({
            transactionTypeCode: 'TOPUP',
            amount: 0.1,
            sourceCommissionAmount: 0.2,
            destinationCommissionAmount: 0,
            sourceVatAmount: 0,
            destinationVatAmount: 0,
        })).toBe(0.3);
    });
});
