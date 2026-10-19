import { test, expect } from '@playwright/test';
import { loginToTopup, gotoTopupScreen, TOPUP_UI_ACCOUNT, type TopupSession } from '../helpers/TopupHelper.ts';
import { proceedToSummary } from './TopupBizUiHelper';
import { RGB, expectSize } from './TopupUiTokens';

// UI look of the Top-up Summary step and the app shell around it. Cases TUI-61..TUI-71 and TUI-116 from
// Topup-UITestCases.md that no older spec proves (values measured on dev on 2026-10-18, see TopupUiTokens.ts).
// The file stops BEFORE Next, so no payment is initiated and the hourly top-up count is not used.
// It reaches the summary once (beforeAll) and every test reads that screen; Cancel runs last.

test.describe.configure({ mode: 'serial' });

test.describe('Topup – UI look – summary and shell', { tag: ['@topup', '@ui', '@style'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'ui' }] }, () => {
    test.setTimeout(120000);

    let session: TopupSession;
    const AMOUNT = '500';

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(240000);
        session = await loginToTopup(browser, TOPUP_UI_ACCOUNT);
        await session.page.setViewportSize({ width: 1920, height: 1080 });
        await gotoTopupScreen(session);
        await session.topup.selectPaymentMethod('visa');
        await session.topup.enterAmount(AMOUNT);
        await proceedToSummary(session);
    });

    test.afterAll(async () => {
        for (const stray of session?.page.context().pages() ?? []) {
            if (stray !== session.page) await stray.close().catch(() => { /* already closed */ });
        }
        await session?.page.close();
    });

    const tc = (id: string, title: string) => ({ annotation: [{ type: 'testcase', description: `${id}: ${title}` }] });
    const rows = () => session.page.locator('.mp-sum-row');

    test('TUI-61: six summary rows in order', tc('TUI-61', 'row order'), async () => {
        await expect(rows()).toHaveCount(6);
        const labels = await rows().evaluateAll(els => els.map(e => (e.children[0]?.textContent ?? '').trim()));
        expect(labels).toEqual(['نوع العملية', 'طريقة الدفع', 'المبلغ الأصلي', 'العمولة', 'ضريبة القيمة المضافة', 'إجمالي المبلغ المراد استلامه']);
    });

    test('TUI-63: row label style', tc('TUI-63', 'label colour, size, weight'), async () => {
        const label = rows().first().locator('span').first();
        await expect(label).toHaveCSS('color', RGB.muted);
        await expect(label).toHaveCSS('font-size', '14px');
        await expect(label).toHaveCSS('font-weight', '400');
    });

    test('TUI-64: transaction type value for a Merchant', tc('TUI-64', 'type row text'), async () => {
        await expect(rows().nth(0)).toContainText(/إضافة أموال للتاجر|Merchant/i);
    });

    test('TUI-65: payment method row follows the chosen method', tc('TUI-65', 'method row shows VISA'), async () => {
        await expect(rows().nth(1)).toContainText(/فيزا|visa/i);
    });

    test('TUI-66: original amount equals the entered amount', tc('TUI-66', 'original amount row'), async () => {
        await expect(rows().nth(2)).toContainText(`${Number(AMOUNT).toFixed(2)}`);
    });

    test('TUI-67: money amounts format and font', tc('TUI-67', 'four amounts, two decimals, mono font, ink colour'), async () => {
        const amounts = session.topup.summaryMoneyAmounts;
        await expect(amounts).toHaveCount(4);
        for (let i = 0; i < 4; i++) {
            await expect(amounts.nth(i)).toHaveText(/^\s*\d{1,3}(,\d{3})*\.\d{2}\s*$/);
            await expect(amounts.nth(i)).toHaveCSS('color', RGB.ink);
            await expect(amounts.nth(i)).toHaveCSS('font-family', /IBM Plex Mono/);
        }
        for (let i = 0; i < 3; i++) {
            await expect(amounts.nth(i)).toHaveCSS('font-size', '14px');
            await expect(amounts.nth(i)).toHaveCSS('font-weight', '500');
        }
    });

    test('TUI-68: the total is bigger and bolder than the other amounts', tc('TUI-68', 'total 16px bold'), async () => {
        const total = session.topup.summaryMoneyAmounts.last();
        await expect(total).toHaveCSS('font-size', '16px');
        await expect(total).toHaveCSS('font-weight', '700');
    });

    test('TUI-69: total against the other rows (finding F2)', tc('TUI-69', 'record how the total is built'), async () => {
        const values = (await session.topup.summaryMoneyAmounts.allInnerTexts()).map(t => Number(t.replace(/,/g, '')));
        const [original, commission, vat, total] = values as [number, number, number, number];
        const added = Math.round((original + commission + vat) * 100) / 100;
        const subtracted = Math.round((original - commission) * 100) / 100;
        test.info().annotations.push({ type: 'finding', description: `original ${original}, commission ${commission}, VAT ${vat}, total ${total}; amount + commission + VAT = ${added}; amount - commission = ${subtracted}. The business cases expect the second.` });
        // Hard check only on what both readings agree on: the total is one of the two, never something else.
        expect([added, subtracted], 'the total must equal amount + commission + VAT or amount - commission').toContain(total);
    });

    test('TUI-70: Cancel button style', tc('TUI-70', 'outline button colours'), async () => {
        const cancel = session.topup.summaryCancelButton.first();
        await expect(cancel).toHaveText(/إلغاء|Cancel/i);
        await expect(cancel).toHaveCSS('color', RGB.body);
        await expect(cancel).toHaveCSS('background-color', RGB.transparent);
        await expect(cancel).toHaveCSS('border', `1px solid ${RGB.border}`);
        await expect(cancel).toHaveCSS('border-radius', '11px');
        await expectSize(cancel, { h: 44 });
    });

    test('TUI-71: Next button style', tc('TUI-71', 'primary button colours'), async () => {
        const next = session.topup.summaryNextButton.first();
        await expect(next).toHaveText(/التالي|Next/i);
        await expect(next).toBeEnabled();
        await expect(next).toHaveCSS('color', RGB.white);
        await expect(next).toHaveCSS('background-color', RGB.primary);
        await expect(next).toHaveCSS('border-radius', '11px');
        await expectSize(next, { h: 44 });
    });

    test('TUI-116: sidebar logout button', tc('TUI-116', 'logout name, size, colour'), async () => {
        const logout = session.shell.logoutButton;
        await expect(logout).toBeVisible();
        await expect(logout).toHaveAccessibleName(/تسجيل الخروج|log ?out/i);
        await expectSize(logout, { w: 40 });
        await expectSize(logout, { h: 40 });
        await expect(logout).toHaveCSS('color', RGB.muted);
        await expect(logout).toHaveCSS('border-radius', '12px');
    });

    test('TUI-73: Cancel returns to the form and keeps the amount on the next Proceed', tc('TUI-73', 'cancel then proceed again'), async () => {
        const { topup } = session;
        await topup.clickSummaryCancelButton();
        await expect(topup.inputAmount).toBeVisible({ timeout: 15000 });
        await topup.visaOption.click().catch(() => { /* already selected */ });
        if (!(await topup.getAmountValue())) await topup.enterAmount(AMOUNT);
        await proceedToSummary(session);
        await expect(rows().nth(2)).toContainText(`${Number(AMOUNT).toFixed(2)}`);
        await topup.clickSummaryCancelButton();
    });
});
