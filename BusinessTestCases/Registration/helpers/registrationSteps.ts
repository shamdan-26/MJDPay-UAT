import { Page, Locator, expect } from '@playwright/test';
import { waitForToastClear } from '../../shared/toastMessages.ts';
import { RegistrationMobilePage } from '../../pageElements/Registration/RegistrationMobilePage';
import { RegistrationInfoPage } from '../../pageElements/Registration/RegistrationInfoPage';
import { RegistrationFinancialPage } from '../../pageElements/Registration/RegistrationFinancialPage';
import { RegistrationVerificationPage } from '../../pageElements/Registration/RegistrationVerificationPage';
import { RegistrationProductsPage } from '../../pageElements/Registration/RegistrationProductsPage';
import { REGISTER_URL, VALID_IBAN, VALID_VAT_NUMBER, TEST_FILE_BUFFER, generateEmail } from './registrationConfig';
import { DEDICATED_RESIDENT_ASSETS, GENERAL_RESIDENT_ASSETS, AssetAlreadyProgressedError, markResidentAssetUsed, getWorkerPartition, nextResidentAsset, generateKSAMobile } from './registrationAssets';
import { getOtpFromDb, fillOTP } from './registrationOtp';
import { selectRandomOption } from './registrationUi';
import { boxStep } from '../../shared/boxStep.ts';

/**
 * fill() followed by a verifying assertion, retried once. On a step that just
 * transitioned (mobile->OTP->Business Info, or a fresh page load), Angular can
 * still be re-rendering the reactive form when .fill() lands — its bootstrap
 * then silently resets the control back to empty right after, leaving Next
 * permanently disabled and the caller waiting out its full timeout instead of
 * failing fast. See goToInfoStep's mobile-field fix (RegistrationMobilePage)
 * for the same race on the previous step.
 */
export async function fillAndVerify(locator: Locator, value: string): Promise<void> {
    return boxStep('fillAndVerify', async () => {
        await locator.fill(value);
        try {
            await expect(locator).toHaveValue(value, { timeout: 3000 });
        } catch {
            await locator.fill(value);
            await expect(locator).toHaveValue(value);
        }
    });
}

/**
 * Fills Business Info (profile type, CRN, National ID, email) — does not click Next.
 * `merchant` clicks the id-based Merchant card (the accessible name is Arabic-only when the app
 * defaults to Arabic); anything else takes the first radio, which is Merchant (the only enabled card).
 */
export async function fillBusinessInfo(
    infoPage: RegistrationInfoPage,
    identity: { crn: string; nationalId: string },
    options: { profileType?: 'individual' | 'merchant'; email?: string } = {},
): Promise<void> {
    return boxStep('fillBusinessInfo', async () => {
        if (options.profileType === 'merchant') {
            await infoPage.merchantButton.click();
        } else {
            await infoPage.profileTypeGroup.getByRole('radio').first().click();
        }
        await fillAndVerify(infoPage.crnInput, identity.crn);
        await fillAndVerify(infoPage.idInput, identity.nationalId);
        await fillAndVerify(infoPage.emailInput, options.email ?? generateEmail());
    });
}

export async function goToInfoStep(page: Page, mobile?: string): Promise<void> {
    return boxStep('goToInfoStep', async () => {
        const usedMobile = mobile ?? generateKSAMobile();
        const mobilePage = new RegistrationMobilePage(page);
        await mobilePage.goto(REGISTER_URL);
        // Clear any in-progress application resumed from a previous identity on this
        // same page/context. The app persists registration state client-side, so a
        // plain re-navigation to REGISTER_URL isn't enough — retry loops that reuse
        // one page across many identities (goToFinancialStep, goToFinancialStepWithDedicatedAsset)
        // were observed resuming the FIRST identity's stuck application on every
        // later attempt regardless of the new mobile/CRN, making every attempt after
        // the first report the same outcome (see the RegistrationFinancialPage.spec.ts
        // hook-timeout failures this fixed — 19-20 consecutive 'products' outcomes
        // drawn from an 86%-fresh pool, statistically impossible without state leakage).
        await page.evaluate(() => localStorage.clear()).catch(() => {});
        await page.context().clearCookies();
        await mobilePage.goto(REGISTER_URL);
        await mobilePage.fillMobile(usedMobile);
        await mobilePage.submitMobile();
        const otpVisible = await page.getByRole('heading', { name: /Enter OTP|أدخل رمز التحقق/i })
            .waitFor({ state: 'visible', timeout: 20000 })
            .then(() => true)
            .catch(() => false);
        if (otpVisible) {
            await page.getByRole('textbox', { name: 'One time password input' }).first()
                .waitFor({ state: 'visible', timeout: 10000 });
            // getOtpFromDb() returns a fixed all-zero OTP in both dev and uat —
            // see its own comment for why the real IMAP/Azure fetch path is
            // skipped entirely for any mobile in either environment now.
            const otp = await getOtpFromDb(usedMobile);
            await fillOTP(page, otp);
            const verifyBtn = page.getByRole('button', { name: /Verify|تحقق/i });
            if (await verifyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await verifyBtn.click();
            }
        }
        await page.getByText(/Tell us about your business|أخبرنا عن نشاطك التجاري/i).waitFor({ state: 'visible', timeout: 60000 });
        await waitForToastClear(page);
    });
}

/**
 * Clicks Business Info's Next button while racing the network response for
 * the profile-registration-type submission it triggers, and reports whether
 * that submission was rejected as a conflict.
 *
 * Confirmed live via network capture: a mobile/CRN/National-ID combination
 * the backend already considers registered returns a 409 on
 * `POST .../register/profile-registration-type` with NO visible on-page
 * error text or toast — isAlreadyRegisteredMessage() (which only scans
 * rendered page text) can never catch this case. Every climb loop in this
 * file that calls infoPage.nextButton.click() directly instead of through
 * this helper shares that same blind spot: it silently treats an
 * already-registered pool asset as a mysterious dead end (financial/
 * verification never load, outcome races time out) rather than cycling to
 * the next asset the way the isAlreadyRegisteredMessage() path already does.
 * This was the real cause behind RegistrationNafath.spec.ts (and
 * its ui/RegistrationNafathPage.spec.ts sibling, which shares the same
 * un-fixed blind spot) repeatedly exhausting a single "fresh" pool asset
 * without ever detecting why.
 */
export async function submitBusinessInfo(
    page: Page,
    infoPage: RegistrationInfoPage
): Promise<{ conflict: boolean }> {
    return boxStep('submitBusinessInfo', async () => {
        const [response] = await Promise.all([
            page.waitForResponse(res => res.url().includes('/register/profile-registration-type'), { timeout: 15000 }).catch(() => null),
            infoPage.nextButton.click(),
        ]);
        return { conflict: response?.status() === 409 };
    });
}

export interface FinancialStepCredentials {
    mobile?: string;
    crn?: string;
    nationalId?: string;
    profileType?: 'individual' | 'merchant';
    email?: string;
}

/**
 * True when the page shows a "this identity is already registered" style
 * rejection. The CRN/National ID pools in this file are shared and reused
 * (round-robin) across every test run, so an asset ending up already
 * registered — because a prior run completed a full sign-up with it — is
 * expected steady-state, not a failure.
 */
export function isAlreadyRegisteredMessage(text: string | null | undefined): boolean {
    if (!text) return false;
    // The app defaults to Arabic, so the rejection is usually seen as e.g.
    // "الملف الشخصي موجود بالفعل." (profile already exists) rather than English.
    return /already\s*(registered|exists|have an account|in use|associated)|duplicate\s*(registration|account|profile)?/i.test(text)
        || /موجود\s*بالفعل|مسجل\s*(مسبقا|مسبقاً|بالفعل)|مكرر/.test(text);
}

/** Resolves with the mobile of the identity that reached the Financial & Business step. */
export async function goToFinancialStep(page: Page, credentials?: FinancialStepCredentials): Promise<string> {
    return boxStep('goToFinancialStep', async () => {
    // Only the default round-robin pool is safe to retry across — an explicit
    // crn/nationalId means the caller is deliberately testing a specific
    // (often intentionally invalid) identity and must not be silently swapped.
    //
    // Not capped: each asset found already used is marked (see markResidentAssetUsed) so
    // future runs skip it for free, and the loop moves on to the next one until an unused
    // asset is found. It is bounded by this worker's partition (not the full unpartitioned
    // pool) and by the caller's test/hook timeout.
    const usingDefaultIdentity = !credentials?.crn && !credentials?.nationalId;
    // Keeps going through the worker's whole slice: every already-used asset is marked and
    // skipped, and the loop only stops once an unused one is found (or the slice is spent).
    const maxAttempts = usingDefaultIdentity ? getWorkerPartition(GENERAL_RESIDENT_ASSETS).length : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const asset = nextResidentAsset();
        const mobile     = credentials?.mobile     ?? asset.mobile;
        const crn        = credentials?.crn        ?? asset.crn;
        const nationalId = credentials?.nationalId ?? asset.nationalId;

        // The retry loop below can legitimately take several minutes across
        // maxAttempts (each a full mobile->OTP->Business Info round trip) — with
        // no visible output, a multi-attempt run is indistinguishable from a hang.
        console.log(`[goToFinancialStep] attempt ${attempt}/${maxAttempts} — mobile=${mobile}`);

        await goToInfoStep(page, mobile);

        const infoPage = new RegistrationInfoPage(page);
        await fillBusinessInfo(infoPage, { crn, nationalId }, { profileType: credentials?.profileType, email: credentials?.email });
        await infoPage.nextButton.click();

        const financialPage = new RegistrationFinancialPage(page);
        await financialPage.loadingButton.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
        const products = new RegistrationProductsPage(page);
        // Races against products.productCards (.mp-product-card), not
        // products.formSubTitle (.form-sub-title) — that class is shared by
        // every wizard step's header, including Financial & Business' own
        // subtitle, so racing it against monthlyBillsInput produced a false
        // 'products' read on nearly every attempt regardless of which step
        // actually loaded (confirmed live: a run's failure snapshot showed the
        // browser genuinely sitting on the Financial form after being
        // misdetected as 'products' moments earlier). productCards only
        // renders on the real Products step.
        const outcome = await Promise.race([
            financialPage.monthlyBillsInput.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'financial' as const),
            products.productCards.first().waitFor({ state: 'visible', timeout: 20000 }).then(() => 'products' as const),
        ]).catch(() => 'neither' as const);
        console.log(`[goToFinancialStep] attempt ${attempt}/${maxAttempts} — outcome=${outcome}`);
        if (outcome === 'financial') return mobile;

        if (usingDefaultIdentity && outcome === 'products') {
            // Shared/reused pool asset had already progressed past Business Info
            // (straight to Products) in a prior run — expected steady-state for
            // this pool, same as the already-registered case below. Persist so
            // future runs skip it via nextResidentAsset() instead of rediscovering it.
            markResidentAssetUsed(mobile, 'products');
            if (attempt < maxAttempts) continue;
            // Every asset in the pool has now progressed past Business Info — this is
            // pool exhaustion, not a backend rejection. Thrown separately from the
            // generic error below so callers aren't misled into debugging a
            // nonexistent regression (the page shows Products, not a rejection).
            throw new Error(
                `goToFinancialStep: exhausted all ${maxAttempts} RESIDENT_ASSETS — every pool asset has ` +
                `already progressed past Business Info straight to Products. Add fresh assets to ` +
                `RESIDENT_ASSETS or free up ones marked 'products' in data/registrationAssets.json.`
            );
        }

        if (outcome === 'products') {
            // Explicit (non-default) identity — the caller passed a specific
            // mobile/crn/nationalId, so there's no pool to cycle through (see
            // maxAttempts above). The page resumed straight to Products, which
            // is a legitimate prior-progress state, not a backend rejection —
            // thrown separately so callers aren't misled by the generic
            // "rejected by the backend" error below into debugging a
            // nonexistent validation failure.
            throw new AssetAlreadyProgressedError(
                `goToFinancialStep: identity already progressed past Business Info straight to ` +
                `Products (not a backend rejection). CRN=${crn}, ID=${nationalId}, Mobile=${mobile}.`
            );
        }

        const errorMsg = await page.evaluate(() => document.body.innerText).catch(() => '(unknown)');

        if (usingDefaultIdentity && isAlreadyRegisteredMessage(errorMsg)) {
            // Valid, expected outcome for a shared/reused pool asset — persist and try the next one.
            markResidentAssetUsed(mobile, 'already-registered');
            if (attempt < maxAttempts) continue;
            // Every asset in the pool is already registered — pool exhaustion, not a
            // fresh backend rejection worth investigating as a regression.
            throw new Error(
                `goToFinancialStep: exhausted all ${maxAttempts} RESIDENT_ASSETS — every pool asset is ` +
                `already registered. Add fresh assets to RESIDENT_ASSETS.`
            );
        }

        throw new Error(
            `Business Info step was rejected by the backend` +
            (usingDefaultIdentity ? ` after ${attempt} attempt(s)` : '') + `.\n` +
            `CRN=${crn}, ID=${nationalId}, Mobile=${mobile}.\n` +
            `Page text: ${errorMsg?.slice(0, 300)}`
        );
    }
    throw new Error('goToFinancialStep: no attempts were made (empty resident pool).');
    });
}

const DEDICATED_FALLBACK_THRESHOLD = 5;

// If this many attempts IN A ROW land on 'products' — spanning BOTH the
// dedicated pool and (after DEDICATED_FALLBACK_THRESHOLD) the general pool —
// bail out rather than burning the rest of maxAttempts / the 600s hook
// timeout. Originally added chasing what looked like systemic pool
// exhaustion (every run producing 16-20/20 straight 'products' outcomes,
// unaffected by clearing localStorage/cookies) — the real cause turned out
// to be goToFinancialStep's outcome race matching products.formSubTitle
// (.form-sub-title), a class shared by every wizard step's own header
// including Financial's, so it false-won the race almost every attempt
// regardless of which step actually loaded (fixed: races productCards
// instead, which only renders on the real Products step). Kept as a
// defensive cap for genuine pool exhaustion now that the false-positive
// source is gone.
const SYSTEMIC_FAILURE_THRESHOLD = 8;

/**
 * Drives goToFinancialStep for a caller that wants one dedicated identity of
 * its own (see getFreshResidentAsset), retrying across the reserved
 * DEDICATED_RESIDENT_ASSETS pool if a given asset turns out to have already
 * progressed past Business Info. That pool predates full used-flag tracking
 * (see markResidentAssetUsed) — a `used:false` entry can still turn out to
 * already be spent on the live UAT backend — so a single fixed pick isn't
 * reliable even when it's the only caller that ever draws it.
 *
 * Re-derives the available (used:false) set fresh on every attempt — rather
 * than filtering once up front and walking the result in order — so each
 * pick reflects every mark made so far this run (including ones just made
 * this loop) before it's attempted, and picks randomly among what's left
 * rather than sequentially, so a stale stretch in the pool doesn't get
 * walked in the same order attempt after attempt. Marks each discovered-stale
 * asset 'products' as it's found so later runs skip it too.
 *
 * Capped at 20 attempts rather than the full (60-asset) pool: live checks
 * have turned up a real stale rate well above what the local used:false
 * flags suggest (a pre-run check of this pool counted 12/60 already
 * 'products' — the same run then discovered 4 more among the 48 it thought
 * were fresh). Genuinely walking all 60 would be ~20-30 min of real UAT
 * round trips per test run. If 20 isn't enough, the fix is refreshing this
 * dataset against live backend state, not raising the cap further — see the
 * project's own conclusion on the shared pool for the same reasoning.
 *
 * Bails out of the dedicated pool early (DEDICATED_FALLBACK_THRESHOLD
 * consecutive already-progressed hits) rather than spending all maxAttempts
 * inside it: a run confirmed 18/60 dedicated assets already-progressed in a
 * single pass, and a bad random draw can chain enough of that stale 30% back
 * to back to burn the whole beforeEach timeout before ever reaching a fresh
 * one — see the RegistrationFinancialPage.spec.ts hook-timeout failure this
 * fixed. GENERAL_RESIDENT_ASSETS (nextResidentAsset()'s pool, ~900+ assets)
 * is checked flag-first the same way and is large enough that a fresh draw
 * is far more likely on the first try, so falling back there for the
 * remaining attempts trades a little of this pool's isolation guarantee for
 * a bounded worst-case runtime.
 */
export async function goToFinancialStepWithDedicatedAsset(page: Page): Promise<void> {
    return boxStep('goToFinancialStepWithDedicatedAsset', async () => {
    const maxAttempts = Math.min(DEDICATED_RESIDENT_ASSETS.length, 20);
    let dedicatedFailures = 0;
    let totalFailures = 0;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (totalFailures >= SYSTEMIC_FAILURE_THRESHOLD) {
            throw new Error(
                `goToFinancialStepWithDedicatedAsset: ${totalFailures} consecutive attempts across both the ` +
                `dedicated and general pools landed on Products — genuine pool exhaustion across both a small ` +
                `reserved pool and the much larger general pool simultaneously is very unlikely. If this fires ` +
                `again after a fresh DEDICATED_RESIDENT_ASSETS pool, re-check goToFinancialStep's outcome race ` +
                `for another false-positive 'products' match before assuming the pool is exhausted.`
            );
        }
        const dedicatedAvailable = DEDICATED_RESIDENT_ASSETS.filter(a => !a.used);
        const useFallbackPool = dedicatedFailures >= DEDICATED_FALLBACK_THRESHOLD || dedicatedAvailable.length === 0;
        const asset = useFallbackPool ? nextResidentAsset() : dedicatedAvailable[Math.floor(Math.random() * dedicatedAvailable.length)];
        console.log(`[goToFinancialStepWithDedicatedAsset] attempt ${attempt}/${maxAttempts} — mobile=${asset.mobile}${useFallbackPool ? ' (general pool fallback)' : ''}`);
        try {
            await goToFinancialStep(page, { mobile: asset.mobile, crn: asset.crn, nationalId: asset.nationalId });
            return;
        } catch (err) {
            if (err instanceof AssetAlreadyProgressedError) {
                markResidentAssetUsed(asset.mobile, 'products');
                if (!useFallbackPool) dedicatedFailures++;
                totalFailures++;
                if (attempt < maxAttempts) continue;
                throw new Error(
                    `goToFinancialStepWithDedicatedAsset: exhausted ${maxAttempts} attempts — every asset tried ` +
                    `had already progressed past Business Info. Refresh DEDICATED_RESIDENT_ASSETS' underlying ` +
                    `data or raise DEDICATED_ASSET_POOL_SIZE.`
                );
            }
            throw err;
        }
    }
    });
}

export async function goToVerificationStep(page: Page): Promise<void> {
    return boxStep('goToVerificationStep', async () => {
        await goToFinancialStep(page);
        await fillFinancialForm(page);
        await new RegistrationFinancialPage(page).next();
        await new RegistrationVerificationPage(page).waitForLoad();
    });
}

export async function fillFinancialForm(page: Page): Promise<void> {
    return boxStep('fillFinancialForm', async () => {
        const financialPage = new RegistrationFinancialPage(page);
        await financialPage.fill('1500', '50000', '10000', '20000');

        // Only Industries (index 0) and Annual Income (index 1) render on this
        // step — there is no separate Banks select to fill.
        await selectRandomOption(page, page.locator('#mat-select-value-0'));
        await selectRandomOption(page, page.locator('#mat-select-value-1'));
    });
}

/** Fills the Verification & Uploads step (Tab 3): bank, IBAN, VAT number, and
 *  every file-upload input on the panel. Does not submit — callers click
 *  signUpButton themselves once the form is filled. */
export async function fillVerificationForm(page: Page): Promise<void> {
    return boxStep('fillVerificationForm', async () => {
        const verificationPage = new RegistrationVerificationPage(page);
        await verificationPage.waitForLoad();

        if (await verificationPage.bankDropdown.count() > 0) {
            await selectRandomOption(page, verificationPage.bankDropdown.first());
        }
        await verificationPage.ibanInput.fill(VALID_IBAN);
        await verificationPage.vatInput.fill(VALID_VAT_NUMBER);

        const fileInputs = page.locator('input[type="file"]');
        const fileInputCount = await fileInputs.count();
        for (let i = 0; i < fileInputCount; i++) {
            const fileName = `doc${i}.pdf`;
            await fileInputs.nth(i)
                .setInputFiles({ name: fileName, mimeType: 'application/pdf', buffer: TEST_FILE_BUFFER })
                .catch(() => {});
            // Confirmed live (RegistrationVerificationUploads.spec.ts): setInputFiles()
            // resolves once the DOM input holds the file, NOT once the app's own
            // async upload finishes — callers clicking Sign Up right after this loop
            // used to race that upload and find it still disabled. Wait for each
            // filename to actually render (the app's own "Uploaded" confirmation)
            // before moving on, same fix already applied at that call site.
            await page.getByText(fileName).waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
        }
    });
}
