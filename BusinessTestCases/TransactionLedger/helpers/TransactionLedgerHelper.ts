/**
 * Transaction Ledger — Initiator Attribution (EMI-5839, status Testing as of
 * 2026-08-02). BE task: the transaction ledger's `initiator` field must be
 * populated for both pending and successful ledger entries, sourced
 * consistently across states. Financial Operations / ledger-level concern —
 * no Business Portal UI surface (`TransactionSummaryPage.ts`'s summary panel
 * renders commission/VAT/total but nothing initiator-related), so this is
 * inspected at the ledger/DB or Admin Portal level, same rationale as
 * TransactionOperationsHelper.ts and ReconciliationHelper.ts.
 *
 * Ticket AC only names two flows explicitly; the initiator value for both was
 * confirmed in a comment thread, not the ticket description itself:
 *   "@Anas Al-Halawani System, MjdPay Profile User." — Amer Majed Abdalrazeq, 2026-07-16
 *
 * AC 4 ("list any transaction flows where initiator cannot be populated") is
 * an open discovery item — the ticket does not enumerate the full set of
 * ledger-writing flows. LI-07 below is blocked on that list, not just on
 * tooling access.
 */

export const API_BASE = process.env['API_BASE_URL'] ?? 'https://gateway-dev-emi.dg-cash.app';

/** Confirmed via ticket comment thread, not the AC text — see file header. */
export const CONFIRMED_INITIATOR = 'System, MjdPay Profile User';

/** The only two flows EMI-5839's AC names explicitly. */
export const IN_SCOPE_FLOWS = ['Bill payment link', 'Wallet payment link'] as const;
export type InScopeFlow = (typeof IN_SCOPE_FLOWS)[number];

export function commonHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'Accept': '*/*',
    };
}
