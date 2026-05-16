import { initializeDatabase } from '@/src/db';

import type { DashboardRecentTransaction, DashboardSummary, DashboardTopCategory } from './types';

type TotalsRow = {
  income_total: number | null;
  expense_total: number | null;
};

type PendingSyncRow = {
  count: number;
};

type BudgetSummaryRow = {
  budget_count: number;
  limit_total: number | null;
  used_total: number | null;
};

export async function getLocalDashboardSummary(userId: string, month: string): Promise<DashboardSummary> {
  const db = await initializeDatabase();
  const monthPattern = `${month}-%`;

  const [totals, topSpendingCategory, recentTransactions, pendingSync, budgetSummary] = await Promise.all([
    db.getFirstAsync<TotalsRow>(
      `select
         coalesce(sum(case when type = 'income' then amount else 0 end), 0) as income_total,
         coalesce(sum(case when type = 'expense' then amount else 0 end), 0) as expense_total
       from local_transactions
       where user_id = ?
         and deleted_at is null
         and transaction_date like ?`,
      userId,
      monthPattern
    ),
    db.getFirstAsync<DashboardTopCategory>(
      `select
         c.id as categoryId,
         c.name as categoryName,
         c.color as categoryColor,
         sum(t.amount) as total
       from local_transactions t
       join local_categories c on c.id = t.category_id and c.user_id = t.user_id
       where t.user_id = ?
         and t.deleted_at is null
         and t.type = 'expense'
         and t.transaction_date like ?
       group by c.id, c.name, c.color
       order by total desc, c.name asc
       limit 1`,
      userId,
      monthPattern
    ),
    db.getAllAsync<DashboardRecentTransaction>(
      `select
         t.id,
         t.type,
         t.amount,
         c.name as category_name,
         c.color as category_color,
         t.note,
         t.transaction_date,
         t.sync_status
       from local_transactions t
       join local_categories c on c.id = t.category_id and c.user_id = t.user_id
       where t.user_id = ?
         and t.deleted_at is null
       order by t.transaction_date desc, t.created_at desc
       limit 5`,
      userId
    ),
    db.getFirstAsync<PendingSyncRow>(
      `select count(*) as count
       from local_transactions
       where user_id = ?
         and sync_status = 'pending'`,
      userId
    ),
    db.getFirstAsync<BudgetSummaryRow>(
      `select
         count(*) as budget_count,
         coalesce(sum(limit_amount), 0) as limit_total,
         coalesce(sum(used_amount), 0) as used_total
       from (
         select
           b.id,
           b.limit_amount,
           coalesce(sum(t.amount), 0) as used_amount
         from local_budgets b
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
       )`,
      userId,
      month
    ),
  ]);

  const incomeTotal = totals?.income_total ?? 0;
  const expenseTotal = totals?.expense_total ?? 0;

  const budgetLimitTotal = budgetSummary?.limit_total ?? 0;
  const budgetUsedTotal = budgetSummary?.used_total ?? 0;

  return {
    balance: incomeTotal - expenseTotal,
    budgetSummary: {
      budgetCount: budgetSummary?.budget_count ?? 0,
      limitTotal: budgetLimitTotal,
      remainingTotal: budgetLimitTotal - budgetUsedTotal,
      usagePercent: budgetLimitTotal > 0 ? (budgetUsedTotal / budgetLimitTotal) * 100 : 0,
      usedTotal: budgetUsedTotal,
    },
    expenseTotal,
    incomeTotal,
    month,
    pendingSyncCount: pendingSync?.count ?? 0,
    recentTransactions,
    topSpendingCategory,
  };
}
