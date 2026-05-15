import { ScrollView, Text, View } from 'react-native';

const recentRows = [
  ['TODAY', 'Food', 'Rp0'],
  ['SYNC', 'Local ledger ready', 'Idle'],
  ['MAY', 'Budget pressure', '0%'],
];

export default function DashboardScreen() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pb-10 pt-16">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-5">
          <Text className="text-xs font-black uppercase tracking-[0.24em] text-stamp">
            Private ledger
          </Text>
          <Text className="mt-3 text-5xl font-black leading-[52px] tracking-tight text-foreground">
            May money pulse
          </Text>
        </View>
        <View className="rounded-full border border-border bg-receipt px-3 py-2">
          <Text className="text-xs font-bold uppercase tracking-[0.16em] text-primary">IDR</Text>
        </View>
      </View>

      <View className="mt-8 overflow-hidden rounded-[32px] bg-primary p-6">
        <View className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-stamp/30" />
        <View className="absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-success/20" />
        <Text className="text-xs font-bold uppercase tracking-[0.22em] text-primary-foreground/70">
          Current balance
        </Text>
        <Text className="mt-4 font-mono text-5xl font-black text-primary-foreground">Rp0</Text>
        <Text className="mt-3 max-w-64 text-sm leading-5 text-primary-foreground/75">
          Local-first totals will update instantly from SQLite, then sync quietly when online.
        </Text>
      </View>

      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 rounded-[24px] border border-border bg-card p-4">
          <Text className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Income</Text>
          <Text className="mt-3 font-mono text-2xl font-black text-success">Rp0</Text>
        </View>
        <View className="flex-1 rounded-[24px] border border-border bg-card p-4">
          <Text className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Expense</Text>
          <Text className="mt-3 font-mono text-2xl font-black text-danger">Rp0</Text>
        </View>
      </View>

      <View className="mt-6 rounded-3xl border border-dashed border-border bg-receipt p-5">
        <Text className="text-xs font-black uppercase tracking-[0.22em] text-primary">
          Ledger feed
        </Text>
        <View className="mt-4 gap-3">
          {recentRows.map(([label, title, value]) => (
            <View key={title} className="flex-row items-center justify-between border-b border-border pb-3">
              <View>
                <Text className="font-mono text-[11px] font-bold text-stamp">{label}</Text>
                <Text className="mt-1 text-base font-semibold text-foreground">{title}</Text>
              </View>
              <Text className="font-mono text-sm font-bold text-muted">{value}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
