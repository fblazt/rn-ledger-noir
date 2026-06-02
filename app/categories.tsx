import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/auth';
import { deleteLocalCategory, listLocalCategories } from '@/src/categories';
import type { Category, CategoryType } from '@/src/categories';
import { ConfirmationDialog, EmptyState, ErrorState, LoadingState, Screen, SyncBadge } from '@/src/components/ui';
import { useSyncSummary } from '@/src/sync';

type CategoryListFilter = 'all' | CategoryType;

function formatSyncStatus(status: Category['sync_status']) {
  if (status === 'failed') {
    return ' · Backup failed';
  }

  if (status === 'pending') {
    return ' · Needs backup';
  }

  return '';
}

const filters: { label: string; value: CategoryListFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Expense', value: 'expense' },
  { label: 'Income', value: 'income' },
];

export default function CategoriesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const primaryForegroundColor = Colors[colorScheme].background;
  const { user } = useAuth();
  const { status: syncStatus } = useSyncSummary();
  const [categories, setCategories] = useState<Category[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<CategoryListFilter>('all');
  const [loading, setLoading] = useState(true);

  const visibleCategories = filter === 'all'
    ? categories
    : categories.filter((category) => category.type === filter);

  async function loadCategories() {
    if (!user) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      setCategories(await listLocalCategories(user.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load categories.');
    }

    setLoading(false);
  }

  useFocusEffect(() => {
    loadCategories();
  });

  async function confirmDelete() {
    if (!user || !deleteTarget) {
      return;
    }

    setDeleteError(null);

    try {
      await deleteLocalCategory(user.id, deleteTarget.id);
      setDeleteTarget(null);
      await loadCategories();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete category.');
    }
  }

  function closeDeleteDialog() {
    setDeleteTarget(null);
    setDeleteError(null);
  }

  return (
    <View className="flex-1 bg-background">
      <Screen
        action={<SyncBadge status={syncStatus} />}
        description="Shape the ledger vocabulary before receipts and budgets start using it."
        eyebrow="Taxonomy"
        title="Category desk"
      >
      <Pressable className="mt-7 size-11 items-center justify-center rounded-full border border-border bg-card" onPress={() => router.back()}>
        <Text className="text-xl font-black text-foreground">←</Text>
      </Pressable>


      {errorMessage ? (
        <View className="mt-7">
          <ErrorState description={errorMessage} title="Unable to load categories" />
        </View>
      ) : null}

      <View className="mt-7 flex-row gap-2">
        {filters.map((item) => (
          <Pressable
            key={item.value}
            className={
              filter === item.value
                ? 'rounded-full border border-primary bg-primary px-4 py-2'
                : 'rounded-full border border-border bg-card px-4 py-2'
            }
            onPress={() => setFilter(item.value)}
          >
            <Text
              className={
                filter === item.value
                  ? 'text-sm font-bold text-primary-foreground'
                  : 'text-sm font-bold text-muted'
              }
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View className="mt-7">
          <LoadingState description="Loading your category list." title="Sorting labels" />
        </View>
      ) : visibleCategories.length === 0 ? (
        <View className="mt-7">
          <EmptyState description="Create a custom category to organize your entries." title="No matching categories." />
        </View>
      ) : (
        <View className="mt-5 gap-3">
          {visibleCategories.map((category) => (
            <View key={category.id} className="rounded-3xl border border-border bg-card p-5">
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <View className="flex-row items-center gap-3">
                    <View className="size-4 rounded-full" style={{ backgroundColor: category.color ?? '#73706A' }} />
                    <Text className="text-xl font-black text-foreground">{category.name}</Text>
                  </View>
                  <Text className="mt-2 text-sm font-bold uppercase tracking-[0.16em] text-muted">
                    {category.type} · {category.is_default === 1 ? 'Default' : 'Custom'}{formatSyncStatus(category.sync_status)}
                  </Text>
                </View>
                <Text className="font-mono text-sm font-black text-stamp">{category.icon ?? 'tag'}</Text>
              </View>

              {category.is_default === 0 ? (
                <View className="mt-4 flex-row gap-3">
                  <Pressable
                    className="flex-1 rounded-2xl bg-receipt px-4 py-3"
                    onPress={() => router.push({ pathname: '/category-form', params: { id: category.id } } as never)}
                  >
                    <Text className="text-center text-sm font-black text-primary">Edit</Text>
                  </Pressable>
                  <Pressable className="flex-1 rounded-2xl bg-danger px-4 py-3" onPress={() => setDeleteTarget(category)}>
                    <Text className="text-center text-sm font-black text-primary-foreground">Delete</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}

      <ConfirmationDialog
        confirmLabel="Delete category"
        description={
          deleteTarget
            ? `Delete ${deleteTarget.name}? This is blocked automatically if active transactions still use it.`
            : ''
        }
        errorMessage={deleteError}
        onCancel={closeDeleteDialog}
        onConfirm={confirmDelete}
        title="Delete category?"
        visible={Boolean(deleteTarget)}
      />
      </Screen>

      <Pressable
        className="absolute bottom-8 right-5 h-14 flex-row items-center gap-2 rounded-full bg-primary px-5 shadow-lg"
        onPress={() => router.push('/category-form' as never)}
      >
        <Ionicons color={primaryForegroundColor} name="add" size={24} />
        <Text className="text-sm font-black text-primary-foreground">New</Text>
      </Pressable>
    </View>
  );
}
