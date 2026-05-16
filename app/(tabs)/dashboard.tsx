import { Text, View } from 'react-native';

import { AmountText, Screen, SyncBadge } from '@/src/components/ui';

const recentRows = [
  ['TODAY', 'Food', 'Rp0'],
  ['SYNC', 'Local ledger ready', 'Idle'],
  ['MAY', 'Budget pressure', '0%'],
];

export default function DashboardScreen() {
  return (
    <Screen
      action={<SyncBadge status="idle" />}
      eyebrow="Private ledger"
      title="May money pulse"
    >
      <View className="mt-8 overflow-hidden rounded-[32px] bg-primary p-6">
        <View className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-stamp/30" />
        <View className="absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-success/20" />
        <Text className="text-xs font-bold uppercase tracking-[0.22em] text-primary-foreground/70">
          Current balance
        </Text>
        <View className="mt-4">
          <AmountText amount={0} size="lg" tone="inverse" />
        </View>
        <Text className="mt-3 max-w-64 text-sm leading-5 text-primary-foreground/75">
          Local-first totals will update instantly from SQLite, then sync quietly when online.
        </Text>
      </View>

      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 rounded-[24px] border border-border bg-card p-4">
          <Text className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Income</Text>
          <View className="mt-3">
            <AmountText amount={0} size="md" tone="income" />
          </View>
        </View>
        <View className="flex-1 rounded-[24px] border border-border bg-card p-4">
          <Text className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Expense</Text>
          <View className="mt-3">
            <AmountText amount={0} size="md" tone="expense" />
          </View>
        </View>
      </View>

      <View className="mt-6 rounded-3xl border border-dashed border-border bg-receipt p-5">
        <Text className="text-xs font-black uppercase tracking-[0.22em] text-primary">
          Ledger feed
        </Text>
        <View className="mt-4 gap-3">
          {recentRows.map(([label, title, value]) => (
            <View
              key={title}
              className="flex-row items-center justify-between border-b border-border pb-3"
            >
              <View>
                <Text className="font-mono text-[11px] font-bold text-stamp">{label}</Text>
                <Text className="mt-1 text-base font-semibold text-foreground">{title}</Text>
              </View>
              <Text className="font-mono text-sm font-bold text-muted">{value}</Text>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}
