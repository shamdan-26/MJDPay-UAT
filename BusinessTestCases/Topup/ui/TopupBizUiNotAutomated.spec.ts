import { test } from '@playwright/test';

// UI-layer skips for the cases that were converted from the API+DB tier (BusinessTestCases/Topup/business/) but cannot be
// proven through the screens. One skipped test per case so every TUB- id stays visible in the UI report. The legacy API
// spec for the same id still runs in ../business/ where one exists. Ids already proven in the UI (TopupFormUI, functional/
// TopupMinAmount, TopupLimits, TopupCommission, TopupNegative, TopupBizOutcomesUI, TopupKbFlowUI) have no row here.

const NO_UI_HAND_BUILT_REQUEST = 'API-only by design: the case needs a request the app never sends (another user\'s id, a missing or reused key, a changed key payload); proven by the API spec in ../business/';
const NO_UI_LOST_RESPONSE = 'M: no UI path - a lost response needs network interception, which changes the action under test; legacy API spec in ../business/ proves it';
const NO_UI_ONE_FLOW_PER_TAB = 'M: no UI path - two tabs start two flows with two different keys, so "the same top-up twice" needs a hand-built request; the double-click case (TUB-36) covers the UI half';
const NO_UI_STEP_URLS = 'M: no UI path - the gateway and OTP steps have no documented URL to open out of order, and the app does not offer them without the earlier steps';
const NO_UI_AMOUNT_FIXED = 'M: no UI path - after the summary the app only offers Cancel; editing the amount starts a new summary, so "change it after confirming" needs a hand-built request';
const NEEDS_SUSPENDED_ACCOUNT = 'M: needs TOPUP_SUSPENDED_ACCOUNT in .env.dev, and what the app shows a suspended wallet at login or on the top-up form is not documented';
const NO_PRIVILEGE_PLUS_LIMIT = 'M: the order "permission before limit" cannot be seen in the UI (a user without the privilege is never offered the form)';

const NOT_AUTOMATED: Array<[id: string, title: string, reason: string]> = [
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
