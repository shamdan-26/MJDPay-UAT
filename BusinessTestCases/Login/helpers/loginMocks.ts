import type { Page, Route } from '@playwright/test';
import { boxStep } from '../../shared/boxStep.ts';

// Gateway mocks for the Login UI specs: they let error/edge cases run without burning a real account
// (no wrong-password attempts, no lockout counter) and without a real OTP.

export const SIGNIN_GLOB = '**/auth/signin';
export const VERIFY_OTP_GLOB = '**/auth/verify/otp';

export function json(route: Route, status: number, body: unknown): Promise<void> {
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

/** Answers every /auth/signin with this status/body and counts the requests that reached it. */
export async function mockSignIn(page: Page, status: number, body: unknown = { message: 'mocked' }): Promise<{ count: () => number }> {
    return boxStep('mockSignIn', async () => {
        let calls = 0;
        await page.route(SIGNIN_GLOB, route => { calls++; return json(route, status, body); });
        return { count: () => calls };
    });
}

/** Delays /auth/signin by `ms` before answering 401 — for double-click and loading-state checks. */
export async function mockSlowSignIn(page: Page, ms: number): Promise<{ count: () => number }> {
    return boxStep('mockSlowSignIn', async () => {
        let calls = 0;
        await page.route(SIGNIN_GLOB, async route => {
            calls++;
            await new Promise(r => setTimeout(r, ms));
            await json(route, 401, { message: 'mocked' });
        });
        return { count: () => calls };
    });
}

/** Aborts /auth/signin at the network level (offline / connection reset). */
export async function mockSignInNetworkFailure(page: Page): Promise<void> {
    return boxStep('mockSignInNetworkFailure', async () => {
        await page.route(SIGNIN_GLOB, route => route.abort('failed'));
    });
}
