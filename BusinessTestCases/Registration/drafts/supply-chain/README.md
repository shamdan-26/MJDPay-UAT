# DRAFT — supply-chain and secret hygiene for the test repo (unverified, never run)

Document-only draft. Nothing here installs or changes anything.

## 1. Dependency vulnerabilities
```bash
npm audit --omit=dev            # runtime deps
npm audit                       # includes dev tooling (Playwright, ts, mailparser, imapflow, mongodb, mssql…)
npx --yes better-npm-audit audit --level high   # fail only on high/critical (optional wrapper)
```
Triage: fix `high`/`critical` that ship in test helpers touching network or parsing (mailparser, imapflow, mongodb, mssql).
Pin Playwright minor versions; update with the Playwright changelog open.

## 2. Secrets in the repo and in `.env.*`
```bash
# one-off scan of git history and working tree
docker run --rm -v "%cd%:/repo" zricethezav/gitleaks:latest detect --source /repo --no-banner -v
# add as a pre-commit hook later:  gitleaks protect --staged
```
**Known exposure to fix first** (found during the Registration work, details intentionally not repeated here):
- `.env.dev` contains real credentials: the Mailosaur API key and SMTP password, an email account password (IMAP), the
  admin portal password and database connection strings. Several of these were also pasted into a chat session.
- Actions: (1) rotate the Mailosaur API key and SMTP password, change the email account password, (2) confirm every
  `.env.*` file is git-ignored and was never committed (`git log --all -- .env.dev`), (3) move secrets to a vault or CI
  secret store and keep only `.env.example` with placeholders, (4) ensure `playwright-report/`, `test-results/` and traces
  do not embed tokens (traces record request headers — scrub or restrict access).

## 3. Test-artifact leakage
- Playwright traces/videos contain request bodies (mobile, ID numbers, bearer tokens). Retain only on failure (already set)
  and keep CI artifacts private with a short retention.
- `data/registrationAssets.json` holds 2000 real-looking National IDs/CRNs/mobiles: confirm they are synthetic test data
  and not real people; restrict repo access accordingly (PDPL).

## 4. CI hardening checklist
- Run `npm ci` (lockfile) not `npm install`; commit `package-lock.json`.
- Disable lifecycle scripts for untrusted packages: `npm ci --ignore-scripts` where possible.
- Dependabot/Renovate weekly PRs for dev dependencies.
- Block `dangerouslyDisableSandbox`-style commands and unpinned `npx` fetches in pipeline steps.
