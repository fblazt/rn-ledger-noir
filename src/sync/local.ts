import { initializeDatabase } from '@/src/db';
import type { EntityType, LocalBudget, LocalCategory, LocalTransaction, SyncStatus } from '@/src/db';

import type { SyncSummary } from './types';

type SyncableEntityType = Extract<EntityType, 'budget' | 'category' | 'transaction'>;

type LocalEntityMap = {
  budget: LocalBudget;
  category: LocalCategory;
  transaction: LocalTransaction;
};

const tableByEntity = {
  budget: 'local_budgets',
  category: 'local_categories',
  transaction: 'local_transactions',
} satisfies Record<SyncableEntityType, string>;

export async function listPendingSyncRows<T extends SyncableEntityType>(entityType: T, userId: string) {
  const db = await initializeDatabase();

  return db.getAllAsync<LocalEntityMap[T]>(
    `select *
     from ${tableByEntity[entityType]}
     where user_id = ? and sync_status in ('pending', 'failed')
     order by updated_at asc`,
    userId
  );
}

export async function markSyncStatus(
  entityType: SyncableEntityType,
  userId: string,
  entityId: string,
  syncStatus: SyncStatus,
  syncedAt: string | null
) {
  const db = await initializeDatabase();

  await db.runAsync(
    `update ${tableByEntity[entityType]}
     set sync_status = ?, synced_at = ?
     where id = ? and user_id = ?`,
    syncStatus,
    syncedAt,
    entityId,
    userId
  );
}

export async function getLocalSyncSummary(userId: string): Promise<SyncSummary> {
  const db = await initializeDatabase();
  const rows = await Promise.all(
    (Object.keys(tableByEntity) as SyncableEntityType[]).map(async (entityType) => {
      const row = await db.getFirstAsync<{ failed: number; pending: number }>(
        `select
           sum(case when sync_status = 'failed' then 1 else 0 end) as failed,
           sum(case when sync_status = 'pending' then 1 else 0 end) as pending
         from ${tableByEntity[entityType]}
         where user_id = ?`,
        userId
      );

      return {
        entityType,
        failed: row?.failed ?? 0,
        pending: row?.pending ?? 0,
      };
    })
  );

  const pending = rows.reduce((total, row) => total + row.pending, 0);
  const failed = rows.reduce((total, row) => total + row.failed, 0);

  const status: SyncSummary['status'] = failed > 0 ? 'failed' : pending > 0 ? 'pending' : 'synced';

  return {
    failed,
    pending,
    rows,
    status,
  };
}

export async function upsertPulledCategory(category: LocalCategory) {
  const db = await initializeDatabase();
  const local = await db.getFirstAsync<LocalCategory>('select * from local_categories where id = ? and user_id = ?', category.id, category.user_id);

  if (shouldKeepLocal(local, category.updated_at)) {
    return false;
  }

  await db.runAsync(
    `insert into local_categories (
      id, user_id, name, type, icon, color, is_default, created_at, updated_at, deleted_at, sync_status, synced_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)
    on conflict(id) do update set
      name = excluded.name,
      type = excluded.type,
      icon = excluded.icon,
      color = excluded.color,
      is_default = excluded.is_default,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at,
      sync_status = 'synced',
      synced_at = excluded.synced_at`,
    category.id,
    category.user_id,
    category.name,
    category.type,
    category.icon,
    category.color,
    category.is_default,
    category.created_at,
    category.updated_at,
    category.deleted_at,
    category.updated_at
  );

  return true;
}

export async function upsertPulledTransaction(transaction: LocalTransaction) {
  const db = await initializeDatabase();
  const local = await db.getFirstAsync<LocalTransaction>('select * from local_transactions where id = ? and user_id = ?', transaction.id, transaction.user_id);

  if (shouldKeepLocal(local, transaction.updated_at)) {
    return false;
  }

  await db.runAsync(
    `insert into local_transactions (
      id, user_id, type, amount, category_id, note, transaction_date, created_at, updated_at, deleted_at, sync_status, synced_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)
    on conflict(id) do update set
      type = excluded.type,
      amount = excluded.amount,
      category_id = excluded.category_id,
      note = excluded.note,
      transaction_date = excluded.transaction_date,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at,
      sync_status = 'synced',
      synced_at = excluded.synced_at`,
    transaction.id,
    transaction.user_id,
    transaction.type,
    transaction.amount,
    transaction.category_id,
    transaction.note,
    transaction.transaction_date,
    transaction.created_at,
    transaction.updated_at,
    transaction.deleted_at,
    transaction.updated_at
  );

  return true;
}

export async function upsertPulledBudget(budget: LocalBudget) {
  const db = await initializeDatabase();
  const local = await db.getFirstAsync<LocalBudget>('select * from local_budgets where id = ? and user_id = ?', budget.id, budget.user_id);

  if (shouldKeepLocal(local, budget.updated_at)) {
    return false;
  }

  await db.runAsync(
    `insert into local_budgets (
      id, user_id, category_id, month, limit_amount, created_at, updated_at, deleted_at, sync_status, synced_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)
    on conflict(id) do update set
      category_id = excluded.category_id,
      month = excluded.month,
      limit_amount = excluded.limit_amount,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at,
      sync_status = 'synced',
      synced_at = excluded.synced_at`,
    budget.id,
    budget.user_id,
    budget.category_id,
    budget.month,
    budget.limit_amount,
    budget.created_at,
    budget.updated_at,
    budget.deleted_at,
    budget.updated_at
  );

  return true;
}

function shouldKeepLocal(local: { sync_status: SyncStatus; updated_at: string } | null, remoteUpdatedAt: string) {
  return Boolean(local && local.sync_status !== 'synced' && Date.parse(local.updated_at) > Date.parse(remoteUpdatedAt));
}
