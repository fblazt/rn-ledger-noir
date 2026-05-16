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

const dir = mkdtempSync(join(tmpdir(), 'fintrack-dashboard-'));
const dbPath = join(dir, 'fintrack.db');
const sqlPath = join(dir, 'validate-dashboard.sql');
const userId = randomUUID();
const foodCategoryId = randomUUID();
const transportCategoryId = randomUUID();
const salaryCategoryId = randomUUID();
const deletedTransactionId = randomUUID();
const now = new Date().toISOString();

function transactionSql({ id = randomUUID(), type, amount, categoryId, note, date, deletedAt = 'null' }) {
  return `insert into local_transactions (
  id, user_id, type, amount, category_id, note, transaction_date, created_at, updated_at, deleted_at, sync_status
) values (
  '${id}', '${userId}', '${type}', ${amount}, '${categoryId}', '${note}', '${date}', '${now}', '${now}', ${deletedAt}, 'pending'
);`;
}

const sql = `
.bail on
pragma foreign_keys = on;
${migration}

insert into local_profiles (id, email, display_name, currency, created_at, updated_at, sync_status)
values ('${userId}', 'dashboard-smoke@local.test', 'Dashboard Smoke User', 'IDR', '${now}', '${now}', 'pending');

insert into local_categories (id, user_id, name, type, icon, color, is_default, created_at, updated_at, sync_status)
values
  ('${foodCategoryId}', '${userId}', 'Food', 'expense', 'utensils', '#FB7185', 1, '${now}', '${now}', 'pending'),
  ('${transportCategoryId}', '${userId}', 'Transport', 'expense', 'bus', '#38BDF8', 1, '${now}', '${now}', 'pending'),
  ('${salaryCategoryId}', '${userId}', 'Salary', 'income', 'briefcase', '#22C55E', 1, '${now}', '${now}', 'pending');

${transactionSql({ type: 'income', amount: 5000000, categoryId: salaryCategoryId, note: 'May salary', date: '2026-05-02' })}
${transactionSql({ type: 'expense', amount: 75000, categoryId: foodCategoryId, note: 'Lunch', date: '2026-05-03' })}
${transactionSql({ type: 'expense', amount: 125000, categoryId: foodCategoryId, note: 'Groceries', date: '2026-05-04' })}
${transactionSql({ type: 'expense', amount: 50000, categoryId: transportCategoryId, note: 'Train', date: '2026-05-05' })}
${transactionSql({ type: 'income', amount: 999999, categoryId: salaryCategoryId, note: 'Other month', date: '2026-06-01' })}
${transactionSql({ id: deletedTransactionId, type: 'expense', amount: 900000, categoryId: foodCategoryId, note: 'Deleted', date: '2026-05-06', deletedAt: `'${now}'` })}

select 'income_total', coalesce(sum(case when type = 'income' then amount else 0 end), 0)
from local_transactions
where user_id = '${userId}' and deleted_at is null and transaction_date like '2026-05-%';

select 'expense_total', coalesce(sum(case when type = 'expense' then amount else 0 end), 0)
from local_transactions
where user_id = '${userId}' and deleted_at is null and transaction_date like '2026-05-%';

select 'balance',
  coalesce(sum(case when type = 'income' then amount else 0 end), 0) -
  coalesce(sum(case when type = 'expense' then amount else 0 end), 0)
from local_transactions
where user_id = '${userId}' and deleted_at is null and transaction_date like '2026-05-%';

select 'recent_deleted_count', count(*)
from local_transactions
where user_id = '${userId}' and deleted_at is null and id = '${deletedTransactionId}';

select 'top_spending_category', c.name || ':' || sum(t.amount)
from local_transactions t
join local_categories c on c.id = t.category_id and c.user_id = t.user_id
where t.user_id = '${userId}' and t.deleted_at is null and t.type = 'expense' and t.transaction_date like '2026-05-%'
group by c.id, c.name, c.color
order by sum(t.amount) desc, c.name asc
limit 1;
`;

writeFileSync(sqlPath, sql);

const result = spawnSync('sqlite3', [dbPath, `.read ${sqlPath}`], { encoding: 'utf8' });

try {
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    process.exit(result.status ?? 1);
  }

  const rows = Object.fromEntries(
    result.stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split('|'))
  );

  const expected = {
    balance: '4750000',
    expense_total: '250000',
    income_total: '5000000',
    recent_deleted_count: '0',
    top_spending_category: 'Food:200000',
  };

  console.log(result.stdout.trim());

  const failed = Object.entries(expected).filter(([key, value]) => rows[key] !== value);

  if (failed.length > 0) {
    throw new Error(`Dashboard validation failed: ${failed.map(([key, value]) => `${key} expected ${value}, got ${rows[key]}`).join('; ')}`);
  }

  console.log('\nDashboard summary validation passed.');
} finally {
  rmSync(dir, { force: true, recursive: true });
}
