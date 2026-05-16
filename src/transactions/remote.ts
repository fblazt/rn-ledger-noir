import type { LocalTransaction } from '@/src/db';
import { supabase } from '@/src/lib/supabase';

import type { RemoteTransaction, RemoteTransactionPayload } from './types';

export function toRemoteTransactionPayload(transaction: LocalTransaction): RemoteTransactionPayload {
  return {
    amount: transaction.amount,
    category_id: transaction.category_id,
    id: transaction.id,
    note: transaction.note,
    transaction_date: transaction.transaction_date,
    type: transaction.type,
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

export async function listRemoteTransactions(userId: string, month: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('transaction_date', `${month}-01`)
    .lt('transaction_date', nextMonthStart(month))
    .order('transaction_date', { ascending: false });

  if (error) {
    throw error;
  }

  return data as RemoteTransaction[];
}

export async function upsertRemoteTransaction(transaction: LocalTransaction) {
  const { data, error } = await supabase
    .from('transactions')
    .upsert(toRemoteTransactionPayload(transaction))
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as RemoteTransaction;
}

function nextMonthStart(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
}
