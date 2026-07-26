import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

const IMAP_HOST     = process.env['IMAP_HOST'];
const IMAP_PORT     = Number(process.env['IMAP_PORT'] ?? 993);
const IMAP_USER     = process.env['IMAP_USER'];
const IMAP_PASSWORD = process.env['IMAP_PASSWORD'];

const SEARCH_WINDOW_MS = 10 * 60 * 1000;

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
    if (!IMAP_HOST || !IMAP_USER || !IMAP_PASSWORD) {
        throw new Error('IMAP_HOST, IMAP_USER, and IMAP_PASSWORD env vars must be set to fetch OTP by email');
    }

    const client = new ImapFlow({
        host:   IMAP_HOST,
        port:   IMAP_PORT,
        secure: true,
        auth:   { user: IMAP_USER, pass: IMAP_PASSWORD },
        logger: false,
    });
    await client.connect();

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

                    const match = body.match(/Use this OTP\s*[:\s]+(\d+)/i) ?? body.match(/\b(\d{6,8})\b/);
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
