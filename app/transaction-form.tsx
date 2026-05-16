import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/src/auth';
import { listLocalCategories } from '@/src/categories';
import type { Category, CategoryType } from '@/src/categories';
import { AmountInput, DatePickerField, FieldError, FormError, LoadingState, Screen } from '@/src/components/ui';
import { toIsoDate } from '@/src/lib/date';
import {
  createLocalTransaction,
  getLocalTransaction,
  transactionFormSchema,
  updateLocalTransaction,
} from '@/src/transactions';
import type { TransactionFormInput } from '@/src/transactions';

const EMPTY_FORM: TransactionFormInput = {
  amount: '',
  categoryId: '',
  note: '',
  transactionDate: toIsoDate(new Date()),
  type: 'expense',
};

type FieldErrors = Partial<Record<keyof TransactionFormInput, string>>;

export default function TransactionFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState<TransactionFormInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const formCategories = useMemo(
    () => categories.filter((category) => category.type === form.type),
    [categories, form.type]
  );

  useEffect(() => {
    async function loadFormData() {
      if (!user) {
        return;
      }

      setLoading(true);
      setFormError(null);

      try {
        const categoryRows = await listLocalCategories(user.id);
        setCategories(categoryRows);

        if (!id) {
          return;
        }

        const transaction = await getLocalTransaction(user.id, id);

        if (!transaction) {
          setFormError('Transaction not found.');
          return;
        }

        setForm({
          amount: String(transaction.amount),
          categoryId: transaction.category_id,
          note: transaction.note ?? '',
          transactionDate: transaction.transaction_date,
          type: transaction.type,
        });
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Unable to load transaction.');
      } finally {
        setLoading(false);
      }
    }

    loadFormData();
  }, [id, user]);

  async function submitTransaction() {
    if (!user) {
      return;
    }

    setFieldErrors({});
    setFormError(null);

    const parsed = transactionFormSchema.safeParse(form);

    if (!parsed.success) {
      setFieldErrors(
        parsed.error.issues.reduce<FieldErrors>((errors, issue) => {
          const field = issue.path[0] as keyof TransactionFormInput | undefined;

          if (field) {
            errors[field] = issue.message;
          }

          return errors;
        }, {})
      );
      return;
    }

    const selectedCategory = categories.find((category) => category.id === parsed.data.categoryId);

    if (!selectedCategory || selectedCategory.type !== parsed.data.type) {
      setFieldErrors({ categoryId: 'Choose a category that matches the transaction type.' });
      return;
    }

    setSubmitting(true);

    try {
      if (id) {
        await updateLocalTransaction(user.id, id, parsed.data);
      } else {
        await createLocalTransaction(user.id, parsed.data);
      }

      router.back();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save transaction.');
    } finally {
      setSubmitting(false);
    }
  }

  function setFormType(type: CategoryType) {
    setForm((current) => ({ ...current, categoryId: '', type }));
  }

  if (loading) {
    return (
      <Screen eyebrow="Receipts" title="Ledger entry" description="Preparing the local transaction form.">
        <View className="mt-7">
          <LoadingState description="Reading transaction details from SQLite." title="Opening entry" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      description="Record a clean local ledger entry. Sync will pick it up later."
      eyebrow="Receipts"
      title={id ? 'Edit entry' : 'New entry'}
    >
      <Pressable className="mt-7 h-11 w-11 items-center justify-center rounded-full border border-border bg-card" onPress={() => router.back()}>
        <Text className="text-xl font-black text-foreground">←</Text>
      </Pressable>

      <View className="mt-6 rounded-[32px] border border-border bg-card p-5">
        <Text className="text-xs font-black uppercase tracking-[0.2em] text-stamp">Type</Text>
        <View className="mt-3 flex-row gap-2">
          {(['expense', 'income'] as const).map((type) => (
            <Pressable
              key={type}
              className={
                form.type === type
                  ? 'flex-1 rounded-2xl bg-primary px-4 py-3'
                  : 'flex-1 rounded-2xl border border-border bg-background px-4 py-3'
              }
              onPress={() => setFormType(type)}
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

        <Text className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-stamp">Amount</Text>
        <AmountInput value={form.amount} onChangeValue={(amount) => setForm((current) => ({ ...current, amount }))} />
        {fieldErrors.amount ? <FieldError message={fieldErrors.amount} /> : null}

        <Text className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-stamp">Category</Text>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {formCategories.map((category) => (
            <Pressable
              key={category.id}
              className={
                form.categoryId === category.id
                  ? 'rounded-full border border-primary bg-primary px-4 py-2'
                  : 'rounded-full border border-border bg-background px-4 py-2'
              }
              onPress={() => setForm((current) => ({ ...current, categoryId: category.id }))}
            >
              <Text
                className={
                  form.categoryId === category.id
                    ? 'text-sm font-bold text-primary-foreground'
                    : 'text-sm font-bold text-muted'
                }
              >
                {category.name}
              </Text>
            </Pressable>
          ))}
        </View>
        {fieldErrors.categoryId ? <FieldError message={fieldErrors.categoryId} /> : null}

        <Text className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-stamp">Date</Text>
        <DatePickerField
          value={form.transactionDate}
          onChange={(transactionDate) => setForm((current) => ({ ...current, transactionDate }))}
        />
        {fieldErrors.transactionDate ? <FieldError message={fieldErrors.transactionDate} /> : null}

        <Text className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-stamp">Note</Text>
        <TextInput
          className="mt-3 rounded-2xl border border-border bg-background px-4 py-4 text-base font-bold text-foreground"
          onChangeText={(note) => setForm((current) => ({ ...current, note }))}
          placeholder="Optional memo"
          placeholderTextColorClassName="accent-muted"
          returnKeyType="done"
          value={form.note}
        />
        {fieldErrors.note ? <FieldError message={fieldErrors.note} /> : null}

        {formError ? <FormError message={formError} /> : null}

        <Pressable
          className={submitting ? 'mt-6 rounded-2xl bg-muted px-4 py-4' : 'mt-6 rounded-2xl bg-primary px-4 py-4'}
          disabled={submitting}
          onPress={submitTransaction}
        >
          <Text className="text-center text-sm font-black uppercase tracking-[0.16em] text-primary-foreground">
            {submitting ? 'Saving…' : id ? 'Save changes' : 'Add transaction'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
