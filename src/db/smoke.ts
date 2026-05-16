import type { SQLiteDatabase } from 'expo-sqlite';

import { nowIso, toIsoDate, toMonthKey } from '@/src/lib/date';
import { createId } from '@/src/lib/id';

export async function verifyBasicLocalWrites(db: SQLiteDatabase, userId: string) {
  const timestamp = nowIso();
  const categoryId = createId();
  const transactionId = createId();
  const budgetId = createId();
  const attachmentId = createId();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `insert into local_profiles (
        id,
        email,
        display_name,
        currency,
        created_at,
        updated_at,
        sync_status
      ) values (?, ?, ?, 'IDR', ?, ?, 'pending')
      on conflict(id) do update set updated_at = excluded.updated_at`,
      userId,
      `${userId}@local.test`,
      'Local Smoke User',
      timestamp,
      timestamp
    );

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
      ) values (?, ?, ?, 'expense', 'receipt', '#A78BFA', 0, ?, ?, 'pending')`,
      categoryId,
      userId,
      `Smoke ${timestamp}`,
      timestamp,
      timestamp
    );

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
      ) values (?, ?, 'expense', 1000, ?, 'Smoke write', ?, ?, ?, 'pending')`,
      transactionId,
      userId,
      categoryId,
      toIsoDate(new Date()),
      timestamp,
      timestamp
    );

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
      ) values (?, ?, ?, ?, 100000, ?, ?, 'pending')`,
      budgetId,
      userId,
      categoryId,
      toMonthKey(new Date()),
      timestamp,
      timestamp
    );

    await db.runAsync(
      `insert into local_transaction_attachments (
        id,
        user_id,
        transaction_id,
        storage_path,
        local_uri,
        file_name,
        mime_type,
        size,
        created_at,
        updated_at,
        sync_status,
        upload_status
      ) values (?, ?, ?, null, 'file://local-smoke-receipt.png', 'receipt.png', 'image/png', 1, ?, ?, 'pending', 'local')`,
      attachmentId,
      userId,
      transactionId,
      timestamp,
      timestamp
    );

    await db.runAsync(
      `insert into sync_queue (
        entity_type,
        entity_id,
        operation,
        payload,
        status,
        created_at,
        updated_at
      ) values ('transaction', ?, 'insert', ?, 'pending', ?, ?)`,
      transactionId,
      JSON.stringify({ id: transactionId }),
      timestamp,
      timestamp
    );
  });

  const row = await db.getFirstAsync<{ count: number }>(
    `select count(*) as count
     from local_profiles p
     join local_categories c on c.user_id = p.id
     join local_transactions t on t.category_id = c.id and t.user_id = c.user_id
     join local_budgets b on b.category_id = c.id and b.user_id = c.user_id
     join local_transaction_attachments a on a.transaction_id = t.id and a.user_id = t.user_id
     join sync_queue q on q.entity_id = t.id
     where p.id = ? and t.id = ?`,
    userId,
    transactionId
  );

  return (row?.count ?? 0) === 1;
}
