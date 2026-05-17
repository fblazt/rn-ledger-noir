import { Text, View } from 'react-native';

type SyncBadgeStatus = 'idle' | 'pending' | 'synced' | 'failed';

type SyncBadgeProps = {
  status: SyncBadgeStatus;
};

const badgeClass: Record<SyncBadgeStatus, string> = {
  idle: 'border-border bg-card',
  pending: 'border-warning/40 bg-warning/10',
  synced: 'border-success/40 bg-success/10',
  failed: 'border-danger/40 bg-danger/10',
};

const dotClass: Record<SyncBadgeStatus, string> = {
  idle: 'bg-muted',
  pending: 'bg-warning',
  synced: 'bg-success',
  failed: 'bg-danger',
};

const label: Record<SyncBadgeStatus, string> = {
  idle: 'All saved',
  pending: 'Needs backup',
  synced: 'All saved',
  failed: 'Backup failed',
};

export function SyncBadge({ status }: SyncBadgeProps) {
  return (
    <View className={`flex-row items-center gap-2 rounded-full border px-3 py-2 ${badgeClass[status]}`}>
      <View className={`h-2 w-2 rounded-full ${dotClass[status]}`} />
      <Text className="text-xs font-black uppercase tracking-[0.14em] text-foreground">
        {label[status]}
      </Text>
    </View>
  );
}
