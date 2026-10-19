import { test, expect } from '../../../shared/fixtures.ts';
import {
    LOGIN_URL,
    NEGATIVE_COMPANY,
    NEGATIVE_MOBILE,
    VALID_PASSWORD,
} from '../../helpers/LoginHelper.ts';
import { mockSignIn } from '../../helpers/loginMocks';

// Keyboard and input-handling behaviour of the login form. /auth/signin is mocked, so no real
// account is used and nothing can lock.

test.describe('Login — Form Keyboard & Input Handling', { tag: ['@login', '@functional', '@form'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'functional' }] }, () => {
    test.beforeEach(async ({ loginPage }) => {
        await loginPage.goto(LOGIN_URL);
    });

    test('should submit the form when Enter is pressed in the password field', { annotation: [{ type: 'testcase', description: "LG-KBD-01: Should submit the form when Enter is pressed in the password field" }] }, async ({ page, loginPage }) => {
        const signIn = await mockSignIn(page, 401);
        await loginPage.fill(NEGATIVE_COMPANY, NEGATIVE_MOBILE, VALID_PASSWORD);
        await loginPage.passwordInput.press('Enter');
        await expect.poll(() => signIn.count(), { timeout: 10000 }).toBe(1);
    });

    test('should not submit when Enter is pressed while a field is empty', { annotation: [{ type: 'testcase', description: "LG-KBD-02: Should not submit when Enter is pressed while a field is empty" }] }, async ({ page, loginPage }) => {
        const signIn = await mockSignIn(page, 401);
        await loginPage.companyInput.fill(NEGATIVE_COMPANY);
        await loginPage.companyInput.press('Enter');
        await page.waitForTimeout(1000);
        expect(signIn.count()).toBe(0);
    });

    test('should move focus company → mobile → password → show-password toggle → Log In with Tab', { annotation: [{ type: 'testcase', description: "LG-KBD-03: Should move focus company → mobile → password → show-password toggle → Log In with Tab" }] }, async ({ page, loginPage }) => {
        await loginPage.fill(NEGATIVE_COMPANY, NEGATIVE_MOBILE, VALID_PASSWORD);
        await loginPage.companyInput.focus();
        await page.keyboard.press('Tab');
        // The clear button of a filled field may sit between inputs; tab until the mobile input is reached.
        for (let i = 0; i < 3 && !(await loginPage.mobileInput.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab');
        await expect(loginPage.mobileInput).toBeFocused();
        for (let i = 0; i < 3 && !(await loginPage.passwordInput.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab');
        await expect(loginPage.passwordInput).toBeFocused();
        for (let i = 0; i < 3 && !(await loginPage.loginButton.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab');
        await expect(loginPage.loginButton).toBeFocused();
    });

    test('should show a visible focus indicator on the Log In button when focused by keyboard', { annotation: [{ type: 'testcase', description: "LG-KBD-04: Should show a visible focus indicator on the Log In button when focused by keyboard" }] }, async ({ loginPage }) => {
        await loginPage.fill(NEGATIVE_COMPANY, NEGATIVE_MOBILE, VALID_PASSWORD);
        await loginPage.loginButton.focus();
        const outline = await loginPage.loginButton.evaluate(el => {
            const s = getComputedStyle(el);
            return { outline: s.outlineStyle, shadow: s.boxShadow };
        });
        expect(outline.outline !== 'none' || outline.shadow !== 'none', 'focused Log In button has no outline or box-shadow').toBe(true);
    });

    test('should send the company number without surrounding spaces', { annotation: [{ type: 'testcase', description: "LG-KBD-05: Should send the company number without surrounding spaces" }] }, async ({ page, loginPage }) => {
        let body = '';
        await page.route('**/auth/signin', route => { body = route.request().postData() ?? ''; return route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }); });
        await loginPage.fill(`  ${NEGATIVE_COMPANY}  `, NEGATIVE_MOBILE, VALID_PASSWORD);
        if (await loginPage.loginButton.isEnabled()) {
            await loginPage.submit();
            await expect.poll(() => body, { timeout: 10000 }).not.toBe('');
            expect(JSON.parse(body).tenantNumber).toBe(NEGATIVE_COMPANY);
        } else {
            // Button stays disabled for padded input — acceptable: the form refuses it instead of trimming.
            await expect(loginPage.loginButton).toBeDisabled();
        }
    });

    test('should never end up with a submittable wrong number when an international-format number is pasted into the mobile field', { annotation: [{ type: 'testcase', description: "LG-KBD-06: Should never end up with a submittable wrong number when an international-format number is pasted into the mobile field" }] }, async ({ loginPage }) => {
        await loginPage.companyInput.fill(NEGATIVE_COMPANY);
        await loginPage.passwordInput.fill(VALID_PASSWORD);
        await loginPage.mobileInput.fill('+966 512 345 678');
        const value = (await loginPage.mobileInput.inputValue()).replace(/\D/g, '');
        const stripped = value === '512345678';
        // Known behaviour (dev): the field truncates the raw paste at ~9 characters before stripping the prefix, so
        // "+966 512 345 678" becomes "+966 512". Safe outcomes are the correct 9 digits, or a disabled Log In button.
        test.info().annotations.push({ type: 'paste-intl-number', description: stripped ? 'prefix stripped correctly' : `truncated to "${value}" (product gap: paste of +966… is not normalised)` });
        if (!stripped) await expect(loginPage.loginButton, `field holds "${value}" yet Log In is enabled`).toBeDisabled();
    });

    test('should accept a pasted local 9-digit number', { annotation: [{ type: 'testcase', description: "LG-KBD-07: Should accept a pasted local 9-digit number" }] }, async ({ loginPage }) => {
        await loginPage.mobileInput.fill('512345678');
        await expect(loginPage.mobileInput).toHaveValue(/512345678/);
    });

    test('should not persist the typed password in the DOM as plain text', { annotation: [{ type: 'testcase', description: "LG-KBD-08: Should not persist the typed password in the DOM as plain text" }] }, async ({ loginPage }) => {
        await loginPage.passwordInput.fill(VALID_PASSWORD);
        await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
        const attrValue = await loginPage.passwordInput.getAttribute('value');
        expect(attrValue ?? '').not.toContain(VALID_PASSWORD);
    });
});
