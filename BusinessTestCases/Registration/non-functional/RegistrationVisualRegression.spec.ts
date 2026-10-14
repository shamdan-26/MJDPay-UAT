import { test, expect, Page } from '@playwright/test';
import { REGISTER_URL, goToInfoStepMocked, goToFinancialStepMocked, goToOtpDialogMocked, mockOtpRequired, OTP_NOT_VALID } from '../RegistrationHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Visual regression — pixel snapshots of each step reachable without a real OTP, English/Arabic × light/dark,
// on a desktop and a phone viewport. First run on a machine writes the baselines:
//   npm run test:dev -- BusinessTestCases/Registration/non-functional/RegistrationVisualRegression.spec.ts --update-snapshots
// Review the generated images under *-snapshots/ before committing them. Dynamic regions (countdown timer, masked
// inputs) are masked so the comparison is stable.
// ─────────────────────────────────────────────────────────────────────────────

const STEPS: { name: string; open: (page: Page) => Promise<void> }[] = [
    { name: 'mobile', open: async page => { await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }); } },
    { name: 'otp', open: async page => { await mockOtpRequired(page, () => OTP_NOT_VALID); await goToOtpDialogMocked(page, '512345678'); } },
    { name: 'business-info', open: async page => { await goToInfoStepMocked(page, '512345678'); } },
    { name: 'financial', open: async page => { await goToFinancialStepMocked(page); } },
];

const VIEWPORTS = [{ label: 'desktop', width: 1280, height: 900 }, { label: 'phone', width: 375, height: 800 }];

for (const step of STEPS) {
    for (const vp of VIEWPORTS) {
        for (const lang of ['en', 'ar'] as const) {
            for (const theme of ['light', 'dark'] as const) {
                test(`${step.name} should match its ${vp.label} ${lang}/${theme} baseline`, { tag: ['@registration', '@ui', '@visual'], annotation: [{ type: 'testcase', description: "RG-VIS-01: Step matches its viewport, language and theme baseline" }, { type: 'feature', description: 'Registration' }, { type: 'layer', description: 'ui' }] }, async ({ page }) => {
                    test.setTimeout(120_000);
                    await page.setViewportSize({ width: vp.width, height: vp.height });
                    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
                    await step.open(page);
                    if (lang === 'ar') await page.getByRole('button', { name: 'العربية' }).click();
                    if (theme === 'dark') {
                        const toggle = page.getByRole('button', { name: 'Switch theme' }).or(page.locator('button.mode-btn.header-icon-btn')).first();
                        const before = await page.locator('body').getAttribute('class');
                        await toggle.click();
                        await expect.poll(() => page.locator('body').getAttribute('class')).not.toBe(before);
                    }
                    await expect(page).toHaveScreenshot(`${step.name}-${vp.label}-${lang}-${theme}.png`, {
                        fullPage: true,
                        animations: 'disabled',
                        maxDiffPixelRatio: 0.02,
                        mask: [page.getByText(/\b\d{1,2}:\d{2}\b/), page.locator('input')],
                    });
                });
            }
        }
    }
}
