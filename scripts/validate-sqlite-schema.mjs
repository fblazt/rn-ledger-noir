#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const sqliteVersion = spawnSync('sqlite3', ['--version'], { encoding: 'utf8' });

if (sqliteVersion.status !== 0) {
  console.error('sqlite3 CLI is required to run this validation.');
  process.exit(1);
}

const schema = readFileSync('src/db/schema.ts', 'utf8');
const migration = schema.match(/1: `([\s\S]*)`,\n};/)?.[1];

if (!migration) {
  console.error('Could not find migration 1 in src/db/schema.ts.');
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), 'fintrack-sqlite-'));
const dbPath = join(dir, 'fintrack.db');
const sqlPath = join(dir, 'validate.sql');
const userId = randomUUID();
const categoryId = randomUUID();
const transactionId = randomUUID();
const budgetId = randomUUID();
const attachmentId = randomUUID();
const now = new Date().toISOString();

const sql = `
.bail on
pragma foreign_keys = on;
${migration}
${migration}

insert into local_profiles (
  id, email, display_name, currency, created_at, updated_at, sync_status
) values (
  '${userId}', 'sqlite-smoke@local.test', 'SQLite Smoke User', 'IDR', '${now}', '${now}', 'pending'
);

insert or ignore into local_categories (
  id, user_id, name, type, icon, color, is_default, created_at, updated_at, sync_status
) values (
  '${categoryId}', '${userId}', 'Food', 'expense', 'utensils', '#FB7185', 1, '${now}', '${now}', 'pending'
);

insert or ignore into local_categories (
  id, user_id, name, type, icon, color, is_default, created_at, updated_at, sync_status
) values (
  '${categoryId}', '${userId}', 'Food', 'expense', 'utensils', '#FB7185', 1, '${now}', '${now}', 'pending'
);

insert into local_transactions (
  id, user_id, type, amount, category_id, note, transaction_date, created_at, updated_at, sync_status
) values (
  '${transactionId}', '${userId}', 'expense', 45000, '${categoryId}', 'SQLite smoke', '2026-05-15', '${now}', '${now}', 'pending'
);

insert into local_budgets (
  id, user_id, category_id, month, limit_amount, created_at, updated_at, sync_status
) values (
  '${budgetId}', '${userId}', '${categoryId}', '2026-05', 1500000, '${now}', '${now}', 'pending'
);

insert into local_transaction_attachments (
  id, user_id, transaction_id, storage_path, local_uri, file_name, mime_type, size, created_at, updated_at, sync_status, upload_status
) values (
  '${attachmentId}', '${userId}', '${transactionId}', null, 'file://receipt.png', 'receipt.png', 'image/png', 1, '${now}', '${now}', 'pending', 'local'
);

insert into sync_queue (
  entity_type, entity_id, operation, payload, status, created_at, updated_at
) values (
  'transaction', '${transactionId}', 'insert', '{"id":"${transactionId}"}', 'pending', '${now}', '${now}'
);

select 'profiles', count(*) from local_profiles where id = '${userId}';
select 'default_categories', count(*) from local_categories where user_id = '${userId}' and is_default = 1;
select 'transactions', count(*) from local_transactions where id = '${transactionId}';
select 'budgets', count(*) from local_budgets where id = '${budgetId}';
select 'attachments', count(*) from local_transaction_attachments where id = '${attachmentId}';
select 'sync_queue', count(*) from sync_queue where entity_id = '${transactionId}';
`;

writeFileSync(sqlPath, sql);

const result = spawnSync('sqlite3', [dbPath, `.read ${sqlPath}`], { encoding: 'utf8' });

try {
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    process.exit(result.status ?? 1);
  }

  const rows = result.stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('|'));
  const failed = rows.filter(([, count]) => count !== '1');

  console.log(result.stdout.trim());

  if (failed.length > 0) {
    throw new Error(`SQLite validation failed: ${failed.map(([name, count]) => `${name}=${count}`).join(', ')}`);
  }

  console.log('\nSQLite schema validation passed.');
} finally {
  rmSync(dir, { force: true, recursive: true });
}
