import { test } from '@playwright/test';

// Business cases that are NOT automated in the API+DB tier. One skipped test per case so every TUB- id stays visible in
// the report and in the traceability table. Source: BusinessTestCases/Topup/Topup-BusinessTestCases.md (Tier column).
//   T2 = needs the browser: the HyperPay popup / 3DS simulator (success, failed, pending outcomes) or the admin OTP UI.
//   T3 = manual or blocked: clock, UI refresh, real OTP expiry, undefined by PO, missing tooling or data.

const NEEDS_BROWSER_GATEWAY = 'T2: needs the HyperPay popup / 3DS simulator to reach a terminal outcome (phase 2, browser tier)';
const NEEDS_BROWSER_ADMIN_OTP = 'T2: admin OTP config is UI-only today (no API to flip operationCode 102)';
const MANUAL_CLOCK = 'T3: needs the KSA midnight rollover (clock control)';
const MANUAL_UI = 'T3: UI behaviour (browser refresh / popup blocker); not a business-API check';
const MANUAL_OTP_EXPIRY = 'T3: needs a real OTP expiry wait; dev OTP is a fixed bypass value so binding and replay cannot be proven';
const NO_CALLBACK_ENDPOINT = 'T3: no provider-callback endpoint is known, so late or duplicate notifications cannot be injected';
const UNDEFINED_BY_PO = 'T3: expected behaviour is not defined yet (open question for PO)';
const NOT_DELIVERED = 'T3: feature not delivered yet (EMI-6031 is To Do) or needs a separate reporting surface';
const NEEDS_COMMISSION_WRITE_TOOL = 'T3: needs a commission config WRITE helper (only read/activate exists); controlled commission values are required';
const MESSAGE_UNDEFINED = 'T3: error wording is not defined (TUA-B07 is skipped), so "which message wins" cannot be asserted';
const OUTBOUND_TYPE_UNKNOWN = 'T3: needs the outbound transaction type name and a limit write for it; not available';
const NEEDS_PRIVILEGE_CHANGE = 'T3: needs an admin API to remove a privilege mid-flow; not available';

const NEEDS_OTP_THRESHOLD_CONFIG = 'T3: needs a write helper for the admin OTP amount threshold (AdminOtpConfigPage only has the on/off toggle) and an OTP-on account';
const NEEDS_ADMIN_LOG_VIEW = 'T2: the admin transaction-log view has no page helper or API call in the repo';
const NEEDS_VAT_CONFIG_TOOL = 'T3: needs an admin VAT-rate write helper; none exists';
const COVERED_BY_CM_SPEC = 'Covered by ../functional/TopupCommission.spec.ts (TU-CM13 edit and restore, TU-CM14 a second rule for the same type and platform is refused with 409, TU-CM15 min above max refused); no separate business spec';
const DROPPED_ONE_RULE_PER_PLATFORM = 'Dropped: dev allows ONE commission rule per transaction type and platform (confirmed 2026-10-16: a range can only be shared when the platforms differ), so this multi-range setup cannot exist (AS21)';
const ACCOUNT_LEVEL_UNKNOWN = 'T3: whether account-level commission rules (POST /api/v1/commissions) allow several ranges is not confirmed (AS21); raw create/update helpers exist on AdminCommissionManagementPage';
const NO_COMMISSION_DELETE = 'T3: needs a second-platform commission rule created and removed; no delete exists for commission rules, so a stray row would stay on the shared environment';
const INACTIVE_RULE_UNDEFINED = 'T3: whether an inactive commission rule is ignored by the overlap check is not decided (AS15, open with Dev)';
const NEEDS_TWO_ADMINS = 'T3: needs two admin sessions saving at the same moment';
const NEEDS_MIDFLOW_CONFIG = 'T3: needs a limit change while a top-up is held open at the summary (browser session plus admin write)';

// TUB-07, 21, 38, 42, 56-59, 62 and 67 are automated in the browser tier: see ../ui/TopupBizOutcomesUI.spec.ts and ../ui/TopupKbFlowUI.spec.ts.
const NOT_AUTOMATED: Array<[id: string, title: string, reason: string]> = [
    ['TUB-01', 'Biller with the Topup privilege can top up', NEEDS_BROWSER_GATEWAY],
    ['TUB-02', 'Merchant with the Topup privilege can top up', NEEDS_BROWSER_GATEWAY],
    ['TUB-03', 'Customer app user can top up', NEEDS_BROWSER_GATEWAY],
    ['TUB-05', 'Privilege removed while a top-up is in progress', NEEDS_PRIVILEGE_CHANGE],
    ['TUB-17', 'Account-level commission overrides the default', NEEDS_COMMISSION_WRITE_TOOL],
    ['TUB-18', 'A commission for another platform does not apply', NEEDS_COMMISSION_WRITE_TOOL],
    ['TUB-19', 'No commission configured: full amount credited', NEEDS_COMMISSION_WRITE_TOOL],
    ['TUB-20', 'Figures shown before payment equal what is posted', NEEDS_BROWSER_GATEWAY],
    ['TUB-22', 'Amount cap: exactly the headroom passes (success half)', NEEDS_BROWSER_GATEWAY],
    ['TUB-23', 'Two top-ups that together exceed the cap', NEEDS_BROWSER_GATEWAY],
    ['TUB-24', 'Count cap: N allowed, N+1 rejected', NEEDS_BROWSER_GATEWAY],
    ['TUB-30', 'Only successful top-ups use up the quota', NEEDS_BROWSER_GATEWAY],
    ['TUB-32', 'When minimum and limit are both violated the minimum is reported', MESSAGE_UNDEFINED],
    ['TUB-34', 'Limit windows follow Saudi time', MANUAL_CLOCK],
    ['TUB-52', 'Expired OTP rejected and resent OTP replaces the old one', MANUAL_OTP_EXPIRY],
    ['TUB-53', 'OTP is tied to this user and this top-up', MANUAL_OTP_EXPIRY],
    ['TUB-54', 'OTP turned off skips the step but not any other rule', NEEDS_BROWSER_ADMIN_OTP],
    ['TUB-55', 'An OTP setting change applies to the next top-up only', NEEDS_BROWSER_ADMIN_OTP],
    ['TUB-60', 'Timeout or unknown outcome never credits twice', NEEDS_BROWSER_GATEWAY],
    ['TUB-61', 'Duplicate or late provider notification changes nothing', NO_CALLBACK_ENDPOINT],
    ['TUB-63', 'Destination wallet limit reached at completion', NEEDS_BROWSER_GATEWAY],
    ['TUB-64', 'Pending top-up raises Reserved Credit only', NEEDS_BROWSER_GATEWAY],
    ['TUB-65', 'Success moves the amount into Available', NEEDS_BROWSER_GATEWAY],
    ['TUB-66', 'Failure releases the reservation', NEEDS_BROWSER_GATEWAY],
    ['TUB-68', 'History shows one correct row per top-up', NEEDS_BROWSER_GATEWAY],
    ['TUB-69', 'Expired top-up draft frees its limit headroom', NOT_DELIVERED],
    ['TUB-70', 'Payment completes after the draft already expired', UNDEFINED_BY_PO],
    ['TUB-71', 'Topped-up money is spendable only after success', NEEDS_BROWSER_GATEWAY],
    ['TUB-72', 'Top-up does not use outbound transfer or payment limits', OUTBOUND_TYPE_UNKNOWN],
    ['TUB-73', 'Top-up totals appear in reports and statements', NOT_DELIVERED],
    // Added 2026-10-16 from the pasted requirements (TUB-74 to 129). The API+DB ones are in TopupBizIdempotency.spec.ts and TopupBizCombinations.spec.ts.
    ['TUB-74', 'OTP is skipped just below the threshold', NEEDS_OTP_THRESHOLD_CONFIG],
    ['TUB-75', 'OTP is required at exactly the threshold', NEEDS_OTP_THRESHOLD_CONFIG],
    ['TUB-76', 'Threshold equal to the minimum top-up amount', NEEDS_OTP_THRESHOLD_CONFIG],
    ['TUB-77', 'Threshold is judged on the entered amount, not the net credit', NEEDS_OTP_THRESHOLD_CONFIG],
    ['TUB-82', 'Retry after a declined first attempt never credits twice', NEEDS_BROWSER_GATEWAY],
    ['TUB-86', 'Admin sees the top-up with the same figures', NEEDS_ADMIN_LOG_VIEW],
    ['TUB-87', 'Admin shows the correct user type', NEEDS_ADMIN_LOG_VIEW],
    ['TUB-88', 'Log rows stay the same after re-login', NEEDS_ADMIN_LOG_VIEW],
    ['TUB-89', 'Admin changes the VAT rate', NEEDS_VAT_CONFIG_TOOL],
    ['TUB-90', 'VAT rate of 0%', NEEDS_VAT_CONFIG_TOOL],
    ['TUB-91', 'Old top-ups keep the VAT they were made with', NEEDS_VAT_CONFIG_TOOL],
    ['TUB-92', 'Invalid VAT rate is rejected', NEEDS_VAT_CONFIG_TOOL],
    ['TUB-93', 'Partly overlapping range is rejected', COVERED_BY_CM_SPEC],
    ['TUB-94', 'Range inside an existing range is rejected', DROPPED_ONE_RULE_PER_PLATFORM],
    ['TUB-95', 'Range that contains an existing range is rejected', DROPPED_ONE_RULE_PER_PLATFORM],
    ['TUB-96', 'Exact duplicate range is rejected', COVERED_BY_CM_SPEC],
    ['TUB-97', 'Touching boundary counts as overlap', DROPPED_ONE_RULE_PER_PLATFORM],
    ['TUB-98', 'Adjacent range with no shared amount is accepted', DROPPED_ONE_RULE_PER_PLATFORM],
    ['TUB-99', 'A gap between ranges is allowed', DROPPED_ONE_RULE_PER_PLATFORM],
    ['TUB-100', 'Editing a range into an overlap is rejected', DROPPED_ONE_RULE_PER_PLATFORM],
    ['TUB-101', 'Editing a range without overlap is accepted', DROPPED_ONE_RULE_PER_PLATFORM],
    ['TUB-102', 'A rule does not overlap itself on edit', COVERED_BY_CM_SPEC],
    ['TUB-103', 'Same range on another account is allowed', ACCOUNT_LEVEL_UNKNOWN],
    ['TUB-104', 'Same range for an account and for the default is allowed', ACCOUNT_LEVEL_UNKNOWN],
    ['TUB-105', 'Same range on another platform is allowed', NO_COMMISSION_DELETE],
    ['TUB-106', 'Same range for another user type is allowed', DROPPED_ONE_RULE_PER_PLATFORM],
    ['TUB-107', 'Percentage and fixed rules cannot share a range', DROPPED_ONE_RULE_PER_PLATFORM],
    ['TUB-108', 'An open-ended range blocks later overlaps', DROPPED_ONE_RULE_PER_PLATFORM],
    ['TUB-109', 'Invalid range gives a validation error, not an overlap error', COVERED_BY_CM_SPEC],
    ['TUB-110', 'An inactive rule is ignored by the overlap check', INACTIVE_RULE_UNDEFINED],
    ['TUB-111', 'Two admins saving overlapping ranges together', NEEDS_TWO_ADMINS],
    ['TUB-115', 'A pending top-up does not use the count quota', NEEDS_BROWSER_GATEWAY],
    ['TUB-116', 'Limit lowered while a top-up waits at the summary', NEEDS_MIDFLOW_CONFIG],
    ['TUB-117', 'Commission changed while the gateway is pending', NEEDS_COMMISSION_WRITE_TOOL],
    ['TUB-118', 'Matrix 1: Merchant, OTP at or above T, account percentage, no limit hit', NEEDS_BROWSER_GATEWAY],
    ['TUB-124', 'Matrix 7: Merchant, OTP off, default percentage, wallet reaches the max exactly', NEEDS_BROWSER_GATEWAY],
    ['TUB-125', 'Matrix 8: Biller, OTP below T, account fixed, N-th top-up', NEEDS_BROWSER_GATEWAY],
    ['TUB-126', 'Matrix 9: Merchant, OTP at or above T, default fixed, amount equals per-transaction max', NEEDS_BROWSER_GATEWAY],
    ['TUB-127', 'Matrix 10: Biller, OTP off, both commissions with account percentage', NEEDS_BROWSER_GATEWAY],
];

test.describe('Topup business – not automated (browser tier and manual)', { tag: ['@topup', '@business', '@not-automated'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'api' }] }, () => {
    for (const [id, title, reason] of NOT_AUTOMATED) {
        test(`${id}: ${title}`, { annotation: [{ type: 'testcase', description: `${id}: ${title}` }] }, async () => {
            test.skip(true, reason);
        });
    }
});
