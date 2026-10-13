import { test, expect } from '@playwright/test';
import { WRONG_PASSWORD } from '../../LoginHelper';
import { API_BASE, commonHeaders } from '../../helpers/loginApi';

// Locale handling of the auth endpoints: the `locale` / `Accept-Language` headers select en_uk or ar_sa and the error
// CODE must stay stable while the message is localised. Uses a non-existent account so nothing can lock.

const UNKNOWN = { username: '+966500000001', tenantNumber: 'NOSUCHTENANT', password: WRONG_PASSWORD };
const withLocale = (locale: string) => ({ ...commonHeaders(), locale, 'Accept-Language': locale });
const ARABIC = /[؀-ۿ]/;

async function failedSignIn(request: import('@playwright/test').APIRequestContext, locale: string) {
    const res = await request.post(`${API_BASE}/auth/signin`, { data: UNKNOWN, headers: withLocale(locale) });
    return { status: res.status(), body: await res.json().catch(() => ({})) as Record<string, unknown>, text: await res.text() };
}

test.describe('Login – API: localisation of auth errors', { tag: ['@login', '@api'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'api' }] }, () => {
    test('should return the English message for locale en_uk', async ({ request }) => {
        const r = await failedSignIn(request, 'en_uk');
        expect(r.status).toBeGreaterThanOrEqual(400);
        expect(r.text).not.toMatch(ARABIC);
    });

    test('should return an Arabic message for locale ar_sa', async ({ request }) => {
        const r = await failedSignIn(request, 'ar_sa');
        expect(r.status).toBeGreaterThanOrEqual(400);
        expect(r.text).toMatch(ARABIC);
    });

    test('should return the same HTTP status in both languages', async ({ request }) => {
        const en = await failedSignIn(request, 'en_uk');
        const ar = await failedSignIn(request, 'ar_sa');
        expect(ar.status).toBe(en.status);
    });

    test('should keep the error code identical across languages', async ({ request }) => {
        const en = await failedSignIn(request, 'en_uk');
        const ar = await failedSignIn(request, 'ar_sa');
        expect(ar.body['code'] ?? ar.body['errorCode']).toEqual(en.body['code'] ?? en.body['errorCode']);
    });

    test('should fall back to a valid response for an unsupported locale', async ({ request }) => {
        const r = await failedSignIn(request, 'xx_yy');
        expect(r.status).toBeGreaterThanOrEqual(400);
        expect(r.status).toBeLessThan(500);
    });

    test('should localise the missing-field validation error too', async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/signin`, { data: {}, headers: withLocale('ar_sa') });
        expect(res.status()).toBe(400);
        expect(await res.text()).toMatch(ARABIC);
    });
});
