# EMI Load Testing with k6

Playwright asks **"does the feature work?"** with one user. k6 asks **"does it still work, and stay fast,
when 50 people do it at once?"**

```
performance/
  data/users.csv                    test accounts (company,mobile,password)
  k6/
    login-journey.k6.js             login chain: ip-address -> uuid -> signin -> verify/otp
    authenticated-reads.k6.js       logs in once per user, then hits wallet/beneficiary reads (paths UNVERIFIED)
    registration-otp.k6.js          Registration OTP ramp/burst/soak DRAFT (never run, sends real OTPs)
    lib/config.js                   env flags, CSV loading, load shape
    lib/gateway.js                  headers, device fingerprint (port of support/deviceFingerprint.ts), checks
  results/                          gitignored
```

Requires the `k6` binary (https://k6.io, `k6 version` to check).

## Run

Always smoke first (1 user, 30 s) to prove the login chain works:

```bash
npm run perf:smoke
npm run perf:load -- -e THREADS=50 -e RAMPUP=60 -e DURATION=600
```

Flags are passed as `-e NAME=value`:

| Flag | Meaning | Default |
|---|---|---|
| `ENV` | `dev`, `uat`, `preprod`. Non-dev needs `API_BASE_URL` and skips the OTP step | `dev` |
| `API_BASE_URL` | gateway base URL | `https://gateway-dev-emi.dg-cash.app` |
| `THREADS` | simultaneous users (VUs) | `10` |
| `RAMPUP` | seconds to reach `THREADS` | `30` |
| `DURATION` | total seconds including ramp-up | `300` |
| `SLA_MS` | per-request budget; slower fails the `under SLA` check | `3000` |
| `VERIFY_OTP` | `false` skips step 4 | `true` on dev |
| `TARGET_RPM` | fixed request rate instead of full speed (assumes 4 requests per iteration) | off |
| `SMOKE` | `true` = 1 user / 30 s (what `perf:smoke` sets) | off |
| `THINK_MIN_MS` / `THINK_RANGE_MS` | think time before sign-in | `1000` / `2000` |
| `OTP_THINK_MIN_MS` / `OTP_THINK_RANGE_MS` | think time before OTP | `2000` / `3000` |

Save a report: add `--summary-export=test-results/k6-login.json` (or `--out json=...`).

## What the login test does

Each user repeats the chain copied from `BusinessTestCases/Login/api/signin`, with a fresh random `deviceId` and a
matching `device-finger-print` per iteration. Without a valid fingerprint the gateway answers an empty 412
(see `support/deviceFingerprint.ts`).

| Step | Request | Checked |
|---|---|---|
| 01 | `GET /devices/ip-address` | 200, SLA |
| 02 | `POST /devices/uuid` | 200, SLA, uuid returned |
| 03 | `POST /auth/signin` | 200, `accessToken.token` present, SLA |
| 04 | `POST /auth/verify/otp` | 200/201, SLA (dev only, OTP `918512`) |

Think time sits between steps. Each step shows as its own row (the request `name` tag) in the k6 summary, plus a
`tx_full_login_journey` trend for the end-to-end time, think time excluded.

On uat/preprod the OTP is emailed and k6 cannot read it, so step 4 is skipped there.

## Reading the results

Thresholds fail the run (non-zero exit) when breached: checks under 99 %, failed requests over 1 %, p95 over `SLA_MS`.

- **http_req_failed / checks** should be about 0. If they climb as users increase, you found the breaking point.
- **p(95)**, not the average: averages hide the slow tail.
- **http_reqs rate** flattening while p(95) rises means saturation.

## Before pointing this at a shared environment

- Agree a window with the team; never run against production; get sign-off for preprod.
- Step up 10 -> 25 -> 50 -> 100 instead of jumping.
- `users.csv` has only a few accounts shared by all VUs. Many VUs on one account can hit rate limiting or lockout that
  looks like a performance problem. Add accounts before big runs.
- `registration-otp.k6.js` sends real OTPs: dev only, with backend agreement, low VUs first.
