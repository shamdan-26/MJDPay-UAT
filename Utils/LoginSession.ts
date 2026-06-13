import { chromium } from '@playwright/test';

const URL = 'https://uat.majdpay.com/business/auth/login';
const VALID_COMPANY  = 'L3999';
const VALID_MOBILE   = '500318143';
const VALID_PASSWORD = 'Aa#1234567';

async function loginSession(){
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    const requestContext = await browser.newContext();
    await requestContext.request.post(
        'https://gateway-uat.majdpay.com/auth/signin', 
        {
            data: {
                password: VALID_PASSWORD,
                tenantNumber: VALID_COMPANY,
                username: `+966${VALID_MOBILE}`
            }
        }
    );

    await requestContext.storageState({ path: 'session.json' });
}

export default loginSession;