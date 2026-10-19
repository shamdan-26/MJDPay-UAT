import { test, expect, type Request, type Response } from '@playwright/test';
import { findTopupCase, loginToTopup, gotoTopupScreen, completeCardPayment, reachOtpScreen, reachCardEntryPopup, getTopupTransactionLogHistoryFromSql, HOME_URL, TOPUP_UI_ACCOUNT, type TopupSession } from '../helpers/TopupHelper.ts';
import { proceedToSummary, readBalanceBefore, raiseMerchantCountHeadroom } from './TopupBizUiHelper';
import { HomepageSidebarPage } from '../../pageElements/Shared/HomepageSidebarPage';

// UI — top-up scenarios from the knowledge base (docs/knowledge-base/topup.md, section 8
// "Test ideas"), driven through the browser. The contract checks (ideas 4-7, 10) read the
// calls the app itself makes during a real top-up, so they prove what the UI sends, not what
// a hand-built API call would.
//
// The KB names the endpoints cards/payment/topup, .../topup/update and
// transactions/card/topup/update-status. Dev serves the same steps from
// POST /api/v1/payments, /payments/verify and /payments/update-status (EMI-221 rename), so the
// capture matches both families. Where the KB leaves a question open (key in header vs body),
// the test accepts either and records which one it saw as an annotation.

const FLOW_URL = /\/api\/v1\/(payments|cards\/payment\/topup|transactions\/card\/topup)/;
const INITIATE_URL = /\/api\/v1\/(payments|cards\/payment\/topup)$/;
const UPDATE_STATUS_URL = /\/(payments\/update-status|topup\/update-status)$/;

interface FlowCall {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string;
    status: number;
    response: string;
}

/** Records every top-up flow call (request + response) made by the page until stop() is called. */
function recordFlow(session: TopupSession) {
    const calls: FlowCall[] = [];
    const pending = new Map<Request, FlowCall>();
    const onRequest = (req: Request) => {
        if (req.method() !== 'POST' || !FLOW_URL.test(req.url())) return;
        const call: FlowCall = { url: req.url(), method: req.method(), headers: req.headers(), body: req.postData() ?? '', status: 0, response: '' };
        pending.set(req, call);
        calls.push(call);
    };
    const onResponse = async (res: Response) => {
        const call = pending.get(res.request());
        if (!call) return;
        call.status = res.status();
        call.response = await res.text().catch(() => '');
    };
    session.page.on('request', onRequest);
    session.page.on('response', onResponse);
    return {
        calls,
        stop: () => { session.page.off('request', onRequest); session.page.off('response', onResponse); },
    };
}

/** The idempotency key of a call, from the `idempotencyKey` header or the body field. */
function keyOf(call: FlowCall): { value: string; where: 'header' | 'body' | 'none' } {
    const header = call.headers['idempotencykey'];
    if (header) return { value: header, where: 'header' };
    const inBody = /"idempotencyKey"\s*:\s*"([^"]+)"/.exec(call.body)?.[1];
    if (inBody) return { value: inBody, where: 'body' };
    return { value: '', where: 'none' };
}

function parseJson(text: string): unknown {
    try { return JSON.parse(text); } catch { return null; }
}

/** All keys that appear anywhere in a JSON value. */
function allKeys(value: unknown, into = new Set<string>()): Set<string> {
    if (Array.isArray(value)) value.forEach(v => allKeys(v, into));
    else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) { into.add(k); allKeys(v, into); }
    }
    return into;
}

// One account, one active session: every describe in this file logs in as TOPUP_UI_ACCOUNT, so the
// whole file runs serially in one worker. Run Topup UI files with --workers=1 for the same reason.
test.describe.configure({ mode: 'serial' });

test.describe('Topup – UI – KB flow contract (idempotency, IDs, payload)', { tag: ['@topup', '@ui'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'ui' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(180000);

    let session: TopupSession;
    let restoreLimits: (() => Promise<void>) | undefined;
    let calls: FlowCall[] = [];
    let resultText = '';

    test.beforeAll(async ({ browser }) => {
        // Hooks do not inherit the describe timeout; this one raises limits and makes a real payment.
        test.setTimeout(300000);
        restoreLimits = await raiseMerchantCountHeadroom(browser); // raises the Merchant hourly count cap for the run, restore() in afterAll (admin login first; never overlaps the app login)
        session = await loginToTopup(browser, TOPUP_UI_ACCOUNT);
        await gotoTopupScreen(session);
        const flow = recordFlow(session);
        try {
            await completeCardPayment(session, 'visa', findTopupCase('VISA'));
            await session.topup.resultTitle.waitFor({ state: 'visible', timeout: 30000 });
        } finally {
            flow.stop();
        }
        calls = flow.calls;
        resultText = await session.page.locator('body').innerText();
    });

    test.afterAll(async () => {
        try {
            await session?.page.close();
        } finally {
            await restoreLimits?.();
        }
    });

    test('TUB-36/KB-04: the initiation call carries an idempotency key', { annotation: [{ type: 'testcase', description: 'TUB-36/KB-04: idempotencyKey is sent on the top-up initiation call (header or body)' }] }, async () => {
        const initiate = calls.find(c => INITIATE_URL.test(c.url));
        expect(initiate, 'no initiation call (POST /api/v1/payments) was captured').toBeDefined();
        const key = keyOf(initiate!);
        test.info().annotations.push({ type: 'key-location', description: key.where });
        expect(key.value, 'idempotencyKey missing from both the header and the body').toMatch(/^[0-9a-f-]{20,}$/i);
    });

    test('TUB-47/KB-05: the initiation response is the standard payload with txnReference', { annotation: [{ type: 'testcase', description: 'TUB-47/KB-05: response has txnReference/status and no draftTransactionId (EMI-5495)' }] }, async () => {
        const initiate = calls.find(c => INITIATE_URL.test(c.url));
        expect(initiate, 'no initiation call was captured').toBeDefined();
        expect(initiate!.status).toBeLessThan(300);
        const keys = allKeys(parseJson(initiate!.response));
        expect(keys.has('txnReference'), 'response has no txnReference').toBe(true);
        expect(keys.has('status'), 'response has no status').toBe(true);
        expect(keys.has('draftTransactionId'), 'draftTransactionId should have been replaced by txnReference').toBe(false);
        // Dev still needs checkoutId to open the gateway, so a mismatch with EMI-5495 is reported, not failed.
        expect.soft(keys.has('checkoutId'), 'checkoutId is still returned (EMI-5495 says txnReference replaces it)').toBe(false);
    });

    test('TUB-43/KB-06: the update call is sent the payment ID, never the card', { annotation: [{ type: 'testcase', description: 'TUB-43/KB-06: update step receives the ID returned by initiation, not cardId (EMI-5028)' }] }, async () => {
        const initiate = calls.find(c => INITIATE_URL.test(c.url));
        const update = calls.find(c => UPDATE_STATUS_URL.test(c.url));
        expect(initiate, 'no initiation call was captured').toBeDefined();
        expect(update, 'no update-status call was captured (the payment did not reach the gateway result)').toBeDefined();

        const issued = parseJson(initiate!.response) as Record<string, unknown> | null;
        const ids = JSON.stringify(issued).match(/"(?:txnReference|checkoutId)"\s*:\s*"([^"]+)"/g)?.map(m => /:\s*"([^"]+)"/.exec(m)![1]) ?? [];
        expect(ids.length, 'initiation returned no txnReference/checkoutId to compare with').toBeGreaterThan(0);
        expect(ids.some(id => update!.body.includes(id)), `update body does not carry an ID issued by initiation (${ids.join(', ')})`).toBe(true);
        expect(update!.body, 'update body must not contain a cardId').not.toMatch(/"cardId"/i);
        expect(update!.body, 'update body must not contain the card number').not.toContain(findTopupCase('VISA').cardNumber);
    });

    test('TUB-41/KB-07/10: every call of one flow uses the same idempotency key', { annotation: [{ type: 'testcase', description: 'TUB-41/KB-07/10: update-status carries the key, equal to the initiation key (EMI-5480)' }] }, async () => {
        const keyed = calls.map(c => ({ url: c.url, ...keyOf(c) }));
        const initiate = keyed.find(c => INITIATE_URL.test(c.url));
        const update = keyed.find(c => UPDATE_STATUS_URL.test(c.url));
        expect(initiate?.value, 'initiation has no key').toBeTruthy();
        expect(update?.value, 'update-status has no idempotencyKey (EMI-5480)').toBeTruthy();
        expect(update!.value).toBe(initiate!.value);
        for (const c of keyed.filter(k => k.value)) {
            expect(c.value, `${c.url} used a different key from the rest of the flow`).toBe(initiate!.value);
        }
    });

    test('TUB-47/KB-03: the result screen does not expose internal IDs', { annotation: [{ type: 'testcase', description: 'TUB-47/KB-03: success screen does not read checkoutId/draftTransactionId (risk 3)' }] }, async () => {
        const initiate = calls.find(c => INITIATE_URL.test(c.url));
        const checkoutId = /"checkoutId"\s*:\s*"([^"]+)"/.exec(initiate?.response ?? '')?.[1];
        expect(resultText).not.toMatch(/draftTransactionId|checkoutId|undefined|null/);
        if (checkoutId) expect(resultText, 'raw checkoutId is shown to the user').not.toContain(checkoutId);
    });
});

test.describe('Topup – UI – KB flow robustness (double click, refresh, entry points)', { tag: ['@topup', '@ui'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'ui' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(120000);

    let session: TopupSession;
    let restoreLimits: (() => Promise<void>) | undefined;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(300000); // hooks do not inherit the describe timeout; includes the admin limits round trip
        restoreLimits = await raiseMerchantCountHeadroom(browser); // raises the Merchant hourly count cap for the run, restore() in afterAll (admin login first; never overlaps the app login)
        session = await loginToTopup(browser, TOPUP_UI_ACCOUNT);
    });

    test.afterAll(async () => {
        try {
            await session?.page.close();
        } finally {
            await restoreLimits?.();
        }
    });

    test.beforeEach(async () => {
        await gotoTopupScreen(session);
    });

    test.afterEach(async () => {
        for (const stray of session.page.context().pages()) {
            if (stray !== session.page) await stray.close().catch(() => { /* already closed */ });
        }
        session.topup.resetActivePage();
    });

    test('TUB-01/KB-01: Topup is offered on Home (quick action and sidebar) and opens the flow', { annotation: [{ type: 'testcase', description: 'TUB-01/KB-01: account with the Topup privilege sees Topup on Home (EMI-3874)' }] }, async () => {
        const { page, topup, quickActions } = session;
        const sidebar = new HomepageSidebarPage(page);
        await page.goto(HOME_URL);
        await page.waitForLoadState('domcontentloaded');
        await expect(quickActions.quickActionTopupCard).toBeVisible({ timeout: 15000 });
        await expect(sidebar.topupSidebarLink).toBeVisible({ timeout: 15000 });
        await sidebar.topupSidebarLink.click();
        await page.waitForURL(/\/transfer\/top-up/, { timeout: 15000 });
        await expect(topup.inputAmount).toBeVisible({ timeout: 15000 });
    });

    // TUB-04 (no privilege, Topup not offered) is now proven in TopupBizEligibilityUI.spec.ts (the test removes and restores the privilege on the Merchant Admin role); only the mid-session removal (TUB-05) stays skipped here.
    test('TUB-05/KB-02: Topup is hidden when the privilege is removed', { annotation: [{ type: 'testcase', description: 'TUB-05/KB-02: removing the Topup privilege hides the button (EMI-3874)' }] }, async () => {
        test.skip(true, 'No helper changes a business user\'s privileges, and the privilege name is not defined (KB gap 6, open question 5). Add a UserManagement privilege helper, then assert quickActionTopupCard and topupSidebarLink are hidden.');
    });

    test('TUB-36/KB-09a: double-clicking Next creates one payment, not two', { annotation: [{ type: 'testcase', description: 'TUB-36/KB-09: double click on Next does not create a duplicate top-up' }] }, async () => {
        const { page, topup, otp } = session;
        const flow = recordFlow(session);
        const data = findTopupCase('VISA');
        let popups = 0;
        const onPage = () => { popups++; };
        page.context().on('page', onPage);
        try {
            await topup.selectPaymentMethod('visa');
            await topup.enterAmount(data.amount);
            await proceedToSummary(session);
            await expect(topup.summaryNextButton).toBeEnabled({ timeout: 15000 });
            // Two clicks on the SAME element in one task = a true double submit. dblclick() sends two mouse
            // events at one screen position, and the second lands on whatever the next screen puts there.
            await topup.summaryNextButton.evaluate((el: HTMLElement) => { el.click(); el.click(); });
            // With the top-up OTP on the next step is the OTP screen; with it off the gateway popup opens.
            await expect.poll(async () => popups > 0 || await otp.inputs.first().isVisible().catch(() => false), { timeout: 20000, message: 'neither the OTP screen nor the gateway popup appeared after Next' }).toBe(true);
            await page.waitForTimeout(3000);
        } finally {
            flow.stop();
            page.context().off('page', onPage);
        }
        const initiations = flow.calls.filter(c => INITIATE_URL.test(c.url));
        expect(initiations.length, 'a double click sent more than one initiation call').toBe(1);
        expect(popups, 'a double click opened more than one gateway popup').toBeLessThanOrEqual(1);
        test.info().annotations.push({ type: 'otp-step', description: popups > 0 ? 'off (gateway popup opened straight after Next)' : 'on' });
        await otp.cancelButton.click({ timeout: 3000 }).catch(() => { /* best-effort cleanup */ });
    });

    test('TUB-38/KB-09b: refreshing on the OTP screen creates no second payment and no popup', { annotation: [{ type: 'testcase', description: 'TUB-38/KB-09: refresh mid-flow creates no duplicate top-up' }] }, async () => {
        const { page, topup } = session;
        await reachOtpScreen(session, 'visa', findTopupCase('VISA'));

        let extraWindows = 0;
        const onPage = () => { extraWindows++; };
        page.context().on('page', onPage);
        const flow = recordFlow(session);
        try {
            await page.reload();
            await page.waitForLoadState('domcontentloaded');
            await expect(topup.pageTitle).toBeVisible({ timeout: 15000 });
            await page.waitForTimeout(3000);
        } finally {
            flow.stop();
            page.context().off('page', onPage);
        }
        expect(flow.calls.filter(c => INITIATE_URL.test(c.url)).length, 'reload re-sent the payment initiation').toBe(0);
        expect(extraWindows, 'reload opened a gateway popup').toBe(0);
    });

    test('TUB-40/KB-08: a second top-up flow gets a new key and a new payment reference', { annotation: [{ type: 'testcase', description: 'TUB-40/KB-08: a new top-up flow gets a new idempotency key (EMI-5480)' }] }, async () => {
        const { otp } = session;
        const data = findTopupCase('VISA');
        const seen: { key: string; ref: string }[] = [];

        for (let i = 0; i < 2; i++) {
            if (i > 0) await gotoTopupScreen(session);
            const flow = recordFlow(session);
            try {
                await reachOtpScreen(session, 'visa', data);
            } finally {
                flow.stop();
            }
            const initiate = flow.calls.find(c => INITIATE_URL.test(c.url));
            expect(initiate, `flow ${i + 1}: no initiation call captured`).toBeDefined();
            seen.push({
                key: keyOf(initiate!).value,
                ref: /"txnReference"\s*:\s*"([^"]+)"/.exec(initiate!.response)?.[1] ?? '',
            });
            await otp.cancelButton.click({ timeout: 3000 }).catch(() => { /* best-effort cleanup */ });
        }

        expect(seen[0].key).toBeTruthy();
        expect(seen[1].key, 'the second flow reused the first flow\'s idempotency key').not.toBe(seen[0].key);
        if (seen[0].ref && seen[1].ref) expect(seen[1].ref).not.toBe(seen[0].ref);
    });

    test('TUB-42: cancelling at the summary and at the OTP does not block the next top-up', { annotation: [{ type: 'testcase', description: 'TUB-42: cancel at summary, then at OTP, then a new top-up reaches the OTP step again (timeout variant not automated)' }] }, async () => {
        const { topup, otp } = session;
        const data = findTopupCase('VISA');

        await topup.selectPaymentMethod('visa');
        await topup.enterAmount(data.amount);
        await topup.clickProceedButton();
        await topup.waitForSummaryToSettle();
        await topup.clickSummaryCancelButton();
        await expect(topup.inputAmount).toBeVisible({ timeout: 15000 });

        await gotoTopupScreen(session);
        await reachOtpScreen(session, 'visa', data);
        await otp.cancelButton.click();

        await gotoTopupScreen(session);
        await reachOtpScreen(session, 'visa', data);
        await expect(otp.inputs.first(), 'the next top-up must reach OTP like a fresh one').toBeVisible();
        await otp.cancelButton.click({ timeout: 3000 }).catch(() => { /* best-effort cleanup */ });
        test.info().annotations.push({ type: 'not-covered', description: 'The timed-out variant needs a real expiry wait.' });
    });

    test('TUB-62: closing the card window before paying charges and credits nothing', { annotation: [{ type: 'testcase', description: 'TUB-62: window closed before paying leaves balance unchanged and no success row' }] }, async () => {
        const { page, topup } = session;
        let key = '';
        const onRequest = (req: Request) => {
            if (req.method() === 'POST' && req.url().endsWith('/api/v1/payments')) key = req.headers()['idempotencykey'] ?? key;
        };
        page.on('request', onRequest);
        const before = await readBalanceBefore(session);
        try {
            const popup = await reachCardEntryPopup(session, 'visa', findTopupCase('VISA'));
            await popup.close();
            topup.resetActivePage();
        } finally {
            page.off('request', onRequest);
        }
        await page.waitForTimeout(3000);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(topup.balanceAmount).toContainText(/\d/, { timeout: 15000 });
        expect(parseFloat(((await topup.balanceAmount.textContent()) ?? '').replace(/[^\d.]/g, ''))).toBeCloseTo(before, 2);
        if (key) {
            const rows = await getTopupTransactionLogHistoryFromSql(key);
            expect(rows.filter(r => r.status === 'SUCCESS')).toHaveLength(0);
        }
        test.info().annotations.push({ type: 'finding', description: 'AS4: dev may still count this abandoned PENDING top-up against the hourly count cap; confirm with BA.' });
    });
});
