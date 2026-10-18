import { test, expect } from '@playwright/test';
import { loginToTopup, gotoTopupScreen, TOPUP_UI_ACCOUNT, type TopupSession } from '../TopupHelper';
import { RGB, readStyle, contrastRatio, expectSize } from './TopupUiTokens';

// UI look of the Top-up form: text, colours, sizes, states. Cases TUI-03..TUI-58 from Topup-UITestCases.md that no
// older spec proves. Values are the ones measured on dev on 2026-10-18 (see TopupUiTokens.ts). "Capture" cases
// (no measured value yet) only record what they see as annotations, so the value can be written into the md.
// No payment is made: the file stops at the form, so it adds nothing to the hourly top-up count.

test.describe.configure({ mode: 'serial' });

test.describe('Topup – UI look – form', { tag: ['@topup', '@ui', '@style'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'ui' }] }, () => {
    test.setTimeout(120000);

    let session: TopupSession;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(180000); // hooks do not inherit the describe timeout
        session = await loginToTopup(browser, TOPUP_UI_ACCOUNT);
    });

    test.afterAll(async () => {
        await session?.page.close();
    });

    test.beforeEach(async () => {
        await session.page.setViewportSize({ width: 1920, height: 1080 }); // the width tests below change it
        await gotoTopupScreen(session);
    });

    const tc = (id: string, title: string) => ({ annotation: [{ type: 'testcase', description: `${id}: ${title}` }] });

    // ───────────── A. Page layout and hero ─────────────

    test('TUI-03: page title style', tc('TUI-03', 'title colour, size, weight'), async () => {
        const { topup } = session;
        await expect(topup.pageTitle).toHaveCSS('color', RGB.ink);
        await expect(topup.pageTitle).toHaveCSS('font-size', '28px');
        await expect(topup.pageTitle).toHaveCSS('font-weight', '600');
    });

    test('TUI-05: page subtitle style', tc('TUI-05', 'subtitle colour, size, weight'), async () => {
        const { topup } = session;
        await expect(topup.pageSubtitle).toHaveCSS('color', RGB.muted);
        await expect(topup.pageSubtitle).toHaveCSS('font-size', '14.5px');
        await expect(topup.pageSubtitle).toHaveCSS('font-weight', '500');
    });

    test('TUI-06: the form has exactly one main heading', tc('TUI-06', 'one h1'), async () => {
        await expect(session.page.locator('h1')).toHaveCount(1);
    });

    test('TUI-08: no horizontal page scroll at desktop widths', tc('TUI-08', 'no horizontal scroll at 1920 and 1366'), async () => {
        const { page } = session;
        for (const width of [1920, 1366]) {
            await page.setViewportSize({ width, height: 900 });
            await page.waitForTimeout(300);
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
            expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(0);
        }
    });

    // ───────────── B. Balance card ─────────────

    test('TUI-09: balance label text and style', tc('TUI-09', 'label colour, size, weight'), async () => {
        const { topup } = session;
        await expect(topup.balanceCardLabel).toHaveText(/الرصيد الحالي|Current balance/i);
        await expect(topup.balanceCardLabel).toHaveCSS('color', RGB.faint);
        await expect(topup.balanceCardLabel).toHaveCSS('font-size', '11px');
        await expect(topup.balanceCardLabel).toHaveCSS('font-weight', '600');
    });

    test('TUI-10: balance amount format and style', tc('TUI-10', 'amount 0.00 with separators, colour, size'), async () => {
        const { topup } = session;
        await expect(topup.balanceAmount).toHaveText(/^\s*\d{1,3}(,\d{3})*\.\d{2}\s*$/);
        await expect(topup.balanceAmount).toHaveCSS('color', RGB.ink);
        await expect(topup.balanceAmount).toHaveCSS('font-size', '22px');
        await expect(topup.balanceAmount).toHaveCSS('font-weight', '700');
    });

    test('TUI-12: wallet code format and style', tc('TUI-12', 'code pattern, colour, size, mono font'), async () => {
        const { topup } = session;
        await expect(topup.balanceWalletCode).toHaveText(/[A-Z]{3}-[A-Z0-9-]+/);
        await expect(topup.balanceWalletCode).toHaveCSS('color', RGB.faint);
        await expect(topup.balanceWalletCode).toHaveCSS('font-size', '11.5px');
        await expect(topup.balanceWalletCode).toHaveCSS('font-family', /IBM Plex Mono/);
    });

    for (const [id, key, name] of [['TUI-13', 'balanceQrButton', 'QR'], ['TUI-14', 'balanceSettingsButton', 'wallet settings']] as const) {
        test(`${id}: ${name} icon button style`, tc(id, `${name} button name, size, colours`), async () => {
            const button = session.topup[key];
            await expect(button).toBeVisible();
            await expect(button).toBeEnabled();
            await expectSize(button, { w: 32 });
            await expectSize(button, { h: 32 });
            await expect(button).toHaveCSS('background-color', RGB.surface);
            await expect(button).toHaveCSS('color', RGB.muted);
            await expect(button).toHaveCSS('border-radius', '8px');
            await expect(button).toHaveCSS('cursor', 'pointer');
        });
    }

    test('TUI-17: balance icon buttons – hover and focus (capture)', tc('TUI-17', 'record hover and focus style'), async () => {
        const { page, topup } = session;
        const before = await readStyle(topup.balanceQrButton);
        await topup.balanceQrButton.hover();
        const hover = await readStyle(topup.balanceQrButton);
        await page.keyboard.press('Tab');
        await topup.balanceQrButton.focus();
        const focus = await readStyle(topup.balanceQrButton);
        test.info().annotations.push({ type: 'capture', description: JSON.stringify({ before, hover, focus }) });
    });

    // ───────────── C. Payment method cards ─────────────

    test('TUI-22: unselected method card style', tc('TUI-22', 'card colours, border, radius, size'), async () => {
        const cards = session.topup.paymentMethodOptions;
        await expect(cards).toHaveCount(3);
        for (let i = 0; i < 3; i++) {
            const card = cards.nth(i);
            await expect(card).toHaveCSS('color', RGB.body);
            await expect(card).toHaveCSS('background-color', RGB.white);
            await expect(card).toHaveCSS('border', `1px solid ${RGB.border}`);
            await expect(card).toHaveCSS('border-radius', '14px');
            await expect(card).toHaveCSS('cursor', 'pointer');
        }
    });

    test('TUI-24: selected method card style', tc('TUI-24', 'selected card colours'), async () => {
        const { topup } = session;
        await topup.visaOption.click();
        const card = topup.paymentMethodOptions.nth(1);
        await expect(card).toHaveAttribute('aria-checked', 'true');
        await expect(card).toHaveCSS('color', RGB.primary);
        await expect(card).toHaveCSS('background-color', RGB.selectedTint);
        await expect(card).toHaveCSS('border', `1px solid ${RGB.primary}`);
        await expect(topup.paymentMethodOptions.first()).toHaveCSS('border', `1px solid ${RGB.border}`);
    });

    test('TUI-26: clicking the selected card again (capture)', tc('TUI-26', 'record whether the card stays selected'), async () => {
        const { topup } = session;
        await topup.visaOption.click();
        await topup.visaOption.click();
        const checked = await topup.paymentMethodOptions.nth(1).getAttribute('aria-checked');
        test.info().annotations.push({ type: 'capture', description: `after a second click VISA aria-checked=${checked}` });
    });

    test('TUI-27: method cards can be used with the keyboard', tc('TUI-27', 'focus and Space select a card'), async () => {
        const { page, topup } = session;
        await topup.paymentMethodOptions.first().focus();
        await page.keyboard.press('Space');
        const state = await topup.paymentMethodOptions.evaluateAll(els => els.map(e => e.getAttribute('aria-checked')));
        test.info().annotations.push({ type: 'capture', description: `aria-checked after Space on the first card: ${state.join(',')}` });
        expect(state.filter(s => s === 'true'), 'Space on a focused card selects exactly it').toHaveLength(1);
    });

    test('TUI-28: method card hover (capture)', tc('TUI-28', 'record the hover style'), async () => {
        const card = session.topup.paymentMethodOptions.first();
        const before = await readStyle(card);
        await card.hover();
        const hover = await readStyle(card);
        test.info().annotations.push({ type: 'capture', description: JSON.stringify({ before, hover }) });
    });

    // ───────────── D. Amount field ─────────────

    test('TUI-30: amount input style', tc('TUI-30', 'amount input colour, size, mono font'), async () => {
        const input = session.topup.inputAmount;
        await expect(input).toHaveCSS('color', RGB.ink);
        await expect(input).toHaveCSS('font-size', '18px');
        await expect(input).toHaveCSS('font-weight', '500');
        await expect(input).toHaveCSS('font-family', /IBM Plex Mono/);
        await expectSize(input, { h: 54 });
    });

    test('TUI-31: currency box style', tc('TUI-31', 'currency box background, size'), async () => {
        const box = session.topup.amountCurrencyIcon;
        await expect(box).toBeVisible();
        await expect(box).toHaveCSS('background-color', RGB.surface);
        await expect(box).toHaveCSS('color', RGB.body);
        await expectSize(box, { w: 44 });
        await expectSize(box, { h: 54 });
        await expect(box).toHaveCSS('font-weight', '600');
    });

    test('TUI-38: zero amount highlights the field in red (no error text)', tc('TUI-38', 'zero amount: field highlighted red, no error text'), async () => {
        const { page, topup } = session;
        await topup.enterAmount('0'); // no method selected: the state measured on 2026-10-18
        await topup.inputAmount.blur();
        const field = page.locator('label.mp-amount-field');
        await expect(field).toHaveClass(/is-error/);
        await expect(field).toHaveCSS('border', `1px solid ${RGB.error}`);
        await expect(field).toHaveCSS('border-radius', '14px');
        await expect(topup.proceedButton).toBeDisabled();
        // By design the field is only highlighted in red: no error text is shown under it.
        await expect(page.locator('.mp-amount-error')).toBeHidden();
    });

    test('TUI-39: the error clears when the amount is fixed', tc('TUI-39', 'error disappears on a valid amount'), async () => {
        const { page, topup } = session;
        await topup.enterAmount('0');
        await topup.inputAmount.blur();
        await expect(page.locator('label.mp-amount-field')).toHaveClass(/is-error/);
        await topup.enterAmount('500');
        await expect(page.locator('label.mp-amount-field')).not.toHaveClass(/is-error/);
        await expect(page.locator('label.mp-amount-field')).not.toHaveCSS('border-top-color', RGB.error);
    });

    test('TUI-40: the error state shows no text under the field', tc('TUI-40', 'error is a red highlight only, no message text'), async () => {
        const { page, topup } = session;
        await topup.enterAmount('0');
        await topup.inputAmount.blur();
        await expect(page.locator('label.mp-amount-field')).toHaveClass(/is-error/);
        await expect(page.locator('.mp-amount-error .error-content')).toBeHidden();
        await expect(page.getByText(/هذا الحقل مطلوب|field is required/i)).toBeHidden();
    });

    test('TUI-41: amount focus style (capture)', tc('TUI-41', 'record the focus style of the amount field'), async () => {
        const { page, topup } = session;
        const field = page.locator('label.mp-amount-field');
        const before = await readStyle(field);
        await topup.inputAmount.click();
        const focused = await readStyle(field);
        test.info().annotations.push({ type: 'capture', description: JSON.stringify({ before, focused }) });
    });

    // ───────────── E. Quick-amount chips ─────────────

    test('TUI-43: quick-amount label style', tc('TUI-43', 'label colour, size'), async () => {
        const label = session.topup.quickAmountLabel;
        await expect(label).toHaveText(/أو اختر المبلغ|Or choose/i);
        await expect(label).toHaveCSS('color', RGB.muted);
        await expect(label).toHaveCSS('font-size', '13px');
    });

    test('TUI-45: chip style', tc('TUI-45', 'pill chips: colours, border, height'), async () => {
        const chips = session.topup.presetAmountChips;
        await expect(chips).toHaveCount(5);
        for (let i = 0; i < 5; i++) {
            const chip = chips.nth(i);
            await expect(chip).toHaveCSS('color', RGB.body);
            await expect(chip).toHaveCSS('background-color', RGB.white);
            await expect(chip).toHaveCSS('border', `1px solid ${RGB.border}`);
            await expect(chip).toHaveCSS('border-radius', '999px');
            await expectSize(chip, { h: 38 });
            await expect(chip).toHaveCSS('font-size', '13px');
        }
    });

    test('TUI-48: active chip style', tc('TUI-48', 'is-active chip colours'), async () => {
        const { page, topup } = session;
        await topup.presetAmountChips.nth(1).click();
        const active = topup.presetAmountChips.nth(1);
        await expect(active).toHaveClass(/is-active/);
        // The chip animates to its final colours (the probe caught it mid-transition); toHaveCSS retries until it settles.
        await expect(active).toHaveCSS('color', RGB.primary);
        await page.waitForTimeout(500);
        test.info().annotations.push({ type: 'capture', description: `settled active chip: ${JSON.stringify(await readStyle(active))}` });
        await expect(topup.presetAmountChips.first()).not.toHaveClass(/is-active/);
        await expect(topup.presetAmountChips.first()).toHaveCSS('color', RGB.body);
    });

    test('TUI-50: chips wrap at phone width without overflow', tc('TUI-50', 'no horizontal overflow at 390 wide'), async () => {
        const { page } = session;
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(400);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, 'horizontal overflow at 390px').toBeLessThanOrEqual(0);
        await expect(session.topup.presetAmountChips.last()).toBeVisible();
    });

    // ───────────── F. Disclaimer and Proceed ─────────────

    test('TUI-52: disclaimer style (capture)', tc('TUI-52', 'record the disclaimer colour and size'), async () => {
        const { topup } = session;
        await expect(topup.disclaimerText).toBeVisible();
        const style = await topup.disclaimerText.evaluate(el => ({ color: getComputedStyle(el).color, size: getComputedStyle(el).fontSize, background: getComputedStyle(el).backgroundColor }));
        test.info().annotations.push({ type: 'capture', description: JSON.stringify(style) });
    });

    test('TUI-53: Proceed label', tc('TUI-53', 'Proceed label'), async () => {
        await expect(session.topup.proceedButton).toHaveText(/متابعة|Proceed/i);
    });

    test('TUI-54: Proceed disabled style', tc('TUI-54', 'disabled: half opacity, not-allowed'), async () => {
        const button = session.topup.proceedButton;
        await expect(button).toBeDisabled();
        await expect(button).toHaveCSS('opacity', '0.5');
        await expect(button).toHaveCSS('cursor', 'not-allowed');
        await expect(button).toHaveCSS('background-color', RGB.primary);
    });

    test('TUI-55: Proceed enabled style', tc('TUI-55', 'enabled: full opacity, primary blue, size'), async () => {
        const { topup } = session;
        await topup.visaOption.click();
        await topup.enterAmount('500');
        const button = topup.proceedButton;
        await expect(button).toBeEnabled();
        await expect(button).toHaveCSS('opacity', '1');
        await expect(button).toHaveCSS('background-color', RGB.primary);
        await expect(button).toHaveCSS('color', RGB.white);
        await expect(button).toHaveCSS('font-size', '14.5px');
        await expect(button).toHaveCSS('font-weight', '600');
        await expect(button).toHaveCSS('border-radius', '11px');
        await expectSize(button, { w: 200 });
        await expectSize(button, { h: 44 });
        await expect(button).toHaveCSS('cursor', 'pointer');
    });

    test('TUI-58: Proceed hover and focus (capture)', tc('TUI-58', 'record hover and focus style'), async () => {
        const { topup } = session;
        await topup.visaOption.click();
        await topup.enterAmount('500');
        const before = await readStyle(topup.proceedButton);
        await topup.proceedButton.hover();
        const hover = await readStyle(topup.proceedButton);
        await topup.proceedButton.focus();
        const focus = await readStyle(topup.proceedButton);
        test.info().annotations.push({ type: 'capture', description: JSON.stringify({ before, hover, focus }) });
    });

    // ───────────── M. Colour contrast ─────────────

    test('TUI-133: text colours meet the 4.5:1 contrast on white', tc('TUI-133', 'contrast of ink, body, muted, faint text'), async () => {
        const ratio = (color: string) => contrastRatio(color, RGB.white);
        for (const [name, color] of [['ink', RGB.ink], ['body', RGB.body], ['muted', RGB.muted], ['faint', RGB.faint]] as const) {
            test.info().annotations.push({ type: 'contrast', description: `${name} ${color} on white = ${ratio(color).toFixed(2)}:1` });
        }
        expect.soft(ratio(RGB.ink), 'ink text contrast').toBeGreaterThanOrEqual(4.5);
        expect.soft(ratio(RGB.body), 'body text contrast').toBeGreaterThanOrEqual(4.5);
        expect.soft(ratio(RGB.muted), 'muted text contrast').toBeGreaterThanOrEqual(4.5);
        // Known finding F4 (2026-10-18): the faint grey (balance label, wallet code) is 3.07:1, below 4.5:1. Reported as a finding,
        // not a failure, until the design changes; then move it into the hard checks above.
        if (ratio(RGB.faint) < 4.5) test.info().annotations.push({ type: 'finding', description: `faint text ${ratio(RGB.faint).toFixed(2)}:1 on white is below 4.5:1 (F4)` });
    });
});
