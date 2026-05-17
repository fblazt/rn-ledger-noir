import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAuth } from '@/src/auth';
import { budgetFormSchema, createLocalBudget, getLocalBudget, listBudgetedCategoryIds, updateLocalBudget } from '@/src/budgets';
import type { BudgetFormInput } from '@/src/budgets';
import { listLocalCategories } from '@/src/categories';
import type { Category } from '@/src/categories';
import { AmountInput, FieldError, FormError, LoadingState, MonthPickerField, Screen } from '@/src/components/ui';
import { toMonthKey } from '@/src/lib/date';

type FieldErrors = Partial<Record<keyof BudgetFormInput, string>>;

const EMPTY_FORM: BudgetFormInput = {
  categoryId: '',
  limitAmount: '',
  month: toMonthKey(new Date()),
};

export default function BudgetFormScreen() {
  const { id, month: routeMonth } = useLocalSearchParams<{ id?: string; month?: string }>();
  const { user } = useAuth();
  const [budgetedCategoryIds, setBudgetedCategoryIds] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Category[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState<BudgetFormInput>({ ...EMPTY_FORM, month: routeMonth ?? EMPTY_FORM.month });
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadCategoryOptions = useCallback(async () => {
    if (!user) {
      return;
    }

    const [categoryRows, budgetedIds] = await Promise.all([
      listLocalCategories(user.id, { type: 'expense' }),
      listBudgetedCategoryIds(user.id, form.month, id),
    ]);

    setCategories(categoryRows);
    setBudgetedCategoryIds(budgetedIds);
  }, [form.month, id, user]);

  useEffect(() => {
    async function loadFormData() {
      if (!user) {
        return;
      }

      setLoading(true);
      setFormError(null);

      try {
        await loadCategoryOptions();

        if (!id) {
          return;
        }

        const budget = await getLocalBudget(user.id, id);

        if (!budget) {
          setFormError('Budget not found.');
          return;
        }

        setForm({
          categoryId: budget.category_id,
          limitAmount: String(budget.limit_amount),
          month: budget.month,
        });
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Unable to load budget.');
      } finally {
        setLoading(false);
      }
    }

    loadFormData();
  }, [id, loadCategoryOptions, user]);

  useFocusEffect(
    useCallback(() => {
      loadCategoryOptions().catch((error) => {
        setFormError(error instanceof Error ? error.message : 'Unable to refresh categories.');
      });
    }, [loadCategoryOptions])
  );

  async function submitBudget() {
    if (!user) {
      return;
    }

    setFieldErrors({});
    setFormError(null);

    const parsed = budgetFormSchema.safeParse(form);

    if (!parsed.success) {
      setFieldErrors(
        parsed.error.issues.reduce<FieldErrors>((errors, issue) => {
          const field = issue.path[0] as keyof BudgetFormInput | undefined;

          if (field) {
            errors[field] = issue.message;
          }

          return errors;
        }, {})
      );
      return;
    }

    setSubmitting(true);

    try {
      if (id) {
        await updateLocalBudget(user.id, id, parsed.data);
      } else {
        await createLocalBudget(user.id, parsed.data);
      }

      router.back();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save budget.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Screen description="Preparing your budget form." eyebrow="Limits" title="Budget limit">
        <View className="mt-7">
          <LoadingState description="Loading budget details." title="Opening budget" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      description="Set one monthly limit per expense category. Usage updates from your spending entries."
      eyebrow="Limits"
      title={id ? 'Edit budget' : 'New budget'}
    >
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        className="mt-7 h-11 w-11 items-center justify-center rounded-full border border-border bg-card"
        onPress={() => router.back()}
      >
        <Text className="text-xl font-black text-foreground">←</Text>
      </Pressable>

      <View className="mt-6 rounded-[32px] border border-border bg-card p-5">
        <Text className="text-xs font-black uppercase tracking-[0.2em] text-stamp">Month</Text>
        <View className="mt-3 self-start">
          <MonthPickerField value={form.month} onChange={(month) => setForm((current) => ({ ...current, month }))} />
        </View>
        {fieldErrors.month ? <FieldError message={fieldErrors.month} /> : null}

        <Text className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-stamp">Expense category</Text>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {categories.map((category) => {
            const disabled = budgetedCategoryIds.has(category.id);
            const selected = form.categoryId === category.id;

            return (
              <Pressable
                key={category.id}
                className={
                  selected
                    ? 'rounded-full border border-primary bg-primary px-4 py-2'
                    : disabled
                      ? 'rounded-full border border-border bg-border px-4 py-2 opacity-60'
                      : 'rounded-full border border-border bg-background px-4 py-2'
                }
                accessibilityLabel={disabled ? `${category.name} already has a budget for this month` : `Choose ${category.name}`}
                accessibilityRole="button"
                accessibilityState={{ disabled, selected }}
                disabled={disabled}
                onPress={() => setForm((current) => ({ ...current, categoryId: category.id }))}
              >
                <Text
                  className={
                    selected
                      ? 'text-sm font-bold text-primary-foreground'
                      : disabled
                        ? 'text-sm font-bold text-muted line-through'
                        : 'text-sm font-bold text-muted'
                  }
                >
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityLabel="Create expense category"
            accessibilityRole="button"
            className="rounded-full border border-dashed border-stamp bg-card px-4 py-2"
            onPress={() => router.push({ pathname: '/category-form', params: { type: 'expense' } } as never)}
          >
            <Text className="text-sm font-black text-stamp">+ New category</Text>
          </Pressable>
        </View>
        {categories.length === 0 ? (
          <View className="mt-3 rounded-2xl border border-dashed border-border bg-background p-4">
            <Text className="text-sm font-black text-foreground">No expense categories yet.</Text>
            <Text className="mt-1 text-sm leading-5 text-muted">Create one before setting a budget.</Text>
          </View>
        ) : null}
        {fieldErrors.categoryId ? <FieldError message={fieldErrors.categoryId} /> : null}

        <Text className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-stamp">Limit</Text>
        <AmountInput value={form.limitAmount} onChangeValue={(limitAmount) => setForm((current) => ({ ...current, limitAmount }))} />
        {fieldErrors.limitAmount ? <FieldError message={fieldErrors.limitAmount} /> : null}

        {formError ? <FormError message={formError} /> : null}

        <Pressable
          className={submitting ? 'mt-6 rounded-2xl bg-muted px-4 py-4' : 'mt-6 rounded-2xl bg-primary px-4 py-4'}
          accessibilityLabel={id ? 'Save budget changes' : 'Add budget'}
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting }}
          disabled={submitting}
          onPress={submitBudget}
        >
          <Text className="text-center text-sm font-black uppercase tracking-[0.16em] text-primary-foreground">
            {submitting ? 'Saving…' : id ? 'Save changes' : 'Add budget'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
