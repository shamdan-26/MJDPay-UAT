# DRAFT — flaky-test tracking for the Registration suite (unverified)

Registration has known flake sources: the 30-second OTP, a shared resident/citizen asset pool, worker-index races, dev
backend outages (merchant `/auth/signin` 404), headed Edge crashes under 5 workers. Track them instead of retrying blindly.

## 1. Collect (no code change needed)
Add the JSON reporter next to the HTML one and keep results per run:
```ts
// playwright.config.ts (proposal — not applied)
reporter: [['html'], ['json', { outputFile: 'test-results/results.json' }]],
retries: process.env.CI ? 2 : 0,
```
A test is **flaky** when it fails and then passes on retry (`outcome: "flaky"` in the JSON), **unstable** when it fails on
>10% of the last 20 runs without a code change.

## 2. Minimal analysis script (draft, run by hand)
```js
// node flaky-report.js results-*.json   → prints top offenders
const fs = require('fs');
const stats = {};
for (const f of process.argv.slice(2)) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  (function walk(s) {
    (s.specs ?? []).forEach(sp => sp.tests.forEach(t => {
      const k = sp.file + ' › ' + sp.title;
      stats[k] ??= { runs: 0, fail: 0, flaky: 0 };
      stats[k].runs++;
      if (t.status === 'unexpected') stats[k].fail++;
      if (t.status === 'flaky') stats[k].flaky++;
    }));
    (s.suites ?? []).forEach(walk);
  })({ suites: j.suites });
}
Object.entries(stats).filter(([, v]) => v.fail || v.flaky)
  .sort((a, b) => (b[1].fail + b[1].flaky) - (a[1].fail + a[1].flaky)).slice(0, 25)
  .forEach(([k, v]) => console.log(`${v.fail + v.flaky}/${v.runs}  ${k}`));
```

## 3. Triage taxonomy (tag each offender)
| Cause | Typical signal | Fix direction |
|---|---|---|
| Environment outage | many unrelated tests fail in one run | skip with clear message; not a test defect |
| Shared data / pool | passes alone, fails in bulk | isolate sub-pool, mark used, mocked variant |
| Timing (OTP 30s, countdowns) | timeout waiting for dialog/timer | mock clock/OTP; resend-and-refill |
| Locator drift | element not found after release | move to `data-testid` (QA-DATA-TESTID-HANDOFF.md) |
| Browser resource | "Target page, context or browser has been closed" | fewer workers; avoid headed in bulk |

## 4. Policy
- Quarantine tag `@quarantine` (excluded from the gating run via `grepInvert`) for any test flaky 3 runs in 10; owner and
  due date mandatory; un-quarantine after 20 clean runs.
- Never raise retries to hide a flake; retries are for infrastructure noise only.
- Review the top-10 list weekly with the test run summary; delete tests that have been quarantined > 30 days.
