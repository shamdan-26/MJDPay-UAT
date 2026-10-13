import { test, expect } from '../../fixtures';
import { LOGIN_URL } from '../LoginHelper';

// Layout of the login screen across viewport sizes. No account or backend is used.

const VIEWPORTS = [
    { name: 'small phone', width: 320, height: 568 },
    { name: 'phone', width: 375, height: 812 },
    { name: 'tablet portrait', width: 768, height: 1024 },
    { name: 'tablet landscape', width: 1024, height: 768 },
    { name: 'desktop', width: 1440, height: 900 },
];

test.describe('Login — Responsive layout', { tag: ['@login', '@ui'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'ui' }] }, () => {
    for (const vp of VIEWPORTS) {
        test.describe(`${vp.name} (${vp.width}×${vp.height})`, () => {
            test.beforeEach(async ({ page, loginPage }) => {
                await page.setViewportSize({ width: vp.width, height: vp.height });
                await loginPage.goto(LOGIN_URL);
            });

            test('should not scroll horizontally', async ({ page }) => {
                const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
                expect(overflow).toBeLessThanOrEqual(1);
            });

            test('should keep all form fields and the Log In button inside the viewport width', async ({ loginPage }) => {
                for (const el of [loginPage.companyInput, loginPage.mobileInput, loginPage.passwordInput, loginPage.loginButton]) {
                    await el.scrollIntoViewIfNeeded();
                    const box = await el.boundingBox();
                    expect(box, 'element not rendered').not.toBeNull();
                    expect(box!.x).toBeGreaterThanOrEqual(0);
                    expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1);
                }
            });

            test('should offer touch targets of at least 32px height for the primary controls', async ({ loginPage }) => {
                for (const el of [loginPage.companyInput, loginPage.mobileInput, loginPage.passwordInput, loginPage.loginButton]) {
                    const box = await el.boundingBox();
                    expect(box!.height).toBeGreaterThanOrEqual(32);
                }
            });

            test('should keep the Forgot Password and Sign Up links reachable', async ({ loginPage }) => {
                await loginPage.forgotPasswordLink.scrollIntoViewIfNeeded();
                await expect(loginPage.forgotPasswordLink).toBeVisible();
                await loginPage.signUpLink.scrollIntoViewIfNeeded();
                await expect(loginPage.signUpLink).toBeVisible();
            });
        });
    }

    test('should keep the layout intact after rotating from portrait to landscape', async ({ page, loginPage }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await loginPage.goto(LOGIN_URL);
        await page.setViewportSize({ width: 812, height: 375 });
        await expect(loginPage.loginButton).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
    });
});
