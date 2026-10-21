import { type Page, type Locator, expect } from '@playwright/test';
import { ADMIN_BASE_URL } from './AdminOtpConfigPage';
import type { AmountLimitValues, Platform, RiskLevel } from './AdminLimitsApi';

/**
 * Admin Portal → Manage Limits → Transaction ("Transaction amount limits"), driven through the screen itself.
 *
 * Read off the live dev admin DOM on 2026-10-21 (the screen is not in QA-DATA-TESTID-HANDOFF.md and has no page-authored
 * ids on the form, so locators are roles and visible labels). What the screen looks like:
 *   - "Update Limits" opens the dialog "Update Transaction Limits".
 *   - Fields: Transaction Type, Risk Level, Platform, "Minimum Amount", then Maximum Amount as Hourly / Daily / Monthly / Yearly.
 *   - Transaction Type is a TREE of checkboxes: a group (e.g. "Cash-In") expands to its types ("Biller Bank Cashin",
 *     "Merchant Cashin", ...). Ticking the group ticks every child, so only the child is ticked here: one type, never the group.
 *   - Risk Level and Platform are single lists that also offer ALL behind a warning modal. ALL is never used.
 * Not read off the live DOM: the toggle that expands a group (found by position inside the group's row) and the error text of a
 * rejected save. Tighten them after the first run on dev.
 */

export const TRANSACTION_LIMITS_URL = `${ADMIN_BASE_URL}/admin/main/limitations-management/transaction-limitations`;

export class AdminTransactionLimitsPage {
    readonly page: Page;
    readonly updateLimitsButton: Locator;
    readonly dialog: Locator;

    constructor(page: Page) {
        this.page = page;
        this.updateLimitsButton = page.getByRole('button', { name: /update limits/i }).first();
        this.dialog = page.getByRole('dialog', { name: /update transaction limits/i });
    }

    async open(): Promise<void> {
        await this.page.goto(TRANSACTION_LIMITS_URL, { waitUntil: 'domcontentloaded' });
        await expect(this.updateLimitsButton, 'Transaction limits screen did not load (is the admin session logged in?)').toBeVisible({ timeout: 30000 });
    }

    private field(label: RegExp): Locator {
        return this.dialog.getByLabel(label).first();
    }

    /** A dropdown of the dialog: the box right after its label. */
    private dropdown(label: string): Locator {
        return this.dialog.locator('label', { hasText: label }).locator('xpath=following::input[1]');
    }

    /** Picks one entry of a single-choice list (Risk Level, Platform). */
    private async pick(label: string, option: string): Promise<void> {
        await this.dropdown(label).click();
        await this.dialog.locator('li:visible').filter({ hasText: new RegExp(`^\\s*${option}\\s*$`) }).first().click();
    }

    /** Ticks exactly one child type of a group, e.g. ('Cash-In', 'Biller Bank Cashin'). */
    private async pickType(group: string, typeName: string): Promise<void> {
        await this.dropdown('Transaction Type').click();
        const child = this.dialog.locator('li:visible').filter({ hasText: new RegExp(`^\\s*${typeName}\\s*$`) }).first();
        if (!(await child.isVisible().catch(() => false))) {
            const row = this.dialog.locator('li:visible').filter({ hasText: new RegExp(`^\\s*${group}\\s*`) }).first();
            await row.locator('svg, img, i, button, [class*="arrow"], [class*="chevron"]').last().click();
        }
        await expect(child, `"${typeName}" is not listed under "${group}" in the Transaction Type tree`).toBeVisible({ timeout: 5000 });
        await child.locator('input[type="checkbox"]').check();
        await expect(child.locator('input[type="checkbox"]')).toBeChecked();
        // Close the list so it does not cover the next field.
        await this.dialog.getByRole('heading', { name: /update transaction limits/i }).click();
    }

    private async fill(label: RegExp, value: number): Promise<void> {
        const input = this.field(label);
        await input.fill(String(value));
        await expect(input).toHaveValue(new RegExp(`^${value}$|^${value.toLocaleString('en-US')}$`));
    }

    /**
     * Sets the minimum and the four period maxima of ONE type x risk x platform cell and saves. Returns whether the dialog
     * closed (accepted) or stayed open (rejected, with whatever message the screen showed).
     */
    async setAmounts(group: string, typeName: string, risk: RiskLevel, platform: Platform, v: AmountLimitValues): Promise<{ accepted: boolean; error: string }> {
        await this.updateLimitsButton.click();
        await expect(this.dialog).toBeVisible({ timeout: 10000 });
        await this.pickType(group, typeName);
        await this.pick('Risk Level', risk);
        await this.pick('Platform', platform);
        await this.fill(/Minimum Amount/i, v.min);
        await this.fill(/Hourly/i, v.hourly);
        await this.fill(/Daily/i, v.daily);
        await this.fill(/Monthly/i, v.monthly);
        await this.fill(/Yearly/i, v.yearly);
        await this.dialog.getByRole('button', { name: /^\s*update\s*$/i }).click();
        const closed = await this.dialog.waitFor({ state: 'hidden', timeout: 10000 }).then(() => true).catch(() => false);
        const error = closed ? '' : ((await this.page.locator('.invalid-feedback:visible, .text-danger:visible, .toast-error, .toast-message, [role="alert"]').first().innerText().catch(() => '')) || 'dialog stayed open, no message');
        if (!closed) await this.dialog.getByRole('button', { name: /^\s*cancel\s*$/i }).click().catch(() => { /* already gone */ });
        return { accepted: closed, error };
    }
}
