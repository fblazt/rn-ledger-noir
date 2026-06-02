import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createLocalAttachment, createReceiptSignedUrl, deleteLocalAttachment, listLocalAttachments } from '@/src/attachments';
import type { Attachment } from '@/src/attachments';
import { useAuth } from '@/src/auth';
import { listLocalCategories } from '@/src/categories';
import type { Category, CategoryType } from '@/src/categories';
import { ConfirmationDialog, FormError, LoadingState, Screen } from '@/src/components/ui';
import { toIsoDate } from '@/src/lib/date';
import { useObjectState } from '@/src/lib/use-object-state';
import { ReceiptSection } from '@/src/components/transactions/receipt-section';
import { TransactionFields } from '@/src/components/transactions/transaction-fields';
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

async function buildAttachmentUris(rows: Attachment[]) {
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

  return Object.fromEntries(entries);
}

export default function TransactionFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const iconColor = Colors[colorScheme].text;
  const primaryForegroundColor = Colors[colorScheme].background;
  const { user } = useAuth();
  const [form, setForm] = useState<TransactionFormInput>(EMPTY_FORM);
  const [state, setState] = useObjectState({
    attachmentError: null as string | null,
    attachmentLoading: false,
    attachmentUris: {} as Record<string, string>,
    attachments: [] as Attachment[],
    categories: [] as Category[],
    deleteAttachmentError: null as string | null,
    deleteAttachmentTarget: null as Attachment | null,
    fieldErrors: {} as FieldErrors,
    formError: null as string | null,
    loading: true,
    submitting: false,
  });
  const {
    attachmentError,
    attachmentLoading,
    attachmentUris,
    attachments,
    categories,
    deleteAttachmentError,
    deleteAttachmentTarget,
    fieldErrors,
    formError,
    loading,
    submitting,
  } = state;

  const formCategories = categories.filter((category) => category.type === form.type);

  async function loadSupportingData() {
    if (!user) {
      return;
    }

    const [categoryRows, attachmentRows] = await Promise.all([
      listLocalCategories(user.id),
      id ? listLocalAttachments(user.id, id) : Promise.resolve([]),
    ]);

    setState({
      attachmentUris: await buildAttachmentUris(attachmentRows),
      attachments: attachmentRows,
      categories: categoryRows,
    });
  }

  useEffect(() => {
    async function loadFormData() {
      if (!user) {
        return;
      }

      setState({ formError: null, loading: true });

      try {
        const [categoryRows, attachmentRows] = await Promise.all([
          listLocalCategories(user.id),
          id ? listLocalAttachments(user.id, id) : Promise.resolve([]),
        ]);

        setState({
          attachmentUris: await buildAttachmentUris(attachmentRows),
          attachments: attachmentRows,
          categories: categoryRows,
        });

        if (id) {
          const transaction = await getLocalTransaction(user.id, id);

          if (!transaction) {
            setState({ formError: 'Transaction not found.' });
          } else {
            setForm({
              amount: String(transaction.amount),
              categoryId: transaction.category_id,
              note: transaction.note ?? '',
              transactionDate: transaction.transaction_date,
              type: transaction.type,
            });
          }
        }
      } catch (error) {
        setState({ formError: error instanceof Error ? error.message : 'Unable to load transaction.' });
      }

      setState({ loading: false });
    }

    loadFormData();
  }, [id, setState, user]);

  useFocusEffect(() => {
    loadSupportingData().catch((error) => {
      setState({ formError: error instanceof Error ? error.message : 'Unable to refresh categories.' });
    });
  });

  async function submitTransaction() {
    if (!user) {
      return;
    }

    setState({ fieldErrors: {}, formError: null });

    const parsed = transactionFormSchema.safeParse(form);

    if (!parsed.success) {
      setState({
        fieldErrors: parsed.error.issues.reduce<FieldErrors>((errors, issue) => {
          const field = issue.path[0] as keyof TransactionFormInput | undefined;

          if (field) {
            errors[field] = issue.message;
          }

          return errors;
        }, {}),
      });
      return;
    }

    const selectedCategory = categories.find((category) => category.id === parsed.data.categoryId);

    if (!selectedCategory || selectedCategory.type !== parsed.data.type) {
      setState({ fieldErrors: { categoryId: 'Choose a category that matches the transaction type.' } });
      return;
    }

    setState({ submitting: true });

    try {
      if (id) {
        await updateLocalTransaction(user.id, id, parsed.data);
      } else {
        await createLocalTransaction(user.id, parsed.data);
      }

      router.back();
    } catch (error) {
      setState({ formError: error instanceof Error ? error.message : 'Unable to save transaction.' });
    }

    setState({ submitting: false });
  }

  async function addAttachment(source: 'camera' | 'library') {
    if (!user || !id) {
      setState({ attachmentError: 'Save the transaction before adding receipts.' });
      return;
    }

    setState({ attachmentError: null, attachmentLoading: true });

    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setState({
          attachmentError: source === 'camera' ? 'Camera permission is needed to take a receipt photo.' : 'Photo library permission is needed to attach a receipt.',
        });
      } else {
        const result = source === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });

        if (!result.canceled) {
          const asset = result.assets[0];
          await createLocalAttachment(user.id, id, {
            fileName: asset.fileName,
            fileSize: asset.fileSize,
            mimeType: asset.mimeType,
            uri: asset.uri,
          });
          const nextAttachments = await listLocalAttachments(user.id, id);
          setState({
            attachmentUris: await buildAttachmentUris(nextAttachments),
            attachments: nextAttachments,
          });
        }
      }
    } catch (error) {
      setState({ attachmentError: error instanceof Error ? error.message : 'Unable to attach receipt.' });
    }

    setState({ attachmentLoading: false });
  }

  async function confirmDeleteAttachment() {
    if (!user || !deleteAttachmentTarget) {
      return;
    }

    setState({ deleteAttachmentError: null });

    try {
      await deleteLocalAttachment(user.id, deleteAttachmentTarget.id);
      setState({ deleteAttachmentTarget: null });
      const nextAttachments = id ? await listLocalAttachments(user.id, id) : [];
      setState({
        attachmentUris: await buildAttachmentUris(nextAttachments),
        attachments: nextAttachments,
      });
    } catch (error) {
      setState({ deleteAttachmentError: error instanceof Error ? error.message : 'Unable to remove receipt.' });
    }
  }


  function setFormType(type: CategoryType) {
    setForm((current) => ({ ...current, categoryId: '', type }));
  }

  if (loading) {
    return (
      <Screen eyebrow="Receipts" title="Ledger entry" description="Preparing your transaction form.">
        <View className="mt-7">
          <LoadingState description="Loading transaction details." title="Opening entry" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      description="Record a clean ledger entry. Backup will run when your account is online."
      eyebrow="Receipts"
      title={id ? 'Edit entry' : 'New entry'}
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
        <TransactionFields
          fieldErrors={fieldErrors}
          form={form}
          formCategories={formCategories}
          onChangeForm={setForm}
          onChangeType={setFormType}
        />

        <ReceiptSection
          attachmentError={attachmentError}
          attachmentLoading={attachmentLoading}
          attachmentUris={attachmentUris}
          attachments={attachments}
          iconColor={iconColor}
          onAddAttachment={addAttachment}
          onRemoveAttachment={(attachment) => setState({ deleteAttachmentError: null, deleteAttachmentTarget: attachment })}
          primaryForegroundColor={primaryForegroundColor}
          transactionId={id}
        />

        {formError ? <FormError message={formError} /> : null}

        <Pressable
          className={submitting ? 'mt-6 rounded-2xl bg-muted p-4' : 'mt-6 rounded-2xl bg-primary p-4'}
          accessibilityLabel={id ? 'Save transaction changes' : 'Add transaction'}
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting }}
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
          setState({ deleteAttachmentError: null, deleteAttachmentTarget: null });
        }}
        onConfirm={confirmDeleteAttachment}
        title="Remove receipt?"
        visible={Boolean(deleteAttachmentTarget)}
      />
    </Screen>
  );
}
