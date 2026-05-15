import { ScrollView, Text, View } from 'react-native';

const previewFilters = ['All', 'Expense', 'Income'];

export default function TransactionsScreen() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pb-10 pt-16">
      <Text className="text-xs font-black uppercase tracking-[0.24em] text-stamp">Receipts</Text>
      <Text className="mt-3 text-5xl font-black tracking-tight text-foreground">Transaction roll</Text>
      <Text className="mt-3 text-base leading-6 text-muted">
        A scan-friendly feed for daily spending, notes, receipt status, and sync state.
      </Text>

      <View className="mt-7 flex-row gap-2">
        {previewFilters.map((filter, index) => (
          <View
            key={filter}
            className={`rounded-full border px-4 py-2 ${
              index === 0 ? 'border-primary bg-primary' : 'border-border bg-card'
            }`}>
            <Text
              className={`text-sm font-bold ${index === 0 ? 'text-primary-foreground' : 'text-muted'}`}>
              {filter}
            </Text>
          </View>
        ))}
      </View>

      <View className="mt-7 rounded-3xl border border-dashed border-border bg-receipt p-5">
        <View className="flex-row items-center justify-between">
          <Text className="font-mono text-xs font-black text-stamp">NO ENTRIES</Text>
          <Text className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Local</Text>
        </View>
        <Text className="mt-5 text-2xl font-black text-foreground">Your first receipt lands here.</Text>
        <Text className="mt-2 text-sm leading-5 text-muted">
          The final list should feel like a tidy paper trail, not a spreadsheet dump.
        </Text>
      </View>
    </ScrollView>
  );
}
