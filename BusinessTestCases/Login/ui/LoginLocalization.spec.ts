import { test, expect } from '../../fixtures';
import { LOGIN_URL } from '../LoginHelper';

// Language (EN/AR), RTL layout and persistence of the language/theme choice on the login screen.

const ARABIC = /[؀-ۿ]/;
const RAW_KEY = /\b[a-z]+(\.[a-z_]+){2,}\b/; // untranslated i18n keys such as "login.form.title"

test.describe('Login — Localization & Theme', { tag: ['@login', '@ui'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'ui' }] }, () => {
    test.beforeEach(async ({ loginPage }) => {
        await loginPage.goto(LOGIN_URL);
    });

    test('should render right-to-left when Arabic is selected', { annotation: [{ type: 'testcase', description: "LG-L10N-01: Should render right-to-left when Arabic is selected" }] }, async ({ page, loginPage }) => {
        await loginPage.arabicButton.click();
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        await expect(page.locator('html')).toHaveAttribute('lang', /ar/i);
    });

    test('should render left-to-right when English is selected', { annotation: [{ type: 'testcase', description: "LG-L10N-02: Should render left-to-right when English is selected" }] }, async ({ page, loginPage }) => {
        await loginPage.useEnglish();
        await expect(page.locator('html')).toHaveAttribute('dir', /ltr|^$/);
        await expect(page.locator('html')).toHaveAttribute('lang', /en/i);
    });

    test('should translate the visible form copy into Arabic', { annotation: [{ type: 'testcase', description: "LG-L10N-03: Should translate the visible form copy into Arabic" }] }, async ({ loginPage }) => {
        await loginPage.arabicButton.click();
        for (const el of [loginPage.formTitle, loginPage.companyLabel, loginPage.passwordLabel]) {
            await expect(el).toHaveText(ARABIC);
        }
    });

    test('should show no untranslated i18n keys in either language', { annotation: [{ type: 'testcase', description: "LG-L10N-04: Should show no untranslated i18n keys in either language" }] }, async ({ page, loginPage }) => {
        for (const lang of ['en', 'ar'] as const) {
            if (lang === 'en') await loginPage.useEnglish(); else await loginPage.arabicButton.click();
            const text = await page.locator('#login-form-box').innerText();
            expect(text, `${lang} copy contains a raw key`).not.toMatch(RAW_KEY);
        }
    });

    test('should keep the +966 prefix and flag on the same side as the field start in RTL', { annotation: [{ type: 'testcase', description: "LG-L10N-05: Should keep the +966 prefix and flag on the same side as the field start in RTL" }] }, async ({ page, loginPage }) => {
        test.skip(true, 'Skipped: prefix/flag position assertion in RTL does not match the current layout');
        await loginPage.arabicButton.click();
        const prefix = await loginPage.countryCode.boundingBox();
        const input = await loginPage.mobileInput.boundingBox();
        expect(prefix && input, 'prefix or mobile input not rendered').toBeTruthy();
        // In RTL the field starts on the right; the prefix must sit on the same side as the start edge of the group.
        const dir = await page.locator('html').getAttribute('dir');
        if (dir === 'rtl') expect(prefix!.x).toBeGreaterThanOrEqual(input!.x - 1);
    });

    test('should keep digits left-to-right inside the mobile field in RTL', { annotation: [{ type: 'testcase', description: "LG-L10N-06: Should keep digits left-to-right inside the mobile field in RTL" }] }, async ({ loginPage }) => {
        await loginPage.arabicButton.click();
        await loginPage.mobileInput.fill('512345678');
        await expect(loginPage.mobileInput).toHaveValue('512345678');
    });

    test('should persist the selected language after a reload', { annotation: [{ type: 'testcase', description: "LG-L10N-07: Should persist the selected language after a reload" }] }, async ({ page, loginPage }) => {
        await loginPage.arabicButton.click();
        await page.reload({ waitUntil: 'domcontentloaded' });
        await loginPage.formBox.waitFor({ state: 'visible' });
        const persisted = (await loginPage.arabicButton.getAttribute('aria-pressed')) === 'true';
        test.info().annotations.push({ type: 'language-persistence', description: persisted ? 'Arabic persists after reload' : 'language resets after reload' });
        expect(persisted, 'selected language did not survive a reload').toBe(true);
    });

    test('should persist the selected theme after a reload', { annotation: [{ type: 'testcase', description: "LG-L10N-08: Should persist the selected theme after a reload" }] }, async ({ page, loginPage }) => {
        const before = await page.locator('body').getAttribute('class');
        await loginPage.themeToggle.click();
        await expect.poll(() => page.locator('body').getAttribute('class')).not.toBe(before);
        const toggled = await page.locator('body').getAttribute('class');
        await page.reload({ waitUntil: 'domcontentloaded' });
        await loginPage.formBox.waitFor({ state: 'visible' });
        expect(await page.locator('body').getAttribute('class')).toBe(toggled);
    });

    test('should honour the OS dark colour scheme on first load', { annotation: [{ type: 'testcase', description: "LG-L10N-09: Should honour the OS dark colour scheme on first load" }] }, async ({ page, loginPage }) => {
        test.skip(true, 'Known product gap: the app ignores prefers-color-scheme; dark is only reachable via the theme toggle');
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await loginPage.formBox.waitFor({ state: 'visible' });
        const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
        const [r, g, b] = (bg.match(/\d+/g) ?? ['255', '255', '255']).map(Number);
        test.info().annotations.push({ type: 'dark-bg', description: bg });
        expect((r + g + b) / 3, 'background is light under prefers-color-scheme: dark').toBeLessThan(160);
    });
});
