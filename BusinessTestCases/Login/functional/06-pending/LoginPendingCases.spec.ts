import { test } from '../../../shared/fixtures.ts';

// Login cases that are specified (see docs/manual-test-cases/Login.md, sections L–P) but cannot be automated yet.
// Each one is a skipped placeholder carrying WHY it is blocked and WHAT unblocks it, so the gap shows up in every
// report instead of living only in a document. When a blocker clears, move the case into the owning spec.

type Pending = { id: string; title: string; rule: string; blockedBy: string; unblock: string };

const PENDING: Pending[] = [
    { id: 'LG-154', title: 'A password used in the last 3 cannot be set again at the first-login reset', rule: 'EMI-2191', blockedBy: 'each valid change consumes a first-login account', unblock: 'an account that can be put back in first-login state (admin staff reset) or a spare account per run' },
    { id: 'LG-155', title: 'An expired password forces a change at sign-in', rule: 'EMI-2191', blockedBy: 'EXPIRED_PW_* account is not provisioned', unblock: 'an account whose password has passed its expiry' },
    { id: 'LG-160', title: 'A second sign-in on another device ends the first session (single active session)', rule: 'EMI-4625 / EMI-2042', blockedBy: 'needs an account no other spec signs in with (LG-SESS-08 only records the outcome)', unblock: 'a dedicated session account; a consumed first-login account can serve once LG-FIRST-20 has run' },
    { id: 'LG-161', title: 'An idle session is ended after the inactivity timeout', rule: 'none in the business rules', blockedBy: 'the timeout value is not defined', unblock: 'a business decision on the idle timeout' },
    { id: 'LG-162', title: 'An expired access token returns 401 and the refresh token renews it; an expired refresh token forces sign-in', rule: 'EMI-2042', blockedBy: 'needs an expired access token and an expired refresh token; token lifetimes are not configurable from the suite', unblock: 'a short-lived-token setting on dev, or a signing key to mint expired tokens (signIn() works now, so only the expiry is missing)' },
    { id: 'LG-163', title: 'Three temporary locks deactivate the account', rule: 'EMI-4625', blockedBy: 'destructive, and the LOCKOUT_* account is not provisioned', unblock: 'a disposable account and the unlock procedure' },
    { id: 'LG-164', title: 'A temporary lock lifts by itself after the lock duration', rule: 'EMI-4625', blockedBy: 'lock duration is unspecified', unblock: 'the lock duration from the business' },
    { id: 'LG-165', title: 'After an admin unlocks the account, the user can sign in again', rule: 'EMI-2121', blockedBy: 'LOCKED_* account is not provisioned (LG-INT-* covers deactivate/reactivate only)', unblock: 'a locked account plus the Admin Portal unlock step' },
    { id: 'LG-166', title: 'Every sign-in, OTP and sign-out writes an audit record (user, device, location, IP, time)', rule: 'EMI-4625 (10-year retention)', blockedBy: 'audit table and columns are unknown', unblock: 'the audit table name and read access' },
    { id: 'LG-167', title: 'A first sign-in on a new device sends the SMS acknowledgement', rule: 'EMI-4625', blockedBy: 'SMS is not observable on dev', unblock: 'an SMS capture or a notification table to read' },
    { id: 'LG-168', title: 'A credential change sends the SMS alert', rule: 'EMI-645', blockedBy: 'SMS is not observable on dev', unblock: 'an SMS capture or a notification table to read' },
    { id: 'LG-169', title: 'After the first successful sign-in on the app the device is trusted (biometric can skip OTP)', rule: 'EMI-4625 / EMI-243', blockedBy: 'app-only; the web portal has no trusted-device mode', unblock: 'a mobile-app test environment' },
    { id: 'LG-170', title: 'A risk-engine flag (VPN, location change, fingerprint change) forces OTP', rule: 'EMI-4625', blockedBy: 'the risk engine cannot be driven from the web suite', unblock: 'a way to raise a risk flag on dev' },
    { id: 'LG-137', title: 'When both NAFATH and WATHIQ are expired, the documented message takes precedence', rule: 'EMI-5836', blockedBy: 'precedence not confirmed; NAFATH_EXPIRED_* / WATHIQ_EXPIRED_* accounts are not provisioned', unblock: 'the precedence rule and a doubly-expired account' },
];

test.describe('Login — Pending cases (blocked, see annotations)', { tag: ['@login', '@functional', '@pending'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'functional' }] }, () => {
    for (const c of PENDING) {
        test.skip(`${c.id}: ${c.title}`, {
            annotation: [
                { type: 'testcase', description: `${c.id}: ${c.title}` },
                { type: 'rule', description: c.rule },
                { type: 'blocked-by', description: c.blockedBy },
                { type: 'unblock', description: c.unblock },
            ],
        }, async () => { /* placeholder — blocked, see annotations */ });
    }
});
