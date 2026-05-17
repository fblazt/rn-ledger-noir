import { initializeDatabase } from '@/src/db';
import type { LocalBudget } from '@/src/db';
import { nowIso } from '@/src/lib/date';
import { createId } from '@/src/lib/id';
import { scheduleSyncAfterLocalWrite } from '@/src/sync/auto';

import type { BudgetFormInput, BudgetWithUsage } from './types';

export async function listLocalBudgets(userId: string, month: string) {
  const db = await initializeDatabase();

  return db.getAllAsync<BudgetWithUsage>(
    `select
       b.*,
       c.name as category_name,
       c.icon as category_icon,
       c.color as category_color,
       coalesce(sum(t.amount), 0) as used_amount,
       b.limit_amount - coalesce(sum(t.amount), 0) as remaining_amount,
       cast((coalesce(sum(t.amount), 0) * 100.0) / b.limit_amount as real) as usage_percent
     from local_budgets b
     join local_categories c on c.id = b.category_id and c.user_id = b.user_id
     left join local_transactions t
       on t.user_id = b.user_id
      and t.category_id = b.category_id
      and t.type = 'expense'
      and t.deleted_at is null
      and t.transaction_date like b.month || '-%'
     where b.user_id = ?
       and b.month = ?
       and b.deleted_at is null
     group by b.id
     order by usage_percent desc, lower(c.name) asc`,
    userId,
    month
  );
}

export async function listBudgetedCategoryIds(userId: string, month: string, excludeBudgetId?: string) {
  const db = await initializeDatabase();
  const args = [userId, month];
  const predicates = ['user_id = ?', 'month = ?', 'deleted_at is null'];

  if (excludeBudgetId) {
    predicates.push('id != ?');
    args.push(excludeBudgetId);
  }

  const rows = await db.getAllAsync<{ category_id: string }>(
    `select category_id
     from local_budgets
     where ${predicates.join(' and ')}`,
    ...args
  );

  return new Set(rows.map((row) => row.category_id));
}

export async function getLocalBudget(userId: string, budgetId: string) {
  const db = await initializeDatabase();

  return db.getFirstAsync<LocalBudget>(
    `select *
     from local_budgets
     where id = ? and user_id = ? and deleted_at is null`,
    budgetId,
    userId
  );
}

export async function createLocalBudget(userId: string, input: BudgetFormInput) {
  const db = await initializeDatabase();
  await assertExpenseCategory(userId, input.categoryId);

  const timestamp = nowIso();
  const id = createId();

  try {
    await db.runAsync(
      `insert into local_budgets (
        id,
        user_id,
        category_id,
        month,
        limit_amount,
        created_at,
        updated_at,
        sync_status
      ) values (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      id,
      userId,
      input.categoryId,
      input.month,
      Number(input.limitAmount),
      timestamp,
      timestamp
    );
  } catch (error) {
    throw normalizeBudgetError(error);
  }

  scheduleSyncAfterLocalWrite(userId);

  return getLocalBudget(userId, id);
}

export async function updateLocalBudget(userId: string, budgetId: string, input: BudgetFormInput) {
  const existing = await getLocalBudget(userId, budgetId);

  if (!existing) {
    throw new Error('Budget not found.');
  }

  const db = await initializeDatabase();
  await assertExpenseCategory(userId, input.categoryId);

  try {
    await db.runAsync(
      `update local_budgets
       set category_id = ?,
           month = ?,
           limit_amount = ?,
           updated_at = ?,
           sync_status = 'pending',
           synced_at = null
       where id = ? and user_id = ? and deleted_at is null`,
      input.categoryId,
      input.month,
      Number(input.limitAmount),
      nowIso(),
      budgetId,
      userId
    );
  } catch (error) {
    throw normalizeBudgetError(error);
  }

  scheduleSyncAfterLocalWrite(userId);

  return getLocalBudget(userId, budgetId);
}

export async function deleteLocalBudget(userId: string, budgetId: string) {
  const existing = await getLocalBudget(userId, budgetId);

  if (!existing) {
    throw new Error('Budget not found.');
  }

  const db = await initializeDatabase();
  const timestamp = nowIso();

  await db.runAsync(
    `update local_budgets
     set deleted_at = ?,
         updated_at = ?,
         sync_status = 'pending',
         synced_at = null
     where id = ? and user_id = ? and deleted_at is null`,
    timestamp,
    timestamp,
    budgetId,
    userId
  );

  scheduleSyncAfterLocalWrite(userId);
}

async function assertExpenseCategory(userId: string, categoryId: string) {
  const db = await initializeDatabase();
  const category = await db.getFirstAsync<{ type: string }>(
    `select type
     from local_categories
     where id = ? and user_id = ? and deleted_at is null`,
    categoryId,
    userId
  );

  if (!category) {
    throw new Error('Choose an active expense category.');
  }

  if (category.type !== 'expense') {
    throw new Error('Budgets can only use expense categories.');
  }
}

function normalizeBudgetError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.toLowerCase().includes('unique')) {
    return new Error('This category already has a budget for the selected month.');
  }

  return error instanceof Error ? error : new Error('Unable to save budget.');
}
