import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/src/auth';
import {
  CATEGORY_COLORS,
  categoryFormSchema,
  createLocalCategory,
  deleteLocalCategory,
  listLocalCategories,
  updateLocalCategory,
} from '@/src/categories';
import type { Category, CategoryFormInput, CategoryType } from '@/src/categories';
import { ErrorState, LoadingState, Screen, SyncBadge } from '@/src/components/ui';

type SaveStatus = 'idle' | 'saving' | 'failed';
type CategoryFilter = 'all' | CategoryType;

const EMPTY_FORM: CategoryFormInput = {
  color: CATEGORY_COLORS[0],
  icon: 'tag',
  name: '',
  type: 'expense',
};

const filters: { label: string; value: CategoryFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Expense', value: 'expense' },
  { label: 'Income', value: 'income' },
];

export default function CategoriesScreen() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [form, setForm] = useState<CategoryFormInput>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const visibleCategories = useMemo(() => {
    if (filter === 'all') {
      return categories;
    }

    return categories.filter((category) => category.type === filter);
  }, [categories, filter]);

  const editingCategory = useMemo(
    () => categories.find((category) => category.id === editingCategoryId) ?? null,
    [categories, editingCategoryId]
  );

  const loadCategories = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      setCategories(await listLocalCategories(user.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load categories.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  async function submitCategory() {
    if (!user) {
      return;
    }

    setErrorMessage(null);

    const parsed = categoryFormSchema.safeParse(form);

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? 'Check the category details.');
      return;
    }

    setSaveStatus('saving');

    try {
      if (editingCategoryId) {
        await updateLocalCategory(user.id, editingCategoryId, parsed.data);
      } else {
        await createLocalCategory(user.id, parsed.data);
      }

      setForm(EMPTY_FORM);
      setEditingCategoryId(null);
      setCategories(await listLocalCategories(user.id));
      setSaveStatus('idle');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save category.');
      setSaveStatus('failed');
    }
  }

  async function submitDelete(category: Category) {
    if (!user) {
      return;
    }

    setErrorMessage(null);

    try {
      await deleteLocalCategory(user.id, category.id);
      setCategories(await listLocalCategories(user.id));

      if (editingCategoryId === category.id) {
        setEditingCategoryId(null);
        setForm(EMPTY_FORM);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete category.');
    }
  }

  function startEditing(category: Category) {
    setErrorMessage(null);
    setEditingCategoryId(category.id);
    setForm({
      color: category.color ?? CATEGORY_COLORS[0],
      icon: category.icon ?? 'tag',
      name: category.name,
      type: category.type,
    });
  }

  function cancelEditing() {
    setEditingCategoryId(null);
    setErrorMessage(null);
    setForm(EMPTY_FORM);
    setSaveStatus('idle');
  }

  return (
    <Screen
      action={<SyncBadge status="pending" />}
      description="Shape the ledger vocabulary before receipts and budgets start using it."
      eyebrow="Taxonomy"
      title="Category desk"
    >
      <Pressable className="mt-7 self-start rounded-full border border-border bg-card px-4 py-2" onPress={() => router.back()}>
        <Text className="text-sm font-black text-foreground">← Back</Text>
      </Pressable>

      <View className="mt-6 rounded-[32px] border border-border bg-card p-5">
        <Text className="text-xs font-black uppercase tracking-[0.2em] text-stamp">
          {editingCategory ? 'Edit custom category' : 'New custom category'}
        </Text>

        {editingCategory?.is_default === 1 ? (
          <Text className="mt-3 text-sm font-bold text-danger">Default categories are read-only.</Text>
        ) : null}

        <Text className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-muted">Type</Text>
        <View className="mt-3 flex-row gap-2">
          {(['expense', 'income'] as const).map((type) => (
            <Pressable
              key={type}
              className={
                form.type === type
                  ? 'flex-1 rounded-2xl bg-primary px-4 py-3'
                  : 'flex-1 rounded-2xl border border-border bg-background px-4 py-3'
              }
              disabled={Boolean(editingCategory?.is_default)}
              onPress={() => setForm((current) => ({ ...current, type }))}
            >
              <Text
                className={
                  form.type === type
                    ? 'text-center text-sm font-black uppercase text-primary-foreground'
                    : 'text-center text-sm font-black uppercase text-muted'
                }
              >
                {type}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-muted">Name</Text>
        <TextInput
          className="mt-3 rounded-2xl border border-border bg-background px-4 py-4 text-base font-bold text-foreground"
          editable={!editingCategory?.is_default}
          onChangeText={(name) => setForm((current) => ({ ...current, name }))}
          placeholder="Coffee, Freelance, Parking…"
          placeholderTextColorClassName="accent-muted"
          returnKeyType="done"
          value={form.name}
        />

        <Text className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-muted">Icon label</Text>
        <TextInput
          autoCapitalize="none"
          className="mt-3 rounded-2xl border border-border bg-background px-4 py-4 text-base font-bold text-foreground"
          editable={!editingCategory?.is_default}
          onChangeText={(icon) => setForm((current) => ({ ...current, icon }))}
          placeholder="tag"
          placeholderTextColorClassName="accent-muted"
          returnKeyType="done"
          value={form.icon}
        />

        <Text className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-muted">Color</Text>
        <View className="mt-3 flex-row flex-wrap gap-3">
          {CATEGORY_COLORS.map((color) => (
            <Pressable
              key={color}
              className={
                form.color === color
                  ? 'h-11 w-11 rounded-full border-4 border-foreground'
                  : 'h-11 w-11 rounded-full border border-border'
              }
              disabled={Boolean(editingCategory?.is_default)}
              onPress={() => setForm((current) => ({ ...current, color }))}
              style={{ backgroundColor: color }}
            />
          ))}
        </View>

        <View className="mt-6 flex-row gap-3">
          {editingCategory ? (
            <Pressable className="flex-1 rounded-2xl border border-border bg-background px-4 py-4" onPress={cancelEditing}>
              <Text className="text-center text-sm font-black uppercase tracking-[0.16em] text-foreground">
                Cancel
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            className={
              saveStatus === 'saving' || Boolean(editingCategory?.is_default)
                ? 'flex-1 rounded-2xl bg-muted px-4 py-4'
                : 'flex-1 rounded-2xl bg-primary px-4 py-4'
            }
            disabled={saveStatus === 'saving' || Boolean(editingCategory?.is_default)}
            onPress={submitCategory}
          >
            <Text className="text-center text-sm font-black uppercase tracking-[0.16em] text-primary-foreground">
              {saveStatus === 'saving' ? 'Saving…' : editingCategory ? 'Save changes' : 'Create category'}
            </Text>
          </Pressable>
        </View>
      </View>

      {errorMessage ? (
        <View className="mt-5">
          <ErrorState description={errorMessage} title="Category review needed" />
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
          <LoadingState description="Pulling local category rows from SQLite." title="Sorting labels" />
        </View>
      ) : (
        <View className="mt-5 gap-3">
          {visibleCategories.map((category) => (
            <View key={category.id} className="rounded-3xl border border-border bg-card p-5">
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <View className="flex-row items-center gap-3">
                    <View className="h-4 w-4 rounded-full" style={{ backgroundColor: category.color ?? '#73706A' }} />
                    <Text className="text-xl font-black text-foreground">{category.name}</Text>
                  </View>
                  <Text className="mt-2 text-sm font-bold uppercase tracking-[0.16em] text-muted">
                    {category.type} · {category.is_default === 1 ? 'Default' : 'Custom'} · {category.sync_status}
                  </Text>
                </View>
                <Text className="font-mono text-sm font-black text-stamp">{category.icon ?? 'tag'}</Text>
              </View>

              {category.is_default === 0 ? (
                <View className="mt-4 flex-row gap-3">
                  <Pressable className="flex-1 rounded-2xl bg-receipt px-4 py-3" onPress={() => startEditing(category)}>
                    <Text className="text-center text-sm font-black text-primary">Edit</Text>
                  </Pressable>
                  <Pressable className="flex-1 rounded-2xl bg-danger px-4 py-3" onPress={() => submitDelete(category)}>
                    <Text className="text-center text-sm font-black text-primary-foreground">Delete</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
