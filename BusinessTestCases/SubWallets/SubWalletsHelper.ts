import type { Page } from '@playwright/test';

/**
 * Sub-Wallets Management (EMI-5185 FE-Web, EMI-5186 BE, EMI-5215 CRUD APIs,
 * EMI-5275 close-cascade) plus the UAT bug set EMI-5571, EMI-5417, EMI-5248,
 * EMI-5249, EMI-5274, EMI-5276.
 *
 * Endpoint paths below are taken from the curl repro blocks on EMI-5571 and
 * EMI-5417, so `/api/v1/sub-wallets` and `/api/v1/wallet-config/sub-wallet/
 * {code}/configuration` are confirmed real. The screen URL and every locator in
 * pageElements/SubWallets/ are best-effort: Sub-wallets is listed as "not tagged
 * yet" in QA-DATA-TESTID-HANDOFF.md, so reconcile both against the real app on
 * the first live run.
 */

export const BASE_URL       = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';
export const SUB_WALLETS_URL = `${BASE_URL}/business/main/sub-wallets`;

export const SUB_WALLETS_API  = '**/api/v1/sub-wallets';
export const WALLETS_API      = '**/api/v1/wallets**';
export const WALLET_CONFIG_API = '**/api/v1/wallet-config/sub-wallet/*/configuration';

/** Wallet code shape seen in the EMI-5417 repro (`BIL-13PKNJY905-23`). */
export const SAMPLE_WALLET_CODE = 'BIL-13PKNJY905-23';

export function uniqueSubWalletName(prefix = 'QA-SW'): string {
    return `${prefix}-${Date.now()}`;
}

export interface SubWalletInput {
    name: string;
    walletType?: string;
    currency?: string;
    notes?: string;
    isShareable?: boolean;
    isCardIssuanceEnabled?: boolean;
}

interface MockSubWallet {
    code: string;
    name: string;
    status?: 'ACTIVE' | 'CLOSED' | 'FROZEN';
    subWalletTypeCode?: string;
    currency?: string;
    parentName?: string | null;
}

function subWallet(overrides: Partial<MockSubWallet> & { name: string }): MockSubWallet {
    return {
        code: `BIL-MOCK-${overrides.name.replace(/\W/g, '').toUpperCase()}`,
        status: 'ACTIVE',
        subWalletTypeCode: 'ESCROW',
        currency: 'SAR',
        parentName: null,
        ...overrides,
    };
}

/**
 * Issues a request from inside the page so page.route() mocks apply.
 * page.request.* is a separate API context that bypasses routing entirely and
 * would hit the real gateway — same reason PaymentLinkHelper.ts has this.
 */
export async function fetchJson(
    page: Page,
    path: string,
    options: { method?: string; body?: unknown } = {}
): Promise<{ status: number; body: unknown }> {
    const url = `${BASE_URL}${path}`;
    return page.evaluate(
        async ({ url, method, body }) => {
            const res = await fetch(url, {
                method: method ?? 'GET',
                headers: { 'Content-Type': 'application/json' },
                body: body !== undefined ? JSON.stringify(body) : undefined,
            });
            const parsedBody = await res.json().catch(() => null);
            return { status: res.status, body: parsedBody };
        },
        { url, method: options.method, body: options.body }
    );
}

export async function gotoSubWallets(page: Page): Promise<void> {
    await page.goto(SUB_WALLETS_URL);
    await page.waitForLoadState('domcontentloaded');
}

/** A populated root list, including one nested child for the N-level tests. */
export async function mockSubWalletList(page: Page, names = ['Operations', 'Payroll']): Promise<void> {
    const wallets = names.map(name => subWallet({ name }));
    await page.route(WALLETS_API, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: wallets }) })
    );
}

export async function mockEmptySubWalletList(page: Page): Promise<void> {
    await page.route(WALLETS_API, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [] }) })
    );
}

export async function mockCreateSubWalletSuccess(page: Page): Promise<void> {
    await page.route(SUB_WALLETS_API, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(subWallet({ name: 'Created Sub Wallet' })),
        })
    );
}

/** EMI-5571 pre-fix state: wallet-config/copy blows up behind POST /sub-wallets. */
export async function mockCreateSubWalletConfigCopyError(page: Page): Promise<void> {
    await page.route(SUB_WALLETS_API, route =>
        route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify([
                {
                    httpStatusCode: 500,
                    message: {
                        plainText: '{"status":500,"error":"Internal Server Error","path":"/api/v1/internal/wallet-config/copy"}',
                    },
                },
            ]),
        })
    );
}

/** EMI-5248: a duplicate name must be rejected, not silently accepted. */
export async function mockCreateSubWalletDuplicateName(page: Page): Promise<void> {
    await page.route(SUB_WALLETS_API, route =>
        route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ messageCode: 'DUPLICATE_SUB_WALLET_NAME', plainText: 'A sub-wallet with this name already exists' }),
        })
    );
}

/** EMI-5248 pre-fix state: the duplicate went through with a 200. */
export async function mockCreateSubWalletDuplicateAccepted(page: Page): Promise<void> {
    await page.route(SUB_WALLETS_API, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(subWallet({ name: 'Duplicate' })) })
    );
}

export async function mockWalletConfigurationSuccess(page: Page): Promise<void> {
    await page.route(WALLET_CONFIG_API, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ walletLimitation: { minBalance: 1, maxBalance: 100 }, allowedChannels: ['ONLINE', 'POC'] }),
        })
    );
}

/** EMI-5417 pre-fix state. */
export async function mockWalletConfigurationServerError(page: Page): Promise<void> {
    await page.route(WALLET_CONFIG_API, route =>
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ status: 500, error: 'Internal Server Error' }) })
    );
}

/** EMI-5274/EMI-5276: privilege list drives whether the module renders at all. */
export async function mockSubWalletPrivileges(page: Page, granted: boolean): Promise<void> {
    await page.route('**/api/v1/**privilege**', route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ privileges: granted ? ['VIEW_SUB_WALLET', 'CREATE_SUB_WALLET'] : [] }),
        })
    );
}

/** EMI-5274: the API itself must refuse, not just the UI hiding the button. */
export async function mockCreateSubWalletForbidden(page: Page): Promise<void> {
    await page.route(SUB_WALLETS_API, route =>
        route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Access denied' }) })
    );
}

export async function mockCloseSubWalletSuccess(page: Page): Promise<void> {
    await page.route('**/api/v1/sub-wallets/*/close', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'CLOSED' }) })
    );
}

/** EMI-5275: a child with pending transactions blocks closing the parent. */
export async function mockCloseSubWalletBlockedByChild(page: Page): Promise<void> {
    await page.route('**/api/v1/sub-wallets/*/close', route =>
        route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
                messageCode: 'SUB_WALLET_NOT_CLOSABLE',
                plainText: 'A sub-wallet has pending transactions and cannot be closed',
            }),
        })
    );
}
