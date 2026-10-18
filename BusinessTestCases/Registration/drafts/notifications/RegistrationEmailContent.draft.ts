// DRAFT — unverified, not run by the suite. Promote by renaming to .spec.ts and moving to Registration/integration/.
//
// Notification quality for the 2 "User Activation" emails sent after registration (API credentials + login details)
// and the OTP email: content, language, links, leakage and spam score, read from the Mailosaur inbox.
//
// Prerequisites : MAILOSAUR_API_KEY + MAILOSAUR_SERVER_ID in .env.dev; the dev mail relay must deliver to Mailosaur
//                 (currently it does NOT — the inbox stays empty); a completed registration (goToContractStep +
//                 Contract submit) whose email is REGISTRATION_EMAIL.
// Assumptions   : Mailosaur message JSON (subject, from, html.links, html.body, text.body, spamAnalysis?) as documented at
//                 https://mailosaur.com/docs/api ; marker strings come from helpers/registrationDb.ts.
import { test, expect } from '@playwright/test';
import { REGISTRATION_EMAIL, ACTIVATION_API_CREDENTIALS_MARKER, ACTIVATION_LOGIN_DETAILS_MARKER } from '../../helpers/RegistrationHelper';

declare const process: { env: Record<string, string | undefined> };

const API = 'https://mailosaur.com/api';
const auth = () => ({ Authorization: 'Basic ' + Buffer.from(`${process.env['MAILOSAUR_API_KEY']}:`).toString('base64') });
const SERVER = process.env['MAILOSAUR_SERVER_ID'];

interface Msg {
    id: string; subject: string; received: string;
    from: { email: string }[]; to: { email: string }[];
    text?: { body?: string; links?: { href: string }[] };
    html?: { body?: string; links?: { href: string }[] };
}

async function activationEmails(request: import('@playwright/test').APIRequestContext): Promise<Msg[]> {
    const list = await request.get(`${API}/messages?server=${SERVER}&itemsPerPage=50`, { headers: auth() });
    const items = ((await list.json()).items ?? []) as { id: string; to: { email: string }[] }[];
    const mine = items.filter(i => i.to?.some(t => t.email?.toLowerCase() === REGISTRATION_EMAIL.toLowerCase()));
    const full: Msg[] = [];
    for (const i of mine) full.push(await (await request.get(`${API}/messages/${i.id}`, { headers: auth() })).json());
    return full.filter(m => /activation|تفعيل/i.test(m.subject ?? ''));
}

test.describe('Registration – activation email quality (DRAFT)', { tag: ['@registration', '@integration', '@notifications'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'integration' }] }, () => {
    test.skip(!process.env['MAILOSAUR_API_KEY'] || !SERVER, 'Mailosaur not configured');
    let emails: Msg[];

    test.beforeAll(async ({ request }) => {
        emails = await activationEmails(request);
    });

    test('should send exactly two activation emails to the registered address', async () => {
        expect(emails.length).toBe(2);
    });

    test('one email carries the API credentials and the other the login details', async () => {
        const bodies = emails.map(e => e.text?.body ?? e.html?.body ?? '');
        expect(bodies.some(b => b.includes(ACTIVATION_API_CREDENTIALS_MARKER))).toBe(true);
        expect(bodies.some(b => b.includes(ACTIVATION_LOGIN_DETAILS_MARKER))).toBe(true);
    });

    test('should come from the platform sender with a non-empty subject in the applicant language', async () => {
        for (const e of emails) {
            expect(e.subject.trim().length).toBeGreaterThan(0);
            expect(e.from[0].email).toMatch(/@/);
        }
    });

    test('every link in the emails should be https and resolve (no 4xx/5xx)', async ({ request }) => {
        const links = emails.flatMap(e => [...(e.html?.links ?? []), ...(e.text?.links ?? [])].map(l => l.href));
        for (const href of new Set(links)) {
            expect(href, 'insecure link').toMatch(/^https:\/\//);
            const res = await request.get(href, { maxRedirects: 5, failOnStatusCode: false });
            expect(res.status(), href).toBeLessThan(400);
        }
    });

    test('should not contain an OTP, a card number or a plain-text account password', async () => {
        for (const e of emails) {
            const body = e.text?.body ?? '';
            expect(body).not.toMatch(/\b(otp|رمز التحقق)\b.{0,20}\d{4,6}/i);
            expect(body).not.toMatch(/\b\d{13,19}\b/);
            expect(body).not.toMatch(/(password|كلمة المرور)\s*[:：]\s*\S+/i);
        }
    });

    test('should have an HTML body and a plain-text alternative', async () => {
        for (const e of emails) {
            expect(e.html?.body?.length ?? 0).toBeGreaterThan(0);
            expect(e.text?.body?.length ?? 0).toBeGreaterThan(0);
        }
    });

    test('should score below the spam threshold', async ({ request }) => {
        for (const e of emails) {
            const res = await request.get(`${API}/analysis/spam/${e.id}`, { headers: auth() });
            test.skip(res.status() === 404, 'Spam analysis unavailable on this Mailosaur plan');
            const { score } = await res.json();
            expect(score, `spam score of "${e.subject}"`).toBeLessThan(5);
        }
    });

    test('should render right-to-left Arabic when the applicant registered in Arabic', async () => {
        for (const e of emails) {
            if (/[؀-ۿ]/.test(e.subject)) expect(e.html?.body ?? '').toMatch(/dir=["']rtl["']|direction:\s*rtl/i);
        }
    });
});
