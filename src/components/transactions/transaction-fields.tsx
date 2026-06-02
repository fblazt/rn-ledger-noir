import { router } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { Category, CategoryType } from '@/src/categories';
import { AmountInput, DatePickerField, FieldError } from '@/src/components/ui';
import type { TransactionFormInput } from '@/src/transactions';

type FieldErrors = Partial<Record<keyof TransactionFormInput, string>>;

type TransactionFieldsProps = {
  fieldErrors: FieldErrors;
  form: TransactionFormInput;
  formCategories: Category[];
  onChangeForm: (updater: (current: TransactionFormInput) => TransactionFormInput) => void;
  onChangeType: (type: CategoryType) => void;
};

export function TransactionFields({
  fieldErrors,
  form,
  formCategories,
  onChangeForm,
  onChangeType,
}: TransactionFieldsProps) {
  return (
    <>
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
            accessibilityLabel={`Set transaction type to ${type}`}
            accessibilityRole="button"
            accessibilityState={{ selected: form.type === type }}
            onPress={() => onChangeType(type)}
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
      <AmountInput value={form.amount} onChangeValue={(amount) => onChangeForm((current) => ({ ...current, amount }))} />
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
            accessibilityLabel={`Choose ${category.name}`}
            accessibilityRole="button"
            accessibilityState={{ selected: form.categoryId === category.id }}
            onPress={() => onChangeForm((current) => ({ ...current, categoryId: category.id }))}
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
        <Pressable
          accessibilityLabel={`Create ${form.type} category`}
          accessibilityRole="button"
          className="rounded-full border border-dashed border-stamp bg-card px-4 py-2"
          onPress={() => router.push({ pathname: '/category-form', params: { type: form.type } } as never)}
        >
          <Text className="text-sm font-black text-stamp">+ New category</Text>
        </Pressable>
      </View>
      {formCategories.length === 0 ? (
        <View className="mt-3 rounded-2xl border border-dashed border-border bg-background p-4">
          <Text className="text-sm font-black text-foreground">No {form.type} categories yet.</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">Create one to keep this entry organized.</Text>
        </View>
      ) : null}
      {fieldErrors.categoryId ? <FieldError message={fieldErrors.categoryId} /> : null}

      <Text className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-stamp">Date</Text>
      <DatePickerField
        value={form.transactionDate}
        onChange={(transactionDate) => onChangeForm((current) => ({ ...current, transactionDate }))}
      />
      {fieldErrors.transactionDate ? <FieldError message={fieldErrors.transactionDate} /> : null}

      <Text className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-stamp">Note</Text>
      <TextInput
        accessibilityLabel="Transaction note"
        className="mt-3 rounded-2xl border border-border bg-background p-4 text-base font-bold text-foreground"
        onChangeText={(note) => onChangeForm((current) => ({ ...current, note }))}
        placeholder="Optional memo"
        placeholderTextColorClassName="accent-muted"
        returnKeyType="done"
        value={form.note}
      />
      {fieldErrors.note ? <FieldError message={fieldErrors.note} /> : null}
    </>
  );
}
