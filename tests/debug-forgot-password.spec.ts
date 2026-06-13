import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const FORGOT_URL = 'https://uat.majdpay.com/business/auth/forgot-password';
const VALID_COMPANY = 'L3999';
const VALID_MOBILE  = '500318143';
const OUTPUT_DIR = path.join(__dirname, '..', 'bug-report-assets');

test('capture screenshot and API traffic for Forgot Password Step 2', async ({ page, context }) => {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const apiRequests: Array<{
        url: string; method: string; requestHeaders: Record<string, string>;
        requestBody: string | null; responseStatus: number | null;
        responseHeaders: Record<string, string>; responseBody: string;
    }> = [];

    // Intercept all API requests
    page.on('request', request => {
        const url = request.url();
        if (url.includes('majdpay.com') || url.includes('/api/') || url.includes('/auth/')) {
            apiRequests.push({
                url,
                method: request.method(),
                requestHeaders: request.headers(),
                requestBody: request.postData(),
                responseStatus: null,
                responseHeaders: {},
                responseBody: '',
            });
        }
    });

    page.on('response', async response => {
        const url = response.url();
        if (url.includes('majdpay.com') || url.includes('/api/') || url.includes('/auth/')) {
            const entry = apiRequests.find(r => r.url === url && r.responseStatus === null);
            if (entry) {
                entry.responseStatus = response.status();
                entry.responseHeaders = response.headers();
                try { entry.responseBody = await response.text(); } catch { entry.responseBody = '[could not read body]'; }
            }
        }
    });

    await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
    await page.goto(FORGOT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
    await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);

    // Screenshot before clicking Next
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01-step1-filled.png'), fullPage: true });

    await page.getByRole('button', { name: 'Next' }).click();

    // Wait a moment for any API response / transition
    await page.waitForTimeout(5000);

    // Screenshot after clicking Next (shows actual result)
    await page.screenshot({ path: path.join(OUTPUT_DIR, '02-after-next-click.png'), fullPage: true });

    // Save API traffic log
    const apiLog = apiRequests.map(r => {
        const headers = Object.entries(r.requestHeaders)
            .map(([k, v]) => `-H '${k}: ${v}'`)
            .join(' \\\n     ');
        const body = r.requestBody ? `-d '${r.requestBody}'` : '';
        const curl = `curl -X ${r.method} '${r.url}' \\\n     ${headers}${body ? ' \\\n     ' + body : ''}`;
        return {
            curl,
            response_status: r.responseStatus,
            response_headers: r.responseHeaders,
            response_body: (() => { try { return JSON.parse(r.responseBody); } catch { return r.responseBody; } })(),
        };
    });

    fs.writeFileSync(path.join(OUTPUT_DIR, 'api-traffic.json'), JSON.stringify(apiLog, null, 2));

    // Find the "Next" button API call specifically
    const nextApiCall = apiRequests.find(r => r.method === 'POST');
    if (nextApiCall) {
        const curlCmd = buildCurl(nextApiCall);
        fs.writeFileSync(path.join(OUTPUT_DIR, 'next-button-curl.txt'), curlCmd);
        const responseStr = `HTTP ${nextApiCall.responseStatus}\n${JSON.stringify(nextApiCall.responseHeaders, null, 2)}\n\n${nextApiCall.responseBody}`;
        fs.writeFileSync(path.join(OUTPUT_DIR, 'next-button-response.txt'), responseStr);
    }

    console.log('API calls captured:', apiRequests.length);
    console.log('Assets saved to:', OUTPUT_DIR);
});

function buildCurl(r: { url: string; method: string; requestHeaders: Record<string, string>; requestBody: string | null }) {
    const headers = Object.entries(r.requestHeaders)
        .filter(([k]) => !['content-length'].includes(k.toLowerCase()))
        .map(([k, v]) => `  -H '${k}: ${v}'`)
        .join(' \\\n');
    const body = r.requestBody ? `  -d '${r.requestBody}'` : '';
    return `curl -X ${r.method} '${r.url}' \\\n${headers}${body ? ' \\\n' + body : ''}`;
}
