// Authenticated reads load test (port of JMeter TG2, which was disabled).
// UNVERIFIED PATHS: /api/v1/* come from page.route() mocks in the Playwright helpers - confirmed as what the Angular app
// calls, NOT confirmed as served on the gateway host. Check one real request in DevTools, fix PATHS below, then run.
import { sleep } from 'k6';
import exec from 'k6/execution';
import { THINK, COUNTRY_CODE, SLA_MS, users, loadScenario } from './lib/config.js';
import { call, headers, randomHex } from './lib/gateway.js';

const PATHS = [
    ['R1 GET /api/v1/wallets', '/api/v1/wallets'],
    ['R2 GET /api/v1/sub-wallets', '/api/v1/sub-wallets'],
    ['R3 GET /api/v1/beneficiary?page=0&size=10', '/api/v1/beneficiary?page=0&size=10'],
];

export const options = {
    scenarios: { reads: loadScenario('reads') },
    thresholds: { checks: ['rate>0.99'], http_req_failed: ['rate<0.01'], http_req_duration: [`p(95)<${SLA_MS}`] },
};

let session; // per VU: logged in once, like JMeter's Once Only Controller

function login() {
    const user = users[(exec.vu.idInTest - 1) % users.length];
    const deviceId = randomHex(32);
    const reg = call('00 POST /devices/uuid (setup)', 'POST', '/devices/uuid', {
        hdrs: headers(),
        body: {
            ipAddress: '0.0.0.0', platform: 'web', deviceId, applicationId: deviceId,
            manufacturerName: 'Google', osName: 'Chrome', model: '149.0', token: '',
        },
    });
    const deviceUuid = reg.data?.uuid;
    const signin = call('00 POST /auth/signin (setup)', 'POST', '/auth/signin', {
        hdrs: headers({ deviceUuid, deviceId }),
        body: { username: `${COUNTRY_CODE}${user.mobile}`, password: user.password, tenantNumber: user.company },
    });
    return { deviceUuid, deviceId, token: signin.data?.accessToken?.token };
}

export function reads() {
    session = session || login();
    for (const [name, path] of PATHS) call(name, 'GET', path, { hdrs: headers(session) });
    sleep(THINK.minS + Math.random() * THINK.rangeS);
}
