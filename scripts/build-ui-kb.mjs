#!/usr/bin/env node
// Builds the locator part of the UI knowledge base from the page objects.
//
//   node scripts/build-ui-kb.mjs
//
// Reads  BusinessTestCases/pageElements/**/*.ts
// Writes docs/ui-kb/<Module>.generated.md  (one per module folder) and docs/ui-kb/INDEX.md
//
// Generated files are overwritten on every run - never edit them by hand.
// Hand-written logic lives in docs/ui-kb/<Module>.md (never touched by this script).

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POM_DIR = path.join(root, 'BusinessTestCases', 'pageElements');
const KB_DIR = path.join(root, 'docs', 'ui-kb');
mkdirSync(KB_DIR, { recursive: true });

const walk = (dir) => readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
});

const rel = (p) => path.relative(root, p).split(path.sep).join('/');
const esc = (s) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

function kindOf(expr) {
    const k = [];
    if (/getByTestId|data-testid/.test(expr)) k.push('testid');
    if (/getByRole/.test(expr)) k.push('role');
    if (/getByLabel/.test(expr)) k.push('label');
    if (/getByText/.test(expr)) k.push('text');
    if (/getByPlaceholder/.test(expr)) k.push('placeholder');
    if (/\.locator\(/.test(expr) && !k.length) k.push('css');
    else if (/\.locator\(/.test(expr)) k.push('css');
    return k.length ? k.join('+') : 'derived';
}

// Pulls statements out of a constructor body: `this.name = <expr>;`, tracking paren depth so multi-line chains stay together.
function parseAssignments(lines, start, end) {
    const out = [];
    let pending = [];
    for (let i = start; i < end; i++) {
        const line = lines[i];
        const t = line.trim();
        if (t.startsWith('//')) { pending.push(t.replace(/^\/\/\s?/, '')); continue; }
        if (t === '') { continue; }
        const m = /^this\.(\w+)\s*=\s*(.*)$/.exec(t);
        if (!m) { pending = []; continue; }
        let expr = m[2];
        let depth = (expr.match(/[([{]/g) ?? []).length - (expr.match(/[)\]}]/g) ?? []).length;
        let j = i;
        while ((depth > 0 || !/;\s*(\/\/.*)?$/.test(expr)) && j + 1 < end) {
            j++;
            expr += ' ' + lines[j].trim();
            depth = (expr.match(/[([{]/g) ?? []).length - (expr.match(/[)\]}]/g) ?? []).length;
        }
        expr = expr.replace(/;\s*(\/\/.*)?$/, '').replace(/\s+/g, ' ');
        out.push({ name: m[1], expr, line: i + 1, notes: pending.join(' ') });
        pending = [];
        i = j;
    }
    return out;
}

function parseMethods(lines) {
    const out = [];
    let doc = [];
    lines.forEach((raw, i) => {
        const t = raw.trim();
        if (t.startsWith('/**') || t.startsWith('*') || t.startsWith('//')) { doc.push(t.replace(/^(\/\*\*|\*\/|\*|\/\/)\s?/, '')); return; }
        const m = /^(?:public\s+)?(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*[^{]+)?\{\s*$/.exec(t);
        if (m && !['constructor', 'if', 'for', 'while', 'switch', 'catch'].includes(m[1]) && /^\s{2,8}\S/.test(raw)) {
            out.push({ name: m[1], args: m[2].replace(/\s+/g, ' ').trim(), line: i + 1, doc: doc.join(' ').trim() });
        }
        doc = [];
    });
    return out;
}

const modules = new Map(); // module -> [{file, classes}]
for (const file of walk(POM_DIR).sort()) {
    const text = readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    const moduleName = path.relative(POM_DIR, file).split(path.sep)[0];
    const classes = [];
    lines.forEach((l, i) => { const m = /^export class (\w+)/.exec(l); if (m) classes.push({ name: m[1], line: i + 1 }); });

    const ctor = lines.findIndex((l) => /^\s*constructor\s*\(/.test(l));
    let assignments = [];
    if (ctor >= 0) {
        let depth = 0, started = false, end = lines.length;
        for (let i = ctor; i < lines.length; i++) {
            for (const ch of lines[i]) { if (ch === '{') { depth++; started = true; } else if (ch === '}') depth--; }
            if (started && depth === 0) { end = i; break; }
        }
        assignments = parseAssignments(lines, ctor + 1, end);
    }
    // Locator getters: `get name(): Locator { return <expr>; }`
    lines.forEach((l, i) => {
        const g = /^\s*get\s+(\w+)\(\)\s*:\s*Locator\s*\{\s*$/.exec(l);
        if (!g) return;
        let body = '';
        for (let j = i + 1; j < lines.length && !/^\s{0,4}\}\s*$/.test(lines[j]); j++) body += ' ' + lines[j].trim();
        const r = /return\s+(.*?);?\s*$/.exec(body.trim());
        const prev = lines[i - 1]?.trim() ?? '';
        assignments.push({ name: g[1], expr: (r ? r[1] : body.trim()).replace(/;$/, '').replace(/\s+/g, ' '), line: i + 1, notes: ['(getter)', prev.startsWith('/**') || prev.startsWith('*') || prev.startsWith('//') ? prev.replace(/^(\/\*\*|\*\/|\*|\/\/)\s?/, '').replace(/\*\/$/, '').trim() : ''].filter(Boolean).join(' ') });
    });
    const header = [];
    for (const l of lines.slice(0, classes[0]?.line ?? 0)) { const t = l.trim(); if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/**')) header.push(t.replace(/^(\/\*\*|\*\/|\*|\/\/)\s?/, '')); }
    const methods = parseMethods(lines);
    const urlConsts = [...text.matchAll(/(?:const|readonly)\s+(\w*(?:URL|Url|PATH|Path|ROUTE)\w*)\s*[:=][^'"`]*['"`]([^'"`]+)['"`]/g)].map((m) => `${m[1]} = ${m[2]}`);
    if (!modules.has(moduleName)) modules.set(moduleName, []);
    modules.get(moduleName).push({ file: rel(file), classes, assignments, methods, header: header.join(' ').trim(), urlConsts });
}

const stamp = new Date().toISOString().slice(0, 10);
const index = [];
for (const [moduleName, files] of [...modules.entries()].sort()) {
    const md = [];
    md.push(`# ${moduleName} - locator catalog (generated)`);
    md.push('');
    md.push(`> Generated by \`scripts/build-ui-kb.mjs\` on ${stamp} from \`BusinessTestCases/pageElements/${moduleName}/\`. Do not edit. Logic, forms, tables and conditions are in \`${moduleName}.md\` when it exists.`);
    md.push('');
    let count = 0;
    for (const f of files) {
        const cls = f.classes.map((c) => c.name).join(', ') || '(no class)';
        md.push(`## ${cls}`);
        md.push('');
        md.push(`Source: \`${f.file}\``);
        if (f.header) md.push('', `About: ${esc(f.header)}`);
        if (f.urlConsts.length) md.push('', `Routes/paths: ${f.urlConsts.map((u) => `\`${esc(u)}\``).join(', ')}`);
        md.push('');
        if (f.assignments.length) {
            md.push('| Element | Locator type | Locator | Line | Notes |');
            md.push('|---|---|---|---|---|');
            for (const a of f.assignments) {
                md.push(`| \`${a.name}\` | ${kindOf(a.expr)} | \`${esc(a.expr).replace(/`/g, "'")}\` | ${a.line} | ${esc(a.notes)} |`);
            }
            count += f.assignments.length;
            md.push('');
        }
        if (f.methods.length) {
            md.push('| Action | Arguments | Line | What it does |');
            md.push('|---|---|---|---|');
            for (const m of f.methods) md.push(`| \`${m.name}\` | \`${esc(m.args)}\` | ${m.line} | ${esc(m.doc)} |`);
            md.push('');
        }
    }
    writeFileSync(path.join(KB_DIR, `${moduleName}.generated.md`), md.join('\n'));
    index.push({ moduleName, files: files.length, elements: count, curated: existsSync(path.join(KB_DIR, `${moduleName}.md`)) });
}

const idx = [];
idx.push('# UI knowledge base - index', '');
idx.push(`Generated ${stamp} by \`scripts/build-ui-kb.mjs\`. Each module has a generated locator catalog and, where written, a hand-curated logic file (forms, tables, conditions, business rules).`, '');
idx.push('| Module | Page objects | Elements | Locators (generated) | Logic (curated) |', '|---|---|---|---|---|');
for (const m of index) idx.push(`| ${m.moduleName} | ${m.files} | ${m.elements} | [${m.moduleName}.generated.md](${m.moduleName}.generated.md) | ${m.curated ? `[${m.moduleName}.md](${m.moduleName}.md)` : 'not written yet'} |`);
const generatedNames = new Set(index.map((m) => `${m.moduleName}.md`));
const extraCurated = readdirSync(KB_DIR).filter((n) => n.endsWith('.md') && !n.endsWith('.generated.md') && n !== 'INDEX.md' && !generatedNames.has(n)).sort();
if (extraCurated.length) {
    idx.push('', '## Logic files without their own locator catalog', '', '| File | Note |', '|---|---|');
    for (const n of extraCurated) idx.push(`| [${n}](${n}) | Curated logic; its page objects may sit in another module's catalog (e.g. BankTransfer is in Shared) |`);
}
idx.push('', '## Other sources', '', '| Topic | File |', '|---|---|',
    '| data-testid names and conventions | `docs/QA-DATA-TESTID-HANDOFF.md` |',
    '| Business flows (W2W, bank transfer, bill payment, errors) | `docs/EMI_Business_Flows.md` |',
    '| Business rules and refined stories | `docs/business-knowledge/` |',
    '| Manual test cases per feature | `docs/manual-test-cases/` |',
    '| Framework conventions | `docs/CLAUDE.md` |');
writeFileSync(path.join(KB_DIR, 'INDEX.md'), idx.join('\n') + '\n');
console.log(`Wrote ${index.length} module catalogs and INDEX.md to docs/ui-kb/ (${index.reduce((a, m) => a + m.elements, 0)} elements)`);
