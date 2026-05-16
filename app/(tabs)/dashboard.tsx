import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { useAuth } from '@/src/auth';
import { AmountText, EmptyState, ErrorState, LoadingState, MonthPickerField, Screen, SyncBadge } from '@/src/components/ui';
import { getLocalDashboardSummary } from '@/src/dashboard';
import type { DashboardSummary } from '@/src/dashboard';
import { formatMonthLabel, formatReadableDate, toMonthKey } from '@/src/lib/date';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(toMonthKey(new Date()));
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      setSummary(await getLocalDashboardSummary(user.id, month));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [month, user]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const syncStatus = summary?.pendingSyncCount ? 'pending' : 'idle';

  return (
    <Screen
      action={<SyncBadge status={syncStatus} />}
      description="Offline monthly totals from your local SQLite ledger."
      eyebrow="Private ledger"
      title={`${formatMonthLabel(month)} pulse`}
    >
      <View className="mt-7 self-start">
        <MonthPickerField value={month} onChange={setMonth} />
      </View>

      {errorMessage ? (
        <View className="mt-7">
          <ErrorState description={errorMessage} title="Unable to load dashboard" />
        </View>
      ) : null}

      {loading ? (
        <View className="mt-7">
          <LoadingState description="Summing local transactions from SQLite." title="Balancing the ledger" />
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

function DashboardContent({ summary }: DashboardContentProps) {
  return (
    <>
      <View className="mt-8 overflow-hidden rounded-[32px] bg-primary p-6">
        <View className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-stamp/30" />
        <View className="absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-success/20" />
        <Text className="text-xs font-bold uppercase tracking-[0.22em] text-primary-foreground/70">Current balance</Text>
        <View className="mt-4">
          <AmountText amount={summary.balance} size="lg" tone="inverse" />
        </View>
        <Text className="mt-3 max-w-64 text-sm leading-5 text-primary-foreground/75">
          Income minus expenses for {formatMonthLabel(summary.month)}, calculated locally and available offline.
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
                className="h-4 w-4 rounded-full"
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
        <Text className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Budget pressure</Text>
        <Text className="mt-3 text-lg font-black text-foreground">Budget tracking unlocks in Phase 9</Text>
        <Text className="mt-2 text-sm leading-5 text-muted">
          This placeholder will become used, remaining, and percentage totals once local budget workflows are added.
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
                    {formatReadableDate(transaction.transaction_date)} · {transaction.sync_status}
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
