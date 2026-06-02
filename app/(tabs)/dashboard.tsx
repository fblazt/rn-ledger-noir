import { useFocusEffect } from '@react-navigation/native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useAuth } from '@/src/auth';
import { AmountText, EmptyState, ErrorState, LoadingState, MonthPickerField, Screen, SyncBadge } from '@/src/components/ui';
import { getLocalDashboardSummary } from '@/src/dashboard';
import type { DashboardSummary } from '@/src/dashboard';
import { formatMonthLabel, formatReadableDate, toMonthKey } from '@/src/lib/date';
import { useSyncSummary } from '@/src/sync';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { status: syncStatus } = useSyncSummary();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => toMonthKey(new Date()));
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  async function loadDashboard() {
    if (!user) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      setSummary(await getLocalDashboardSummary(user.id, month));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load dashboard.');
    }

    setLoading(false);
  }

  useFocusEffect(() => {
    loadDashboard();
  });

  return (
    <Screen
      action={<SyncBadge status={syncStatus} />}
      description="Monthly totals from your private spending history."
      eyebrow="Private ledger"
      title={`${formatMonthLabel(month)} pulse`}
    >
      <View className="mt-7 flex-row items-center justify-between rounded-3xl border border-border bg-card p-4">
        <View>
          <Text className="text-xs font-black uppercase tracking-[0.18em] text-muted">Viewing</Text>
          <Text className="mt-1 text-lg font-black text-foreground">{formatMonthLabel(month)}</Text>
        </View>
        <MonthPickerField compact value={month} onChange={setMonth} />
      </View>

      {errorMessage ? (
        <View className="mt-7">
          <ErrorState description={errorMessage} title="Unable to load dashboard" />
        </View>
      ) : null}

      {loading ? (
        <View className="mt-7">
          <LoadingState description="Summing this month's entries." title="Balancing the ledger" />
        </View>
      ) : summary ? (
        <DashboardContent summary={summary} />
      ) : (
        <View className="mt-7">
          <EmptyState description="Create a transaction to start building your dashboard." title="No ledger data yet." />
        </View>
      )}
    </Screen>
  );
}

type DashboardContentProps = {
  summary: DashboardSummary;
};

function formatSyncStatus(status: DashboardSummary['recentTransactions'][number]['sync_status']) {
  if (status === 'failed') {
    return ' · Backup failed';
  }

  if (status === 'pending') {
    return ' · Needs backup';
  }

  return '';
}

const standardIdrFormatter = new Intl.NumberFormat('id-ID', {
  currency: 'IDR',
  maximumFractionDigits: 0,
  style: 'currency',
});

const compactIdrFormatter = new Intl.NumberFormat('id-ID', {
  currency: 'IDR',
  maximumFractionDigits: 0,
  notation: 'compact',
  style: 'currency',
});

function formatCompactAmount(amount: number) {
  return (amount >= 1_000_000 ? compactIdrFormatter : standardIdrFormatter).format(amount);
}

function DashboardContent({ summary }: DashboardContentProps) {
  return (
    <>
      <View className="mt-8 overflow-hidden rounded-[32px] bg-primary p-6">
        <View className="absolute -right-10 -top-10 size-36 rounded-full bg-stamp/30" />
        <View className="absolute -bottom-12 left-8 size-28 rounded-full bg-success/20" />
        <Text className="text-xs font-bold uppercase tracking-[0.22em] text-primary-foreground/70">Current balance</Text>
        <View className="mt-4">
          <AmountText amount={summary.balance} size="lg" tone="inverse" />
        </View>
        <Text className="mt-3 max-w-64 text-sm leading-5 text-primary-foreground/75">
          Income minus expenses for {formatMonthLabel(summary.month)}, available even offline.
        </Text>
      </View>

      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 rounded-[24px] border border-border bg-card p-4">
          <Text className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Income</Text>
          <View className="mt-3">
            <AmountText amount={summary.incomeTotal} size="md" tone="income" />
          </View>
        </View>
        <View className="flex-1 rounded-[24px] border border-border bg-card p-4">
          <Text className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Expense</Text>
          <View className="mt-3">
            <AmountText amount={summary.expenseTotal} size="md" tone="expense" />
          </View>
        </View>
      </View>

      <View className="mt-4 rounded-[24px] border border-border bg-card p-5">
        <Text className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Top spending</Text>
        {summary.topSpendingCategory ? (
          <View className="mt-4 flex-row items-center justify-between gap-4">
            <View className="flex-1 flex-row items-center gap-3">
              <View
                className="size-4 rounded-full"
                style={{ backgroundColor: summary.topSpendingCategory.categoryColor ?? '#73706A' }}
              />
              <Text className="flex-1 text-lg font-black text-foreground">{summary.topSpendingCategory.categoryName}</Text>
            </View>
            <AmountText amount={summary.topSpendingCategory.total} size="sm" tone="expense" />
          </View>
        ) : (
          <Text className="mt-3 text-sm leading-5 text-muted">No expenses for this month yet.</Text>
        )}
      </View>

      <View className="mt-4 rounded-[24px] border border-dashed border-border bg-receipt p-5">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Budget pressure</Text>
            <Text className="mt-3 text-lg font-black text-foreground">
              {summary.budgetSummary.budgetCount > 0
                ? `${Math.round(summary.budgetSummary.usagePercent)}% used across ${summary.budgetSummary.budgetCount} budgets`
                : 'No budgets for this month'}
            </Text>
          </View>
          <AmountText amount={summary.budgetSummary.remainingTotal} size="sm" tone={summary.budgetSummary.remainingTotal < 0 ? 'expense' : 'income'} />
        </View>
        <View className="mt-4 h-3 overflow-hidden rounded-full bg-border">
          <View
            className={summary.budgetSummary.usagePercent >= 100 ? 'h-3 rounded-full bg-danger' : summary.budgetSummary.usagePercent >= 80 ? 'h-3 rounded-full bg-warning' : 'h-3 rounded-full bg-success'}
            style={{ width: `${Math.min(Math.max(summary.budgetSummary.usagePercent, 0), 100)}%` }}
          />
        </View>
        <Text className="mt-3 text-sm leading-5 text-muted">
          Used {formatCompactAmount(summary.budgetSummary.usedTotal)} of {formatCompactAmount(summary.budgetSummary.limitTotal)}.
        </Text>
      </View>

      <View className="mt-6 rounded-3xl border border-dashed border-border bg-receipt p-5">
        <Text className="text-xs font-black uppercase tracking-[0.22em] text-primary">Recent ledger feed</Text>
        {summary.recentTransactions.length === 0 ? (
          <Text className="mt-4 text-sm leading-5 text-muted">No active transactions yet.</Text>
        ) : (
          <View className="mt-4 gap-3">
            {summary.recentTransactions.map((transaction) => (
              <View key={transaction.id} className="flex-row items-center justify-between gap-4 border-b border-border pb-3">
                <View className="flex-1">
                  <Text className="font-mono text-[11px] font-bold uppercase text-stamp">
                    {formatReadableDate(transaction.transaction_date)}{formatSyncStatus(transaction.sync_status)}
                  </Text>
                  <Text className="mt-1 text-base font-semibold text-foreground">{transaction.category_name}</Text>
                  {transaction.note ? <Text className="mt-1 text-sm text-muted">{transaction.note}</Text> : null}
                </View>
                <AmountText amount={transaction.amount} size="sm" tone={transaction.type === 'income' ? 'income' : 'expense'} />
              </View>
            ))}
          </View>
        )}
      </View>
    </>
  );
}
