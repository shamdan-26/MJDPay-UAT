import type { Page } from '@playwright/test';

/**
 * Bill Beneficiary Management (EMI-185, epic EMI-2192 / EMI-4382) — admin users
 * add, view, filter, edit, and delete beneficiaries (Alias + CRN) reused when
 * paying bills. Reuses the general Business fixture account since no
 * dedicated beneficiary-management account/data set exists yet in this repo.
 *
 * Later feature tickets folded in here: EMI-3699 (Manage Beneficiary flow),
 * EMI-3736 (beneficiaryStatus became an object), EMI-4431/EMI-4432 (add a
 * customer as a beneficiary by phone number; contract optional),
 * EMI-4435/EMI-4436 (role-based approve / reject), EMI-5376 (identifier shown
 * on beneficiary pages).
 *
 * ── Endpoint provenance ──────────────────────────────────────────────────
 * Confirmed real, taken from ticket curl blocks and AC tables:
 *   GET  /api/v1/beneficiary?page&size&statusCode   (EMI-5652 curl, EMI-3736)
 *   PUT  /api/v1/beneficiary/approve                (EMI-4436 AC table)
 *   PUT  /api/v1/beneficiary/reject                 (EMI-4436 AC table)
 *   POST /api/v1/beneficiary-otp                    (EMI-5864 curl)
 *   POST /api/v1/beneficiary-otp/resend             (EMI-5769 curl)
 * Locators in pageElements/BeneficiaryManagement/ remain best-effort —
 * Beneficiary management is in QA-DATA-TESTID-HANDOFF.md §5 ("not yet
 * covered"), so reconcile against the live DOM before CI gating.
 */

export const BASE_URL = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';
export const HOME_URL = `${BASE_URL}/business/main/home`;
export const BENEFICIARY_URL = `${BASE_URL}/business/main/manage-beneficiary`;

export const BENEFICIARY_API         = '**/api/v1/beneficiary**';
export const BENEFICIARY_APPROVE_API = '**/api/v1/beneficiary/approve';
export const BENEFICIARY_REJECT_API  = '**/api/v1/beneficiary/reject';
export const BENEFICIARY_OTP_API     = '**/api/v1/beneficiary-otp';
export const BENEFICIARY_OTP_RESEND_API = '**/api/v1/beneficiary-otp/resend';

/** Privilege codes named in the EMI-4436 AC table. */
export const APPROVE_PRIVILEGE = 'BILLER_APPROVE_BENEFICIARIES';
export const REJECT_PRIVILEGE  = 'BILLER_REJECT_BENEFICIARIES';

export function uniqueAlias(prefix = 'QA-BEN'): string {
    return `${prefix}-${Date.now()}`.slice(0, 15);
}

// A CRN belonging to a fixture account known to exist in UAT, so the profile
// lookup step (Alias + CRN -> Brand name) resolves successfully.
export const KNOWN_CRN = process.env['BENEFICIARY_KNOWN_CRN'] ?? '';
export const UNKNOWN_CRN = '9999999999';

/** Individual mobile used in the EMI-4741 repro for "add an individual". */
export const KNOWN_INDIVIDUAL_MOBILE = process.env['BENEFICIARY_KNOWN_MOBILE'] ?? '501350736';

export type BeneficiaryStatusCode = 'PENDING' | 'APPROVED' | 'REJECTED';

/** EMI-3736: beneficiaryStatus is an object now, not a plain string. */
export function beneficiaryStatus(code: BeneficiaryStatusCode) {
    return { code, nameEn: code.charAt(0) + code.slice(1).toLowerCase(), nameAr: `ar_${code}` };
}

export interface MockBeneficiary {
    id: number;
    /** EMI-5376 / EMI-5128 / EMI-5652: the identifier must come back and render. */
    beneficiaryIdentifier: string;
    /** EMI-5142: the list must show the alias, not the company/brand name. */
    alias: string;
    brandName: string;
    crn: string;
    mobileNumber?: string | null;
    beneficiaryStatus: ReturnType<typeof beneficiaryStatus>;
    contractUrl?: string | null;
}

export function mockBeneficiary(overrides: Partial<MockBeneficiary> & { alias: string }): MockBeneficiary {
    return {
        id: Math.floor(Math.random() * 100000),
        beneficiaryIdentifier: `BEN-${overrides.alias.replace(/\W/g, '').toUpperCase()}`,
        brandName: `${overrides.alias} Trading Co`,
        crn: '1088776608',
        mobileNumber: null,
        beneficiaryStatus: beneficiaryStatus('APPROVED'),
        contractUrl: null,
        ...overrides,
    };
}

/**
 * Issues a request from inside the page so page.route() mocks apply.
 * page.request.* is a separate API context that bypasses routing entirely and
 * would hit the real gateway — same reason SubWalletsHelper.ts has this.
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

export async function gotoBeneficiaries(page: Page): Promise<void> {
    await page.goto(BENEFICIARY_URL);
    await page.waitForLoadState('domcontentloaded');
}

// ── List & status filter ─────────────────────────────────────────────────

export function defaultBeneficiaries(): MockBeneficiary[] {
    return [
        mockBeneficiary({ alias: 'QA-APPROVED', beneficiaryStatus: beneficiaryStatus('APPROVED') }),
        mockBeneficiary({ alias: 'QA-PENDING',  beneficiaryStatus: beneficiaryStatus('PENDING') }),
        mockBeneficiary({ alias: 'QA-REJECTED', beneficiaryStatus: beneficiaryStatus('REJECTED') }),
    ];
}

/**
 * EMI-3736 / EMI-4812: the list honours the `statusCode` query param, so a UI
 * that drops it gets the full set back and the filter assertions fail.
 * EMI-4805 also depends on this: clearing the filter must not resurrect
 * REJECTED rows into a Select Beneficiary context.
 */
export async function mockBeneficiaryList(page: Page, all = defaultBeneficiaries()): Promise<void> {
    await page.route(BENEFICIARY_API, route => {
        if (route.request().method() !== 'GET') return route.fallback();
        const requested = new URL(route.request().url()).searchParams.get('statusCode');
        const content = requested ? all.filter(b => b.beneficiaryStatus.code === requested) : all;
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ content, totalElements: content.length }),
        });
    });
}

/** EMI-4812 pre-fix state: statusCode ignored, everything comes back. */
export async function mockBeneficiaryListIgnoringStatusFilter(page: Page, all = defaultBeneficiaries()): Promise<void> {
    await page.route(BENEFICIARY_API, route => {
        if (route.request().method() !== 'GET') return route.fallback();
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ content: all, totalElements: all.length }),
        });
    });
}

/** EMI-5652 / EMI-5376 / EMI-5128 pre-fix state: identifier missing from the payload. */
export async function mockBeneficiaryListWithoutIdentifier(page: Page): Promise<void> {
    const stripped = defaultBeneficiaries().map(({ beneficiaryIdentifier: _ignored, ...rest }) => rest);
    await page.route(BENEFICIARY_API, route => {
        if (route.request().method() !== 'GET') return route.fallback();
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ content: stripped, totalElements: stripped.length }),
        });
    });
}

/** EMI-5130: a maker with the view privilege must see the admin's beneficiaries. */
export async function mockBeneficiaryListForbidden(page: Page): Promise<void> {
    await page.route(BENEFICIARY_API, route => {
        if (route.request().method() !== 'GET') return route.fallback();
        return route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify([{ httpStatusCode: 403, message: { messageCode: 'UNAUTHORIZED_EXCEPTION', plainText: 'You are not authorized to access this resource.' } }]),
        });
    });
}

// ── Add beneficiary ──────────────────────────────────────────────────────

export async function mockAddBeneficiarySuccess(page: Page, created = mockBeneficiary({ alias: 'QA-NEW' })): Promise<void> {
    await page.route(BENEFICIARY_API, route => {
        if (route.request().method() === 'POST') {
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(created) });
        }
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ content: [created], totalElements: 1 }),
        });
    });
}

/** EMI-3686 / EMI-4414: a genuine duplicate must be rejected with a real message. */
export async function mockAddBeneficiaryDuplicate(page: Page): Promise<void> {
    await page.route(BENEFICIARY_API, route => {
        if (route.request().method() !== 'POST') return route.fallback();
        return route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ messageCode: 'BENEFICIARY_ALREADY_EXISTS', plainText: 'This beneficiary has already been added' }),
        });
    });
}

/** EMI-3686 pre-fix state: the duplicate returned 200 with a success message. */
export async function mockAddBeneficiaryDuplicateAccepted(page: Page): Promise<void> {
    await page.route(BENEFICIARY_API, route => {
        if (route.request().method() !== 'POST') return route.fallback();
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockBeneficiary({ alias: 'QA-DUP' })) });
    });
}

/** EMI-4414 pre-fix state: a genuinely new beneficiary was wrongly told it exists. */
export async function mockAddBeneficiaryFalseAlreadyExists(page: Page): Promise<void> {
    await mockAddBeneficiaryDuplicate(page);
}

/** EMI-5317 / EMI-5448 / EMI-5138 pre-fix state: add blew up server-side. */
export async function mockAddBeneficiaryServerError(page: Page): Promise<void> {
    await page.route(BENEFICIARY_API, route => {
        if (route.request().method() !== 'POST') return route.fallback();
        return route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ status: 500, error: 'Internal Server Error', path: '/api/v1/beneficiary' }),
        });
    });
}

/**
 * EMI-5153: an oversized contract upload must surface the real size limit,
 * not a bare "Something Went Wrong!".
 */
export async function mockContractUploadTooLarge(page: Page): Promise<void> {
    await page.route(BENEFICIARY_API, route => {
        if (route.request().method() !== 'POST') return route.fallback();
        return route.fulfill({
            status: 413,
            contentType: 'application/json',
            body: JSON.stringify({
                messageCode: 'FILE_TOO_LARGE',
                plainText: 'The uploaded file exceeds the maximum allowed size (50MB).',
            }),
        });
    });
}

/** EMI-4791: the stored contract must actually be retrievable. */
export async function mockContractAttachmentAvailable(page: Page): Promise<void> {
    await page.route('**/api/v1/**contract**', route =>
        route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4 mock contract' })
    );
}

/** EMI-4791 pre-fix state: opening the attachment 404'd. */
export async function mockContractAttachmentMissing(page: Page): Promise<void> {
    await page.route('**/api/v1/**contract**', route =>
        route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Not Found' }) })
    );
}

// ── OTP (EMI-5692, EMI-5769, EMI-5800, EMI-5864, EMI-5118) ───────────────

export async function mockBeneficiaryOtpSuccess(page: Page): Promise<void> {
    for (const glob of [BENEFICIARY_OTP_API, BENEFICIARY_OTP_RESEND_API]) {
        await page.route(glob, route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sent: true, expiresInSeconds: 300 }) })
        );
    }
}

/** EMI-5864 pre-fix state: the OTP was never issued. */
export async function mockBeneficiaryOtpNotSent(page: Page): Promise<void> {
    await page.route(BENEFICIARY_OTP_API, route =>
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ status: 500, error: 'Internal Server Error', path: '/api/v1/beneficiary-otp' }) })
    );
}

/** EMI-5692 pre-fix state: resend 500'd. */
export async function mockBeneficiaryOtpResendServerError(page: Page): Promise<void> {
    await page.route(BENEFICIARY_OTP_RESEND_API, route =>
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ status: 500, error: 'Internal Server Error', path: '/api/v1/beneficiary-otp/resend' }) })
    );
}

/** EMI-5769 / EMI-5800 pre-fix state: resend 403'd with an authorisation message. */
export async function mockBeneficiaryOtpResendForbidden(page: Page): Promise<void> {
    await page.route(BENEFICIARY_OTP_RESEND_API, route =>
        route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify([{ httpStatusCode: 403, message: { messageCode: 'UNAUTHORIZED_EXCEPTION', plainText: 'You are not authorized to access this resource.' } }]),
        })
    );
}

// ── Approval workflow (EMI-4435 / EMI-4436) ──────────────────────────────

export async function mockBeneficiaryPrivileges(page: Page, privileges: string[]): Promise<void> {
    await page.route('**/api/v1/**privilege**', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ privileges }) })
    );
}

export async function mockApproveRejectSuccess(page: Page): Promise<void> {
    await page.route(BENEFICIARY_APPROVE_API, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ beneficiaryStatus: beneficiaryStatus('APPROVED') }) })
    );
    await page.route(BENEFICIARY_REJECT_API, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ beneficiaryStatus: beneficiaryStatus('REJECTED') }) })
    );
}

/** EMI-4435: an unprivileged staff member must be refused by the API, not just by a hidden button. */
export async function mockApproveRejectForbidden(page: Page): Promise<void> {
    for (const glob of [BENEFICIARY_APPROVE_API, BENEFICIARY_REJECT_API]) {
        await page.route(glob, route =>
            route.fulfill({
                status: 403,
                contentType: 'application/json',
                body: JSON.stringify([{ httpStatusCode: 403, message: { messageCode: 'UNAUTHORIZED_EXCEPTION', plainText: 'You are not authorized to access this resource.' } }]),
            })
        );
    }
}

// ── Bill creation gate (EMI-4009, EMI-4905, EMI-4805) ────────────────────

/** EMI-4009 / EMI-4905: bill creation must refuse a non-APPROVED beneficiary. */
export async function mockCreateBillWithBeneficiaryValidation(page: Page): Promise<void> {
    await page.route('**/api/v1/bills**', async route => {
        if (route.request().method() !== 'POST') return route.fallback();
        const body = route.request().postDataJSON() as { beneficiaryStatusCode?: string } | null;
        const approved = body?.beneficiaryStatusCode === 'APPROVED';
        await route.fulfill({
            status: approved ? 200 : 400,
            contentType: 'application/json',
            body: JSON.stringify(
                approved
                    ? { billId: 1477 }
                    : { messageCode: 'BENEFICIARY_NOT_APPROVED', plainText: 'Beneficiary is not approved' }
            ),
        });
    });
}

/** EMI-4009 pre-fix state: an unapproved beneficiary sailed through. */
export async function mockCreateBillWithoutBeneficiaryValidation(page: Page): Promise<void> {
    await page.route('**/api/v1/bills**', route => {
        if (route.request().method() !== 'POST') return route.fallback();
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ billId: 1477 }) });
    });
}
