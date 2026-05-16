export type DashboardSummary = {
  month: string;
  incomeTotal: number;
  expenseTotal: number;
  balance: number;
  pendingSyncCount: number;
  topSpendingCategory: DashboardTopCategory | null;
  recentTransactions: DashboardRecentTransaction[];
};

export type DashboardTopCategory = {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  total: number;
};

export type DashboardRecentTransaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category_name: string;
  category_color: string | null;
  note: string | null;
  transaction_date: string;
  sync_status: 'pending' | 'synced' | 'failed';
};
