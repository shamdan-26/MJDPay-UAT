import { type Page, expect } from '@playwright/test';
import { AdminOtpConfigPage, ADMIN_BASE_URL } from './AdminOtpConfigPage';

/**
 * Admin Portal → Manage Limits (Wallet Balance / Transaction / Count), driven API-first.
 *
 * Endpoints read off the live dev admin SPA (2026-10-13, limitations-management module bundle):
 *   GET|PUT {GATEWAY}/api/v1/limitations/admin-wallet-limitations
 *   GET|PUT {GATEWAY}/api/v1/limitations/transaction-limitations        (min amount + HOUR/DAY/MONTH/YEAR max amount)
 *   GET|PUT {GATEWAY}/api/v1/limitations/transaction-count-limitations  (HOUR/DAY/MONTH/YEAR max count)
 * The write is the SAME URL as the read, method PUT. Lookups: /api/v1/transaction-types, /risk-levels,
 * /platform-type, /wallet-types.
 *
 * Findings that differ from the first draft of Topup-Admin-Config-Matrix.md:
 *   - The minimum top-up amount is NOT a separate setting: it is the `min` field of the Transaction limit row
 *     (type × risk level × platform), written together with the four period maxima.
 *   - Periods are HOUR / DAY / MONTH / YEAR (no WEEK). There is no separate per-transaction max (TXN_MAX).
 *   - Risk level and Platform offer an "ALL" choice that the SPA guards with a warning modal — never use it here.
 *
 * UNVERIFIED (no write was ever sent while capturing): the exact GET paging params and response envelope, and the
 * PUT body field names are taken from the SPA's own form controls (`riskLevel`, `platformTypeCode`,
 * `transactionTypeCodes`, `transactionCategoryCodes`, `hourly|daily|monthly|yearlyPeriodAmount`, `min`,
 * `…PeriodTransactionCount`, `walletType`, `minBalance`, `maxBalance`, `isActive`). The first real run should
 * confirm them; every method throws with the raw response on a non-2xx so a mismatch is obvious.
 *
 * Auth: relays the headers of a real request the admin SPA sent (same approach and reasons as
 * AdminCommissionManagementPage.ensureApiHeaders — `device-finger-print` embeds the token). One admin login at a
 * time: a second login invalidates the first (401 SESSION_INVALID).
 */

export const ADMIN_GATEWAY = process.env['ADMIN_GATEWAY_URL'] ?? 'https://gateway-dev-emi.dg-cash.app';
const LIMITS_PATH = {
    wallet: '/api/v1/limitations/admin-wallet-limitations',
    transaction: '/api/v1/limitations/transaction-limitations',
    count: '/api/v1/limitations/transaction-count-limitations',
} as const;

export const WALLET_LIMITS_URL = `${ADMIN_BASE_URL}/admin/main/limitations-management/wallet-limitations`;

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export const RISK_LEVELS: readonly RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH'];
export type Platform = 'WEB' | 'APP';
export type Period = 'HOUR' | 'DAY' | 'MONTH' | 'YEAR';
export const PERIODS: readonly Period[] = ['HOUR', 'DAY', 'MONTH', 'YEAR'];

/** Top-up transaction types as named by the admin "Cash-In" group. Code 102003 is confirmed (TopupHelper); resolve the rest by name. */
export const TOPUP_TYPE_NAME = {
    BILLER: 'Biller Bank Cashin',
    MERCHANT: 'Merchant Cashin',
    CUSTOMER: 'Customer Cashin',
} as const;

/** One GET row of the Transaction limits grid — one per type × risk × platform × period. */
export interface TransactionLimitRow {
    transactionType: string;
    transactionTypeCode?: string;
    riskLevel: RiskLevel;
    platformType: Platform;
    period: Period;
    min: number;
    max: number;
}

export interface CountLimitRow {
    transactionType: string;
    transactionTypeCode?: string;
    riskLevel: RiskLevel;
    platformType: Platform;
    period: Period;
    transactionCount?: number;
    count?: number;
}

export interface WalletLimitRow {
    walletType: string;
    riskLevel: RiskLevel;
    minBalance: number;
    maxBalance: number;
}

/** What one PUT writes for a type × risk × platform cell: the minimum plus all four period maxima. */
export interface AmountLimitValues {
    min: number;
    hourly: number;
    daily: number;
    monthly: number;
    yearly: number;
}

export interface CountLimitValues {
    hourly: number;
    daily: number;
    monthly: number;
    yearly: number;
}

/** Everything needed to put one cell back exactly as found. */
export interface LimitCell {
    typeName: string;
    typeCode: string;
    risk: RiskLevel;
    platform: Platform;
}

export interface TopupLimitsSnapshot {
    cells: LimitCell[];
    amount: Map<string, AmountLimitValues>;
    count: Map<string, CountLimitValues>;
    wallet: Map<string, { minBalance: number; maxBalance: number }>;
    walletType: string;
}

const cellKey = (c: { typeName: string; risk: RiskLevel; platform: Platform }) => `${c.typeName}|${c.risk}|${c.platform}`;
const walletKey = (walletType: string, risk: RiskLevel) => `${walletType}|${risk}`;

export class AdminLimitsApi {
    private headers: Record<string, string> | null = null;
    private headersAt = 0;
    /** The captured JWT lives ~18 min; refresh well before that (see AdminCommissionManagementPage). */
    private static readonly MAX_AGE_MS = 10 * 60 * 1000;
    private typeCodeCache = new Map<string, string>();

    constructor(private readonly page: Page) {
        this.page.on('request', (req) => {
            if (!this.headers && req.url().includes('gateway-') && req.headers()['authorization']) {
                this.headers = req.headers();
                this.headersAt = Date.now();
            }
        });
    }

    /** Logs in as admin and opens a Manage Limits screen so the SPA fires an authenticated gateway request to relay. */
    async open(): Promise<void> {
        await new AdminOtpConfigPage(this.page).login();
        await this.page.goto(WALLET_LIMITS_URL);
        await this.waitForHeaders();
    }

    private async waitForHeaders(): Promise<void> {
        for (let i = 0; i < 20 && !this.headers; i++) await this.page.waitForTimeout(500);
        if (!this.headers) throw new Error('AdminLimitsApi: no authenticated gateway request observed — call open() first.');
    }

    private async authHeaders(forceRefresh = false): Promise<Record<string, string>> {
        const stale = this.headers !== null && Date.now() - this.headersAt > AdminLimitsApi.MAX_AGE_MS;
        if (forceRefresh || stale) {
            this.headers = null;
            await this.open();
        }
        await this.waitForHeaders();
        const h = { ...this.headers! };
        delete h['host'];
        delete h['content-length'];
        delete h['connection'];
        return h;
    }

    private async request(method: 'GET' | 'PUT', path: string, body?: unknown): Promise<unknown> {
        const send = async (headers: Record<string, string>) => {
            const url = `${ADMIN_GATEWAY}${path}`;
            return method === 'GET'
                ? this.page.request.get(url, { headers })
                : this.page.request.put(url, { headers: { ...headers, 'content-type': 'application/json' }, data: body });
        };
        let res = await send(await this.authHeaders());
        if (res.status() === 401) res = await send(await this.authHeaders(true));
        if (!res.ok()) throw new Error(`${method} ${path} failed: ${res.status()} ${await res.text().catch(() => '')}`);
        const text = await res.text();
        return text ? JSON.parse(text) : null;
    }

    /** Reads every page of a list endpoint. Tolerates a Spring page ({content,last}) or a bare array. */
    private async getAll<T>(path: string): Promise<T[]> {
        const all: T[] = [];
        for (let pageNum = 0; pageNum < 400; pageNum++) {
            const json = await this.request('GET', `${path}?page=${pageNum}&size=200`) as { content?: T[]; last?: boolean } | T[] | null;
            if (Array.isArray(json)) { all.push(...json); break; }
            all.push(...(json?.content ?? []));
            if (!json || json.last !== false) break;
        }
        return all;
    }

    // ---------- lookups ----------

    /** Resolves a transaction-type NAME ("Biller Bank Cashin") to its numeric code via /api/v1/transaction-types. */
    async resolveTypeCode(typeName: string): Promise<string> {
        const cached = this.typeCodeCache.get(typeName);
        if (cached) return cached;
        const json = await this.request('GET', '/api/v1/transaction-types') as unknown;
        const flat: Array<Record<string, unknown>> = [];
        const walk = (n: unknown) => {
            if (Array.isArray(n)) n.forEach(walk);
            else if (n && typeof n === 'object') {
                flat.push(n as Record<string, unknown>);
                Object.values(n as Record<string, unknown>).forEach(walk);
            }
        };
        walk(json);
        const hit = flat.find(o => [o['name'], o['nameEn'], o['transactionType'], o['description']].some(v => typeof v === 'string' && v.toLowerCase() === typeName.toLowerCase()) && (o['code'] ?? o['transactionTypeCode']));
        if (!hit) throw new Error(`AdminLimitsApi: transaction type "${typeName}" not found in /api/v1/transaction-types`);
        const code = String(hit['code'] ?? hit['transactionTypeCode']);
        this.typeCodeCache.set(typeName, code);
        return code;
    }

    // ---------- reads ----------

    async getTransactionLimits(): Promise<TransactionLimitRow[]> {
        return this.getAll<TransactionLimitRow>(LIMITS_PATH.transaction);
    }
    async getCountLimits(): Promise<CountLimitRow[]> {
        return this.getAll<CountLimitRow>(LIMITS_PATH.count);
    }
    async getWalletLimits(): Promise<WalletLimitRow[]> {
        return this.getAll<WalletLimitRow>(LIMITS_PATH.wallet);
    }

    /** Amount limits of one cell, folded from its four period rows. Throws if the cell has no rows. */
    async getAmountCell(c: Pick<LimitCell, 'typeName' | 'risk' | 'platform'>, rows?: TransactionLimitRow[]): Promise<AmountLimitValues> {
        const all = rows ?? await this.getTransactionLimits();
        const mine = all.filter(r => r.transactionType === c.typeName && r.riskLevel === c.risk && r.platformType === c.platform);
        if (mine.length === 0) throw new Error(`No transaction-limit rows for ${cellKey(c)}`);
        const by = (p: Period) => mine.find(r => r.period === p)?.max ?? 0;
        return { min: mine[0]!.min, hourly: by('HOUR'), daily: by('DAY'), monthly: by('MONTH'), yearly: by('YEAR') };
    }

    async getCountCell(c: Pick<LimitCell, 'typeName' | 'risk' | 'platform'>, rows?: CountLimitRow[]): Promise<CountLimitValues> {
        const all = rows ?? await this.getCountLimits();
        const mine = all.filter(r => r.transactionType === c.typeName && r.riskLevel === c.risk && r.platformType === c.platform);
        if (mine.length === 0) throw new Error(`No count-limit rows for ${cellKey(c)}`);
        const by = (p: Period) => { const r = mine.find(x => x.period === p); return r?.transactionCount ?? r?.count ?? 0; };
        return { hourly: by('HOUR'), daily: by('DAY'), monthly: by('MONTH'), yearly: by('YEAR') };
    }

    // ---------- writes (always one fully-specified cell, never "ALL") ----------

    async putAmountCell(c: LimitCell, v: AmountLimitValues): Promise<void> {
        await this.request('PUT', LIMITS_PATH.transaction, {
            riskLevel: c.risk,
            platformTypeCode: c.platform,
            transactionTypeCodes: [c.typeCode],
            transactionCategoryCodes: [],
            hourlyPeriodAmount: v.hourly,
            dailyPeriodAmount: v.daily,
            monthlyPeriodAmount: v.monthly,
            yearlyPeriodAmount: v.yearly,
            min: v.min,
            isActive: true,
        });
    }

    async putCountCell(c: LimitCell, v: CountLimitValues): Promise<void> {
        await this.request('PUT', LIMITS_PATH.count, {
            riskLevel: c.risk,
            platformTypeCode: c.platform,
            transactionTypeCodes: [c.typeCode],
            transactionCategoryCodes: [],
            hourlyPeriodTransactionCount: v.hourly,
            dailyPeriodTransactionCount: v.daily,
            monthlyPeriodTransactionCount: v.monthly,
            yearlyPeriodTransactionCount: v.yearly,
            isActive: true,
        });
    }

    async putWallet(walletType: string, risk: RiskLevel, v: { minBalance: number; maxBalance: number }): Promise<void> {
        await this.request('PUT', LIMITS_PATH.wallet, { walletType, riskLevel: risk, minBalance: v.minBalance, maxBalance: v.maxBalance, isActive: true });
    }

    // ---------- snapshot / restore (the "limits always return to the original value" rule) ----------

    /** All three risk tiers are captured so the suite is independent of which tier the test account sits in. */
    async snapshotTopup(typeName: string, platform: Platform, walletType: string): Promise<TopupLimitsSnapshot> {
        const typeCode = await this.resolveTypeCode(typeName);
        const [tx, cnt, wal] = await Promise.all([this.getTransactionLimits(), this.getCountLimits(), this.getWalletLimits()]);
        const snap: TopupLimitsSnapshot = { cells: [], amount: new Map(), count: new Map(), wallet: new Map(), walletType };
        for (const risk of RISK_LEVELS) {
            const cell: LimitCell = { typeName, typeCode, risk, platform };
            const hasAmount = tx.some(r => r.transactionType === typeName && r.riskLevel === risk && r.platformType === platform);
            if (!hasAmount) continue;
            snap.cells.push(cell);
            snap.amount.set(cellKey(cell), await this.getAmountCell(cell, tx));
            if (cnt.some(r => r.transactionType === typeName && r.riskLevel === risk && r.platformType === platform)) {
                snap.count.set(cellKey(cell), await this.getCountCell(cell, cnt));
            }
            const w = wal.find(r => r.walletType === walletType && r.riskLevel === risk);
            if (w) snap.wallet.set(walletKey(walletType, risk), { minBalance: w.minBalance, maxBalance: w.maxBalance });
        }
        if (snap.cells.length === 0) throw new Error(`AdminLimitsApi: no limit rows found for "${typeName}" on ${platform}`);
        return snap;
    }

    /** Applies one amount value set to every captured risk tier. */
    async setAmountAllTiers(snap: TopupLimitsSnapshot, patch: Partial<AmountLimitValues>): Promise<void> {
        for (const cell of snap.cells) {
            await this.putAmountCell(cell, { ...snap.amount.get(cellKey(cell))!, ...patch });
        }
    }
    async setCountAllTiers(snap: TopupLimitsSnapshot, patch: Partial<CountLimitValues>): Promise<void> {
        for (const cell of snap.cells) {
            const base = snap.count.get(cellKey(cell));
            if (base) await this.putCountCell(cell, { ...base, ...patch });
        }
    }
    async setWalletAllTiers(snap: TopupLimitsSnapshot, patch: Partial<{ minBalance: number; maxBalance: number }>): Promise<void> {
        for (const risk of RISK_LEVELS) {
            const base = snap.wallet.get(walletKey(snap.walletType, risk));
            if (base) await this.putWallet(snap.walletType, risk, { ...base, ...patch });
        }
    }

    /** Puts every captured value back, then re-reads and asserts equality (§0.2 of the matrix). Safe to call repeatedly. */
    async restoreTopup(snap: TopupLimitsSnapshot): Promise<void> {
        for (const cell of snap.cells) {
            await this.putAmountCell(cell, snap.amount.get(cellKey(cell))!);
            const c = snap.count.get(cellKey(cell));
            if (c) await this.putCountCell(cell, c);
        }
        for (const risk of RISK_LEVELS) {
            const w = snap.wallet.get(walletKey(snap.walletType, risk));
            if (w) await this.putWallet(snap.walletType, risk, w);
        }
        await this.expectMatchesSnapshot(snap);
    }

    async expectMatchesSnapshot(snap: TopupLimitsSnapshot): Promise<void> {
        const [tx, cnt, wal] = await Promise.all([this.getTransactionLimits(), this.getCountLimits(), this.getWalletLimits()]);
        for (const cell of snap.cells) {
            expect(await this.getAmountCell(cell, tx), `amount limits ${cellKey(cell)} restored`).toEqual(snap.amount.get(cellKey(cell)));
            const c = snap.count.get(cellKey(cell));
            if (c) expect(await this.getCountCell(cell, cnt), `count limits ${cellKey(cell)} restored`).toEqual(c);
        }
        for (const risk of RISK_LEVELS) {
            const w = snap.wallet.get(walletKey(snap.walletType, risk));
            if (!w) continue;
            const now = wal.find(r => r.walletType === snap.walletType && r.riskLevel === risk);
            expect({ minBalance: now?.minBalance, maxBalance: now?.maxBalance }, `wallet limits ${walletKey(snap.walletType, risk)} restored`).toEqual(w);
        }
    }
}
