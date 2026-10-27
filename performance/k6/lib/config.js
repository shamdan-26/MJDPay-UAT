// Shared k6 config. Everything is driven by `-e NAME=value` flags (or the npm scripts in package.json).
import exec from 'k6/execution';
import { SharedArray } from 'k6/data';

const num = (name, fallback) => (__ENV[name] !== undefined && __ENV[name] !== '' ? Number(__ENV[name]) : fallback);

export const ENV = __ENV.ENV || 'dev';
// Same default host as the Playwright API specs (BusinessTestCases/Login/helpers/loginApi.ts). uat/preprod hosts must be given.
export const BASE = __ENV.API_BASE_URL || (ENV === 'dev' ? 'https://gateway-dev-emi.dg-cash.app' : '');
if (!BASE) throw new Error(`No gateway host for ENV=${ENV}. Pass -e API_BASE_URL=https://...`);

export const COUNTRY_CODE = __ENV.COUNTRY_CODE || '+966';
export const VALID_OTP = __ENV.OTP || '918512'; // fixed OTP, dev only
// On uat/preprod the OTP is emailed, so k6 cannot complete it: skip step 4 there unless forced.
export const VERIFY_OTP = __ENV.VERIFY_OTP ? __ENV.VERIFY_OTP !== 'false' : ENV === 'dev';
export const SLA_MS = num('SLA_MS', 3000);

export const THREADS = num('THREADS', 10);
export const RAMPUP_S = num('RAMPUP', 30);
export const DURATION_S = num('DURATION', 300);
export const TARGET_RPM = num('TARGET_RPM', 0); // 0 = as fast as the think time allows
export const SMOKE = __ENV.SMOKE === 'true';

export const THINK = {
    minS: num('THINK_MIN_MS', 1000) / 1000,
    rangeS: num('THINK_RANGE_MS', 2000) / 1000,
    otpMinS: num('OTP_THINK_MIN_MS', 2000) / 1000,
    otpRangeS: num('OTP_THINK_RANGE_MS', 3000) / 1000,
};

// data/users.csv: company,mobile,password  (password is the last column so it may contain commas)
export const users = new SharedArray('users', () =>
    open('../../data/users.csv')
        .split(/\r?\n/)
        .slice(1)
        .filter((l) => l.trim())
        .map((line) => {
            const [company, mobile, ...rest] = line.split(',');
            return { company: company.trim(), mobile: mobile.trim(), password: rest.join(',').trim() };
        }));

/** Next account, round-robin across the whole test (JMeter's shared, recycling CSV data set). */
export const nextUser = () => users[exec.scenario.iterationInTest % users.length];

/** Load shape: smoke / fixed request rate / ramp-hold-ramp-down. `fn` is the exported function to run. */
export function loadScenario(fn) {
    if (SMOKE) return { executor: 'constant-vus', vus: 1, duration: '30s', exec: fn };
    if (TARGET_RPM > 0) {
        const perIter = Number(__ENV.REQUESTS_PER_ITERATION || 4);
        return {
            executor: 'constant-arrival-rate', rate: Math.max(1, Math.round(TARGET_RPM / perIter)), timeUnit: '1m',
            duration: `${DURATION_S}s`, preAllocatedVUs: THREADS, maxVUs: THREADS * 4, exec: fn,
        };
    }
    return {
        executor: 'ramping-vus', startVUs: 0, gracefulRampDown: '30s', exec: fn,
        stages: [
            { duration: `${RAMPUP_S}s`, target: THREADS },
            { duration: `${Math.max(1, DURATION_S - RAMPUP_S)}s`, target: THREADS },
            { duration: '10s', target: 0 },
        ],
    };
}
