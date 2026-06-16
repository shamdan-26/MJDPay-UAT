import { Page } from '@playwright/test';

export const LOGIN_URL    = 'https://dev.majdpay.com/business/auth/login';
export const REGISTER_URL = 'https://dev.majdpay.com/business/auth/register';

export const VALID_EMAIL = 's.hamdan@dg-cash.com';

export function generateKSAMobile(): string {
    return '5' + Math.floor(Math.random() * 1e8).toString().padStart(8, '0');
}

export function generateCRN(): string {
    return '1' + Math.floor(Math.random() * 1e9).toString().padStart(9, '0');
}

export function generateIqama(): string {
    return '2' + Math.floor(Math.random() * 1e9).toString().padStart(9, '0');
}

export async function fillOTP(page: Page) {
    const inputs = page.getByRole('textbox', { name: 'One time password input' });
    const count  = await inputs.count();
    for (let i = 0; i < count; i++) {
        await inputs.nth(i).click();
        await inputs.nth(i).pressSequentially('0');
    }
}

export async function selectRandomOption(page: Page, dropdownLocator: any) {
    const tag = await dropdownLocator.evaluate((el: Element) => el.tagName.toLowerCase());
    if (tag === 'select') {
        const options    = await dropdownLocator.locator('option').all();
        const selectable = options.slice(1);
        const pick       = selectable[Math.floor(Math.random() * selectable.length)];
        await dropdownLocator.selectOption(await pick.getAttribute('value'));
    } else {
        await dropdownLocator.click();
        const items = page.locator('[role="option"]:visible, .dropdown-item:visible, .ng-option:visible');
        await items.first().waitFor({ state: 'visible', timeout: 5000 });
        const count = await items.count();
        await items.nth(Math.floor(Math.random() * count)).click();
    }
}
