

const URL = 'https://uat.majdpay.com/business/auth/login';
const VALID_COMPANY  = 'L3999';
const VALID_MOBILE   = '500318143';
const VALID_PASSWORD = 'Aa#1234567';

async function loginSession(context: any, page: any, URL: string){
    await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
     await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
            await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
            await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
            await page.getByRole('button', { name: 'Log In' }).click();

}

export default loginSession;