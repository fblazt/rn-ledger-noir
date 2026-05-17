import type { LocalBudget, LocalCategory, LocalTransaction } from '@/src/db';
import { fromRemoteBudget, toRemoteBudgetPayload } from '@/src/budgets/remote';
import type { RemoteBudget } from '@/src/budgets/types';
import { fromRemoteCategory, toRemoteCategoryPayload } from '@/src/categories/remote';
import type { RemoteCategory } from '@/src/categories/types';
import { fromRemoteTransaction, toRemoteTransactionPayload } from '@/src/transactions/remote';
import type { RemoteTransaction } from '@/src/transactions/types';
import { supabase } from '@/src/lib/supabase';

export async function pushCategory(category: LocalCategory) {
  const { data, error } = await supabase
    .from('categories')
    .upsert(toRemoteCategoryPayload(category))
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return fromRemoteCategory(data as RemoteCategory);
}

export async function pushTransaction(transaction: LocalTransaction) {
  const { data, error } = await supabase
    .from('transactions')
    .upsert(toRemoteTransactionPayload(transaction))
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return fromRemoteTransaction(data as RemoteTransaction);
}

export async function pushBudget(budget: LocalBudget) {
  const { data, error } = await supabase
    .from('budgets')
    .upsert(toRemoteBudgetPayload(budget))
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return fromRemoteBudget(data as RemoteBudget);
}

export async function pullCategories(userId: string) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data as RemoteCategory[]).map(fromRemoteCategory);
}

export async function pullTransactions(userId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data as RemoteTransaction[]).map(fromRemoteTransaction);
}

export async function pullBudgets(userId: string) {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data as RemoteBudget[]).map(fromRemoteBudget);
}
