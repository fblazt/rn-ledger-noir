import type { LocalBudget } from '@/src/db';
import type { RemoteBudget, RemoteBudgetPayload } from './types';

export function toRemoteBudgetPayload(budget: LocalBudget): RemoteBudgetPayload {
  return {
    category_id: budget.category_id,
    created_at: budget.created_at,
    deleted_at: budget.deleted_at,
    id: budget.id,
    limit_amount: budget.limit_amount,
    month: budget.month,
    updated_at: budget.updated_at,
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

