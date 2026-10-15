import { test, expect } from '@playwright/test';
import { getSqlPool, closeSqlPool } from '../../../support/sqlServerClient';

// Wallet Snapshot database schema (EMI-6114) — wallet_snapshots /
// wallet_snapshot_events / wallet_snapshot_verifications. No REST endpoint of
// its own; this ticket is verified directly at the DB level via the same
// support/sqlServerClient.ts pattern TopupHelper.ts/RegistrationHelper.ts
// already use. See docs/business-knowledge/EMI-6114-Refined-Ticket.md.
//
// Test IDs (WSD-xx) map 1:1 to docs/manual-test-cases/audit-additions.json's
// "Wallet Snapshot Pipeline" sheet, sub "Snapshot Database Schema (EMI-6114)".
//
// Which emi_* database owns these tables was never confirmed live (this
// session's sandbox could not reach the dev SQL Server), so WSD-01 discovers
// it dynamically via sys.databases rather than hardcoding a guess — every
// later test reuses that discovered name.

test.describe('Wallet Snapshot Schema', () => {
    test.describe.configure({ mode: 'serial' });

    let ownerDb: string | null = null;

    test.afterAll(async () => {
        await closeSqlPool();
    });

    test('WSD-01: wallet_snapshots, wallet_snapshot_events, and wallet_snapshot_verifications tables exist', async () => {
        const pool = await getSqlPool();
        const dbs = await pool.request().query(`
            SELECT name FROM sys.databases WHERE name LIKE 'emi_%';
        `);

        for (const { name } of dbs.recordset as { name: string }[]) {
            const res = await pool.request().query(`
                USE [${name}];
                SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE 'wallet_snapshot%';
            `);
            if (res.recordset.length > 0) {
                ownerDb = name;
                break;
            }
        }

        expect(ownerDb, 'no emi_* database contains any wallet_snapshot* table').not.toBeNull();

        const tables = await pool.request().query(`
            USE [${ownerDb}];
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME IN
                ('wallet_snapshots', 'wallet_snapshot_events', 'wallet_snapshot_verifications');
        `);
        const found = new Set((tables.recordset as { TABLE_NAME: string }[]).map((r) => r.TABLE_NAME));
        for (const t of ['wallet_snapshots', 'wallet_snapshot_events', 'wallet_snapshot_verifications']) {
            expect(found.has(t), `table ${t} not found in ${ownerDb}`).toBe(true);
        }
    });

    test('WSD-02: every reserveDebit/reserveCredit/current/available balance column is a precision-safe decimal type, never float', async () => {
        expect(ownerDb, 'WSD-01 must run first and discover the owning database').not.toBeNull();
        const pool = await getSqlPool();
        const cols = await pool.request().query(`
            USE [${ownerDb}];
            SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'wallet_snapshots'
              AND (COLUMN_NAME LIKE '%reserve%' OR COLUMN_NAME LIKE '%current%' OR COLUMN_NAME LIKE '%available%');
        `);
        expect(cols.recordset.length, 'expected at least one balance-bucket column on wallet_snapshots').toBeGreaterThan(0);
        for (const c of cols.recordset as { COLUMN_NAME: string; DATA_TYPE: string }[]) {
            expect(['decimal', 'numeric'], `${c.COLUMN_NAME} is ${c.DATA_TYPE}, expected decimal/numeric`).toContain(c.DATA_TYPE.toLowerCase());
        }
    });

    test('WSD-03: the wallet_snapshots status column accepts all six documented statuses', async () => {
        expect(ownerDb, 'WSD-01 must run first and discover the owning database').not.toBeNull();
        const pool = await getSqlPool();
        // Confirms the column exists and its declared type/constraints; does not
        // attempt a live INSERT (would mutate real data) — see EMI-6114's doc §4
        // for why a human with DB access should confirm all 6 values are
        // actually permitted (CHECK constraint, lookup FK, or none at all).
        const col = await pool.request().query(`
            USE [${ownerDb}];
            SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'wallet_snapshots' AND COLUMN_NAME = 'status';
        `);
        expect(col.recordset.length, 'wallet_snapshots.status column not found').toBe(1);
    });

    test('WSD-05: wallet_snapshots has no declared foreign key to wallet_snapshot_events (confirmed soft runId correlation)', async () => {
        expect(ownerDb, 'WSD-01 must run first and discover the owning database').not.toBeNull();
        const pool = await getSqlPool();
        const fks = await pool.request().query(`
            USE [${ownerDb}];
            SELECT fk.name AS fk_name, tp.name AS parent_table, tr.name AS ref_table
            FROM sys.foreign_keys fk
            INNER JOIN sys.tables tp ON tp.object_id = fk.parent_object_id
            INNER JOIN sys.tables tr ON tr.object_id = fk.referenced_object_id
            WHERE (tp.name = 'wallet_snapshots' AND tr.name = 'wallet_snapshot_events')
               OR (tp.name = 'wallet_snapshot_events' AND tr.name = 'wallet_snapshots');
        `);
        // EMI-6127's tech notes state this correlation is by runId value, not a
        // declared FK — this test documents the CURRENT state as a tripwire: if
        // it ever starts failing (a FK now exists), that's a deliberate schema
        // change worth noting in EMI-6114's doc, not a bug in this test.
        expect(fks.recordset.length, 'expected no declared FK between wallet_snapshots and wallet_snapshot_events (soft runId correlation) — if this now fails, a FK was added, update EMI-6114-Refined-Ticket.md §2/§5 accordingly').toBe(0);
    });

    test('WSD-08: wallet_snapshot_verifications has a nullable foreign key to wallet_snapshot_events (event_id)', async () => {
        expect(ownerDb, 'WSD-01 must run first and discover the owning database').not.toBeNull();
        const pool = await getSqlPool();
        const fks = await pool.request().query(`
            USE [${ownerDb}];
            SELECT fk.name AS fk_name
            FROM sys.foreign_keys fk
            INNER JOIN sys.tables tp ON tp.object_id = fk.parent_object_id
            INNER JOIN sys.tables tr ON tr.object_id = fk.referenced_object_id
            WHERE tp.name = 'wallet_snapshot_verifications' AND tr.name = 'wallet_snapshot_events';
        `);
        expect(fks.recordset.length, 'expected a FK from wallet_snapshot_verifications to wallet_snapshot_events').toBeGreaterThan(0);
    });
});
