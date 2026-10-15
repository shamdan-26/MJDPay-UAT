# EMI Load Testing with JMeter

Load testing answers a different question from the Playwright suite in this repo.
Playwright asks **"does the feature work?"** — one user at a time. JMeter asks
**"does it still work, and stay fast, when 50 people do it at once?"**

This folder contains a JMeter test plan for the EMI / majdpay business gateway.

```
performance/
  EMI-Load-Test.jmx      the test plan (open this in JMeter's GUI to edit)
  data/users.csv         the test accounts JMeter logs in with
  run-load-test.ps1      runs the test and builds an HTML report
  results/               created on each run (gitignored)
```

---

## 1. One-time setup

Java is already installed on this machine. You only need JMeter itself:

1. Download the **Binary** zip from https://jmeter.apache.org/download_jmeter.cgi
2. Unzip it somewhere simple, e.g. `C:\apache-jmeter-5.6.3`
3. Tell your machine where it lives (run once, then open a **new** terminal):

```bash
[Environment]::SetEnvironmentVariable("JMETER_HOME", "C:\apache-jmeter-5.6.3", "User")
```

The runner script also finds JMeter automatically if it's already on your PATH.

---

## 2. Run it

Always start with a smoke run — 1 user for 30 seconds. It proves the login chain
works before you point real load at anything.

```bash
cd "$env:USERPROFILE\OneDrive - Digital Cash\Desktop\ai-autimation\performance"; .\run-load-test.ps1 -Smoke -Open
```

If the smoke run is green, do a real run:

```bash
.\run-load-test.ps1 -Threads 50 -RampUp 60 -Duration 600 -Open
```

| Parameter | Meaning | Default |
|---|---|---|
| `-Env` | `dev`, `uat` or `preprod` — picks the gateway host | `dev` |
| `-Threads` | how many simultaneous users | `10` |
| `-RampUp` | seconds to go from 0 to that many users | `30` |
| `-Duration` | how long to keep the load running, in seconds | `300` |
| `-SlaMs` | response-time budget; anything slower is marked failed | `3000` |
| `-VerifyOtp` | include the OTP step (dev only — see below) | `$true` |
| `-TargetRpm` | cap the whole test at N requests/minute instead of full speed | off |
| `-Smoke` | shorthand for 1 user / 30 seconds | off |
| `-Open` | open the HTML report when the run finishes | off |

**Ramp-up rule of thumb:** roughly 1 user per second. Starting 50 users
instantaneously measures your own laptop's connection setup, not the server.

---

## 3. What the test actually does

Each virtual user repeats the real login chain, copied straight from
[LoginAPIFlow.spec.ts](../BusinessTestCases/Login/api/signin/) — same
endpoints, same headers, same request bodies:

| Step | Request | Checked |
|---|---|---|
| 1 | `GET /devices/ip-address` | HTTP 200, response time, extracts `ipAddress` |
| 2 | `POST /devices/uuid` | HTTP 200, response time, extracts `uuid` |
| 3 | `POST /auth/signin` | HTTP 200, body contains `accessToken`, response time |
| 4 | `POST /auth/verify/otp` | HTTP 200/201, sends `Bearer` token from step 3 |

Between steps there is **think time** (1–3 s before signing in, 2–5 s before the
OTP) because real users don't fire requests back to back. Without it you get an
unrealistically brutal test that mostly measures your own network.

Each user picks a different account from `data/users.csv`, gets a fresh random
`deviceId` / `device-finger-print` per iteration, and the four steps are wrapped
in a **transaction** called `TX - Full Login Journey` so the report shows the
end-to-end login time as one number as well as per-step times.

### The OTP catch

On **dev** the OTP is always `918512`, so JMeter can complete the whole chain.
On **uat/preprod** the OTP is emailed to the shared QA mailbox — JMeter can't read
that, so the runner automatically skips step 4 when you pass `-Env uat`. Steps 1–3
are still the heavy part, so the test is still worth running there.

---

## 4. Reading the results

Open `results/<timestamp>/html-report/index.html`. The numbers that matter:

- **Error %** — should be ~0. If it climbs as users increase, you've found the
  breaking point. That's the headline result of a load test.
- **90%/95% line** — 95% of requests were at least this fast. Use this, not the
  average. Averages hide the slow tail that users actually complain about.
- **Response Times Over Time** — a flat line means the system is coping; a line
  that climbs during the run means something is degrading (connection pool,
  database, memory) and it would keep getting worse.
- **Throughput** — requests/second the server actually handled. If you add users
  and throughput stops rising while response time rises, you've hit saturation.

The console also prints a quick samples / errors / avg / p95 summary.

---

## 5. Editing the plan

Open the GUI to change anything visually:

```bash
& "$env:JMETER_HOME\bin\jmeter.bat" -t "EMI-Load-Test.jmx"
```

Use the GUI for **editing only**. Never run a load test from the GUI — it uses far
more memory than the test itself and will skew your numbers. That's what
`run-load-test.ps1` (CLI mode) is for.

Two things in the plan are deliberately switched off:

- **Throughput Cap timer** (inside TG1) — enable it, or just pass `-TargetRpm`, when
  you want a fixed request rate rather than "as fast as possible".
- **TG2 - Authenticated Reads** — a second scenario that logs in once then hammers
  `GET /api/v1/wallets`, `/api/v1/sub-wallets`, `/api/v1/beneficiary`. These paths
  come from the `page.route()` mock patterns in the Playwright helpers, so they're
  the right paths *as the Angular app calls them* — but I could not confirm they're
  served on the gateway host. **Verify one real request in DevTools first**, fix the
  host/path in the plan, then enable the thread group.

---

## 6. Before you point this at a shared environment

Load testing is the one kind of testing that can take an environment down for
everyone else. Standard practice:

- Tell the team, and agree a window — a UAT run at 10am will block manual testers.
- Get sign-off before running against preprod, and never run against production.
- Start small (10 users), then step up: 10 → 25 → 50 → 100. Stepping up is how you
  find the breaking point; jumping straight to 200 only tells you that it broke.
- Watch the server side too (APM / CPU / DB). JMeter tells you *that* it got slow,
  the server metrics tell you *why*.

`data/users.csv` contains the same shared dev accounts as `data/testAccounts.json`.
If you run with many threads, add more accounts to the CSV — dozens of users
logging in as the same account can trip rate limiting or account lockout and give
you failures that look like performance problems but aren't.
