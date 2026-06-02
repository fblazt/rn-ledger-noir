import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/src/auth';
import {
  CATEGORY_COLORS,
  categoryFormSchema,
  createLocalCategory,
  getLocalCategoryById,
  updateLocalCategory,
} from '@/src/categories';
import type { CategoryFormInput } from '@/src/categories';
import { FieldError, FormError, LoadingState, Screen } from '@/src/components/ui';
import { useObjectState } from '@/src/lib/use-object-state';

const EMPTY_FORM: CategoryFormInput = {
  color: CATEGORY_COLORS[0],
  icon: 'tag',
  name: '',
  type: 'expense',
};

type FieldErrors = Partial<Record<keyof CategoryFormInput, string>>;

export default function CategoryFormScreen() {
  const { id, type } = useLocalSearchParams<{ id?: string; type?: string }>();
  const { user } = useAuth();
  const [form, setForm] = useState<CategoryFormInput>(() => ({
    ...EMPTY_FORM,
    type: type === 'income' ? 'income' : 'expense',
  }));
  const [state, setState] = useObjectState({
    fieldErrors: {} as FieldErrors,
    formError: null as string | null,
    loading: Boolean(id),
    submitting: false,
  });
  const { fieldErrors, formError, loading, submitting } = state;

  useEffect(() => {
    async function loadCategory() {
      if (!id || !user) {
        setState({ loading: false });
        return;
      }

      try {
        const category = await getLocalCategoryById(user.id, id);

        if (!category) {
          setState({ formError: 'Category not found.' });
        } else if (category.is_default === 1) {
          setState({ formError: 'Default categories are read-only.' });
        } else {
          setForm({
            color: category.color ?? CATEGORY_COLORS[0],
            icon: category.icon ?? 'tag',
            name: category.name,
            type: category.type,
          });
        }
      } catch (error) {
        setState({ formError: error instanceof Error ? error.message : 'Unable to load category.' });
      }

      setState({ loading: false });
    }

    loadCategory();
  }, [id, setState, user]);

  async function submitCategory() {
    if (!user) {
      return;
    }

    setState({ fieldErrors: {}, formError: null });

    const parsed = categoryFormSchema.safeParse(form);

    if (!parsed.success) {
      setState({
        fieldErrors: parsed.error.issues.reduce<FieldErrors>((errors, issue) => {
          const field = issue.path[0] as keyof CategoryFormInput | undefined;

          if (field) {
            errors[field] = issue.message;
          }

          return errors;
        }, {}),
      });
      return;
    }

    setState({ submitting: true });

    try {
      if (id) {
        await updateLocalCategory(user.id, id, parsed.data);
      } else {
        await createLocalCategory(user.id, parsed.data);
      }

      router.back();
    } catch (error) {
      setState({ formError: error instanceof Error ? error.message : 'Unable to save category.' });
    }

    setState({ submitting: false });
  }

  if (loading) {
    return (
      <Screen eyebrow="Taxonomy" title="Category desk" description="Preparing the category record.">
        <View className="mt-7">
          <LoadingState description="Loading category details." title="Opening category" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      description="Keep the label short, type-specific, and easy to scan in transaction forms."
      eyebrow="Taxonomy"
      title={id ? 'Edit category' : 'New category'}
    >
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        className="mt-7 size-11 items-center justify-center rounded-full border border-border bg-card"
        onPress={() => router.back()}
      >
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
              accessibilityLabel={`Set category type to ${type}`}
              accessibilityRole="button"
              accessibilityState={{ selected: form.type === type }}
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

        <Text className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-stamp">Name</Text>
        <TextInput
          accessibilityLabel="Category name"
          className="mt-3 rounded-2xl border border-border bg-background p-4 text-base font-bold text-foreground"
          onChangeText={(name) => setForm((current) => ({ ...current, name }))}
          placeholder="Coffee, Freelance, Parking…"
          placeholderTextColorClassName="accent-muted"
          returnKeyType="done"
          value={form.name}
        />
        {fieldErrors.name ? <FieldError message={fieldErrors.name} /> : null}

        <Text className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-stamp">Icon label</Text>
        <TextInput
          accessibilityLabel="Category icon label"
          autoCapitalize="none"
          className="mt-3 rounded-2xl border border-border bg-background p-4 text-base font-bold text-foreground"
          onChangeText={(icon) => setForm((current) => ({ ...current, icon }))}
          placeholder="tag"
          placeholderTextColorClassName="accent-muted"
          returnKeyType="done"
          value={form.icon}
        />
        {fieldErrors.icon ? <FieldError message={fieldErrors.icon} /> : null}

        <Text className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-stamp">Color</Text>
        <View className="mt-3 flex-row flex-wrap gap-3">
          {CATEGORY_COLORS.map((color) => (
            <Pressable
              key={color}
              className={
                form.color === color
                  ? 'size-11 rounded-full border-4 border-foreground'
                  : 'size-11 rounded-full border border-border'
              }
              accessibilityLabel={`Choose category color ${color}`}
              accessibilityRole="button"
              accessibilityState={{ selected: form.color === color }}
              onPress={() => setForm((current) => ({ ...current, color }))}
              style={{ backgroundColor: color }}
            />
          ))}
        </View>
        {fieldErrors.color ? <FieldError message={fieldErrors.color} /> : null}

        {formError ? <FormError message={formError} /> : null}

        <Pressable
          className={submitting ? 'mt-6 rounded-2xl bg-muted p-4' : 'mt-6 rounded-2xl bg-primary p-4'}
          accessibilityLabel={id ? 'Save category changes' : 'Create category'}
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting }}
          disabled={submitting}
          onPress={submitCategory}
        >
          <Text className="text-center text-sm font-black uppercase tracking-[0.16em] text-primary-foreground">
            {submitting ? 'Saving…' : id ? 'Save changes' : 'Create category'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
