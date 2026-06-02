import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import type { Attachment } from '@/src/attachments';
import { FormError } from '@/src/components/ui';

function formatAttachmentStatus(attachment: Attachment) {
  if (attachment.upload_status === 'failed' || attachment.sync_status === 'failed') {
    return 'Backup failed';
  }

  if (attachment.upload_status === 'uploading') {
    return 'Backing up';
  }

  if (attachment.sync_status === 'pending' || attachment.upload_status === 'local') {
    return 'Needs backup';
  }

  return null;
}

type ReceiptSectionProps = {
  attachmentError: string | null;
  attachmentLoading: boolean;
  attachmentUris: Record<string, string>;
  attachments: Attachment[];
  iconColor: string;
  onAddAttachment: (source: 'camera' | 'library') => void;
  onRemoveAttachment: (attachment: Attachment) => void;
  primaryForegroundColor: string;
  transactionId?: string;
};

export function ReceiptSection({
  attachmentError,
  attachmentLoading,
  attachmentUris,
  attachments,
  iconColor,
  onAddAttachment,
  onRemoveAttachment,
  primaryForegroundColor,
  transactionId,
}: ReceiptSectionProps) {
  return (
    <View className="mt-6 rounded-[24px] border border-border bg-background p-4">
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text className="text-xs font-black uppercase tracking-[0.2em] text-stamp">Receipts</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">
            {transactionId ? 'Attach receipt photos for safekeeping and backup.' : 'Save the transaction before adding receipts.'}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            className={transactionId && !attachmentLoading ? 'size-11 items-center justify-center rounded-full bg-card' : 'size-11 items-center justify-center rounded-full bg-border opacity-60'}
            accessibilityLabel="Take receipt photo"
            accessibilityRole="button"
            accessibilityState={{ disabled: !transactionId || attachmentLoading }}
            disabled={!transactionId || attachmentLoading}
            onPress={() => onAddAttachment('camera')}
          >
            <Ionicons color={iconColor} name="camera-outline" size={20} />
          </Pressable>
          <Pressable
            className={transactionId && !attachmentLoading ? 'size-11 items-center justify-center rounded-full bg-card' : 'size-11 items-center justify-center rounded-full bg-border opacity-60'}
            accessibilityLabel="Attach receipt from photo library"
            accessibilityRole="button"
            accessibilityState={{ disabled: !transactionId || attachmentLoading }}
            disabled={!transactionId || attachmentLoading}
            onPress={() => onAddAttachment('library')}
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
                accessibilityLabel="Preview receipt photo"
                accessibilityRole="imagebutton"
                className="overflow-hidden rounded-xl"
                onPress={() => router.push({ pathname: '/attachment-preview', params: { uri: attachmentUris[attachment.id] ?? attachment.local_uri } } as never)}
              >
                {attachmentUris[attachment.id] ? (
                  <Image source={{ uri: attachmentUris[attachment.id] }} style={{ height: 64, width: 64 }} contentFit="cover" />
                ) : (
                  <View className="size-16 items-center justify-center bg-background">
                    <Ionicons color={iconColor} name="image-outline" size={20} />
                  </View>
                )}
              </Pressable>
              <View className="flex-1">
                <Text className="text-sm font-black text-foreground">Receipt photo</Text>
                {formatAttachmentStatus(attachment) ? (
                  <Text className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-muted">{formatAttachmentStatus(attachment)}</Text>
                ) : null}
              </View>
              <Pressable
                accessibilityLabel="Remove receipt photo"
                accessibilityRole="button"
                className="size-10 items-center justify-center rounded-full bg-danger"
                onPress={() => onRemoveAttachment(attachment)}
              >
                <Ionicons color={primaryForegroundColor} name="trash-outline" size={18} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
