import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    async function loadFormData() {
      if (!user) {
        return;
      }

      setLoading(true);
      setFormError(null);

      try {
        const [categoryRows, budgetedIds] = await Promise.all([
          listLocalCategories(user.id, { type: 'expense' }),
          listBudgetedCategoryIds(user.id, form.month, id),
        ]);

        setCategories(categoryRows);
        setBudgetedCategoryIds(budgetedIds);

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
  }, [form.month, id, user]);

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
      <Screen description="Preparing the local budget form." eyebrow="Limits" title="Budget limit">
        <View className="mt-7">
          <LoadingState description="Reading budget details from SQLite." title="Opening budget" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      description="Set one monthly limit per expense category. Usage is calculated from local transactions."
      eyebrow="Limits"
      title={id ? 'Edit budget' : 'New budget'}
    >
      <Pressable className="mt-7 h-11 w-11 items-center justify-center rounded-full border border-border bg-card" onPress={() => router.back()}>
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
        </View>
        {categories.length === 0 ? <Text className="mt-3 text-sm text-muted">Create an expense category first.</Text> : null}
        {fieldErrors.categoryId ? <FieldError message={fieldErrors.categoryId} /> : null}

        <Text className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-stamp">Limit</Text>
        <AmountInput value={form.limitAmount} onChangeValue={(limitAmount) => setForm((current) => ({ ...current, limitAmount }))} />
        {fieldErrors.limitAmount ? <FieldError message={fieldErrors.limitAmount} /> : null}

        {formError ? <FormError message={formError} /> : null}

        <Pressable
          className={submitting ? 'mt-6 rounded-2xl bg-muted px-4 py-4' : 'mt-6 rounded-2xl bg-primary px-4 py-4'}
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
