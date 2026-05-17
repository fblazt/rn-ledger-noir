import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/auth';
import { deleteLocalBudget, listLocalBudgets } from '@/src/budgets';
import type { BudgetWithUsage } from '@/src/budgets';
import { AmountText, ConfirmationDialog, EmptyState, ErrorState, LoadingState, MonthPickerField, Screen, SyncBadge } from '@/src/components/ui';
import { formatMonthLabel, toMonthKey } from '@/src/lib/date';
import { useSyncSummary } from '@/src/sync';

export default function BudgetsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const primaryForegroundColor = Colors[colorScheme].background;
  const { user } = useAuth();
  const { status: syncStatus } = useSyncSummary();
  const [budgets, setBudgets] = useState<BudgetWithUsage[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetWithUsage | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(toMonthKey(new Date()));

  const loadBudgets = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      setBudgets(await listLocalBudgets(user.id, month));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load budgets.');
    } finally {
      setLoading(false);
    }
  }, [month, user]);

  useFocusEffect(
    useCallback(() => {
      loadBudgets();
    }, [loadBudgets])
  );

  async function confirmDelete() {
    if (!user || !deleteTarget) {
      return;
    }

    setDeleteError(null);

    try {
      await deleteLocalBudget(user.id, deleteTarget.id);
      setDeleteTarget(null);
      await loadBudgets();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete budget.');
    }
  }

  function closeDeleteDialog() {
    setDeleteError(null);
    setDeleteTarget(null);
  }

  return (
    <View className="flex-1 bg-background">
      <Screen
        action={<SyncBadge status={syncStatus} />}
        description="Monthly category limits show pressure early, before overspending becomes a surprise."
        eyebrow="Limits"
        title="Budget pressure"
      >
        <View className="mt-7 self-start">
          <MonthPickerField value={month} onChange={setMonth} />
        </View>

        {errorMessage ? (
          <View className="mt-7">
            <ErrorState description={errorMessage} title="Unable to load budgets" />
          </View>
        ) : null}

        {loading ? (
          <View className="mt-7">
            <LoadingState description="Calculating local usage from SQLite." title="Reading limits" />
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
              <BudgetCard key={budget.id} budget={budget} onDelete={() => setDeleteTarget(budget)} />
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

function formatBudgetAmount(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    currency: 'IDR',
    maximumFractionDigits: 0,
    notation: Math.abs(amount) >= 1_000_000 ? 'compact' : 'standard',
    style: 'currency',
  }).format(amount);
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
            <View className="h-4 w-4 rounded-full" style={{ backgroundColor: budget.category_color ?? '#73706A' }} />
            <Text className="text-xl font-black text-foreground">{budget.category_name}</Text>
          </View>
          <Text className="mt-2 text-sm font-bold uppercase tracking-[0.16em] text-muted">
            {Math.round(budget.usage_percent)}% used · {budget.sync_status}
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
