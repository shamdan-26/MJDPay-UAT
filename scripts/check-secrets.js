'use strict';

const { execFileSync } = require('child_process');

const ENV_FILE_PATTERN = /(^|\/)\.env(\.[^/]+)?$/;
const ALLOWED_ENV_FILES = new Set(['.env.example']);

const SECRET_PATTERNS = [
    { name: 'MongoDB connection string', regex: /mongodb(\+srv)?:\/\/[^\s"'`]+/gi },
    { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/g },
    { name: 'Google API key', regex: /AIza[0-9A-Za-z\-_]{35}/g },
    { name: 'Slack token', regex: /xox[baprs]-[0-9A-Za-z-]{10,}/g },
    { name: 'Private key block', regex: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g },
    { name: 'Generic secret assignment', regex: /(password|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"\s]{8,}['"]/gi },
];

function run(args) {
    return execFileSync('git', args, { encoding: 'utf8' });
}

function stagedFiles() {
    return run(['diff', '--cached', '--name-only', '--diff-filter=ACM'])
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
}

function addedLines(file) {
    let diff;
    try {
        diff = run(['diff', '--cached', '-U0', '--', file]);
    } catch {
        return [];
    }
    return diff.split('\n').filter((line) => line.startsWith('+') && !line.startsWith('+++'));
}

const violations = [];

for (const file of stagedFiles()) {
    const baseName = file.split('/').pop();
    if (ENV_FILE_PATTERN.test(file) && !ALLOWED_ENV_FILES.has(baseName)) {
        violations.push(`${file}: committing an .env file is blocked — env files must stay untracked/gitignored`);
        continue;
    }

    for (const line of addedLines(file)) {
        for (const { name, regex } of SECRET_PATTERNS) {
            regex.lastIndex = 0;
            if (regex.test(line)) {
                violations.push(`${file}: possible ${name} in added line:\n    ${line.slice(0, 160)}`);
            }
        }
    }
}

if (violations.length) {
    console.error('Commit blocked — possible secret(s) detected:\n');
    for (const v of violations) console.error(' - ' + v);
    console.error(
        '\nSecrets belong in .env files (already gitignored), never in source. ' +
        'If this is a false positive, adjust the patterns in scripts/check-secrets.js.'
    );
    process.exit(1);
}
