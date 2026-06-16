import { Page, expect } from '@playwright/test';

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

export async function goToInfoStep(page: Page): Promise<void> {
    await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('textbox', { name: 'Mobile number' }).fill(generateKSAMobile());
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'next' }).click();
    await page.waitForTimeout(5000);
    await page.getByRole('heading', { name: 'Enter OTP' }).waitFor({ state: 'visible', timeout: 20000 });
    await page.getByRole('textbox', { name: 'One time password input' }).first()
        .waitFor({ state: 'visible', timeout: 10000 });
    await fillOTP(page);
    const verifyBtn = page.getByRole('button', { name: 'Verify' });
    await expect(verifyBtn).toBeEnabled({ timeout: 10000 });
    await verifyBtn.click();
    await page.waitForTimeout(3000);
    await page.getByText('Tell us about your business').waitFor({ state: 'visible', timeout: 20000 });
}

export async function goToFinancialStep(page: Page): Promise<void> {
    await goToInfoStep(page);
    const crn   = generateCRN();
    const iqama = generateIqama();
    const options = page.getByRole('radiogroup', { name: 'Profile Type' }).getByRole('radio');
    await options.first().click();
    await page.getByRole('textbox', { name: 'unified number' }).fill(crn);
    await page.getByRole('textbox', { name: 'National ID/Iqama' }).fill(iqama);
    await page.getByRole('textbox', { name: /Email/i }).fill(VALID_EMAIL);
    await page.getByRole('button', { name: 'next' }).click();
    await page.waitForTimeout(2000);
    await page.getByRole('textbox', { name: /monthly expected number/i })
        .waitFor({ state: 'visible', timeout: 15000 });
}

export async function goToVerificationStep(page: Page): Promise<void> {
    await goToFinancialStep(page);
    await page.getByRole('textbox', { name: /monthly expected number/i }).fill('1500');
    await page.getByRole('textbox', { name: /monthly expected sum/i }).fill('50000');
    await page.getByRole('textbox', { name: /monthly withdrawal/i }).fill('10000');
    await page.getByRole('textbox', { name: /monthly deposit/i }).fill('20000');
    await selectRandomOption(page, page.getByRole('combobox', { name: /banks/i }));
    await selectRandomOption(page, page.getByRole('combobox', { name: /industries/i }));
    await selectRandomOption(page, page.getByRole('combobox', { name: /annual income/i }));
    await page.getByRole('button', { name: 'next' }).click();
    await page.waitForTimeout(2000);
    await page.getByRole('textbox', { name: /iban/i })
        .waitFor({ state: 'visible', timeout: 15000 });
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
