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

const dir = mkdtempSync(join(tmpdir(), 'fintrack-budget-'));
const dbPath = join(dir, 'fintrack.db');
const sqlPath = join(dir, 'validate-budget.sql');
const userId = randomUUID();
const foodCategoryId = randomUUID();
const transportCategoryId = randomUUID();
const salaryCategoryId = randomUUID();
const foodBudgetId = randomUUID();
const transportBudgetId = randomUUID();
const now = new Date().toISOString();

const sql = `
.bail on
pragma foreign_keys = on;
${migration}

insert into local_profiles (id, email, display_name, currency, created_at, updated_at, sync_status)
values ('${userId}', 'budget-smoke@local.test', 'Budget Smoke User', 'IDR', '${now}', '${now}', 'pending');

insert into local_categories (id, user_id, name, type, icon, color, is_default, created_at, updated_at, sync_status)
values
  ('${foodCategoryId}', '${userId}', 'Food', 'expense', 'utensils', '#FB7185', 1, '${now}', '${now}', 'pending'),
  ('${transportCategoryId}', '${userId}', 'Transport', 'expense', 'bus', '#38BDF8', 1, '${now}', '${now}', 'pending'),
  ('${salaryCategoryId}', '${userId}', 'Salary', 'income', 'briefcase', '#22C55E', 1, '${now}', '${now}', 'pending');

insert into local_budgets (id, user_id, category_id, month, limit_amount, created_at, updated_at, sync_status)
values
  ('${foodBudgetId}', '${userId}', '${foodCategoryId}', '2026-05', 200000, '${now}', '${now}', 'pending'),
  ('${transportBudgetId}', '${userId}', '${transportCategoryId}', '2026-05', 50000, '${now}', '${now}', 'pending');

insert into local_transactions (id, user_id, type, amount, category_id, note, transaction_date, created_at, updated_at, sync_status)
values
  ('${randomUUID()}', '${userId}', 'expense', 120000, '${foodCategoryId}', 'Groceries', '2026-05-03', '${now}', '${now}', 'pending'),
  ('${randomUUID()}', '${userId}', 'expense', 100000, '${foodCategoryId}', 'Dinner', '2026-05-04', '${now}', '${now}', 'pending'),
  ('${randomUUID()}', '${userId}', 'expense', 10000, '${foodCategoryId}', 'Other month', '2026-06-04', '${now}', '${now}', 'pending'),
  ('${randomUUID()}', '${userId}', 'income', 999999, '${salaryCategoryId}', 'Salary', '2026-05-01', '${now}', '${now}', 'pending'),
  ('${randomUUID()}', '${userId}', 'expense', 25000, '${transportCategoryId}', 'Train', '2026-05-05', '${now}', '${now}', 'pending');

select 'food_used', coalesce(sum(t.amount), 0)
from local_budgets b
left join local_transactions t on t.user_id = b.user_id and t.category_id = b.category_id and t.type = 'expense' and t.deleted_at is null and t.transaction_date like b.month || '-%'
where b.id = '${foodBudgetId}' and b.deleted_at is null;

select 'food_remaining', b.limit_amount - coalesce(sum(t.amount), 0)
from local_budgets b
left join local_transactions t on t.user_id = b.user_id and t.category_id = b.category_id and t.type = 'expense' and t.deleted_at is null and t.transaction_date like b.month || '-%'
where b.id = '${foodBudgetId}' and b.deleted_at is null;

select 'food_percent', round((coalesce(sum(t.amount), 0) * 100.0) / b.limit_amount)
from local_budgets b
left join local_transactions t on t.user_id = b.user_id and t.category_id = b.category_id and t.type = 'expense' and t.deleted_at is null and t.transaction_date like b.month || '-%'
where b.id = '${foodBudgetId}' and b.deleted_at is null;

select 'active_budget_count', count(*)
from local_budgets
where user_id = '${userId}' and month = '2026-05' and deleted_at is null;
`;

writeFileSync(sqlPath, sql);

const result = spawnSync('sqlite3', [dbPath, `.read ${sqlPath}`], { encoding: 'utf8' });

try {
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    process.exit(result.status ?? 1);
  }

  const duplicateResult = spawnSync(
    'sqlite3',
    [dbPath, `insert into local_budgets (id, user_id, category_id, month, limit_amount, created_at, updated_at, sync_status) values ('${randomUUID()}', '${userId}', '${foodCategoryId}', '2026-05', 1, '${now}', '${now}', 'pending');`],
    { encoding: 'utf8' }
  );

  const rows = Object.fromEntries(
    result.stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split('|'))
  );

  const expected = {
    active_budget_count: '2',
    food_percent: '110.0',
    food_remaining: '-20000',
    food_used: '220000',
  };

  console.log(result.stdout.trim());
  console.log(`duplicate_budget_blocked|${duplicateResult.status === 0 ? 0 : 1}`);

  const failed = Object.entries(expected).filter(([key, value]) => rows[key] !== value);

  if (duplicateResult.status === 0) {
    failed.push(['duplicate_budget_blocked', '1']);
  }

  if (failed.length > 0) {
    throw new Error(`Budget validation failed: ${failed.map(([key, value]) => `${key} expected ${value}, got ${rows[key]}`).join('; ')}`);
  }

  console.log('\nBudget summary validation passed.');
} finally {
  rmSync(dir, { force: true, recursive: true });
}
