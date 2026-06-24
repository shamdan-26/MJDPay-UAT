import { test, expect, APIRequestContext } from '@playwright/test';
import {
  REGISTER_URL,
  nextUatOtpAsset,
  nextResidentAsset,
  getOtpFromDb,
  generateEmail,
} from './helpers';

declare const process: { env: Record<string, string | undefined> };

const API_BASE = process.env['API_BASE_URL'] ?? 'https://gateway-dev.majdpay.com';

// ─────────────────────────────────────────────────────────────────────────────
// Registration API Flow – end-to-end API test suite
//
// Covers all 10 endpoints identified during the registration flow capture:
//   1.  POST /emi-profile/api/v1/register/mobile/otp
//   2.  GET  /otp/otp-settings/q?operationCode=REGISTRATION
//   3.  POST /emi-profile/api/v1/register/verify/otp
//   4.  POST /emi-profile/api/v1/register/mobile/otp/resend
//   5.  POST /emi-profile/api/v1/register/profile-registration-type
//   6.  POST /file/attachment/upload?fileType=iban
//   7.  POST /file/attachment/upload?fileType=vat
//   8.  POST /emi-profile/api/v1/register
//   9.  GET  /emi-profile/api/v1/products?status=ACTIVE
//  10.  POST /emi-profile/api/v1/register/contract/accept
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Registration – API Flow', () => {
  test.describe.configure({ mode: 'serial' });

  let sessionToken: string;
  let mobileNumber: string;
  let ibanFileId: string;
  let vatFileId: string;

  const resident = nextResidentAsset();
  const email = generateEmail();

  // ── 1. Send OTP ────────────────────────────────────────────────────────────

  test('API-01: POST /register/mobile/otp should return 200 with otpRequired:true', async ({ request }) => {
    const asset = nextUatOtpAsset();
    mobileNumber = `+966${asset.mobile}`;

    const res = await request.post(`${API_BASE}/emi-profile/api/v1/register/mobile/otp`, {
      data: { mobileNumber },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('requestId');
    expect(body.otpRequired).toBe(true);
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
  });

  // ── 3. Verify OTP ──────────────────────────────────────────────────────────

  test('API-03: POST /register/verify/otp should return 200 with sessionToken', async ({ request }) => {
    const otp = await getOtpFromDb(mobileNumber.replace('+966', ''));

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
    const asset = nextUatOtpAsset();
    const freshMobile = `+966${asset.mobile}`;

    // First send OTP so resend is valid
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
          profileType: 'MERCHANT',
          unifiedNumber: resident.crn,
          nationalId: resident.nationalId,
          email,
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );

    expect(res.status()).toBe(201);
  });

  // ── 6. Upload IBAN Proof ───────────────────────────────────────────────────

  test('API-06: POST /file/attachment/upload?fileType=iban should return 200 with fileId', async ({ request }) => {
    // Use a minimal 1x1 PNG as a placeholder attachment
    const minimalPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request.post(
      `${API_BASE}/file/attachment/upload?unifiedNumber=${resident.crn}&fileType=iban`,
      {
        multipart: {
          file: {
            name: 'iban_proof.png',
            mimeType: 'image/png',
            buffer: minimalPng,
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
      `${API_BASE}/file/attachment/upload?unifiedNumber=${resident.crn}&fileType=vat`,
      {
        multipart: {
          file: {
            name: 'vat_certificate.png',
            mimeType: 'image/png',
            buffer: minimalPng,
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
        unifiedNumber: resident.crn,
        nationalId: resident.nationalId,
        email,
        profileType: 'MERCHANT',
        monthlyExpectedNumberOfBills: 2000,
        monthlyExpectedSumOfBills: 2000,
        expectedMonthlyWithdrawal: 2000,
        expectedMonthlyDeposit: 2000,
        bankCode: 'AL_INMA_BANK',
        industry: 'HEALTHCARE',
        annualIncome: '0-1000',
        iban: 'SA0380000001234567891234',
        vatNumber: '300123456700003',
        ibanFileId,
        vatFileId,
      },
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    expect(res.status()).toBe(200);
  });

  // ── 9. Get Available Products ──────────────────────────────────────────────

  test('API-09: GET /products?status=ACTIVE should return active products list', async ({ request }) => {
    const res = await request.get(
      `${API_BASE}/emi-profile/api/v1/products?status=ACTIVE`,
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
    expect(body[0]).toHaveProperty('status');
  });

  // ── 10. Accept Contract ────────────────────────────────────────────────────

  test('API-10: POST /register/contract/accept should return 200 and complete registration', async ({ request }) => {
    const res = await request.post(
      `${API_BASE}/emi-profile/api/v1/register/contract/accept`,
      {
        data: {
          productIds: [1],
          contractAccepted: true,
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
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
    const asset = nextUatOtpAsset();
    const freshMobile = `+966${asset.mobile}`;

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
          profileType: 'MERCHANT',
          unifiedNumber: '0000000000',
          nationalId: '0000000000',
          email: 'unauth@test.com',
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
          profileType: 'MERCHANT',
          unifiedNumber: '1307335131',
          nationalId: '1012345678',
          email: 'invalid@test.com',
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.errorCode).toMatch(/INVALID-NATIONAL-ID/i);
  });

  test('API-N5: GET /products without token should return 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/emi-profile/api/v1/products?status=ACTIVE`);
    expect(res.status()).toBe(401);
  });
});
