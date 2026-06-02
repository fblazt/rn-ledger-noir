import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/auth';
import { deleteLocalBudget, listLocalBudgets } from '@/src/budgets';
import type { BudgetWithUsage } from '@/src/budgets';
import { AmountText, ConfirmationDialog, EmptyState, ErrorState, LoadingState, MonthPickerField, Screen, SyncBadge } from '@/src/components/ui';
import { formatMonthLabel, toMonthKey } from '@/src/lib/date';
import { useObjectState } from '@/src/lib/use-object-state';
import { useSyncSummary } from '@/src/sync';

function formatSyncStatus(status: BudgetWithUsage['sync_status']) {
  if (status === 'failed') {
    return ' · Backup failed';
  }

  if (status === 'pending') {
    return ' · Needs backup';
  }

  return '';
}

export default function BudgetsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const primaryForegroundColor = Colors[colorScheme].background;
  const { user } = useAuth();
  const { status: syncStatus } = useSyncSummary();
  const [state, setState] = useObjectState({
    budgets: [] as BudgetWithUsage[],
    deleteError: null as string | null,
    deleteTarget: null as BudgetWithUsage | null,
    errorMessage: null as string | null,
    loading: true,
    month: toMonthKey(new Date()),
  });
  const { budgets, deleteError, deleteTarget, errorMessage, loading, month } = state;

  async function loadBudgets() {
    if (!user) {
      return;
    }

    setState({ errorMessage: null, loading: true });

    try {
      setState({ budgets: await listLocalBudgets(user.id, month) });
    } catch (error) {
      setState({ errorMessage: error instanceof Error ? error.message : 'Unable to load budgets.' });
    }

    setState({ loading: false });
  }

  useFocusEffect(() => {
    loadBudgets();
  });

  async function confirmDelete() {
    if (!user || !deleteTarget) {
      return;
    }

    setState({ deleteError: null });

    try {
      await deleteLocalBudget(user.id, deleteTarget.id);
      setState({ deleteTarget: null });
      await loadBudgets();
    } catch (error) {
      setState({ deleteError: error instanceof Error ? error.message : 'Unable to delete budget.' });
    }
  }

  function closeDeleteDialog() {
    setState({ deleteError: null, deleteTarget: null });
  }

  return (
    <View className="flex-1 bg-background">
      <Screen
        action={<SyncBadge status={syncStatus} />}
        description="Monthly category limits show pressure early, before overspending becomes a surprise."
        eyebrow="Limits"
        title="Budget pressure"
      >
        <View className="mt-7 flex-row items-center justify-between rounded-3xl border border-border bg-card p-4">
          <View>
            <Text className="text-xs font-black uppercase tracking-[0.18em] text-muted">Viewing</Text>
            <Text className="mt-1 text-lg font-black text-foreground">{formatMonthLabel(month)}</Text>
          </View>
          <MonthPickerField compact value={month} onChange={(nextMonth) => setState({ month: nextMonth })} />
        </View>

        {errorMessage ? (
          <View className="mt-7">
            <ErrorState description={errorMessage} title="Unable to load budgets" />
          </View>
        ) : null}

        {loading ? (
          <View className="mt-7">
            <LoadingState description="Calculating this month's budget usage." title="Reading limits" />
          </View>
        ) : budgets.length === 0 ? (
          <View className="mt-7">
            <EmptyState
              description={`Add a budget for ${formatMonthLabel(month)} to start tracking category pressure.`}
              title="No budgets this month."
            />
          </View>
        ) : (
          <View className="mt-7 gap-3">
            {budgets.map((budget) => (
              <BudgetCard key={budget.id} budget={budget} onDelete={() => setState({ deleteTarget: budget })} />
            ))}
          </View>
        )}

        <ConfirmationDialog
          confirmLabel="Delete budget"
          description={deleteTarget ? `Delete the ${deleteTarget.category_name} budget for ${formatMonthLabel(deleteTarget.month)}?` : ''}
          errorMessage={deleteError}
          onCancel={closeDeleteDialog}
          onConfirm={confirmDelete}
          title="Delete budget?"
          visible={Boolean(deleteTarget)}
        />
      </Screen>

      <Pressable
        className="absolute bottom-8 right-5 h-14 flex-row items-center gap-2 rounded-full bg-primary px-5 shadow-lg"
        onPress={() => router.push({ pathname: '/budget-form', params: { month } } as never)}
      >
        <Ionicons color={primaryForegroundColor} name="add" size={24} />
        <Text className="text-sm font-black text-primary-foreground">New</Text>
      </Pressable>
    </View>
  );
}

type BudgetCardProps = {
  budget: BudgetWithUsage;
  onDelete: () => void;
};

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

function formatBudgetAmount(amount: number) {
  return (Math.abs(amount) >= 1_000_000 ? compactIdrFormatter : standardIdrFormatter).format(amount);
}

function BudgetCard({ budget, onDelete }: BudgetCardProps) {
  const clampedPercent = Math.min(Math.max(budget.usage_percent, 0), 100);
  const pressureTone = budget.usage_percent >= 100 ? 'danger' : budget.usage_percent >= 80 ? 'warning' : 'success';
  const barClassName = {
    danger: 'h-3 rounded-full bg-danger',
    success: 'h-3 rounded-full bg-success',
    warning: 'h-3 rounded-full bg-warning',
  }[pressureTone];

  return (
    <View className="rounded-[28px] border border-border bg-card p-5">
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <View className="flex-row items-center gap-3">
            <View className="size-4 rounded-full" style={{ backgroundColor: budget.category_color ?? '#73706A' }} />
            <Text className="text-xl font-black text-foreground">{budget.category_name}</Text>
          </View>
          <Text className="mt-2 text-sm font-bold uppercase tracking-[0.16em] text-muted">
            {Math.round(budget.usage_percent)}% used{formatSyncStatus(budget.sync_status)}
          </Text>
        </View>
        <AmountText amount={budget.limit_amount} size="sm" tone="default" />
      </View>

      <View className="mt-5 h-3 overflow-hidden rounded-full bg-border">
        <View className={barClassName} style={{ width: `${clampedPercent}%` }} />
      </View>

      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 rounded-2xl bg-background px-4 py-3">
          <Text className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Used</Text>
          <Text className="mt-2 font-mono text-xs font-black text-danger" numberOfLines={1} adjustsFontSizeToFit>
            {formatBudgetAmount(budget.used_amount)}
          </Text>
        </View>
        <View className="flex-1 rounded-2xl bg-background px-4 py-3">
          <Text className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Remaining</Text>
          <Text
            className={budget.remaining_amount < 0 ? 'mt-2 font-mono text-xs font-black text-danger' : 'mt-2 font-mono text-xs font-black text-success'}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatBudgetAmount(budget.remaining_amount)}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row gap-3">
        <Pressable
          className="flex-1 rounded-2xl bg-receipt px-4 py-3"
          onPress={() => router.push({ pathname: '/budget-form', params: { id: budget.id, month: budget.month } } as never)}
        >
          <Text className="text-center text-sm font-black text-primary">Edit</Text>
        </Pressable>
        <Pressable className="flex-1 rounded-2xl bg-danger px-4 py-3" onPress={onDelete}>
          <Text className="text-center text-sm font-black text-primary-foreground">Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}
