import { Modal, Pressable, Text, View } from 'react-native';

type ConfirmationDialogProps = {
  confirmLabel: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  visible: boolean;
  danger?: boolean;
  errorMessage?: string | null;
};

export function ConfirmationDialog({
  confirmLabel,
  danger = true,
  description,
  errorMessage,
  onCancel,
  onConfirm,
  title,
  visible,
}: ConfirmationDialogProps) {
  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <Pressable className="flex-1 justify-end bg-black/70 px-5 pb-8" onPress={onCancel}>
        <Pressable className="rounded-[32px] border border-border bg-card p-5" onPress={(event) => event.stopPropagation()}>
          <Text className="font-mono text-xs font-black uppercase tracking-[0.18em] text-stamp">
            Confirm action
          </Text>
          <Text className="mt-4 text-2xl font-black text-foreground">{title}</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">{description}</Text>

          {errorMessage ? (
            <View className="mt-5 rounded-3xl border border-danger/40 bg-background p-4">
              <Text className="font-mono text-xs font-black uppercase tracking-[0.18em] text-danger">
                Blocked
              </Text>
              <Text className="mt-2 text-sm leading-5 text-muted">{errorMessage}</Text>
            </View>
          ) : null}

          <View className="mt-6 flex-row gap-3">
            <Pressable className="flex-1 rounded-2xl border border-border bg-background px-4 py-4" onPress={onCancel}>
              <Text className="text-center text-sm font-black uppercase tracking-[0.16em] text-foreground">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              className={
                danger
                  ? 'flex-1 rounded-2xl bg-danger px-4 py-4'
                  : 'flex-1 rounded-2xl bg-primary px-4 py-4'
              }
              onPress={onConfirm}
            >
              <Text className="text-center text-sm font-black uppercase tracking-[0.16em] text-primary-foreground">
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
