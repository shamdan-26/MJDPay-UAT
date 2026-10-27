// Login journey load test (port of EMI-Load-Test.jmx, TG1). Mirrors BusinessTestCases/Login/api/signin:
//   01 GET /devices/ip-address  02 POST /devices/uuid  03 POST /auth/signin  04 POST /auth/verify/otp (dev only)
// Run through the npm scripts (perf:smoke / perf:load) or: k6 run performance/k6/login-journey.k6.js -e THREADS=50 ...
import http from 'k6/http';
import { sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE, COUNTRY_CODE, VALID_OTP, VERIFY_OTP, THINK, SLA_MS, nextUser, loadScenario } from './lib/config.js';
import { call, headers, randomHex } from './lib/gateway.js';

const journey = new Trend('tx_full_login_journey', true); // end-to-end login time, think time excluded (as in JMeter)

export const options = {
    scenarios: { login: loadScenario('loginJourney') },
    thresholds: {
        checks: ['rate>0.99'],
        http_req_failed: ['rate<0.01'],
        http_req_duration: [`p(95)<${SLA_MS}`],
        tx_full_login_journey: [`p(95)<${SLA_MS * 3}`],
    },
};

const think = (min, range) => sleep(min + Math.random() * range);

export function loginJourney() {
    const user = nextUser();
    const deviceId = randomHex(32); // fresh device per iteration
    let active = 0;
    http.cookieJar().clear(BASE);

    const ip = call('01 GET /devices/ip-address', 'GET', '/devices/ip-address', { hdrs: headers() });
    const reg = call('02 POST /devices/uuid', 'POST', '/devices/uuid', {
        hdrs: headers(),
        body: {
            ipAddress: ip.data?.ipAddress ?? '0.0.0.0', platform: 'web', deviceId, applicationId: deviceId,
            manufacturerName: 'Google', osName: 'Chrome', model: '149.0', token: '',
        },
    });
    active += ip.res.timings.duration + reg.res.timings.duration;
    const deviceUuid = reg.data?.uuid;

    think(THINK.minS, THINK.rangeS);
    const signin = call('03 POST /auth/signin', 'POST', '/auth/signin', {
        hdrs: headers({ deviceUuid, deviceId }),
        body: { username: `${COUNTRY_CODE}${user.mobile}`, password: user.password, tenantNumber: user.company },
        extra: { 'body has accessToken': (d) => !!d?.accessToken?.token },
    });
    active += signin.res.timings.duration;
    const token = signin.data?.accessToken?.token;

    if (VERIFY_OTP && token) {
        think(THINK.otpMinS, THINK.otpRangeS);
        const otp = call('04 POST /auth/verify/otp', 'POST', '/auth/verify/otp', {
            hdrs: headers({ deviceUuid, deviceId, token }), body: { otp: VALID_OTP }, okStatus: [200, 201],
        });
        active += otp.res.timings.duration;
    }
    journey.add(active);
}
