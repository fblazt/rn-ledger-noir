import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/auth';
import { listLocalCategories } from '@/src/categories';
import type { Category } from '@/src/categories';
import { AmountText, ConfirmationDialog, EmptyState, ErrorState, LoadingState, MonthPickerField, Screen, SyncBadge } from '@/src/components/ui';
import { formatReadableDate, toMonthKey } from '@/src/lib/date';
import { useSyncSummary } from '@/src/sync';
import { deleteLocalTransaction, listLocalTransactions } from '@/src/transactions';
import type { TransactionTypeFilter, TransactionWithCategory } from '@/src/transactions';

function formatSyncStatus(status: TransactionWithCategory['sync_status']) {
  if (status === 'failed') {
    return ' · Backup failed';
  }

  if (status === 'pending') {
    return ' · Needs backup';
  }

  return '';
}

const typeFilters: { label: string; value: TransactionTypeFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Expense', value: 'expense' },
  { label: 'Income', value: 'income' },
];

export default function TransactionsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const iconColor = Colors[colorScheme].text;
  const primaryForegroundColor = Colors[colorScheme].background;
  const { user } = useAuth();
  const { status: syncStatus } = useSyncSummary();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilterId, setCategoryFilterId] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TransactionWithCategory | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => toMonthKey(new Date()));
  const [query, setQuery] = useState('');
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');

  const filterCategories = typeFilter === 'all'
    ? categories
    : categories.filter((category) => category.type === typeFilter);

  const activeFilterCount = Number(typeFilter !== 'all') + Number(Boolean(categoryFilterId));

  async function loadScreenData() {
    if (!user) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const [categoryRows, transactionRows] = await Promise.all([
        listLocalCategories(user.id),
        listLocalTransactions(user.id, {
          categoryId: categoryFilterId || undefined,
          month,
          query,
          type: typeFilter,
        }),
      ]);

      setCategories(categoryRows);
      setTransactions(transactionRows);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load transactions.');
    }

    setLoading(false);
  }

  useFocusEffect(() => {
    loadScreenData();
  });

  async function confirmDelete() {
    if (!user || !deleteTarget) {
      return;
    }

    setDeleteError(null);

    try {
      await deleteLocalTransaction(user.id, deleteTarget.id);
      setDeleteTarget(null);
      await loadScreenData();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete transaction.');
    }
  }

  function closeDeleteDialog() {
    setDeleteError(null);
    setDeleteTarget(null);
  }

  function clearFilters() {
    setCategoryFilterId('');
    setTypeFilter('all');
  }

  return (
    <View className="flex-1 bg-background">
      <Screen
        action={<SyncBadge status={syncStatus} />}
        description="A scan-friendly feed for daily spending, notes, receipts, and backup status."
        eyebrow="Receipts"
        title="Transaction roll"
      >

      {errorMessage ? (
        <View className="mt-7">
          <ErrorState description={errorMessage} title="Unable to load transactions" />
        </View>
      ) : null}

        <View className="mt-7 flex-row items-center gap-2">
          <TextInput
            className="h-12 flex-1 rounded-2xl border border-border bg-card px-4 text-base font-bold text-foreground"
            onChangeText={setQuery}
            placeholder="Search note or category"
            placeholderTextColorClassName="accent-muted"
            returnKeyType="search"
            value={query}
          />
          <MonthPickerField compact value={month} onChange={setMonth} />
          <Pressable
            className="size-12 items-center justify-center rounded-2xl border border-border bg-card"
            onPress={() => setFilterVisible(true)}
          >
            <Ionicons color={iconColor} name={activeFilterCount > 0 ? 'filter' : 'filter-outline'} size={20} />
          </Pressable>
        </View>

      {loading ? (
        <View className="mt-7">
          <LoadingState description="Loading your spending entries." title="Counting receipts" />
        </View>
      ) : transactions.length === 0 ? (
        <View className="mt-7">
          <EmptyState
            description="Add a transaction, search differently, or adjust the filters."
            label="No entries"
            title="Your receipt tray is clear."
          />
        </View>
      ) : (
        <View className="mt-7 gap-3">
          {transactions.map((transaction) => (
            <View key={transaction.id} className="rounded-3xl border border-border bg-card p-5">
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <View className="flex-row items-center gap-3">
                    <View
                      className="size-4 rounded-full"
                      style={{ backgroundColor: transaction.category_color ?? '#73706A' }}
                    />
                    <Text className="text-xl font-black text-foreground">{transaction.category_name}</Text>
                  </View>
                  <Text className="mt-2 text-sm font-bold uppercase tracking-[0.16em] text-muted">
                    {formatReadableDate(transaction.transaction_date)}{formatSyncStatus(transaction.sync_status)}
                  </Text>
                  {transaction.note ? <Text className="mt-3 text-base leading-6 text-muted">{transaction.note}</Text> : null}
                </View>
                <AmountText
                  amount={transaction.amount}
                  size="sm"
                  tone={transaction.type === 'income' ? 'income' : 'expense'}
                />
              </View>

              <View className="mt-4 flex-row gap-3">
                <Pressable
                  className="flex-1 rounded-2xl bg-receipt px-4 py-3"
                  onPress={() => router.push({ pathname: '/transaction-form', params: { id: transaction.id } } as never)}
                >
                  <Text className="text-center text-sm font-black text-primary">Edit</Text>
                </Pressable>
                <Pressable className="flex-1 rounded-2xl bg-danger px-4 py-3" onPress={() => setDeleteTarget(transaction)}>
                  <Text className="text-center text-sm font-black text-primary-foreground">Delete</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <TransactionFilterDialog
        categories={filterCategories}
        categoryFilterId={categoryFilterId}
        clearFilters={clearFilters}
        onClose={() => setFilterVisible(false)}
        setCategoryFilterId={setCategoryFilterId}
        setTypeFilter={setTypeFilter}
        typeFilter={typeFilter}
        visible={filterVisible}
      />

      <ConfirmationDialog
        confirmLabel="Delete entry"
        description={deleteTarget ? `Delete ${deleteTarget.category_name} from ${formatReadableDate(deleteTarget.transaction_date)}?` : ''}
        errorMessage={deleteError}
        onCancel={closeDeleteDialog}
        onConfirm={confirmDelete}
        title="Delete transaction?"
        visible={Boolean(deleteTarget)}
      />
      </Screen>

      <Pressable
        className="absolute bottom-8 right-5 h-14 flex-row items-center gap-2 rounded-full bg-primary px-5 shadow-lg"
        onPress={() => router.push('/transaction-form' as never)}
      >
        <Ionicons color={primaryForegroundColor} name="add" size={24} />
        <Text className="text-sm font-black text-primary-foreground">New</Text>
      </Pressable>
    </View>
  );
}

type TransactionFilterDialogProps = {
  categories: Category[];
  categoryFilterId: string;
  clearFilters: () => void;
  onClose: () => void;
  setCategoryFilterId: (value: string) => void;
  setTypeFilter: (value: TransactionTypeFilter) => void;
  typeFilter: TransactionTypeFilter;
  visible: boolean;
};

function TransactionFilterDialog({
  categories,
  categoryFilterId,
  clearFilters,
  onClose,
  setCategoryFilterId,
  setTypeFilter,
  typeFilter,
  visible,
}: TransactionFilterDialogProps) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable className="flex-1 justify-end bg-black/70 px-5 pb-8" onPress={onClose}>
        <Pressable className="rounded-[32px] border border-border bg-card p-5" onPress={(event) => event.stopPropagation()}>
          <Text className="font-mono text-xs font-black uppercase tracking-[0.18em] text-stamp">Filters</Text>

          <Text className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-muted">Type</Text>
          <View className="mt-3 flex-row gap-2">
            {typeFilters.map((filter) => (
              <Pressable
                key={filter.value}
                className={
                  typeFilter === filter.value
                    ? 'flex-1 rounded-2xl border border-primary bg-primary px-4 py-3'
                    : 'flex-1 rounded-2xl border border-border bg-background px-4 py-3'
                }
                onPress={() => {
                  setTypeFilter(filter.value);
                  setCategoryFilterId('');
                }}
              >
                <Text
                  className={
                    typeFilter === filter.value
                      ? 'text-center text-sm font-black text-primary-foreground'
                      : 'text-center text-sm font-black text-muted'
                  }
                >
                  {filter.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-muted">Category</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <Pressable
              className={
                categoryFilterId === ''
                  ? 'rounded-full border border-primary bg-primary px-4 py-2'
                  : 'rounded-full border border-border bg-background px-4 py-2'
              }
              onPress={() => setCategoryFilterId('')}
            >
              <Text
                className={
                  categoryFilterId === ''
                    ? 'text-sm font-bold text-primary-foreground'
                    : 'text-sm font-bold text-muted'
                }
              >
                Any
              </Text>
            </Pressable>
            {categories.map((category) => (
              <Pressable
                key={category.id}
                className={
                  categoryFilterId === category.id
                    ? 'rounded-full border border-primary bg-primary px-4 py-2'
                    : 'rounded-full border border-border bg-background px-4 py-2'
                }
                onPress={() => setCategoryFilterId(category.id)}
              >
                <Text
                  className={
                    categoryFilterId === category.id
                      ? 'text-sm font-bold text-primary-foreground'
                      : 'text-sm font-bold text-muted'
                  }
                >
                  {category.name}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="mt-6 flex-row gap-3">
            <Pressable className="flex-1 rounded-2xl border border-border bg-background p-4" onPress={clearFilters}>
              <Text className="text-center text-sm font-black uppercase tracking-[0.16em] text-foreground">Clear</Text>
            </Pressable>
            <Pressable className="flex-1 rounded-2xl bg-primary p-4" onPress={onClose}>
              <Text className="text-center text-sm font-black uppercase tracking-[0.16em] text-primary-foreground">Apply</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
