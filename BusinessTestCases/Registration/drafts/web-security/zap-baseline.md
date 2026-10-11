# DRAFT — OWASP ZAP baseline for the Registration wizard (unverified, never run)

Passive scan only (no attack traffic): spiders the pages and reports missing headers, cookie flags, information leaks and
known-vulnerable libraries. **Run against dev only**, tell the backend/infra team first.

## Prerequisites
- Docker (or the ZAP desktop app).
- Target: `https://dev-emi.dg-cash.app/business/auth/register` (UI) and `https://gateway-dev-emi.dg-cash.app` (API).

## UI baseline
```bash
docker run --rm -v "%cd%/zap-out:/zap/wrk:rw" ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t https://dev-emi.dg-cash.app/business/auth/register \
  -r registration-ui-baseline.html -J registration-ui-baseline.json -I
```
(`-I` = do not fail the command on warnings; drop it to gate a pipeline.)

## API baseline from the swagger/openapi file
```bash
docker run --rm -v "%cd%/zap-out:/zap/wrk:rw" ghcr.io/zaproxy/zaproxy:stable \
  zap-api-scan.py -t https://gateway-dev-emi.dg-cash.app/v3/api-docs -f openapi \
  -r registration-api-baseline.html -S
```
(`-S` = safe mode, no active attacks. The openapi path is ASSUMED — use the gateway's real swagger URL.)

## What to look at first
1. Missing/weak security headers: `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `Strict-Transport-Security`,
   `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (see `RegistrationSecurityHeaders.draft.ts`).
2. Cookies without `Secure`/`HttpOnly`/`SameSite`.
3. Information disclosure in error bodies (stack traces, internal host names) — the gateway already returns `message.messageCode`.
4. Vulnerable JS libraries reported by the retire.js rule.
5. CORS: wildcard origin with credentials.

## Triage rule
Record each finding as a row in a spreadsheet: alert, URL, risk, owner (front end / gateway / infra), ticket. Only
High/Medium alerts block a release; Low/Informational go to the backlog.

## Out of scope for this draft
Active scanning (`zap-full-scan.py`), authenticated scanning, and anything against UAT/preprod/prod.
