import { chromium } from '@playwright/test';

const VALID_COMPANY  = 'L3999';
const VALID_MOBILE   = '500318143';
const VALID_PASSWORD = 'Aa#1234567';

async function globalSetup() {
    const browser = await chromium.launch();
    const requestContext = await browser.newContext();
    await requestContext.request.post(
        'https://gateway-dev.majdpay.com/auth/signin',
        {
            data: {
                password: VALID_PASSWORD,
                tenantNumber: VALID_COMPANY,
                username: `+966${VALID_MOBILE}`,
            },
        }
    );
    await requestContext.storageState({ path: 'session.json' });
    await browser.close();
}

export default globalSetup;
