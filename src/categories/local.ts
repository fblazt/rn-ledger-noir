import type { SQLiteDatabase } from 'expo-sqlite';

import { initializeDatabase } from '@/src/db';
import type { LocalCategory, TransactionType } from '@/src/db';
import { nowIso } from '@/src/lib/date';
import { createId } from '@/src/lib/id';
import { scheduleSyncAfterLocalWrite } from '@/src/sync/scheduler';

import type { CategoryFormInput } from './types';

type CategoryListOptions = {
  type?: TransactionType;
};

export async function listLocalCategories(userId: string, options: CategoryListOptions = {}) {
  const db = await initializeDatabase();

  if (options.type) {
    return db.getAllAsync<LocalCategory>(
      `select *
       from local_categories
       where user_id = ? and type = ? and deleted_at is null
       order by is_default desc, lower(name) asc`,
      userId,
      options.type
    );
  }

  return db.getAllAsync<LocalCategory>(
    `select *
     from local_categories
     where user_id = ? and deleted_at is null
     order by type asc, is_default desc, lower(name) asc`,
    userId
  );
}

export async function createLocalCategory(userId: string, input: CategoryFormInput) {
  const db = await initializeDatabase();
  const timestamp = nowIso();
  const id = createId();

  await db.runAsync(
    `insert into local_categories (
      id,
      user_id,
      name,
      type,
      icon,
      color,
      is_default,
      created_at,
      updated_at,
      sync_status
    ) values (?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending')`,
    id,
    userId,
    input.name.trim(),
    input.type,
    input.icon.trim(),
    input.color,
    timestamp,
    timestamp
  );

  scheduleSyncAfterLocalWrite(userId);

  return getLocalCategory(db, userId, id);
}

export async function updateLocalCategory(userId: string, categoryId: string, input: CategoryFormInput) {
  const db = await initializeDatabase();
  const existing = await getLocalCategory(db, userId, categoryId);

  if (!existing) {
    throw new Error('Category not found.');
  }

  if (existing.is_default === 1) {
    throw new Error('Default categories cannot be edited.');
  }

  await db.runAsync(
    `update local_categories
     set name = ?,
         type = ?,
         icon = ?,
         color = ?,
         updated_at = ?,
         sync_status = 'pending',
         synced_at = null
     where id = ? and user_id = ? and deleted_at is null`,
    input.name.trim(),
    input.type,
    input.icon.trim(),
    input.color,
    nowIso(),
    categoryId,
    userId
  );

  scheduleSyncAfterLocalWrite(userId);

  return getLocalCategory(db, userId, categoryId);
}

export async function deleteLocalCategory(userId: string, categoryId: string) {
  const db = await initializeDatabase();
  const existing = await getLocalCategory(db, userId, categoryId);

  if (!existing) {
    throw new Error('Category not found.');
  }

  if (existing.is_default === 1) {
    throw new Error('Default categories cannot be deleted.');
  }

  const activeTransaction = await db.getFirstAsync<{ count: number }>(
    `select count(*) as count
     from local_transactions
     where user_id = ? and category_id = ? and deleted_at is null`,
    userId,
    categoryId
  );

  if ((activeTransaction?.count ?? 0) > 0) {
    throw new Error('This category is used by active transactions.');
  }

  await db.runAsync(
    `update local_categories
     set deleted_at = ?,
         updated_at = ?,
         sync_status = 'pending',
         synced_at = null
     where id = ? and user_id = ? and deleted_at is null`,
    nowIso(),
    nowIso(),
    categoryId,
    userId
  );

  scheduleSyncAfterLocalWrite(userId);
}

async function getActiveCategoryCount(userId: string, type: TransactionType) {
  const db = await initializeDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `select count(*) as count
     from local_categories
     where user_id = ? and type = ? and deleted_at is null`,
    userId,
    type
  );

  return row?.count ?? 0;
}

export async function getLocalCategoryById(userId: string, categoryId: string) {
  const db = await initializeDatabase();

  return getLocalCategory(db, userId, categoryId);
}

async function getLocalCategory(db: SQLiteDatabase, userId: string, categoryId: string) {
  return db.getFirstAsync<LocalCategory>(
    `select *
     from local_categories
     where id = ? and user_id = ? and deleted_at is null`,
    categoryId,
    userId
  );
}
