import { Page } from '@playwright/test';
import { RegistrationInfoPage } from '../../pageElements/Registration/RegistrationInfoPage';
import { RegistrationFinancialPage } from '../../pageElements/Registration/RegistrationFinancialPage';
import { RegistrationVerificationPage } from '../../pageElements/Registration/RegistrationVerificationPage';
import { RegistrationProductsPage } from '../../pageElements/Registration/RegistrationProductsPage';
import { RegistrationNafathPage } from '../../pageElements/Registration/RegistrationNafathPage';
import { RegistrationContractPage } from '../../pageElements/Registration/RegistrationContractPage';
import { CITIZEN_ASSETS, markCitizenAssetUsed, getWorkerPartition, nextCitizenAsset } from './registrationAssets';
import { fillBusinessInfo, goToInfoStep, isAlreadyRegisteredMessage, fillFinancialForm, fillVerificationForm } from './registrationSteps';
import { boxStep } from '../../shared/boxStep.ts';

/**
 * The mobile number of whichever CITIZEN_ASSETS entry `goToProductsStep`
 * most recently succeeded with — set on every loop iteration, not just on
 * return, so it's already correct by the time any of that function's several
 * `return true` points fires. Exposed as a side-channel (`lastReachedAssetMobile`)
 * rather than added to `goToProductsStep`'s own return value: that value is a
 * bare boolean asserted directly (`expect(reachedProducts).toBe(true)`) by six
 * other call sites across this suite, so widening it to an object would break
 * every one of them. A caller that needs to know which identity was actually
 * used (e.g. to look its record up afterward in the database) reads this
 * immediately after `goToProductsStep`/`goToContractStep` resolves.
 */
let lastReachedAssetMobile: string | null = null;
export function lastReachedCitizenAssetMobile(): string | null {
    return lastReachedAssetMobile;
}

/**
 * Drives the registration wizard forward until it lands on the outer Products
 * step (step 3 of 4), cycling to a new CITIZEN_ASSETS mobile whenever the
 * current one resumes past Products instead — onto Contract. CITIZEN_ASSETS is
 * a shared, reused pool, so a mobile resuming mid-flow is expected steady-state,
 * not a failure: Financial & Business and Verification & Uploads are filled
 * through with fillFinancialForm()/fillVerificationForm() whenever they appear
 * along the way, in case a given mobile pauses there instead of at
 * Products/Contract/NAFATH.
 *
 * Races Products/Contract/NAFATH in one bounded wait per attempt rather than
 * waiting on Products alone first — a mobile that resumes straight to Contract
 * would otherwise burn a long Products-only timeout before anyone noticed it
 * wasn't going to appear.
 *
 * Hitting the real NAFATH panel is not a dead end: its Verify button starts
 * disabled and enables once the redirect countdown expires (EMI-4895/
 * EMI-4937), so we wait that out and click it — the happy path in this
 * environment — before checking whether Products (or Contract) followed.
 *
 * Returns true once Products is reached, false if maxAttempts is exhausted
 * without landing there.
 *
 * `landOnContractOk` — when true, a mobile that resumes straight past Products
 * to Contract counts as success too (returns true immediately) instead of being
 * discarded and cycled past. goToContractStep() passes this since Contract is
 * its actual target anyway; skipping the extra full registration attempt saves
 * ~30-45s per asset that would otherwise be wasted only to re-derive the same
 * destination. Other callers (which specifically need the Products panel) leave
 * this false.
 */
export async function goToProductsStep(page: Page, maxAttempts = getWorkerPartition(CITIZEN_ASSETS).length, landOnContractOk = false): Promise<boolean> {
    return boxStep('goToProductsStep', async () => {
    const products = new RegistrationProductsPage(page);
    const financialPage = new RegistrationFinancialPage(page);
    // Scoped to products.productCards (.mp-product-card), not products.formSubTitle
    // (.form-sub-title) — that class is shared by every wizard step's own header,
    // including Business Info's, so racing it below could false-win as 'products'
    // if the flow unexpectedly lands back on an earlier step instead (confirmed
    // live: a RegistrationProductsPage.spec.ts run read Business Info's own title
    // ("أخبرنا عن نشاطك التجاري") through this same shared-class hole — see the
    // identical fix in goToFinancialStep's outcome race). productCards only
    // renders on the real Products step. A raw page.getByText() text search isn't
    // an option either — it's ambiguous on this app (likely an Angular CDK a11y
    // live-announcer duplicate of the same string elsewhere in the DOM), which
    // throws a strict-mode violation that Promise.race's .catch() below silently
    // swallows as 'neither', even when Products has clearly rendered.
    const productsHeading = products.productCards.first();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // When landing on Contract is an acceptable outcome (goToContractStep's
        // actual target), also reuse assets already flagged `contract` — they
        // resume straight there, same as `products`-flagged ones do for the
        // Products-only callers. Without this, goToContractStep could never
        // reuse its own previously-discovered fast path and had to burn a full
        // fresh registration attempt (risking a real NAFATH dead end) every time.
        const asset = nextCitizenAsset(landOnContractOk ? ['products', 'contract'] : 'products');
        lastReachedAssetMobile = asset.mobile;
        console.log(`[goToProductsStep] attempt ${attempt}/${maxAttempts} — mobile ${asset.mobile} (used=${(asset as { used?: unknown }).used ?? 'unused'})`);
        await goToInfoStep(page, asset.mobile);

        const infoPage = new RegistrationInfoPage(page);
        await fillBusinessInfo(infoPage, asset);
        await infoPage.nextButton.click();
        await financialPage.loadingButton.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});

        // Check for an "already registered" rejection right away — it renders as a
        // toast that auto-dismisses within seconds, so it must be read before sinking
        // ~50s into the Financial/Verification/Contract/NAFATH waits below, by which
        // point it would have already disappeared from document.body.innerText.
        const infoStepText = await page.evaluate(() => document.body.innerText).catch(() => '');
        if (isAlreadyRegisteredMessage(infoStepText)) {
            markCitizenAssetUsed(asset.mobile, 'already-registered');
            continue;
        }

        const reachedFinancial = await financialPage.monthlyBillsInput
            .waitFor({ state: 'visible', timeout: 15000 })
            .then(() => true)
            .catch(() => false);

        if (reachedFinancial) {
            await fillFinancialForm(page);
            await financialPage.next();
        }

        const verificationPage = new RegistrationVerificationPage(page);
        const reachedVerification = await verificationPage.ibanInput
            .waitFor({ state: 'visible', timeout: 15000 })
            .then(() => true)
            .catch(() => false);

        if (reachedVerification) {
            await fillVerificationForm(page);
            await verificationPage.signUpButton.click();
            await financialPage.loadingButton.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
        }

        const contractStep = products.activeStep.filter({ hasText: 'العقد' });
        const nafathPage = new RegistrationNafathPage(page);

        const landedOn = await Promise.race([
            productsHeading.waitFor({ state: 'visible', timeout: 40000 }).then(() => 'products' as const),
            contractStep.waitFor({ state: 'visible', timeout: 40000 }).then(() => 'contract' as const),
            nafathPage.nafathHeading.waitFor({ state: 'visible', timeout: 40000 }).then(() => 'nafath' as const),
        ]).catch(() => 'neither' as const);
        console.log(`[goToProductsStep] attempt ${attempt} landed on: ${landedOn}`);

        if (landedOn === 'products') {
            // Confirmed live: an asset whose product selection was already submitted
            // in an earlier run (e.g. driven through goToContractStep's Products
            // Continue button) renders the Products heading only as a brief flicker
            // before the app auto-advances it to Contract on its own — the race
            // above can catch that flicker and misreport 'products' for an asset
            // that's actually already past it (confirmed via DOM dump: the "landed
            // on products" page.content() was byte-identical to a Contract-page
            // dump). Give reused `products`-flagged assets a short settle window to
            // rule that out before trusting the landing; skip it for brand-new
            // assets, which can't have this history yet and would otherwise pay a
            // pure timeout tax on every single successful landing.
            const isReusedAsset = asset.used === 'products';
            if (isReusedAsset) {
                const advancedToContract = await contractStep.waitFor({ state: 'visible', timeout: 5000 })
                    .then(() => true)
                    .catch(() => false);
                if (advancedToContract) {
                    console.log(`[goToProductsStep] attempt ${attempt} — 'products' was a flicker, actually already on contract`);
                    markCitizenAssetUsed(asset.mobile, 'contract');
                    if (landOnContractOk) return true;
                    continue;
                }
            }
            markCitizenAssetUsed(asset.mobile, 'products');
            return true;
        }
        if (landedOn === 'contract') {
            markCitizenAssetUsed(asset.mobile, 'contract');
            if (landOnContractOk) return true;
            continue;
        }

        if (landedOn === 'nafath') {
            // Reaching real NAFATH is itself a dead end for automation (it requires
            // biometric verification), so this identity is spent for future runs
            // regardless of what the click below does — mark it now.
            markCitizenAssetUsed(asset.mobile, 'nafath');

            // Happy path: the Verify button starts disabled and only enables once
            // the redirect countdown expires (EMI-4895 — see
            // RegistrationNafath.spec.ts). The wait is sized from the
            // live timer (waitForCountdownToFinish), so it holds whatever the
            // countdown duration currently is.
            console.log(`[goToProductsStep] attempt ${attempt} hit NAFATH — clicking Verify`);
            await nafathPage.waitForCountdownToFinish();
            const verified = await nafathPage.verifyButton.click({ timeout: 30000 }).then(() => true).catch(() => false);
            console.log(`[goToProductsStep] attempt ${attempt} NAFATH verify click ${verified ? 'succeeded' : 'failed'}`);
            if (!verified) continue;

            const postNafathLandedOn = await Promise.race([
                productsHeading.waitFor({ state: 'visible', timeout: 40000 }).then(() => 'products' as const),
                contractStep.waitFor({ state: 'visible', timeout: 40000 }).then(() => 'contract' as const),
            ]).catch(() => 'neither' as const);
            console.log(`[goToProductsStep] attempt ${attempt} post-NAFATH landed on: ${postNafathLandedOn}`);

            if (postNafathLandedOn === 'products') return true;
            if (postNafathLandedOn === 'contract') {
                if (landOnContractOk) return true;
                continue;
            }

            // Neither Products nor Contract appeared after a successful NAFATH
            // verify — most likely an "already registered" rejection with no
            // recognizable panel, same as the outer 'neither' check below. Only
            // cycle when that's confirmed; otherwise this is a genuine
            // post-NAFATH regression, so fail fast instead of burning the rest
            // of maxAttempts retrying blindly.
            const postNafathText = await page.evaluate(() => document.body.innerText).catch(() => '');
            if (!isAlreadyRegisteredMessage(postNafathText)) return false;
            continue;
        }

        // Neither Products, Contract, nor NAFATH appeared — most likely an
        // "already registered" rejection with no recognizable panel, but could
        // also just be a slow-loading attempt on this one asset. Either way,
        // cycle to the next asset instead of treating a single inconclusive
        // attempt as an unexpected failure — maxAttempts already bounds the
        // whole climb, and the final `return false` after the loop covers
        // genuine exhaustion. (Previously this returned false immediately for
        // the non-already-registered case, contradicting this very comment and
        // giving up after a single attempt instead of using the other 9 — see
        // the RegistrationProductsPage.spec.ts beforeAll failure this fixed.)
        const pageText = await page.evaluate(() => document.body.innerText).catch(() => '');
        if (isAlreadyRegisteredMessage(pageText)) {
            markCitizenAssetUsed(asset.mobile, 'already-registered');
        } else {
            console.log(`[goToProductsStep] attempt ${attempt} — landed on neither Products/Contract/NAFATH and no already-registered message; cycling to the next asset.`);
        }
    }
    return false;
    });
}

/**
 * Drives the wizard to the Contract step: reaches Products via goToProductsStep,
 * then clicks its Continue button — confirmed live to skip the PoS sub-flow
 * straight to Contract when the "Request devices now" checkbox is left
 * unchecked (see RegistrationProductsPage's skipSetupLaterButton comment).
 * Throws if Products was never reached (goToProductsStep exhausted its
 * attempts) rather than silently landing nowhere.
 *
 * Returns the mobile number of the identity that actually got there — every
 * existing caller was a bare `await goToContractStep(page);` with the prior
 * `Promise<void>` return discarded, so returning this instead is not a
 * breaking change. Lets a caller look up that identity's own record
 * afterward (e.g. in emi_profile's SQL tables) without having to guess which
 * of the CITIZEN_ASSETS pool's ~2000 entries goToProductsStep landed on.
 */
export async function goToContractStep(page: Page): Promise<string> {
    return boxStep('goToContractStep', async () => {
    const reachedProducts = await goToProductsStep(page, undefined, true);
    if (!reachedProducts) {
        throw new Error('Could not reach the Products step, so the Contract step is unreachable.');
    }
    const mobile = lastReachedCitizenAssetMobile();
    if (!mobile) {
        throw new Error('goToProductsStep reported success but recorded no identity — lastReachedCitizenAssetMobile() was never set.');
    }

    const contractPage = new RegistrationContractPage(page);
    const products = new RegistrationProductsPage(page);
    // landOnContractOk means goToProductsStep may have already resolved straight
    // onto Contract (mobile resumed past Products) — only click through Products'
    // Continue button when we're actually still on it. A one-shot isVisible()
    // check here raced the page: a `products`-landed asset that had already
    // completed the PoS step on a prior run auto-advances off Products on its
    // own, so by the time isVisible() ran neither the Contract heading nor the
    // Products Continue button was necessarily up yet, and the click below would
    // wait 20s for a button that had already been swept off the page. Racing the
    // two locators (each with its own bounded wait) instead of a single instant
    // snapshot lets whichever one actually renders win.
    // skipSetupLaterButton (testid register-products-continue-btn) is the
    // confirmed Products-step Continue control — products.continueButton is
    // ambiguous with the Devices & Delivery panel's own "متابعة" button.
    const initialState = await Promise.race([
        contractPage.agreementHeading.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'contract' as const),
        products.skipSetupLaterButton.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'products' as const),
    ]).catch(() => 'neither' as const);
    console.log(`[goToContractStep] initial state: ${initialState}`);

    if (initialState === 'products') {
        console.log('[goToContractStep] clicking Products skipSetupLaterButton to advance to Contract');
        await products.skipSetupLaterButton.click({ timeout: 20000 }).catch(() => {
            console.log('[goToContractStep] skipSetupLaterButton click failed/no-op — button may have already been swept off the page; falling through to waitForLoad');
        });
        console.log('[goToContractStep] skipSetupLaterButton click resolved');
    }

    console.log('[goToContractStep] waiting for contract agreementHeading to render');
    await contractPage.waitForLoad();
    console.log('[goToContractStep] contract page loaded');
    return mobile;
    });
}
