# DRAFT — Registration smoke tier and synthetic monitoring (unverified)

Goal: a **≤ 3 minute**, backend-independent signal after every deploy ("is the wizard alive?"), plus a scheduled run that
catches an outage before applicants do. Built entirely from the mock-driven specs, so it needs no OTP, no pool identity and
no login session.

## Selection rule
Tag a spec `@smoke` only if it (1) uses the mocked helpers, (2) has no `waitForTimeout` > 1s, (3) passes alone in < 30s,
(4) fails for a reason a human would call "registration is broken".

## Proposed smoke set (see `RegistrationSmoke.draft.ts`)
1. Registration page loads with title, logo and mobile field.
2. Mobile → (OTP bypass) → Business Info shows profile cards.
3. Business Info → Financial (mocked submit) shows the amount fields.
4. Arabic switch sets `dir="rtl"`; theme toggle changes the body class.
5. Real gateway reachability: `POST /register/mobile/otp` for a test mobile answers 200 with a `requestId` (the **only**
   real backend call; skip when the environment is flagged down).

## Pipeline
```
on: deploy-to-dev           →  playwright test --grep @smoke --workers=2        (gate: must pass to continue)
on: schedule */30 min       →  same, report failures to the QA channel          (synthetic monitoring)
on: nightly                 →  full @registration regression (mock-driven first, live specs last)
```
Run command (dev): `npm run test:dev -- --grep @smoke BusinessTestCases/Registration`

## Alerting
- Two consecutive scheduled failures → notify (one failure is often a blip).
- Attach trace + the failing request URL/status; link to this document's "known outages" list.

## Tier overview
| Tier | When | Content | Budget |
|---|---|---|---|
| Smoke | every deploy, every 30 min | 5 checks above | 3 min |
| Regression (mocked) | every PR / nightly | ui + functional mocked + security API | 15 min |
| Regression (live) | nightly / pre-release | pool-identity journeys, DB/email integration | 60+ min |
| Non-functional | weekly / pre-release | a11y, visual, perf, fuzz, load (dev only) | varies |
