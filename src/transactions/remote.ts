import type { LocalTransaction } from '@/src/db';
import type { RemoteTransaction, RemoteTransactionPayload } from './types';

export function toRemoteTransactionPayload(transaction: LocalTransaction): RemoteTransactionPayload {
  return {
    amount: transaction.amount,
    category_id: transaction.category_id,
    created_at: transaction.created_at,
    deleted_at: transaction.deleted_at,
    id: transaction.id,
    note: transaction.note,
    transaction_date: transaction.transaction_date,
    type: transaction.type,
    updated_at: transaction.updated_at,
    user_id: transaction.user_id,
  };
}

export function fromRemoteTransaction(transaction: RemoteTransaction): LocalTransaction {
  return {
    amount: transaction.amount,
    category_id: transaction.category_id,
    created_at: transaction.created_at,
    deleted_at: transaction.deleted_at,
    id: transaction.id,
    note: transaction.note,
    sync_status: 'synced',
    synced_at: transaction.updated_at,
    transaction_date: transaction.transaction_date,
    type: transaction.type,
    updated_at: transaction.updated_at,
    user_id: transaction.user_id,
  };
}

