import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import registrationAssets from '../../../data/registrationAssets.json';

// Pre-generated test assets (from National_IDs_Generated) — see data/registrationAssets.json.
// One merged `assets` pool tagged with `type: "citizen" | "resident"` (National ID prefix
// 1 = citizen, 2 = resident) rather than two separate arrays, so both round-robin helpers
// below share a single growing dataset.
export const CITIZEN_ASSETS = registrationAssets.assets.filter(a => a.type === 'citizen');
export const RESIDENT_ASSETS = registrationAssets.assets.filter(a => a.type === 'resident');

// Primary defaults resident pool used for Business Info step
export const VALID_CRN    = RESIDENT_ASSETS[0].crn;
export const VALID_IQAMA  = RESIDENT_ASSETS[0].nationalId;
export const VALID_MOBILE = RESIDENT_ASSETS[0].mobile;

/**
 * Reserved sub-pool exclusively for the "should start a brand-new registration
 * when the mobile is reused with a different CRN" test in
 * RegistrationInfoFieldsFunctionality.spec.ts (EMI-122 T21). That test draws two
 * resident assets per run via nextResidentAsset() — the same pool every other
 * Registration spec file/describe block draws from — and was confirmed to fail
 * in full bulk runs (while passing in isolation) purely from contention over
 * shared identities, not a real regression (see the
 * project_resident_assets_worker_index_races memory). Carving out the last N
 * assets and excluding them from nextResidentAsset()'s pool means this test
 * stops contending with the rest of the suite. Reserved from the tail
 * deliberately — the fixed-index pattern used elsewhere
 * (RESIDENT_ASSETS[workerIndex % length], workerIndex always small) only ever
 * touches the front of the array, so it never collides with this reservation.
 */
const MOBILE_REUSE_POOL_SIZE = 30;
const MOBILE_REUSE_MOBILES = new Set(RESIDENT_ASSETS.slice(-MOBILE_REUSE_POOL_SIZE).map(a => a.mobile));
export const MOBILE_REUSE_ASSETS = RESIDENT_ASSETS.filter(a => MOBILE_REUSE_MOBILES.has(a.mobile));

/**
 * Reserved sub-pool for getFreshResidentAsset() — callers that want one
 * dedicated identity of their own, isolated from nextResidentAsset()'s
 * shared pool. Without this reservation, getFreshResidentAsset() drew from
 * the same GENERAL_RESIDENT_ASSETS pool and deterministically returned the
 * very first used:false entry every time — which nextResidentAsset() could
 * also draw (it's just one asset among many available ones), so an unrelated
 * test advancing that same identity further server-side silently broke the
 * "dedicated" asset out from under its owner. Reserved directly after the
 * MOBILE_REUSE slice, same tail-reservation reasoning as that pool.
 *
 * Sized well above what one test needs: 3 of the first 10 assets tried here
 * turned out already progressed on the live UAT backend despite being
 * flagged used:false locally (this tail of the pool predates full used-flag
 * tracking, same as the front-of-pool staleness found earlier — see
 * markResidentAssetUsed). A 30%+ stale rate means a narrow reservation
 * risks exhausting itself the same way the original shared-pool
 * maxAttempts did.
 */
const DEDICATED_ASSET_POOL_SIZE = 60;
// Slice taken from the middle of the array (index 900), not the tail: live
// checks proved the tail slice (indices -90..-30) was ~100% already
// progressed to Products on both UAT and dev — some prior bulk process
// consumed that whole neighborhood. A middle slice is untested territory,
// not a guarantee of freshness, but it isn't a known-dead zone the way the
// front (~150+ confirmed used) and that tail slice are.
const DEDICATED_ASSET_START_INDEX = 900;
const DEDICATED_ASSET_MOBILES = new Set(
    RESIDENT_ASSETS.slice(DEDICATED_ASSET_START_INDEX, DEDICATED_ASSET_START_INDEX + DEDICATED_ASSET_POOL_SIZE).map(a => a.mobile)
);
export const DEDICATED_RESIDENT_ASSETS = RESIDENT_ASSETS.filter(a => DEDICATED_ASSET_MOBILES.has(a.mobile));

export const GENERAL_RESIDENT_ASSETS = RESIDENT_ASSETS.filter(
    a => !MOBILE_REUSE_MOBILES.has(a.mobile) && !DEDICATED_ASSET_MOBILES.has(a.mobile)
);

let _citizenIndex  = 0;
let _mobileReuseIndex = 0;

const REGISTRATION_ASSETS_PATH = path.resolve(__dirname, '../../../data/registrationAssets.json');

/** Where a citizen asset ended up when it was spent by goToProductsStep. */
export type CitizenAssetOutcome = 'products' | 'contract' | 'nafath' | 'already-registered';

/** Where a resident asset ended up when it was spent by goToFinancialStep. */
export type ResidentAssetOutcome = 'products' | 'already-registered';

/**
 * Thrown by goToFinancialStep when an explicit (non-default) identity has
 * already progressed past Business Info straight to Products — a resume,
 * not a backend rejection. A dedicated `instanceof`-checkable type rather
 * than string-matching the message: goToFinancialStepWithDedicatedAsset
 * catches this specifically to mark the stale asset and move on to the next
 * one in its small reserved pool.
 */
export class AssetAlreadyProgressedError extends Error {}

/**
 * Persists one asset's `used` flag to data/registrationAssets.json — reading
 * the file fresh from disk immediately beforehand rather than serializing
 * the in-memory `registrationAssets` object imported at module load.
 *
 * playwright.config.ts runs 3 workers locally, each its own process with its
 * own private copy of that JSON from process start. Writing that stale copy
 * back clobbers every mark any other worker persisted since — confirmed via
 * a live run where goToFinancialStep marked 10 resident assets 'products'
 * (one per attempt, all logged) yet none of the 10 were on disk afterward:
 * another worker's write, still holding its own older snapshot, stomped
 * them. That's the actual cause behind repeated maxAttempts exhaustion —
 * marks were never surviving to be skipped on the next run. Re-reading right
 * before the write narrows the race to the brief gap between concurrent
 * writes instead of leaving it open for a worker's entire lifetime.
 */
function persistAssetUsedFlag(poolKey: 'assets' | 'uatOtpAssets', mobile: string, used: boolean | string): void {
    try {
        const onDisk = JSON.parse(fs.readFileSync(REGISTRATION_ASSETS_PATH, 'utf8'));
        const match = (onDisk[poolKey] as Array<{ mobile: string; used?: boolean | string }>)
            .find(a => a.mobile === mobile);
        if (match) match.used = used;
        fs.writeFileSync(REGISTRATION_ASSETS_PATH, JSON.stringify(onDisk, null, 2) + '\n');
    } catch (err) {
        console.warn(`[RegistrationHelper] Failed to persist used-flag for ${mobile}: ${err}`);
    }
}

/**
 * Marks a citizen asset as used — tagged with the page it landed on
 * (`products`, `contract`, `nafath`, or `already-registered`) rather than a
 * bare boolean — and persists the flag to data/registrationAssets.json. On
 * UAT these outcomes are permanent dead ends for goToProductsStep — see the
 * project_citizen_asset_pool_exhausted memory — so persisting `used` means
 * later runs skip straight past assets that already cost ~30-45s to
 * discover, instead of rediscovering them from asset #0 every time
 * _citizenIndex resets.
 */
export function markCitizenAssetUsed(mobile: string, page: CitizenAssetOutcome): void {
    const asset = CITIZEN_ASSETS.find(a => a.mobile === mobile);
    if (asset) (asset as { used?: boolean | CitizenAssetOutcome }).used = page;
    persistAssetUsedFlag('assets', mobile, page);
}

/**
 * Marks a resident asset as used — tagged with the outcome it hit in
 * goToFinancialStep (`products` if Business Info resumed straight past
 * Financial, `already-registered` if the backend rejected it outright) —
 * and persists the flag to data/registrationAssets.json, mirroring
 * markCitizenAssetUsed. Without this, nextResidentAsset() had no way to
 * know an asset was already spent — the `used` field existed in the JSON
 * for residents but nothing ever wrote to it, so it stayed `false` forever
 * regardless of live server state.
 */
export function markResidentAssetUsed(mobile: string, outcome: ResidentAssetOutcome): void {
    const asset = RESIDENT_ASSETS.find(a => a.mobile === mobile);
    if (asset) (asset as { used?: boolean | ResidentAssetOutcome }).used = outcome;
    persistAssetUsedFlag('assets', mobile, outcome);
}

/**
 * Splits a pool into a disjoint slice per Playwright worker so concurrent
 * workers (playwright.config.ts runs `workers: 3` locally) never draw the
 * same "next available" asset at the same time and race to submit it —
 * previously nextResidentAsset()/nextCitizenAsset() reset `_residentIndex`/
 * `_citizenIndex` to 0 in every worker process independently, so two workers
 * routinely picked the identical CRN/mobile pair and submitted Business Info
 * for it concurrently, corrupting each other's "reached Financial" checks.
 * Falls back to the full pool when not running inside a test worker (e.g.
 * config.workers is 1 on CI, or the pool is too small to partition).
 */
export function getWorkerPartition<T>(pool: T[]): T[] {
    let parallelIndex = 0;
    let totalWorkers = 1;
    try {
        const info = test.info();
        parallelIndex = info.parallelIndex;
        totalWorkers = info.config.workers || 1;
    } catch {
        // Not running inside an active test (e.g. a standalone script) — use the full pool.
    }
    if (totalWorkers <= 1) return pool;
    const slice = pool.filter((_, i) => i % totalWorkers === parallelIndex);
    return slice.length > 0 ? slice : pool;
}

/** Returns the next citizen asset (CRN + National ID + mobile) in round-robin
 *  order. With no `wantOutcome`, skips any asset already flagged `used`
 *  (original behaviour — e.g. NAFATH-step tests want a fresh identity, not
 *  one that already resolved elsewhere). Pass `wantOutcome` when the caller's
 *  goal is a specific landing page (e.g. `goToProductsStep` passes
 *  `'products'`): an asset previously spent landing on that same page resumes
 *  straight back to it, so it's included alongside unused ones — while an
 *  asset flagged for a *different* outcome (e.g. `contract`-flagged when the
 *  goal is `products`) is still skipped, since it would resume to the wrong
 *  page. `wantOutcome` also accepts an array when more than one landing page
 *  is acceptable (e.g. `goToProductsStep`'s `landOnContractOk` — an asset
 *  already flagged `products` or `contract` both resume somewhere useful).
 *  Falls back to the full pool (ignoring the flag) once nothing matches, so
 *  callers never hard-fail — just lose the time-saving skip. */
export function nextCitizenAsset(wantOutcome?: CitizenAssetOutcome | CitizenAssetOutcome[]) {
    const wanted = Array.isArray(wantOutcome) ? wantOutcome : wantOutcome ? [wantOutcome] : [];
    const pool = getWorkerPartition(CITIZEN_ASSETS);
    const available = pool.filter(a => !a.used || wanted.includes(a.used as CitizenAssetOutcome));
    if (available.length === 0) {
        console.warn('[RegistrationHelper] All citizen assets are flagged used — cycling the full pool again.');
        return pool[_citizenIndex++ % pool.length];
    }
    return available[_citizenIndex++ % available.length];
}

/** Returns the next resident asset (CRN + Iqama + mobile), skipping any
 *  asset already flagged `used` — same reasoning as nextCitizenAsset: an
 *  asset that already resumed to Products or was rejected as
 *  already-registered can't reach Financial again. Falls back to the full
 *  pool (ignoring the flag) once nothing matches, so callers never
 *  hard-fail — just lose the time-saving skip.
 *
 *  Picked at random from the available pool rather than walked in order:
 *  a fixed worker partition + sequential index means every run starts at
 *  the same offset and marches forward in the same order, so a contiguous
 *  stretch of assets that are already progressed live on UAT but not yet
 *  flagged locally (e.g. from ad-hoc runs before markResidentAssetUsed
 *  existed) gets hit by every run in lockstep, exhausting goToFinancialStep's
 *  maxAttempts regardless of how high it's set. Random draw decorrelates
 *  attempts from data order so a dead zone in the pool no longer stalls
 *  every run identically.
 */
export function nextResidentAsset() {
    const pool = getWorkerPartition(GENERAL_RESIDENT_ASSETS);
    const available = pool.filter(a => !a.used);
    if (available.length === 0) {
        console.warn('[RegistrationHelper] All resident assets are flagged used — cycling the full pool again.');
        return pool[Math.floor(Math.random() * pool.length)];
    }
    return available[Math.floor(Math.random() * available.length)];
}

/**
 * Returns one resident asset explicitly flagged `used: false` from the
 * reserved DEDICATED_RESIDENT_ASSETS sub-pool — never GENERAL_RESIDENT_ASSETS,
 * which nextResidentAsset() also draws from. For a caller that wants one
 * dedicated, deterministic fresh identity of its own rather than drawing from
 * (and being subject to the worker partitioning, random draw, and
 * maxAttempts retry-cycling of) nextResidentAsset() — e.g. a single test that
 * should own its own mobile outright instead of contending with the rest of
 * the suite for the shared pool. Falls back to nextResidentAsset()'s general
 * pool once the dedicated one is dry, so callers never hard-fail — just lose
 * the isolation guarantee.
 */
export function getFreshResidentAsset() {
    const asset = DEDICATED_RESIDENT_ASSETS.find(a => a.used === false);
    if (asset) return asset;
    console.warn('[RegistrationHelper] getFreshResidentAsset: dedicated pool exhausted — falling back to the general resident pool.');
    return nextResidentAsset();
}

/** Returns the next resident asset from the pool reserved for the "mobile
 *  reused with a different CRN" test (EMI-122 T21) — isolated from
 *  nextResidentAsset()'s pool so that test stops contending with the rest of
 *  the Registration suite for identities during a full bulk run. Same
 *  round-robin + worker-partition + used-flag-skip behaviour as
 *  nextResidentAsset(), just scoped to MOBILE_REUSE_ASSETS. Falls back to
 *  nextResidentAsset()'s much larger general pool once this 30-asset
 *  reservation is dry, rather than cycling back through known-used entries
 *  — same time-saving reasoning as getFreshResidentAsset()'s fallback. */
export function nextMobileReuseResidentAsset() {
    const pool = getWorkerPartition(MOBILE_REUSE_ASSETS);
    const available = pool.filter(a => !a.used);
    if (available.length === 0) {
        console.warn('[RegistrationHelper] All mobile-reuse resident assets are flagged used — falling back to the general resident pool.');
        return nextResidentAsset();
    }
    return available[_mobileReuseIndex++ % available.length];
}

/** Picks a random mobile from the full pre-generated pool. */
export function generateKSAMobile(): string {
    const all = [...CITIZEN_ASSETS, ...RESIDENT_ASSETS];
    return all[Math.floor(Math.random() * all.length)].mobile;
}

// UAT test accounts from phone numbers.xlsx — Sheet1, uat-flagged rows — see data/registrationAssets.json
export const DEV_OTP_ASSETS = registrationAssets.uatOtpAssets;

let _uatOtpIndex = 0;

/** Returns the next UAT OTP test account in round-robin order (phone numbers.xlsx).
 *  Skips any asset already flagged `used` — same reasoning as `nextCitizenAsset`:
 *  a mobile that already went through the OTP flow can land on an
 *  "already registered" state instead of showing the OTP dialog. Falls back to
 *  the full pool once nothing matches so callers never hard-fail. */
export function nextUatOtpAsset() {
    const available = DEV_OTP_ASSETS.filter(a => !a.used);
    if (available.length === 0) {
        console.warn('[RegistrationHelper] All UAT OTP assets are flagged used — cycling the full pool again.');
        return DEV_OTP_ASSETS[_uatOtpIndex++ % DEV_OTP_ASSETS.length];
    }
    return available[_uatOtpIndex++ % available.length];
}

/** Marks a UAT OTP asset used and persists the flag to data/registrationAssets.json,
 *  mirroring `markCitizenAssetUsed`. */
export function markUatOtpAssetUsed(mobile: string): void {
    const asset = DEV_OTP_ASSETS.find(a => a.mobile === mobile);
    if (asset) (asset as { used?: boolean }).used = true;
    persistAssetUsedFlag('uatOtpAssets', mobile, true);
}

/** Picks an unused UAT OTP test mobile from phone numbers.xlsx (see `nextUatOtpAsset`). */
export function generateFreshKSAMobile(): string {
    const available = DEV_OTP_ASSETS.filter(a => !a.used);
    const pool = available.length > 0 ? available : DEV_OTP_ASSETS;
    return pool[Math.floor(Math.random() * pool.length)].mobile;
}
