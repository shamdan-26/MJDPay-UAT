import { test, expect, Page } from '@playwright/test';
import { REGISTER_URL, goToInfoStepMocked, goToFinancialStepMocked, goToOtpDialogMocked, mockOtpRequired, OTP_NOT_VALID } from '../RegistrationHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Accessibility — axe-core scans of every step reachable without a real OTP, in English/Arabic and light/dark.
// Needs the dev dependency  @axe-core/playwright  (npm i -D @axe-core/playwright); the whole file skips with a
// clear message until it is installed. Only serious/critical violations fail the run; minor ones are attached.
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
    const builder = new AxeBuilderCtor!({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']);
    const { violations } = await builder.analyze();
    await test.info().attach(`axe-${label}`, { body: JSON.stringify(violations, null, 2), contentType: 'application/json' });
    const blocking = violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(blocking.map(v => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)`), `Blocking accessibility violations on ${label}`).toEqual([]);
}

const STEPS: { name: string; open: (page: Page) => Promise<void> }[] = [
    { name: 'Mobile', open: async page => { await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }); } },
    { name: 'OTP dialog', open: async page => { await mockOtpRequired(page, () => OTP_NOT_VALID); await goToOtpDialogMocked(page); } },
    { name: 'Business Info', open: async page => { await goToInfoStepMocked(page); } },
    { name: 'Financial & Business', open: async page => { await goToFinancialStepMocked(page); } },
];

for (const step of STEPS) {
    for (const lang of ['EN', 'AR'] as const) {
        for (const theme of ['light', 'dark'] as const) {
            test(`${step.name} should have no serious accessibility violations (${lang}, ${theme} theme)`, { tag: ['@registration', '@ui', '@a11y'], annotation: [{ type: 'testcase', description: "RG-A11Y-01: Step has no serious accessibility violations" }, { type: 'feature', description: 'Registration' }, { type: 'layer', description: 'ui' }] }, async ({ page }) => {
                test.skip(!AxeBuilderCtor, 'Install @axe-core/playwright (npm i -D @axe-core/playwright) to run accessibility scans');
                test.setTimeout(120_000);
                await page.emulateMedia({ colorScheme: theme });
                await step.open(page);
                if (lang === 'AR') await page.getByRole('button', { name: 'العربية' }).click();
                if (theme === 'dark') {
                    const toggle = page.getByRole('button', { name: 'Switch theme' }).or(page.locator('button.mode-btn.header-icon-btn')).first();
                    const before = await page.locator('body').getAttribute('class');
                    await toggle.click();
                    await expect.poll(() => page.locator('body').getAttribute('class')).not.toBe(before);
                }
                await scan(page, `${step.name}-${lang}-${theme}`);
            });
        }
    }
}
