import type { LocalBudget } from '@/src/db';
import { supabase } from '@/src/lib/supabase';

import type { RemoteBudget, RemoteBudgetPayload } from './types';

export function toRemoteBudgetPayload(budget: LocalBudget): RemoteBudgetPayload {
  return {
    category_id: budget.category_id,
    id: budget.id,
    limit_amount: budget.limit_amount,
    month: budget.month,
    user_id: budget.user_id,
  };
}

export function fromRemoteBudget(budget: RemoteBudget): LocalBudget {
  return {
    category_id: budget.category_id,
    created_at: budget.created_at,
    deleted_at: budget.deleted_at,
    id: budget.id,
    limit_amount: budget.limit_amount,
    month: budget.month,
    sync_status: 'synced',
    synced_at: budget.updated_at,
    updated_at: budget.updated_at,
    user_id: budget.user_id,
  };
}

export async function listRemoteBudgets(userId: string, month: string) {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data as RemoteBudget[];
}

export async function upsertRemoteBudget(budget: LocalBudget) {
  const { data, error } = await supabase
    .from('budgets')
    .upsert(toRemoteBudgetPayload(budget))
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as RemoteBudget;
}
