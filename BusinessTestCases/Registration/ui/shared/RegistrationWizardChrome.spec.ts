import { test, expect, Page, Locator } from '@playwright/test';
import { REGISTER_URL, goToInfoStepMocked } from '../../RegistrationHelper';
import { RegistrationMobilePage } from '../../../pageElements/Registration/RegistrationMobilePage';
import { RegistrationInfoPage } from '../../../pageElements/Registration/RegistrationInfoPage';

// ─────────────────────────────────────────────────────────────────────────────
// Wizard chrome — the header (logo, language switch, theme toggle), page title,
// document language/direction, console health and responsive layout that every
// step shares. Previously each step spec re-asserted the logo/EN/Arabic/theme
// controls (27 copies); they are checked once here, on the two steps reachable
// without a real OTP (Mobile and Business Info via the mocked OTP bypass), so no
// pool identity is consumed.
// ─────────────────────────────────────────────────────────────────────────────

interface Chrome { logoImage: Locator; logoLink: Locator; enButton: Locator; arabicButton: Locator; themeToggle: Locator }

const STEPS: { name: string; open: (page: Page) => Promise<void>; chrome: (page: Page) => Chrome }[] = [
    {
        name: 'Mobile',
        open: async page => { await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }); },
        chrome: page => new RegistrationMobilePage(page),
    },
    {
        name: 'Business Info',
        open: async page => { await goToInfoStepMocked(page); },
        chrome: page => new RegistrationInfoPage(page),
    },
];

for (const step of STEPS) {
    test.describe(`Registration – Wizard chrome (${step.name})`, { tag: ['@registration', '@ui'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'ui' }] }, () => {
        let chrome: Chrome;

        test.beforeEach(async ({ page }) => {
            test.setTimeout(90_000);
            await step.open(page);
            chrome = step.chrome(page);
        });

        test('should display the MJD Pay logo', async () => {
            await expect(chrome.logoImage).toBeVisible();
        });

        test('should link the MJD Pay logo to the landing page', async () => {
            await expect(chrome.logoLink).toBeVisible();
            await expect(chrome.logoLink).toHaveAttribute('href', /landing|majdpay|\//);
        });

        test('should display the EN and Arabic language buttons', async () => {
            await expect(chrome.enButton).toBeVisible();
            await expect(chrome.arabicButton).toBeVisible();
        });

        test('should display the theme toggle button', async () => {
            await expect(chrome.themeToggle).toBeVisible();
        });

        test('should have the correct page title', async ({ page }) => {
            await expect(page).toHaveTitle('EMI - Business');
        });

        test('should switch the document to Arabic and right-to-left', async ({ page }) => {
            await chrome.arabicButton.click();
            await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
            await expect(page.locator('html')).toHaveAttribute('lang', /ar/i);
        });

        test('should switch back to English and left-to-right', async ({ page }) => {
            await chrome.arabicButton.click();
            await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
            await chrome.enButton.click();
            await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
        });

        test('should change the theme class when the theme toggle is clicked', async ({ page }) => {
            const before = await page.locator('body').getAttribute('class');
            await chrome.themeToggle.click();
            await expect.poll(() => page.locator('body').getAttribute('class')).not.toBe(before);
        });

        test('should load without console errors or failed asset requests', async ({ page }) => {
            const consoleErrors: string[] = [];
            const failedAssets: string[] = [];
            page.on('console', m => { if (m.type() === 'error' && !/favicon|firebase|analytics/i.test(m.text())) consoleErrors.push(m.text()); });
            page.on('response', r => { if (r.status() >= 400 && /\.(js|css|woff2?|png|svg|jpg)(\?|$)/i.test(r.url())) failedAssets.push(`${r.status()} ${r.url()}`); });
            await step.open(page);
            expect(failedAssets, failedAssets.join('\n')).toHaveLength(0);
            expect(consoleErrors, consoleErrors.join('\n')).toHaveLength(0);
        });

        for (const vp of [{ label: 'phone 375px', width: 375, height: 800 }, { label: 'tablet 768px', width: 768, height: 1024 }]) {
            test(`should not scroll horizontally on a ${vp.label} viewport`, async ({ page }) => {
                await page.setViewportSize({ width: vp.width, height: vp.height });
                await step.open(page);
                const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
                expect(overflow, `Page is ${overflow}px wider than the viewport`).toBeLessThanOrEqual(1);
            });
        }
    });
}
