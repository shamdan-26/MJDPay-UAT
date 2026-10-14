#!/usr/bin/env node
// Read-only DB helper for the /db skill. Never prints credentials.
//
//   node .claude/skills/db/db-query.mjs sql-databases
//   node .claude/skills/db/db-query.mjs sql-tables  <database> [nameFilter]
//   node .claude/skills/db/db-query.mjs sql-columns <database> <table>
//   node .claude/skills/db/db-query.mjs sql         <database> "<SELECT ...>" [maxRows=50]
//   node .claude/skills/db/db-query.mjs mongo-dbs
//   node .claude/skills/db/db-query.mjs mongo-collections <database>
//   node .claude/skills/db/db-query.mjs mongo-find  <database> <collection> '<json filter>' [limit=20] ['<json sort>']
//   node .claude/skills/db/db-query.mjs mongo-count <database> <collection> '<json filter>'
//
// Connection settings come from .env.<ENV> at the repo root (ENV defaults to "dev"):
// MSSQL_HOST, MSSQL_PORT, MSSQL_USER, MSSQL_PASSWORD, MONGO_URI.

import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const require = createRequire(path.join(root, 'package.json'));
const dotenv = require('dotenv');

const envName = process.env.ENV || 'dev';
const envFile = path.join(root, `.env.${envName}`);
if (!existsSync(envFile)) fail(`Env file not found: .env.${envName}`);
dotenv.config({ path: envFile, quiet: true });

const [, , cmd, ...args] = process.argv;
const MAX_CELL = 200;

function fail(msg) {
    console.error(`ERROR: ${msg}`);
    process.exit(1);
}

// Only SELECT / WITH ... SELECT, and no statement stacking or anything that writes or executes.
const WRITE_WORDS = /\b(insert|update|delete|merge|drop|alter|create|truncate|exec|execute|grant|revoke|deny|backup|restore|shutdown|into|xp_\w+|sp_\w+|openrowset|opendatasource|bulk)\b/i;
function assertReadOnlySql(q) {
    const stripped = q.replace(/'(?:[^']|'')*'/g, "''").replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    if (!/^\s*(select|with)\b/i.test(stripped)) fail('Only SELECT / WITH queries are allowed.');
    if (stripped.includes(';') && stripped.trim().replace(/;$/, '').includes(';')) fail('Multiple statements are not allowed.');
    if (WRITE_WORDS.test(stripped)) fail('Query contains a write/exec keyword; this helper is read-only.');
}

const q = (s) => s.replace(/]/g, ']]'); // bracket-escape an identifier
const ident = (s) => { if (!/^[A-Za-z0-9_.\-$ ]+$/.test(s)) fail(`Unsafe identifier: ${s}`); return s; };

function trim(rows) {
    return rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => {
        let x = v instanceof Date ? v.toISOString() : v;
        if (typeof x === 'string' && x.length > MAX_CELL) x = `${x.slice(0, MAX_CELL)}…(${x.length} chars)`;
        if (x && typeof x === 'object' && !(x instanceof Date)) { const j = JSON.stringify(x); x = j.length > MAX_CELL ? `${j.slice(0, MAX_CELL)}…` : x; }
        return [k, x];
    })));
}

async function withSql(fn) {
    const { MSSQL_HOST, MSSQL_PORT, MSSQL_USER, MSSQL_PASSWORD } = process.env;
    if (!MSSQL_HOST || !MSSQL_USER || !MSSQL_PASSWORD) fail('MSSQL_HOST / MSSQL_USER / MSSQL_PASSWORD are not set in the env file.');
    const sql = require('mssql');
    const pool = await sql.connect({
        server: MSSQL_HOST, port: Number(MSSQL_PORT ?? 1433), user: MSSQL_USER, password: MSSQL_PASSWORD,
        database: 'master', options: { trustServerCertificate: true, encrypt: false, readOnlyIntent: true }, connectionTimeout: 15000, requestTimeout: 30000,
    });
    try { return await fn(pool); } finally { await pool.close(); }
}

async function withMongo(fn) {
    if (!process.env.MONGO_URI) fail('MONGO_URI is not set in the env file.');
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    await client.connect();
    try { return await fn(client); } finally { await client.close(); }
}

const print = (rows, note = '') => { console.log(JSON.stringify(trim(rows), null, 2)); console.log(`-- ${rows.length} row(s)${note}`); };

try {
    switch (cmd) {
        case 'sql-databases':
            await withSql(async (p) => print((await p.request().query("SELECT name FROM sys.databases WHERE database_id > 4 ORDER BY name")).recordset));
            break;
        case 'sql-tables': {
            const [db, filter = ''] = args; if (!db) fail('database required');
            await withSql(async (p) => {
                const r = p.request(); r.input('f', `%${filter}%`);
                print((await r.query(`USE [${q(ident(db))}]; SELECT TABLE_SCHEMA AS [schema], TABLE_NAME AS [table] FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' AND TABLE_NAME LIKE @f ORDER BY 1,2`)).recordset);
            });
            break;
        }
        case 'sql-columns': {
            const [db, table] = args; if (!db || !table) fail('database and table required');
            await withSql(async (p) => {
                const r = p.request(); r.input('t', table);
                print((await r.query(`USE [${q(ident(db))}]; SELECT COLUMN_NAME AS [column], DATA_TYPE AS [type], CHARACTER_MAXIMUM_LENGTH AS [len], IS_NULLABLE AS [nullable] FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME=@t ORDER BY ORDINAL_POSITION`)).recordset);
            });
            break;
        }
        case 'sql': {
            const [db, query, max = '50'] = args; if (!db || !query) fail('database and query required');
            assertReadOnlySql(query);
            const limit = Math.min(Number(max) || 50, 500);
            await withSql(async (p) => {
                const rows = (await p.request().query(`USE [${q(ident(db))}]; ${query}`)).recordset ?? [];
                print(rows.slice(0, limit), rows.length > limit ? ` (showing first ${limit} of ${rows.length})` : '');
            });
            break;
        }
        case 'mongo-dbs':
            await withMongo(async (c) => print((await c.db().admin().listDatabases({ nameOnly: true })).databases));
            break;
        case 'mongo-collections': {
            const [db] = args; if (!db) fail('database required');
            await withMongo(async (c) => print((await c.db(db).listCollections({}, { nameOnly: true }).toArray())));
            break;
        }
        case 'mongo-find': {
            const [db, coll, filter = '{}', limit = '20', sort = '{}'] = args; if (!db || !coll) fail('database and collection required');
            await withMongo(async (c) => print(await c.db(db).collection(coll).find(JSON.parse(filter)).sort(JSON.parse(sort)).limit(Math.min(Number(limit) || 20, 200)).toArray()));
            break;
        }
        case 'mongo-count': {
            const [db, coll, filter = '{}'] = args; if (!db || !coll) fail('database and collection required');
            await withMongo(async (c) => console.log(await c.db(db).collection(coll).countDocuments(JSON.parse(filter))));
            break;
        }
        default:
            fail('Unknown command. See the header of db-query.mjs for usage.');
    }
} catch (e) {
    // Redact credentials from driver error text (URI userinfo and password=... fragments).
    const uriWithUser = new RegExp(`(mongo${'db'}(?:\\+srv)?):\\/\\/[^@\\s]+@`, 'gi');
    fail(String(e?.message ?? e).replace(/(password|pwd)=[^;\s]+/gi, '$1=***').replace(uriWithUser, '$1://***@'));
}
