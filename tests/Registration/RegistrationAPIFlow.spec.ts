import { test, expect } from '@playwright/test';
import {
  UAT_OTP_ASSETS,
  getOtpFromDb,
  generateEmail,
} from './helpers';

declare const process: { env: Record<string, string | undefined> };

const API_BASE = process.env['API_BASE_URL'] ?? 'https://gateway-dev.majdpay.com';

// ─────────────────────────────────────────────────────────────────────────────
// Registration API Flow – end-to-end API test suite
//
// Covers all 22 endpoints identified during the registration flow capture:
//
//  Phone Entry
//   1.  POST /emi-profile/api/v1/register/mobile/otp
//   2.  GET  /otp/otp-settings/q?operationCode=REGISTRATION
//   3.  POST /emi-profile/api/v1/register/mobile/otp/resend
//   4.  POST /emi-profile/api/v1/register/verify/otp
//
//  Business Info
//   5.  POST /emi-profile/api/v1/register/profile-registration-type
//   6.  POST /file/attachment/upload?fileType=iban
//   7.  POST /file/attachment/upload?fileType=vat
//   8.  POST /emi-profile/api/v1/register
//
//  NAFATH
//   9.  POST /emi-profile/api/v1/register/uri/status
//
//  Products
//  10.  GET  /emi-profile/api/v1/products
//  11.  POST /emi-profile/api/v1/register/products
//
//  Contract
//  12.  GET  /emi-profile/api/v1/contracts/preview?profileCode={}
//  13.  POST /emi-profile/api/v1/register/contract/accept
//  14.  GET  /emi-profile/api/v1/contracts/generate-file?profileCode={}
//
//  Lookups
//  15.  GET  /emi-profile/api/v1/industries
//  16.  GET  /api/v1/lookup/banks
//  17.  GET  /api/v1/purpose-of-transfer
//  18.  GET  /api/v1/transaction-types
//  19.  GET  /api/v1/payment-method
//  20.  GET  /emi-profile/api/v1/annual-incomes
//  21.  GET  /api/v1/discountTypes
//  22.  GET  /emi-profile/api/v1/register/profile-registration-type
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Registration – API Flow', () => {
  test.describe.configure({ mode: 'serial' });

  let sessionToken: string;
  let mobileNumber: string;
  let selectedAsset: typeof UAT_OTP_ASSETS[0];
  let otpLength: number;
  let ibanFileId: string;
  let vatFileId: string;
  let pickedProductId: number;
  let profileCode: string;

  const email = generateEmail();

  // ── 1. Send OTP ────────────────────────────────────────────────────────────
  // Iterates UAT_OTP_ASSETS until an unregistered mobile is found.

  test('API-01: POST /register/mobile/otp should return 200 with otpRequired:true', async ({ request }) => {
    let found = false;
    for (const asset of UAT_OTP_ASSETS) {
      const mobile = `+966${asset.mobile}`;
      const res = await request.post(`${API_BASE}/emi-profile/api/v1/register/mobile/otp`, {
        data: { mobileNumber: mobile },
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.status() === 200) {
        const body = await res.json();
        if (body.otpRequired === true) {
          selectedAsset = asset;
          mobileNumber  = mobile;
          expect(body).toHaveProperty('requestId');
          found = true;
          break;
        }
      }
    }
    expect(found, 'No unregistered mobile found in UAT_OTP_ASSETS').toBe(true);
  });

  // ── 2. Get OTP Settings ────────────────────────────────────────────────────

  test('API-02: GET /otp-settings/q should return OTP config for REGISTRATION', async ({ request }) => {
    const res = await request.get(
      `${API_BASE}/otp/otp-settings/q?operationCode=REGISTRATION`
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('length');
    expect(body).toHaveProperty('validityInSeconds');
    expect(body).toHaveProperty('canResendOtpAfterInSeconds');
    expect(typeof body.length).toBe('number');
    otpLength = body.length;
  });

  // ── 3. Verify OTP ──────────────────────────────────────────────────────────
  // For dev env getOtpFromDb returns '' — fall back to all-zero OTP.

  test('API-03: POST /register/verify/otp should return 200 with sessionToken', async ({ request }) => {
    const rawOtp = await getOtpFromDb(mobileNumber.replace('+966', ''));
    const otp    = rawOtp || '0'.repeat(otpLength ?? 6);

    const res = await request.post(`${API_BASE}/emi-profile/api/v1/register/verify/otp`, {
      data: { mobileNumber, otp },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('sessionToken');
    expect(typeof body.sessionToken).toBe('string');
    sessionToken = body.sessionToken;
  });

  // ── 4. Resend OTP (optional path) ──────────────────────────────────────────

  test('API-04: POST /register/mobile/otp/resend should return 200', async ({ request }) => {
    // Use the last asset in the list to avoid colliding with selectedAsset
    const resendAsset  = UAT_OTP_ASSETS[UAT_OTP_ASSETS.length - 1];
    const freshMobile  = `+966${resendAsset.mobile}`;

    await request.post(`${API_BASE}/emi-profile/api/v1/register/mobile/otp`, {
      data: { mobileNumber: freshMobile },
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await request.post(
      `${API_BASE}/emi-profile/api/v1/register/mobile/otp/resend`,
      {
        data: { mobileNumber: freshMobile },
        headers: { 'Content-Type': 'application/json' },
      }
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('requestId');
    expect(body.otpRequired).toBe(true);
  });

  // ── 5. Set Profile Registration Type ──────────────────────────────────────

  test('API-05: POST /register/profile-registration-type should return 201', async ({ request }) => {
    const res = await request.post(
      `${API_BASE}/emi-profile/api/v1/register/profile-registration-type`,
      {
        data: {
          profileType:   'MERCHANT',
          unifiedNumber: selectedAsset.crn,
          nationalId:    selectedAsset.id,
          email,
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${sessionToken}`,
        },
      }
    );

    expect(res.status()).toBe(201);
  });

  // ── 6. Upload IBAN Proof ───────────────────────────────────────────────────

  test('API-06: POST /file/attachment/upload?fileType=iban should return 200 with fileId', async ({ request }) => {
    const minimalPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request.post(
      `${API_BASE}/file/attachment/upload?unifiedNumber=${selectedAsset.crn}&fileType=iban`,
      {
        multipart: {
          file: {
            name:     'iban_proof.png',
            mimeType: 'image/png',
            buffer:   minimalPng,
          },
        },
        headers: { Authorization: `Bearer ${sessionToken}` },
      }
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('fileId');
    ibanFileId = body.fileId;
  });

  // ── 7. Upload VAT Certificate ──────────────────────────────────────────────

  test('API-07: POST /file/attachment/upload?fileType=vat should return 200 with fileId', async ({ request }) => {
    const minimalPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request.post(
      `${API_BASE}/file/attachment/upload?unifiedNumber=${selectedAsset.crn}&fileType=vat`,
      {
        multipart: {
          file: {
            name:     'vat_certificate.png',
            mimeType: 'image/png',
            buffer:   minimalPng,
          },
        },
        headers: { Authorization: `Bearer ${sessionToken}` },
      }
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('fileId');
    vatFileId = body.fileId;
  });

  // ── 8. Submit Registration ─────────────────────────────────────────────────

  test('API-08: POST /register should return 200 on full sign-up submission', async ({ request }) => {
    const res = await request.post(`${API_BASE}/emi-profile/api/v1/register`, {
      data: {
        unifiedNumber:                selectedAsset.crn,
        nationalId:                   selectedAsset.id,
        email,
        profileType:                  'MERCHANT',
        monthlyExpectedNumberOfBills: 2000,
        monthlyExpectedSumOfBills:    2000,
        expectedMonthlyWithdrawal:    2000,
        expectedMonthlyDeposit:       2000,
        bankCode:                     'AL_INMA_BANK',
        industry:                     'HEALTHCARE',
        annualIncome:                 '0-1000',
        iban:                         'SA0380000001234567891234',
        vatNumber:                    '300123456700003',
        ibanFileId,
        vatFileId,
      },
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${sessionToken}`,
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    if (body.profileCode) profileCode = body.profileCode;
  });

  // ── 9. NAFATH Initiation ───────────────────────────────────────────────────

  test('API-09: POST /register/uri/status should initiate NAFATH and return a redirect URI', async ({ request }) => {
    const res = await request.post(
      `${API_BASE}/emi-profile/api/v1/register/uri/status`,
      {
        data: {},
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${sessionToken}`,
        },
      }
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('uri');
  });

  // ── 10. Get Available Products ─────────────────────────────────────────────

  test('API-10: GET /products should return active products list', async ({ request }) => {
    const res = await request.get(
      `${API_BASE}/emi-profile/api/v1/products`,
      {
        headers: { Authorization: `Bearer ${sessionToken}` },
      }
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty('id');
    expect(body[0]).toHaveProperty('name');
    pickedProductId = body[0].id;
  });

  // ── 11. Assign Products ────────────────────────────────────────────────────

  test('API-11: POST /register/products should assign selected products and return 200', async ({ request }) => {
    const res = await request.post(
      `${API_BASE}/emi-profile/api/v1/register/products`,
      {
        data: { productIds: [pickedProductId] },
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${sessionToken}`,
        },
      }
    );

    expect(res.status()).toBe(200);
  });

  // ── 12. Contract Preview ───────────────────────────────────────────────────

  test('API-12: GET /contracts/preview should return contract preview', async ({ request }) => {
    const code = profileCode ?? selectedAsset.crn;
    const res  = await request.get(
      `${API_BASE}/emi-profile/api/v1/contracts/preview?profileCode=${code}`,
      {
        headers: { Authorization: `Bearer ${sessionToken}` },
      }
    );

    expect(res.status()).toBe(200);
  });

  // ── 13. Accept Contract ────────────────────────────────────────────────────

  test('API-13: POST /register/contract/accept should return 200 and complete registration', async ({ request }) => {
    const res = await request.post(
      `${API_BASE}/emi-profile/api/v1/register/contract/accept`,
      {
        data: {
          productIds:       [pickedProductId],
          contractAccepted: true,
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${sessionToken}`,
        },
      }
    );

    expect(res.status()).toBe(200);
  });

  // ── 14. Download Contract PDF ──────────────────────────────────────────────

  test('API-14: GET /contracts/generate-file should return contract PDF', async ({ request }) => {
    const code = profileCode ?? selectedAsset.crn;
    const res  = await request.get(
      `${API_BASE}/emi-profile/api/v1/contracts/generate-file?profileCode=${code}`,
      {
        headers: { Authorization: `Bearer ${sessionToken}` },
      }
    );

    expect(res.status()).toBe(200);
  });

  // ── Negative / Edge-case tests ─────────────────────────────────────────────

  test('API-N1: POST /register/mobile/otp with invalid number format should return 400', async ({ request }) => {
    const res = await request.post(`${API_BASE}/emi-profile/api/v1/register/mobile/otp`, {
      data: { mobileNumber: '123' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(400);
  });

  test('API-N2: POST /register/verify/otp with wrong OTP should return 400', async ({ request }) => {
    // Use second-to-last asset (last is reserved for API-04 resend test)
    const asset2      = UAT_OTP_ASSETS[UAT_OTP_ASSETS.length - 2];
    const freshMobile = `+966${asset2.mobile}`;

    await request.post(`${API_BASE}/emi-profile/api/v1/register/mobile/otp`, {
      data: { mobileNumber: freshMobile },
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await request.post(`${API_BASE}/emi-profile/api/v1/register/verify/otp`, {
      data: { mobileNumber: freshMobile, otp: '999999' },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('errorCode');
  });

  test('API-N3: POST /register/profile-registration-type without token should return 401', async ({ request }) => {
    const res = await request.post(
      `${API_BASE}/emi-profile/api/v1/register/profile-registration-type`,
      {
        data: {
          profileType:   'MERCHANT',
          unifiedNumber: '0000000000',
          nationalId:    '0000000000',
          email:         'unauth@test.com',
        },
        headers: { 'Content-Type': 'application/json' },
      }
    );
    expect(res.status()).toBe(401);
  });

  test('API-N4: POST /register/profile-registration-type with invalid nationalId should return 400', async ({ request }) => {
    const res = await request.post(
      `${API_BASE}/emi-profile/api/v1/register/profile-registration-type`,
      {
        data: {
          profileType:   'MERCHANT',
          unifiedNumber: '1307335131',
          nationalId:    '1012345678',
          email:         'invalid@test.com',
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${sessionToken}`,
        },
      }
    );
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.errorCode).toMatch(/INVALID-NATIONAL-ID/i);
  });

  test('API-N5: GET /products without token should return 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/emi-profile/api/v1/products`);
    expect(res.status()).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Lookup Endpoints
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Registration – Lookup Endpoints', () => {

  test('API-L1: GET /industries should return a list of industries', async ({ request }) => {
    const res = await request.get(`${API_BASE}/emi-profile/api/v1/industries`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test('API-L2: GET /lookup/banks should return a list of banks', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/v1/lookup/banks`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test('API-L3: GET /purpose-of-transfer should return transfer purpose options', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/v1/purpose-of-transfer`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('API-L4: GET /transaction-types should return transaction type options', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/v1/transaction-types`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('API-L5: GET /payment-method should return payment method options', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/v1/payment-method`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('API-L6: GET /annual-incomes should return annual income brackets', async ({ request }) => {
    const res = await request.get(`${API_BASE}/emi-profile/api/v1/annual-incomes`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test('API-L7: GET /discountTypes should return discount type options', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/v1/discountTypes`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('API-L8: GET /register/profile-registration-type should return available profile types', async ({ request }) => {
    const res = await request.get(
      `${API_BASE}/emi-profile/api/v1/register/profile-registration-type`
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });
});
