import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createLocalAttachment, createReceiptSignedUrl, deleteLocalAttachment, listLocalAttachments } from '@/src/attachments';
import type { Attachment } from '@/src/attachments';
import { useAuth } from '@/src/auth';
import { listLocalCategories } from '@/src/categories';
import type { Category, CategoryType } from '@/src/categories';
import { AmountInput, ConfirmationDialog, DatePickerField, FieldError, FormError, LoadingState, Screen } from '@/src/components/ui';
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
  const colorScheme = useColorScheme() ?? 'light';
  const iconColor = Colors[colorScheme].text;
  const primaryForegroundColor = Colors[colorScheme].background;
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentUris, setAttachmentUris] = useState<Record<string, string>>({});
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [deleteAttachmentError, setDeleteAttachmentError] = useState<string | null>(null);
  const [deleteAttachmentTarget, setDeleteAttachmentTarget] = useState<Attachment | null>(null);
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
        const [categoryRows, attachmentRows] = await Promise.all([
          listLocalCategories(user.id),
          id ? listLocalAttachments(user.id, id) : Promise.resolve([]),
        ]);
        setCategories(categoryRows);
        setAttachments(attachmentRows);
        await refreshAttachmentUris(attachmentRows);

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

  async function addAttachment(source: 'camera' | 'library') {
    if (!user || !id) {
      setAttachmentError('Save the transaction before adding receipts.');
      return;
    }

    setAttachmentError(null);
    setAttachmentLoading(true);

    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setAttachmentError(source === 'camera' ? 'Camera permission is needed to take a receipt photo.' : 'Photo library permission is needed to attach a receipt.');
        return;
      }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      await createLocalAttachment(user.id, id, {
        fileName: asset.fileName,
        fileSize: asset.fileSize,
        mimeType: asset.mimeType,
        uri: asset.uri,
      });
      const nextAttachments = await listLocalAttachments(user.id, id);
      setAttachments(nextAttachments);
      await refreshAttachmentUris(nextAttachments);
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : 'Unable to attach receipt.');
    } finally {
      setAttachmentLoading(false);
    }
  }

  async function confirmDeleteAttachment() {
    if (!user || !deleteAttachmentTarget) {
      return;
    }

    setDeleteAttachmentError(null);

    try {
      await deleteLocalAttachment(user.id, deleteAttachmentTarget.id);
      setDeleteAttachmentTarget(null);
      const nextAttachments = id ? await listLocalAttachments(user.id, id) : [];
      setAttachments(nextAttachments);
      await refreshAttachmentUris(nextAttachments);
    } catch (error) {
      setDeleteAttachmentError(error instanceof Error ? error.message : 'Unable to remove receipt.');
    }
  }

  async function refreshAttachmentUris(rows: Attachment[]) {
    const entries = await Promise.all(
      rows.map(async (attachment) => {
        if (attachment.local_uri) {
          return [attachment.id, attachment.local_uri] as const;
        }

        if (!attachment.storage_path) {
          return [attachment.id, ''] as const;
        }

        try {
          return [attachment.id, await createReceiptSignedUrl(attachment.storage_path)] as const;
        } catch {
          return [attachment.id, ''] as const;
        }
      })
    );

    setAttachmentUris(Object.fromEntries(entries));
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

        <View className="mt-6 rounded-[24px] border border-border bg-background p-4">
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="text-xs font-black uppercase tracking-[0.2em] text-stamp">Receipts</Text>
              <Text className="mt-2 text-sm leading-5 text-muted">
                {id ? 'Attach local receipt images. Files are copied into app storage.' : 'Save the transaction before adding receipts.'}
              </Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable
                className={id && !attachmentLoading ? 'h-11 w-11 items-center justify-center rounded-full bg-card' : 'h-11 w-11 items-center justify-center rounded-full bg-border opacity-60'}
                disabled={!id || attachmentLoading}
                onPress={() => addAttachment('camera')}
              >
                <Ionicons color={iconColor} name="camera-outline" size={20} />
              </Pressable>
              <Pressable
                className={id && !attachmentLoading ? 'h-11 w-11 items-center justify-center rounded-full bg-card' : 'h-11 w-11 items-center justify-center rounded-full bg-border opacity-60'}
                disabled={!id || attachmentLoading}
                onPress={() => addAttachment('library')}
              >
                <Ionicons color={iconColor} name="image-outline" size={20} />
              </Pressable>
            </View>
          </View>

          {attachmentError ? <FormError message={attachmentError} /> : null}

          {attachments.length > 0 ? (
            <View className="mt-4 gap-3">
              {attachments.map((attachment) => (
                <View key={attachment.id} className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3">
                  <Pressable
                    className="overflow-hidden rounded-xl"
                    onPress={() => router.push({ pathname: '/attachment-preview', params: { uri: attachmentUris[attachment.id] ?? attachment.local_uri } } as never)}
                  >
                    {attachmentUris[attachment.id] ? (
                      <Image source={{ uri: attachmentUris[attachment.id] }} style={{ height: 64, width: 64 }} contentFit="cover" />
                    ) : (
                      <View className="h-16 w-16 items-center justify-center bg-background">
                        <Ionicons color={iconColor} name="image-outline" size={20} />
                      </View>
                    )}
                  </Pressable>
                  <View className="flex-1">
                    <Text className="text-sm font-black text-foreground">Receipt photo</Text>
                    <Text className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-muted">{attachment.upload_status} · {attachment.sync_status}</Text>
                  </View>
                  <Pressable
                    className="h-10 w-10 items-center justify-center rounded-full bg-danger"
                    onPress={() => {
                      setDeleteAttachmentError(null);
                      setDeleteAttachmentTarget(attachment);
                    }}
                  >
                    <Ionicons color={primaryForegroundColor} name="trash-outline" size={18} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </View>

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

      <ConfirmationDialog
        confirmLabel="Remove receipt"
        description="Remove this receipt photo from the transaction?"
        errorMessage={deleteAttachmentError}
        onCancel={() => {
          setDeleteAttachmentError(null);
          setDeleteAttachmentTarget(null);
        }}
        onConfirm={confirmDeleteAttachment}
        title="Remove receipt?"
        visible={Boolean(deleteAttachmentTarget)}
      />
    </Screen>
  );
}
