import { test, expect } from '@playwright/test';
import { REGISTRATION_API_BASE, registrationHeaders } from '../helpers/registrationApi';

const API_BASE = REGISTRATION_API_BASE;

// The gateway answers 400 MISSING_REQUIRED_HEADER without these on every request; per-request headers still override.
test.use({ extraHTTPHeaders: registrationHeaders() });

// ─────────────────────────────────────────────────────────────────────────────
// Lookup Endpoints
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Registration – Lookup Endpoints', { tag: ['@registration', '@api'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'api' }] }, () => {

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
