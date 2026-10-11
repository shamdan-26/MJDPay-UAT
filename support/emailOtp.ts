import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

const IMAP_HOST = process.env['IMAP_HOST'];
const IMAP_PORT = Number(process.env['IMAP_PORT'] ?? 993);
const IMAP_USER = process.env['IMAP_USER'];

const AZURE_TENANT_ID     = process.env['AZURE_TENANT_ID'];
const AZURE_CLIENT_ID     = process.env['AZURE_CLIENT_ID'];
const AZURE_CLIENT_SECRET = process.env['AZURE_CLIENT_SECRET'];

const SEARCH_WINDOW_MS = 10 * 60 * 1000;

let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * App-only OAuth2 access token for the shared mailbox via the Entra ID
 * client-credentials flow. Exchange Online has retired IMAP Basic Auth, so
 * this replaces the old IMAP_PASSWORD login — requires an Entra app
 * registration with the "IMAP.AccessAsApp" application permission (Office 365
 * Exchange Online API) and admin consent. Cached until shortly before expiry
 * so repeated fetchOtpFromEmail calls in one run don't re-request it.
 */
async function getAccessToken(): Promise<string> {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

    if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
        throw new Error('AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET env vars must be set to fetch OTP by email');
    }

    const response = await fetch(`https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({
            grant_type:    'client_credentials',
            client_id:     AZURE_CLIENT_ID,
            client_secret: AZURE_CLIENT_SECRET,
            scope:         'https://outlook.office365.com/.default',
        }),
    });

    if (!response.ok) {
        throw new Error(`Azure AD token request failed (${response.status}): ${await response.text()}`);
    }

    const { access_token, expires_in } = await response.json() as { access_token: string; expires_in: number };
    cachedToken = { value: access_token, expiresAt: Date.now() + expires_in * 1000 };
    return access_token;
}

const MAILOSAUR_API = 'https://mailosaur.com/api';

/**
 * Reads the OTP from a Mailosaur server (MAILOSAUR_API_KEY + MAILOSAUR_SERVER_ID).
 * Searches only mail received in the last minute (the OTP lives 30s, so older mail is always stale),
 * newest first, preferring a message whose body contains the mobile; Mailosaur's own extracted
 * `text.codes` is used first, then the same regexes as the IMAP path.
 */
async function fetchOtpFromMailosaur(mobile: string, maxAttempts: number, delayMs: number, messageFilter: RegExp): Promise<string> {
    const apiKey = process.env['MAILOSAUR_API_KEY']!;
    const server = process.env['MAILOSAUR_SERVER_ID'];
    if (!server) throw new Error('MAILOSAUR_SERVER_ID env var must be set alongside MAILOSAUR_API_KEY');
    const headers = { Authorization: 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64'), 'Content-Type': 'application/json' };
    const receivedAfter = new Date(Date.now() - 60_000).toISOString();
    const local = mobile.replace(/^\+?966/, '').replace(/^0/, '');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // The list endpoint (not /search, which requires criteria) — newest first, only mail from the last minute.
        const res = await fetch(`${MAILOSAUR_API}/messages?server=${server}&receivedAfter=${encodeURIComponent(receivedAfter)}&itemsPerPage=25`, { headers });
        if (!res.ok) throw new Error(`Mailosaur list failed (${res.status}): ${await res.text()}`);
        const { items = [] } = await res.json() as { items?: { id: string }[] };

        for (const item of items) {
            const msgRes = await fetch(`${MAILOSAUR_API}/messages/${item.id}`, { headers });
            if (!msgRes.ok) continue;
            const msg = await msgRes.json() as { text?: { body?: string; codes?: { value: string }[] }; html?: { body?: string } };
            const body = msg.text?.body ?? msg.html?.body ?? '';
            if (!body.includes(local) || !messageFilter.test(body)) continue;
            const code = msg.text?.codes?.[0]?.value
                ?? body.match(/Use this OTP\s*[:\s]+(\d+)/i)?.[1]
                ?? body.match(/\b(\d{4,8})\b/)?.[1];
            if (code) return code;
        }
        if (attempt < maxAttempts) await new Promise(r => setTimeout(r, delayMs));
    }
    throw new Error(`No OTP email found in Mailosaur for mobile ${mobile} after ${maxAttempts} attempts`);
}

/**
 * Fetches a real OTP from the shared UAT/preprod test mailbox over IMAP —
 * replaces the old MongoDB notification-log lookup (`getOtpFromDb` in
 * Registration/RegistrationHelper.ts and Login/LoginHelper.ts), which required
 * a MONGO_URI that was never actually provisioned for this project. Matches
 * the same way the Mongo lookup did: newest message first, body must contain
 * both the target mobile and `messageFilter`, OTP digits pulled out via regex.
 */
export async function fetchOtpFromEmail(
    mobile: string,
    maxAttempts = 10,
    delayMs = 2000,
    messageFilter: RegExp = /Use this OTP/i
): Promise<string> {
    // Mailosaur (HTTP API, no IMAP/2FA) takes over whenever its API key is configured.
    if (process.env['MAILOSAUR_API_KEY']) {
        return fetchOtpFromMailosaur(mobile, maxAttempts, delayMs, messageFilter);
    }
    if (!IMAP_HOST || !IMAP_USER) {
        throw new Error('IMAP_HOST and IMAP_USER env vars must be set to fetch OTP by email');
    }

    // Microsoft 365 (OAuth2) when the Entra app is configured; otherwise plain IMAP with an app password
    // (e.g. Gmail: imap.gmail.com, 2-Step Verification + App password).
    const useOAuth = !!(AZURE_TENANT_ID && AZURE_CLIENT_ID && AZURE_CLIENT_SECRET);
    const auth = useOAuth
        ? { user: IMAP_USER, accessToken: await getAccessToken() }
        : { user: IMAP_USER, pass: process.env['IMAP_PASSWORD'] ?? '' };

    const client = new ImapFlow({
        host:   IMAP_HOST,
        port:   IMAP_PORT,
        secure: true,
        auth,
        logger: false,
    });
    try {
        await client.connect();
    } catch (err) {
        throw new Error(
            `IMAP OAuth2 login to ${IMAP_HOST} as ${IMAP_USER} failed — check the Entra app has IMAP.AccessAsApp ` +
            `permission with admin consent, and that any Exchange ApplicationAccessPolicy scoping the app includes this mailbox. ` +
            `Original error: ${(err as Error).message}`
        );
    }

    try {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const lock = await client.getMailboxLock('INBOX');
            try {
                const since = new Date(Date.now() - SEARCH_WINDOW_MS);
                const uids  = await client.search({ since }, { uid: true });

                for (const uid of [...uids].reverse()) {
                    const message = await client.fetchOne(uid, { source: true }, { uid: true });
                    if (!message?.source) continue;

                    const parsed = await simpleParser(message.source);
                    const body   = parsed.text ?? parsed.html ?? '';
                    if (!body.includes(mobile) || !messageFilter.test(body)) continue;

                    const match = body.match(/Use this OTP\s*[:\s]+(\d+)/i) ?? body.match(/\b(\d{4,8})\b/);
                    if (match) return match[1];
                }
            } finally {
                lock.release();
            }
            if (attempt < maxAttempts) await new Promise(r => setTimeout(r, delayMs));
        }
        throw new Error(`No OTP email found for mobile ${mobile} after ${maxAttempts} attempts`);
    } finally {
        await client.logout().catch(() => {});
    }
}
