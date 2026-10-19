import { test, expect, type Page } from '@playwright/test';
import {
    VALID_PASSWORD,
    VALID_COMPANY,
    VALID_MOBILE,
    mockOtpDisabled,
    mockForgetPasswordSuccess,
    gotoForgotPassword,
    fillStep1AndProceed,
} from '../helpers/ForgotPasswordHelper.ts';
import { ForgotPasswordPage } from '../../pageElements/ForgotPassword/ForgotPasswordPage';

// ─────────────────────────────────────────────────────────────────────────────
// Accessibility — axe-core scans of both steps (English/Arabic) plus keyboard-only operation (mocked).
// Needs the dev dependency  @axe-core/playwright ; the axe scans skip with a clear message until it is installed.
// Only serious/critical violations fail the run; the rest are attached.
// ─────────────────────────────────────────────────────────────────────────────

interface AxeViolation { id: string; impact?: string | null; help: string; nodes: unknown[] }
type AxeBuilder = new (opts: { page: Page }) => { withTags(tags: string[]): { analyze(): Promise<{ violations: AxeViolation[] }> } };

let AxeBuilderCtor: AxeBuilder | null = null;

test.beforeAll(async () => {
    const specifier = '@axe-core/playwright';
    try {
        const mod = await import(specifier);
        AxeBuilderCtor = (mod.default ?? mod.AxeBuilder) as AxeBuilder;
    } catch {
        AxeBuilderCtor = null;
    }
});

async function scan(page: Page, label: string) {
    const { violations } = await new AxeBuilderCtor!({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    await test.info().attach(`axe-${label}`, { body: JSON.stringify(violations, null, 2), contentType: 'application/json' });
    const blocking = violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(blocking.map(v => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)`), `Blocking accessibility violations on ${label}`).toEqual([]);
}

const meta = { tag: ['@forgotpassword', '@ui', '@a11y'], annotation: [{ type: 'feature', description: 'ForgotPassword' }, { type: 'layer', description: 'non-functional' }] };

test.describe('Forgot Password – Accessibility (axe)', meta, () => {
    test.beforeEach(async ({ page }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
    });

    for (const lang of ['en', 'ar'] as const) {
        test(`step 1 should have no serious axe violations (${lang})`, { annotation: [{ type: 'testcase', description: 'FP-A11Y-01: Step 1 should have no serious axe violations (…)' }] }, async ({ page }) => {
            test.skip(!AxeBuilderCtor, 'Install @axe-core/playwright to run the axe scans');
            test.setTimeout(90_000);
            await gotoForgotPassword(page);
            const fp = new ForgotPasswordPage(page);
            if (lang === 'ar') await fp.arabicButton.click();
            await scan(page, `forgot-step1-${lang}`);
        });

        test(`step 2 should have no serious axe violations (${lang})`, { annotation: [{ type: 'testcase', description: 'FP-A11Y-02: Step 2 should have no serious axe violations (…)' }] }, async ({ page }) => {
            test.skip(!AxeBuilderCtor, 'Install @axe-core/playwright to run the axe scans');
            test.setTimeout(90_000);
            await gotoForgotPassword(page);
            const fp = new ForgotPasswordPage(page);
            if (lang === 'ar') await fp.arabicButton.click();
            await fillStep1AndProceed(page);
            await fp.fillStep2(VALID_PASSWORD, VALID_PASSWORD);
            await scan(page, `forgot-step2-${lang}`);
        });
    }

    test('step 1 can be completed with the keyboard alone', { annotation: [{ type: 'testcase', description: 'FP-A11Y-03: Step 1 is keyboard operable' }] }, async ({ page }) => {
        await gotoForgotPassword(page);
        const fp = new ForgotPasswordPage(page);
        await fp.companyInput.focus();
        await page.keyboard.type(VALID_COMPANY);
        await page.keyboard.press('Tab');
        await expect(fp.mobileInput).toBeFocused();
        await page.keyboard.type(VALID_MOBILE);
        await expect(fp.nextButton).toBeEnabled();
        await fp.nextButton.focus();
        await page.keyboard.press('Enter');
        await expect(fp.newPasswordInput).toBeVisible({ timeout: 30000 });
    });
});
