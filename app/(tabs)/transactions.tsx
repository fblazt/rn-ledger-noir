import { Text, View } from 'react-native';

import { EmptyState, Screen, SyncBadge } from '@/src/components/ui';

const previewFilters = [
  { active: true, label: 'All' },
  { active: false, label: 'Expense' },
  { active: false, label: 'Income' },
];

export default function TransactionsScreen() {
  return (
    <Screen
      action={<SyncBadge status="idle" />}
      description="A scan-friendly feed for daily spending, notes, receipt status, and sync state."
      eyebrow="Receipts"
      title="Transaction roll"
    >
      <View className="mt-7 flex-row gap-2">
        {previewFilters.map((filter) => (
          <View
            key={filter.label}
            className={
              filter.active
                ? 'rounded-full border border-primary bg-primary px-4 py-2'
                : 'rounded-full border border-border bg-card px-4 py-2'
            }
          >
            <Text
              className={
                filter.active
                  ? 'text-sm font-bold text-primary-foreground'
                  : 'text-sm font-bold text-muted'
              }
            >
              {filter.label}
            </Text>
          </View>
        ))}
      </View>

      <View className="mt-7">
        <EmptyState
          description="The final list should feel like a tidy paper trail, not a spreadsheet dump."
          label="No entries"
          title="Your first receipt lands here."
        />
      </View>
    </Screen>
  );
}
