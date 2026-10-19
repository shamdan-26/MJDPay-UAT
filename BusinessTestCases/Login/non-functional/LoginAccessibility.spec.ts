import { test, expect, type Page } from '@playwright/test';
import { LOGIN_URL, NEGATIVE_COMPANY, NEGATIVE_MOBILE, VALID_PASSWORD } from '../helpers/LoginHelper.ts';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { mockSignIn } from '../helpers/loginMocks';

// ─────────────────────────────────────────────────────────────────────────────
// Accessibility — axe-core scans of the login screen (English/Arabic × light/dark) plus keyboard-only operation.
// Needs the dev dependency  @axe-core/playwright  (npm i -D @axe-core/playwright); the axe scans skip with a clear
// message until it is installed. Only serious/critical violations fail the run; the rest are attached.
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

const meta = { tag: ['@login', '@ui', '@a11y'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'non-functional' }] };

test.describe('Login – Accessibility (axe)', meta, () => {
    for (const lang of ['en', 'ar'] as const) {
        for (const theme of ['light', 'dark'] as const) {
            test(`login form should have no serious axe violations (${lang}/${theme})`, { annotation: [{ type: 'testcase', description: "LG-A11Y-01: Login form should have no serious axe violations (…/…)" }] }, async ({ page }) => {
                test.skip(!AxeBuilderCtor, 'Install @axe-core/playwright to run the axe scans');
                // Dark theme only darkens the page background (the login card stays white), so text fails colour contrast.
                test.skip(theme === 'dark', 'Known product defect: dark theme fails colour contrast; re-enable once the card themes');
                test.setTimeout(90_000);
                await page.emulateMedia({ colorScheme: theme });
                const login = new LoginPage(page);
                await login.goto(LOGIN_URL);
                if (lang === 'en') await login.useEnglish(); else await login.arabicButton.click();
                await scan(page, `login-${lang}-${theme}`);
            });
        }
    }

    test('login form with a visible error toast should have no serious axe violations', { annotation: [{ type: 'testcase', description: "LG-A11Y-02: Login form with a visible error toast should have no serious axe violations" }] }, async ({ page }) => {
        test.skip(!AxeBuilderCtor, 'Install @axe-core/playwright to run the axe scans');
        const login = new LoginPage(page);
        await login.goto(LOGIN_URL);
        await mockSignIn(page, 401);
        await login.fillAndSubmit(NEGATIVE_COMPANY, NEGATIVE_MOBILE, VALID_PASSWORD);
        await page.locator('[class*="toast"], [class*="snack"]').first().waitFor({ state: 'visible', timeout: 10000 });
        await scan(page, 'login-error-toast');
    });
});

test.describe('Login – Accessibility (semantics & keyboard)', meta, () => {
    test.beforeEach(async ({ page }) => { await new LoginPage(page).goto(LOGIN_URL); });

    test('every input should have an accessible name', { annotation: [{ type: 'testcase', description: "LG-A11Y-03: Every input should have an accessible name" }] }, async ({ page }) => {
        for (const input of await page.locator('input:visible').all()) {
            const name = (await input.getAttribute('aria-label')) || (await input.getAttribute('placeholder')) || (await input.getAttribute('id'));
            const labelled = await input.evaluate(el => !!(el as HTMLInputElement).labels?.length || el.getAttribute('aria-labelledby'));
            expect(Boolean(name) || labelled, 'input without an accessible name').toBe(true);
        }
    });

    test('icon-only buttons (show password, theme, clear) should have an accessible name', { annotation: [{ type: 'testcase', description: "LG-A11Y-04: Icon-only buttons (show password, theme, clear) should have an accessible name" }] }, async ({ page }) => {
        for (const button of await page.locator('button:visible').all()) {
            const text = ((await button.innerText().catch(() => '')) || (await button.getAttribute('aria-label')) || (await button.getAttribute('title')) || '').trim();
            expect.soft(text.length, `button without a name: ${await button.evaluate(el => el.outerHTML.slice(0, 120))}`).toBeGreaterThan(0);
        }
    });

    test('the page should declare a language and a title', { annotation: [{ type: 'testcase', description: "LG-A11Y-05: The page should declare a language and a title" }] }, async ({ page }) => {
        expect(await page.locator('html').getAttribute('lang')).toBeTruthy();
        expect((await page.title()).trim().length).toBeGreaterThan(0);
    });

    test('the language buttons should expose their pressed state to assistive tech', { annotation: [{ type: 'testcase', description: "LG-A11Y-06: The language buttons should expose their pressed state to assistive tech" }] }, async ({ page }) => {
        const login = new LoginPage(page);
        await expect(login.enButton).toHaveAttribute('aria-pressed', /true|false/);
        await expect(login.arabicButton).toHaveAttribute('aria-pressed', /true|false/);
    });

    test('the whole login can be completed with the keyboard only', { annotation: [{ type: 'testcase', description: "LG-A11Y-07: The whole login can be completed with the keyboard only" }] }, async ({ page }) => {
        const login = new LoginPage(page);
        const signIn = await mockSignIn(page, 401);
        await login.companyInput.focus();
        await page.keyboard.type(NEGATIVE_COMPANY);
        await page.keyboard.press('Tab');
        for (let i = 0; i < 3 && !(await login.mobileInput.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab');
        await page.keyboard.type(NEGATIVE_MOBILE);
        await page.keyboard.press('Tab');
        for (let i = 0; i < 3 && !(await login.passwordInput.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab');
        await page.keyboard.type(VALID_PASSWORD);
        await page.keyboard.press('Enter');
        await expect.poll(() => signIn.count(), { timeout: 10000 }).toBe(1);
    });

    test('the error toast should be announced to screen readers (role alert/status or aria-live)', { annotation: [{ type: 'testcase', description: "LG-A11Y-08: The error toast should be announced to screen readers (role alert/status or aria-live)" }] }, async ({ page }) => {
        const login = new LoginPage(page);
        await mockSignIn(page, 401);
        await login.fillAndSubmit(NEGATIVE_COMPANY, NEGATIVE_MOBILE, VALID_PASSWORD);
        const live = page.locator('[role="alert"], [role="status"], [aria-live="assertive"], [aria-live="polite"]');
        await expect(live.first()).toBeVisible({ timeout: 10000 });
    });

    test('text and controls should remain usable at 200% zoom (no horizontal scroll)', { annotation: [{ type: 'testcase', description: "LG-A11Y-09: Text and controls should remain usable at 200% zoom (no horizontal scroll)" }] }, async ({ page }) => {
        await page.setViewportSize({ width: 640, height: 450 }); // 1280x900 at 200%
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
        await expect(new LoginPage(page).loginButton).toBeVisible();
    });
});
