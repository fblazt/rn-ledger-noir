import { initializeDatabase } from '@/src/db';
import type { LocalTransaction } from '@/src/db';
import { nowIso } from '@/src/lib/date';
import { createId } from '@/src/lib/id';

import type { TransactionFormInput, TransactionListFilters, TransactionWithCategory } from './types';

export async function listLocalTransactions(userId: string, filters: TransactionListFilters) {
  const db = await initializeDatabase();
  const args: (number | string)[] = [userId, `${filters.month}-%`];
  const predicates = [
    't.user_id = ?',
    't.deleted_at is null',
    't.transaction_date like ?',
  ];

  if (filters.type && filters.type !== 'all') {
    predicates.push('t.type = ?');
    args.push(filters.type);
  }

  if (filters.categoryId) {
    predicates.push('t.category_id = ?');
    args.push(filters.categoryId);
  }

  if (filters.query?.trim()) {
    predicates.push('(t.note like ? or c.name like ?)');
    const query = `%${filters.query.trim()}%`;
    args.push(query, query);
  }

  return db.getAllAsync<TransactionWithCategory>(
    `select
       t.*,
       c.name as category_name,
       c.icon as category_icon,
       c.color as category_color
     from local_transactions t
     join local_categories c on c.id = t.category_id and c.user_id = t.user_id
     where ${predicates.join(' and ')}
     order by t.transaction_date desc, t.created_at desc`,
    ...args
  );
}

export async function createLocalTransaction(userId: string, input: TransactionFormInput) {
  const db = await initializeDatabase();
  const timestamp = nowIso();
  const id = createId();
  const note = input.note?.trim() ? input.note.trim() : null;

  await db.runAsync(
    `insert into local_transactions (
      id,
      user_id,
      type,
      amount,
      category_id,
      note,
      transaction_date,
      created_at,
      updated_at,
      sync_status
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    id,
    userId,
    input.type,
    Number(input.amount),
    input.categoryId,
    note,
    input.transactionDate,
    timestamp,
    timestamp
  );

  return getLocalTransaction(userId, id);
}

export async function updateLocalTransaction(userId: string, transactionId: string, input: TransactionFormInput) {
  const existing = await getLocalTransaction(userId, transactionId);

  if (!existing) {
    throw new Error('Transaction not found.');
  }

  const db = await initializeDatabase();
  const note = input.note?.trim() ? input.note.trim() : null;

  await db.runAsync(
    `update local_transactions
     set type = ?,
         amount = ?,
         category_id = ?,
         note = ?,
         transaction_date = ?,
         updated_at = ?,
         sync_status = 'pending',
         synced_at = null
     where id = ? and user_id = ? and deleted_at is null`,
    input.type,
    Number(input.amount),
    input.categoryId,
    note,
    input.transactionDate,
    nowIso(),
    transactionId,
    userId
  );

  return getLocalTransaction(userId, transactionId);
}

export async function deleteLocalTransaction(userId: string, transactionId: string) {
  const existing = await getLocalTransaction(userId, transactionId);

  if (!existing) {
    throw new Error('Transaction not found.');
  }

  const db = await initializeDatabase();
  const timestamp = nowIso();

  await db.runAsync(
    `update local_transactions
     set deleted_at = ?,
         updated_at = ?,
         sync_status = 'pending',
         synced_at = null
     where id = ? and user_id = ? and deleted_at is null`,
    timestamp,
    timestamp,
    transactionId,
    userId
  );
}

export async function getLocalTransaction(userId: string, transactionId: string) {
  const db = await initializeDatabase();

  return db.getFirstAsync<LocalTransaction>(
    `select *
     from local_transactions
     where id = ? and user_id = ? and deleted_at is null`,
    transactionId,
    userId
  );
}
