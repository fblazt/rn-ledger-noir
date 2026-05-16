import { Text, View } from 'react-native';

import { MonthSelector, Screen } from '@/src/components/ui';

const budgetPreview = [
  { barClassName: 'h-3 w-1/12 rounded-full bg-success', name: 'Food', value: '0%' },
  { barClassName: 'h-3 w-1/12 rounded-full bg-warning', name: 'Transport', value: '0%' },
  { barClassName: 'h-3 w-1/12 rounded-full bg-danger', name: 'Bills', value: '0%' },
];

export default function BudgetsScreen() {
  return (
    <Screen
      description="Monthly category limits should show pressure early, before overspending becomes a surprise."
      eyebrow="Limits"
      title="Budget pressure"
    >
      <View className="mt-8">
        <MonthSelector monthLabel="May 2026" />
      </View>

      <View className="mt-5 rounded-[32px] border border-border bg-card p-5">
        <Text className="text-xs font-black uppercase tracking-[0.22em] text-primary">May controls</Text>
        <View className="mt-5 gap-5">
          {budgetPreview.map((budget) => (
            <View key={budget.name}>
              <View className="flex-row justify-between">
                <Text className="text-base font-bold text-foreground">{budget.name}</Text>
                <Text className="font-mono text-sm font-black text-muted">{budget.value}</Text>
              </View>
              <View className="mt-2 h-3 overflow-hidden rounded-full bg-border">
                <View className={budget.barClassName} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}
