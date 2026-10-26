import { getSqlPool } from '../../../support/sqlServerClient';
import { getMongoDb } from '../../../support/mongoClient';
import { boxStep } from '../../shared/boxStep.ts';

// ─────────────────────────────────────────────────────────────────────────────
// SQL Server (emi_profile.*) — direct DB assertions for the account a
// registration run actually produced, independent of what the UI itself goes
// on to render. Schema and table names confirmed live 2026-09-27 by
// cross-referencing a real completed registration (goToContractStep + Contract
// submission) against these exact tables, not guessed. See
// support/sqlServerClient.ts for the connection itself and TopupHelper.ts for
// the identical pattern this mirrors on the Topup side.
//
// `business_profile_registration_requests.created_at` is NOT when a given run
// used that identity — CITIZEN_ASSETS is a shared, reused pool (confirmed
// live: a row completed by today's run still carried a `created_at` from
// three months earlier), so every query below orders by `last_modified_at`
// instead, which does update on reuse.

/**
 * The registration flow hands out local numbers (`5xxxxxxxx`) but the dev DB stores `+966…`.
 * Passed as a second parameter (not built in SQL with `'+966' + @mobile`, which raises a
 * collation conflict against the Arabic_100 columns).
 */
function toE164Mobile(mobile: string): string {
    const digits = mobile.replace(/\D/g, '').replace(/^966/, '').replace(/^0/, '');
    return `+966${digits}`;
}

export interface RegistrationProfileRow {
    id: string;
    created_at: string;
    email: string;
    mobile_number: string;
    tenant_number: string;
    profile_code: string;
    identity_number: string;
    is_active: boolean;
    is_approved: boolean;
    is_blocked: boolean;
    is_email_verified: boolean;
    is_test_user: boolean;
}

/** Reads the `profiles` row for a mobile number straight from emi_profile — the actual provisioned account, not the in-progress registration request. */
export async function getRegistrationProfileByMobileFromSql(mobileNumber: string): Promise<RegistrationProfileRow | null> {
    return boxStep('getRegistrationProfileByMobileFromSql', async () => {
    const pool = await getSqlPool();
    const result = await pool.request()
        .input('mobile', mobileNumber)
        .input('mobileE164', toE164Mobile(mobileNumber))
        .query(`
            USE [emi_profile];
            SELECT TOP 1 id, created_at, email, mobile_number, tenant_number, profile_code, identity_number,
                   is_active, is_approved, is_blocked, is_email_verified, is_test_user
            FROM profiles
            WHERE mobile_number IN (@mobile, @mobileE164)
            ORDER BY created_at DESC;
        `);
    return (result.recordset[0] as RegistrationProfileRow) ?? null;
    });
}

export interface BusinessProfileRegistrationRequestRow {
    id: string;
    created_at: string;
    last_modified_at: string;
    mobile_number: string;
    email: string | null;
    crn: string | null;
    profile_code: string;
    /** MERCHANT | BILLER — the account type chosen at registration. */
    profile_type: string;
    is_completed_form: boolean;
    is_mobile_owner_ship_verified: boolean;
    is_wathiq_info_completed: boolean;
    is_get_nafath_status_completed: boolean;
    is_product_assigned: boolean;
    is_contract_accepted: boolean;
}

/** Reads the `business_profile_registration_requests` row for a mobile number, most-recently-modified first (see header comment on why not `created_at`). */
export async function getBusinessRegistrationRequestByMobileFromSql(mobileNumber: string): Promise<BusinessProfileRegistrationRequestRow | null> {
    return boxStep('getBusinessRegistrationRequestByMobileFromSql', async () => {
    const pool = await getSqlPool();
    const result = await pool.request()
        .input('mobile', mobileNumber)
        .input('mobileE164', toE164Mobile(mobileNumber))
        .query(`
            USE [emi_profile];
            SELECT TOP 1 id, created_at, last_modified_at, mobile_number, email, crn, profile_code, profile_type,
                   is_completed_form, is_mobile_owner_ship_verified, is_wathiq_info_completed,
                   is_get_nafath_status_completed, is_product_assigned, is_contract_accepted
            FROM business_profile_registration_requests
            WHERE mobile_number IN (@mobile, @mobileE164)
            ORDER BY last_modified_at DESC;
        `);
    return (result.recordset[0] as BusinessProfileRegistrationRequestRow) ?? null;
    });
}

export interface RegistrationFullDetail {
    id: string;
    created_at: string;
    email: string;
    mobile_number: string;
    tenant_number: string;
    profile_code: string;
    is_active: boolean;
    is_approved: boolean;
    identity_number: string;
    crn: string | null;
    is_contract_accepted: boolean | null;
    is_product_assigned: boolean | null;
    iban: string | null;
    vat_number: string | null;
    unified_number: string | null;
    company_title: string | null;
    city: string | null;
}

/**
 * One-shot cross-table read of everything a completed registration produces:
 * the provisioned `profiles` row joined to its originating
 * `business_profile_registration_requests` (by mobile), then that request's
 * own `business_profiles` (by CRN) and `company_address` (by
 * company_address_id). Confirmed live 2026-09-27 against a real
 * goToContractStep + Contract-submission run's own account. Returns null if
 * no `profiles` row exists yet for this mobile (registration never reached
 * the point of provisioning an actual account) — the joined columns are
 * individually nullable beyond that, since a profile can exist before its
 * business-side rows are fully populated.
 */
export async function getFullRegistrationDetailByMobileFromSql(mobileNumber: string): Promise<RegistrationFullDetail | null> {
    return boxStep('getFullRegistrationDetailByMobileFromSql', async () => {
    const pool = await getSqlPool();
    const result = await pool.request()
        .input('mobile', mobileNumber)
        .input('mobileE164', toE164Mobile(mobileNumber))
        .query(`
            USE [emi_profile];
            SELECT TOP 1 p.id, p.created_at, p.email, p.mobile_number, p.tenant_number, p.profile_code,
                   p.is_active, p.is_approved, p.identity_number,
                   bprr.crn, bprr.is_contract_accepted, bprr.is_product_assigned,
                   bp.iban, bp.vat_number, bp.unified_number,
                   ca.title AS company_title, ca.city
            FROM profiles p
            LEFT JOIN business_profile_registration_requests bprr ON bprr.mobile_number = p.mobile_number
            LEFT JOIN business_profiles bp ON bp.crn = bprr.crn
            LEFT JOIN company_address ca ON ca.id = bp.company_address_id
            WHERE p.mobile_number IN (@mobile, @mobileE164)
            ORDER BY p.created_at DESC;
        `);
    return (result.recordset[0] as RegistrationFullDetail) ?? null;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mongo (notifications-log.notifications) — the actual dispatch record for the
// "User Activation" email a completed registration sends, independent of
// what the app's own confirmation screen claims. Schema and collection name
// confirmed live 2026-09-27 against the notification a real completed
// registration produced.
//
// Confirmed live the same day: `isSuccessfullySent` was `false` with
// `errorMessage` "Mail server connection failed... Couldn't connect to host,
// port: smtp.gmail.com, 587" — this dev environment's outbound SMTP is not
// reachable, so the UI's own "حسابك جاهز... راجع بريدك الإلكتروني" ("Your
// account is ready... check your email") confirmation is not actually backed
// by a delivered email here. That's an environment/infra fact, not something
// a registration-flow bug fix could address, so callers should assert the
// notification record EXISTS (proves the app attempted the handoff) without
// hard-asserting `isSuccessfullySent` — do that comparison explicitly at the
// call site instead, with its own environment-aware message, if a given test
// wants to track whether it's since started working.

export interface RegistrationActivationNotification {
    _id: string;
    userId: string;
    subject: string;
    recipient: string;
    message: string;
    notificationType: string;
    isSuccessfullySent: boolean;
    errorMessage?: string;
    createdAt: string;
}

/** Reads the most recent "User Activation" notification for a profile code straight from notifications-log.notifications. */
export async function getActivationNotificationFromMongo(profileCode: string): Promise<RegistrationActivationNotification | null> {
    return boxStep('getActivationNotificationFromMongo', async () => {
        const db = await getMongoDb('notifications-log');
        const doc = await db.collection('notifications')
            .find({ userId: profileCode, subject: 'User Activation' })
            .sort({ createdAt: -1 })
            .limit(1)
            .next();
        return doc as RegistrationActivationNotification | null;
    });
}

/**
 * Every "User Activation" notification for a profile, oldest first. Confirmed live
 * 2026-10-11 on the new dev Mongo: a completed registration produces exactly TWO,
 * ~3s apart and with different content — (1) the API credentials email (Client ID /
 * secret key — `ACTIVATION_API_CREDENTIALS_MARKER`) and (2) the login details email
 * (Company Number, mobile, generated password — `ACTIVATION_LOGIN_DETAILS_MARKER`).
 * The "- QA Test" copies sent to a QA mailbox have a different subject and are excluded.
 */
export async function getActivationNotificationsFromMongo(profileCode: string): Promise<RegistrationActivationNotification[]> {
    return boxStep('getActivationNotificationsFromMongo', async () => {
        const db = await getMongoDb('notifications-log');
        const docs = await db.collection('notifications')
            .find({ userId: profileCode, subject: 'User Activation' })
            .sort({ createdAt: 1 })
            .toArray();
        return docs as unknown as RegistrationActivationNotification[];
    });
}

export const ACTIVATION_API_CREDENTIALS_MARKER = 'المفتاح السري';
export const ACTIVATION_LOGIN_DETAILS_MARKER = 'رقم الشركة';

/** Number of `profiles` rows provisioned for a mobile number — a completed registration must leave exactly one. */
export async function countProfilesByMobileFromSql(mobileNumber: string): Promise<number> {
    return boxStep('countProfilesByMobileFromSql', async () => {
    const pool = await getSqlPool();
    const result = await pool.request()
        .input('mobile', mobileNumber)
        .input('mobileE164', toE164Mobile(mobileNumber))
        .query(`
            USE [emi_profile];
            SELECT COUNT(*) AS n FROM profiles WHERE mobile_number IN (@mobile, @mobileE164);
        `);
    return Number(result.recordset[0]?.n ?? 0);
    });
}

export interface RegistrationProvisioning {
    profile_id: string;
    profile_code: string;
    /** `profiles.type` — MERCHANT or BILLER. */
    profile_type: string;
    /** 1 when `merchant_profiles` / `biller_profiles` has a row with the profile's id (both tables only hold `id`). */
    in_merchant: number;
    in_biller: number;
    /** `emi_wallet.user_wallets` rows owned by the profile (`owner_profile_code`). */
    wallets: number;
    /** `wallet_type.code` of the profile's wallets, e.g. MERCHANT / BILLER. */
    wallet_types: string | null;
}

/**
 * What a completed registration provisions beyond the `profiles` row: the
 * type-specific profile row (merchant_profiles | biller_profiles, keyed by the
 * profile id) and the wallet in emi_wallet.user_wallets (keyed by profile_code).
 * Confirmed live 2026-10-11: all of these appear together, ~1.5s after the
 * Contract step's "Submit and finish" — none exist before it.
 */
export async function getRegistrationProvisioningFromSql(mobileNumber: string): Promise<RegistrationProvisioning | null> {
    return boxStep('getRegistrationProvisioningFromSql', async () => {
    const pool = await getSqlPool();
    const result = await pool.request()
        .input('mobile', mobileNumber)
        .input('mobileE164', toE164Mobile(mobileNumber))
        .query(`
            USE [emi_profile];
            SELECT TOP 1 p.id AS profile_id, p.profile_code, p.type AS profile_type,
                   CASE WHEN m.id IS NULL THEN 0 ELSE 1 END AS in_merchant,
                   CASE WHEN b.id IS NULL THEN 0 ELSE 1 END AS in_biller,
                   (SELECT COUNT(*) FROM [emi_wallet].dbo.user_wallets w WHERE w.owner_profile_code = p.profile_code) AS wallets,
                   (SELECT STRING_AGG(t.code, ',') FROM [emi_wallet].dbo.user_wallets w
                        JOIN [emi_wallet].dbo.wallet_type t ON t.id = w.wallet_type_id
                        WHERE w.owner_profile_code = p.profile_code) AS wallet_types
            FROM profiles p
            LEFT JOIN merchant_profiles m ON m.id = p.id
            LEFT JOIN biller_profiles b ON b.id = p.id
            WHERE p.mobile_number IN (@mobile, @mobileE164)
            ORDER BY p.created_at DESC;
        `);
    return (result.recordset[0] as RegistrationProvisioning) ?? null;
    });
}

/** Number of "User Activation" notification records for a profile code (see getActivationNotificationFromMongo). */
export async function countActivationNotificationsFromMongo(profileCode: string): Promise<number> {
    return boxStep('countActivationNotificationsFromMongo', async () => {
        const db = await getMongoDb('notifications-log');
        return db.collection('notifications').countDocuments({ userId: profileCode, subject: 'User Activation' });
    });
}
