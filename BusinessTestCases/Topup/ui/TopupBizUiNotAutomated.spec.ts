import { test } from '@playwright/test';

// UI-layer skips for the cases that were converted from the API+DB tier (BusinessTestCases/Topup/api/) but cannot be
// proven through the screens. One skipped test per case so every TUB- id stays visible in the UI report. The legacy API
// spec for the same id still runs in ../api/ where one exists. Ids already proven in the UI (TopupFormUI, functional/
// TopupMinAmount, TopupLimits, TopupCommission, TopupNegative, TopupBizOutcomesUI, TopupKbFlowUI) have no row here.

const NO_UI_HAND_BUILT_REQUEST = 'API-only by design: the case needs a request the app never sends (another user\'s id, a missing or reused key, a changed key payload); proven by the API spec in ../api/';
const NO_UI_LOST_RESPONSE = 'M: no UI path - a lost response needs network interception, which changes the action under test; legacy API spec in ../api/ proves it';
const NO_UI_ONE_FLOW_PER_TAB = 'M: no UI path - two tabs start two flows with two different keys, so "the same top-up twice" needs a hand-built request; the double-click case (TUB-36) covers the UI half';
const NO_UI_STEP_URLS = 'M: no UI path - the gateway and OTP steps have no documented URL to open out of order, and the app does not offer them without the earlier steps';
const NO_UI_AMOUNT_FIXED = 'M: no UI path - after the summary the app only offers Cancel; editing the amount starts a new summary, so "change it after confirming" needs a hand-built request';
const NEEDS_SUSPENDED_ACCOUNT = 'M: needs TOPUP_SUSPENDED_ACCOUNT in .env.dev, and what the app shows a suspended wallet at login or on the top-up form is not documented';
const NO_PRIVILEGE_PLUS_LIMIT = 'M: the order "permission before limit" cannot be seen in the UI (a user without the privilege is never offered the form)';

const NO_CUSTOMER_APP = 'M: no UI path - the Customer app is a mobile product; this suite drives the business web portal only';
const NEEDS_FRESH_ACCOUNT = 'M: needs an account with a known, unused quota (exact usage and N-th attempt); real top-ups count against the hourly COUNT cap and the shared test account is not fresh. Same blocker as TUA-C11/C13/C24 in functional/TopupLimits.spec.ts';
const NEEDS_CLOCK = 'M: needs control of the clock (midnight KSA, expiry waits); no clock tool in the repo';
const NEEDS_PROVIDER_CALLBACK = 'M: needs a provider callback or a lost gateway response that the sandbox simulator cannot send (see TUB-61)';
const NO_OTP_EXPIRY_TOOL = 'M: needs a real OTP expiry or a second concurrent top-up code; the dev bypass accepts the fixed code only';
const NEEDS_ADMIN_VAT_SCREEN = 'M: needs the admin VAT-rate screen, which has no page object and no documented locators; VAT is not editable through any helper in the repo';
const NEEDS_TWO_ADMINS = 'M: needs two admin sessions saving at once; one admin login at a time is the rule on this suite (a second login invalidates the first)';
const NEEDS_ADMIN_TXN_LOG = 'M: needs a page object for the admin Transaction Log (/admin/main/transaction-log), not modelled in the repo; the reference to search for is captured by payWithOutcome';
const NEEDS_RESERVED_LOCATOR = 'M: Reserved Credit / Available balance are not modelled; the form shows one balance and the homepage card has the current balance only. Needs the locators of the balance breakdown';
const NEEDS_HISTORY_LOCATOR = 'M: the user transaction history is not modelled for Top-up (HomepageTransactionsPage has no row accessors); needs the row locators first';
const NEEDS_MATRIX_SETUP = 'M: the matrix row needs OTP threshold, privilege and commission source set together; the repo has no OTP-threshold or privilege write helper (see TOC-* for the OTP admin screen)';
const NEEDS_COMMISSION_RULE_EDIT = 'M: needs a second commission rule or an edit of the existing one; dev allows one rule per type and platform and the edit of the type is ignored by the backend (TU-CM03)';
const NO_OUTBOUND_FLOW = 'M: needs a bill payment or transfer flow in the same session; those belong to their own modules';
const REPORTS_NOT_MODELLED = 'M: needs the wallet statement and transaction reports, which have no page object here';
const DROPPED_IN_MD = 'Dropped in the md: dev allows one commission rule per transaction type and platform, so the setup cannot exist (confirmed 2026-10-16)';

const NOT_AUTOMATED: Array<[id: string, title: string, reason: string]> = [
    ['TUB-03', 'Customer app user can top up', NO_CUSTOMER_APP],
    ['TUB-14', 'Fixed commission and VAT math', NEEDS_COMMISSION_RULE_EDIT],
    ['TUB-23', 'Two top-ups that together exceed the cap', NEEDS_FRESH_ACCOUNT],
    ['TUB-24', 'Count cap: N allowed, N+1 rejected', NEEDS_FRESH_ACCOUNT],
    ['TUB-30', 'Only successful top-ups use up the quota', NEEDS_FRESH_ACCOUNT],
    ['TUB-34', 'Limit windows follow Saudi time', NEEDS_CLOCK],
    ['TUB-52', 'Expired OTP is rejected and a resent OTP replaces the old one', NO_OTP_EXPIRY_TOOL],
    ['TUB-53', 'OTP is tied to this user and this top-up', NO_OTP_EXPIRY_TOOL],
    ['TUB-54', 'OTP turned off skips the step but not any other rule', NEEDS_MATRIX_SETUP],
    ['TUB-55', 'An OTP setting change applies to the next top-up only', NEEDS_MATRIX_SETUP],
    ['TUB-60', 'Timeout or unknown outcome never credits twice', NEEDS_PROVIDER_CALLBACK],
    ['TUB-63', 'Destination wallet limit reached at completion', NEEDS_FRESH_ACCOUNT],
    ['TUB-64', 'Pending top-up raises Reserved Credit only', NEEDS_RESERVED_LOCATOR],
    ['TUB-65', 'Success moves the amount into Available', NEEDS_RESERVED_LOCATOR],
    ['TUB-66', 'Failure releases the reservation', NEEDS_RESERVED_LOCATOR],
    ['TUB-68', 'History shows one correct row per top-up', NEEDS_HISTORY_LOCATOR],
    ['TUB-69', 'Expired top-up draft frees its limit headroom', NEEDS_CLOCK],
    ['TUB-70', 'Payment completes after the draft already expired', NEEDS_CLOCK],
    ['TUB-71', 'Topped-up money is spendable only after success', NO_OUTBOUND_FLOW],
    ['TUB-72', 'Top-up does not use outbound transfer or payment limits', NO_OUTBOUND_FLOW],
    ['TUB-73', 'Top-up totals appear in reports and statements', REPORTS_NOT_MODELLED],
    ['TUB-74', 'OTP is skipped just below the threshold', NEEDS_MATRIX_SETUP + '; the range boundaries are proven by TOC-03 (functional/TopupOtpAdminConfig.spec.ts)'],
    ['TUB-75', 'OTP is required at exactly the threshold', NEEDS_MATRIX_SETUP + '; the range boundaries are proven by TOC-03 (functional/TopupOtpAdminConfig.spec.ts)'],
    ['TUB-76', 'Threshold equal to the minimum top-up amount', NEEDS_MATRIX_SETUP],
    ['TUB-77', 'Threshold is judged on the entered amount, not the net credit', NEEDS_MATRIX_SETUP],
    ['TUB-82', 'Retry after a declined first attempt never credits twice', NO_UI_HAND_BUILT_REQUEST],
    ['TUB-83', 'Retry while the first request is still running', NO_UI_HAND_BUILT_REQUEST],
    ['TUB-86', 'Admin sees the top-up with the same figures', NEEDS_ADMIN_TXN_LOG],
    ['TUB-87', 'Admin shows the correct user type', NEEDS_ADMIN_TXN_LOG],
    ['TUB-88', 'Log rows stay the same after re-login', NEEDS_ADMIN_TXN_LOG],
    ['TUB-89', 'Admin changes the VAT rate', NEEDS_ADMIN_VAT_SCREEN],
    ['TUB-90', 'VAT rate of 0%', NEEDS_ADMIN_VAT_SCREEN],
    ['TUB-91', 'Old top-ups keep the VAT they were made with', NEEDS_ADMIN_VAT_SCREEN],
    ['TUB-92', 'Invalid VAT rate is rejected', NEEDS_ADMIN_VAT_SCREEN],
    ['TUB-94', 'Range inside an existing range is rejected', DROPPED_IN_MD],
    ['TUB-95', 'Range that contains an existing range is rejected', DROPPED_IN_MD],
    ['TUB-97', 'Touching boundary counts as overlap', DROPPED_IN_MD],
    ['TUB-98', 'Adjacent range with no shared amount is accepted', DROPPED_IN_MD],
    ['TUB-99', 'A gap between ranges is allowed', DROPPED_IN_MD],
    ['TUB-100', 'Editing a range into an overlap is rejected', DROPPED_IN_MD],
    ['TUB-101', 'Editing a range without overlap is accepted', DROPPED_IN_MD],
    ['TUB-102', 'A rule does not overlap itself on edit', NEEDS_COMMISSION_RULE_EDIT],
    ['TUB-103', 'Same range on another account is allowed', NEEDS_COMMISSION_RULE_EDIT],
    ['TUB-104', 'Same range for an account and for the default is allowed', NEEDS_COMMISSION_RULE_EDIT],
    ['TUB-105', 'Same range on another platform is allowed', NEEDS_COMMISSION_RULE_EDIT],
    ['TUB-106', 'Same range for another user type is allowed', DROPPED_IN_MD],
    ['TUB-107', 'Percentage and fixed rules cannot share a range', DROPPED_IN_MD],
    ['TUB-108', 'An open-ended range blocks later overlaps', DROPPED_IN_MD],
    ['TUB-110', 'An inactive rule is ignored by the overlap check', NEEDS_COMMISSION_RULE_EDIT],
    ['TUB-111', 'Two admins saving overlapping ranges together', NEEDS_TWO_ADMINS],
    ['TUB-115', 'A pending top-up does not use the count quota', NEEDS_FRESH_ACCOUNT],
    ['TUB-116', 'Limit lowered while a top-up waits at the summary', NEEDS_FRESH_ACCOUNT],
    ['TUB-117', 'Commission changed while the gateway is pending', NEEDS_COMMISSION_RULE_EDIT],
    ['TUB-118', 'Matrix 1: Merchant, OTP at or above T, account percentage, no limit hit', NEEDS_MATRIX_SETUP],
    ['TUB-124', 'Matrix 7: Merchant, OTP off, default percentage, wallet reaches the max exactly', NEEDS_MATRIX_SETUP],
    ['TUB-125', 'Matrix 8: Biller, OTP below T, account fixed, N-th top-up', NEEDS_MATRIX_SETUP],
    ['TUB-126', 'Matrix 9: Merchant, OTP at or above T, default fixed, amount equals per-transaction max', NEEDS_MATRIX_SETUP],
    ['TUB-127', 'Matrix 10: Biller, OTP off, both commissions with account percentage', NEEDS_MATRIX_SETUP],
    ['TUB-06', 'Suspended or inactive wallet cannot top up', NEEDS_SUSPENDED_ACCOUNT],
    ['TUB-33', 'Limits cannot be bypassed outside the normal screens', NO_UI_HAND_BUILT_REQUEST],
    ['TUB-37', 'Retry after a slow or lost response is not a second top-up', NO_UI_LOST_RESPONSE],
    ['TUB-39', 'Same top-up open in two tabs or devices completes once', NO_UI_ONE_FLOW_PER_TAB],
    ['TUB-44', 'A user cannot complete or view another user\'s top-up', NO_UI_HAND_BUILT_REQUEST],
    ['TUB-45', 'Steps cannot be skipped or reordered', NO_UI_STEP_URLS],
    ['TUB-46', 'Amount cannot change after the summary is confirmed', NO_UI_AMOUNT_FIXED],
    ['TUB-78', 'Reusing a finished flow\'s key never charges again', NO_UI_HAND_BUILT_REQUEST],
    ['TUB-79', 'Same key with a different amount is never processed as new', NO_UI_HAND_BUILT_REQUEST],
    ['TUB-80', 'Same key with a different payment method', NO_UI_HAND_BUILT_REQUEST],
    ['TUB-81', 'One user\'s key cannot reach another user\'s payment', NO_UI_HAND_BUILT_REQUEST],
    ['TUB-84', 'A request without a key is refused', NO_UI_HAND_BUILT_REQUEST],
    ['TUB-123', 'Matrix 6: Biller without privilege and count cap exceeded', NO_PRIVILEGE_PLUS_LIMIT],
];

test.describe('Topup business – UI – not automated (no screen path or missing account)', { tag: ['@topup', '@ui', '@business', '@not-automated'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'ui' }] }, () => {
    for (const [id, title, reason] of NOT_AUTOMATED) {
        test(`${id}: ${title}`, { annotation: [{ type: 'testcase', description: `${id}: ${title}` }] }, async () => {
            test.skip(true, reason);
        });
    }
});
