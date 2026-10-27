// Gateway helpers: device identity, headers, and the SLA-checked request wrapper.
// Port of support/deviceFingerprint.ts - keep the two in step (see that file for why each field exists).
import http from 'k6/http';
import { check } from 'k6';
import crypto from 'k6/crypto';
import { BASE, SLA_MS } from './config.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0';
const FIXED_SALT = 'Am_*359184dkfPOIU@QWER45K__3Zxcv';
const WEB_APP_ID = 'f7bdbb59-46c5-4eba-85c1-8fdf6812ce50';

const field = (tag, value) => `${tag}${String(value.length).padStart(4, '0')}${value}`;

export function deviceFingerprint(deviceUuid, deviceId) {
    const body = field('01', deviceUuid) + field('02', 'ipAddress') + field('03', USER_AGENT) + field('04', deviceId)
        + field('05', '') + field('06', String(Date.now())) + field('07', 'Asia/Riyadh') + field('08', WEB_APP_ID) + field('09', FIXED_SALT);
    return body + crypto.sha256(body, 'hex');
}

export function randomHex(n) {
    let s = '';
    for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
}

export function headers({ deviceUuid, deviceId, token } = {}) {
    const h = {
        'Content-Type': 'application/json', Accept: '*/*', 'Accept-Language': 'en_uk', locale: 'en_uk',
        platform: 'web', platformType: 'web', channel: 'ONLINE', toster_ID: `toster_ID_${Date.now()}`,
        latitude: '24.7136', longitude: '46.6753', 'user-agent': USER_AGENT,
    };
    if (deviceUuid && deviceId) h['device-finger-print'] = deviceFingerprint(deviceUuid, deviceId);
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
}

const parse = (res) => {
    try { return res.json(); } catch (e) { return null; }
};

/**
 * Sends one request tagged with `name` (the per-step row in the k6 summary) and checks status + the SLA budget.
 * `okStatus` lists accepted statuses; `extra` adds named checks on the parsed body.
 */
export function call(name, method, path, { body, hdrs, okStatus = [200], extra = {} } = {}) {
    const res = http.request(method, `${BASE}${path}`, body ? JSON.stringify(body) : null, { headers: hdrs, tags: { name } });
    const data = parse(res);
    const checks = {
        [`${name}: status ${okStatus.join('/')}`]: (r) => okStatus.includes(r.status),
        [`${name}: under SLA`]: (r) => r.timings.duration < SLA_MS,
    };
    for (const [label, fn] of Object.entries(extra)) checks[`${name}: ${label}`] = () => fn(data, res);
    check(res, checks);
    return { res, data };
}
