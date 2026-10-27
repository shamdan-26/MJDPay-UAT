// DRAFT — unverified, never run. k6 script (not a Playwright test; k6 is a separate binary: https://k6.io).
//
// SAFETY: dev environment only, with the backend team's agreement. Every `mobile/otp` call can send a real OTP.
// Keep VUS/duration low first (defaults below are deliberately small) and raise gradually.
//
// Run:  k6 run performance/k6/registration-otp.k6.js
//       k6 run -e SCENARIO=soak -e VUS=10 -e DURATION=30m ...   (see options below)
//
// Assumptions: host and required headers as discovered on dev; response shapes as in RegistrationApiContract.draft.ts.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE = __ENV.API_BASE_URL || 'https://gateway-dev-emi.dg-cash.app';
const API = `${BASE}/emi-profile/api/v1`;
const SCENARIO = __ENV.SCENARIO || 'ramp';

const HEADERS = {
    'Content-Type': 'application/json',
    Accept: '*/*',
    'Accept-Language': 'en_uk',
    locale: 'en_uk',
    platform: 'web',
    platformType: 'web',
    channel: 'ONLINE',
    'toster_ID': 'k6-load',
    'device-finger-print': 'k6-load-fingerprint',
    latitude: '24.7136',
    longitude: '46.6753',
};

const serverErrors = new Rate('server_errors');
const otpLatency = new Trend('otp_request_ms', true);

const scenarios = {
    // gradual ramp of OTP requests
    ramp: { executor: 'ramping-vus', startVUs: 1, stages: [{ duration: '1m', target: 5 }, { duration: '2m', target: 10 }, { duration: '1m', target: 0 }], exec: 'otpFlow' },
    // wrong-code burst against a single request id (lockout / rate-limit behaviour under load)
    burst: { executor: 'constant-arrival-rate', rate: 5, timeUnit: '1s', duration: '1m', preAllocatedVUs: 10, exec: 'wrongCodeBurst' },
    // long steady load to expose leaks and slow degradation
    soak: { executor: 'constant-vus', vus: Number(__ENV.VUS || 5), duration: __ENV.DURATION || '15m', exec: 'otpFlow' },
};

export const options = {
    scenarios: { [SCENARIO]: scenarios[SCENARIO] },
    thresholds: {
        http_req_duration: ['p(95)<800'],   // ASSUMED budget — agree it with the backend team
        server_errors: ['rate<0.01'],       // < 1% 5xx
        otp_request_ms: ['p(95)<800'],
    },
};

function randomMobile() {
    // KSA mobile: +9665XXXXXXXX. Use a dedicated test range to avoid real users.
    const tail = String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
    return `+9665${tail}`;
}

function post(path, body) {
    const res = http.post(`${API}${path}`, JSON.stringify(body), { headers: { ...HEADERS, toster_ID: `k6-${__VU}-${Date.now()}` } });
    serverErrors.add(res.status >= 500);
    return res;
}

export function otpFlow() {
    const res = post('/register/mobile/otp', { mobileNumber: randomMobile() });
    otpLatency.add(res.timings.duration);
    check(res, { 'otp request accepted': r => r.status === 200 });
    sleep(1);
}

export function wrongCodeBurst() {
    const mobileNumber = randomMobile();
    const sent = post('/register/mobile/otp', { mobileNumber });
    if (sent.status !== 200) return;
    const requestId = sent.json('requestId');
    for (let i = 0; i < 6; i++) {
        const res = post('/register/verify/otp', { mobileNumber, requestId, otp: String(100000 + i) });
        check(res, { 'wrong code is a 4xx, never a session': r => r.status >= 400 && r.status < 500 });
    }
}
